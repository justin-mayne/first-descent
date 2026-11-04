using System;
using UnityEngine;

namespace SphinxSimulation.Physics
{
    /// <summary>
    /// Implements the double fall-line ski kinematics and Voellmy-Salm loose-snow (sluff)
    /// surface avalanche dynamics for The Sphinx (Line 38/50, Chugach Mountains, AK).
    /// Coordinate convention:
    ///   +X = Down-slope fall-line (142 deg SE)
    ///   +Y = Looker's Right / Skier's Left (52 deg NE)
    ///   +Z = Elevation ASL (meters)
    /// </summary>
    public class SphinxSkiSluffController : MonoBehaviour
    {
        [Header("Skier Physical Parameters")]
        public float skierMassKg = 82.0f;           // Skier + Mammut RAS airbag + mountaineering kit
        public float skiLengthM = 1.86f;            // Salomon QST Blank 112mm
        public float skiWaistWidthM = 0.112f;
        public float aeroDragAreaM2 = 0.55f;

        [Header("Snowpack State (Default: 2022 Velvet Powder)")]
        public float snowDensityKgM3 = 140.0f;
        public float powderDepthM = 0.35f;
        public float basalFrictionMuK = 0.14f;
        public float voellmyDryFrictionMuS = 0.16f;
        public float voellmyTurbulentDragXi = 1500.0f;
        public float sluffFlowThicknessM = 0.38f;

        [Header("Real-Time Telemetry State")]
        public Vector3 localPositionM = new Vector3(0f, 0f, 1820f);
        public Vector2 tangentVelocityMS = Vector2.zero;
        public float currentSlopePitchDeg = 38.0f;
        public float currentCrossTiltDeg = 10.0f;
        public float activeSluffFrontX = 0.0f;
        public float activeSluffSpeedMS = 0.0f;
        public bool isRagdollWipeout = false;
        public bool isParkedOnSafeRib = false;

        private const float GravityG = 9.81f;
        private const float AirDensityKgM3 = 1.05f; // ~1,500m ASL standard atmosphere

        /// <summary>
        /// Advances both the skier's tangent-plane velocity and the trailing Voellmy-Salm sluff wave.
        /// </summary>
        /// <param name="dt">Fixed timestep in seconds</param>
        /// <param name="carveTurnInput">Normalized carving input [-1 = Looker's Left, +1 = Skier's Left Rib]</param>
        /// <param name="edgeAngleDeg">Ski edge angle in degrees [0 to 75]</param>
        public void StepSimulation(float dt, float carveTurnInput, float edgeAngleDeg)
        {
            if (isRagdollWipeout) return;

            UpdateTerrainAnglesFromPosition(localPositionM.x, localPositionM.y, out currentSlopePitchDeg, out currentCrossTiltDeg, out localPositionM.z);

            float thetaRad = currentSlopePitchDeg * Mathf.Deg2Rad;
            float phiRad = currentCrossTiltDeg * Mathf.Deg2Rad;

            // 1. Double Fall-Line Gravity Vector on Tangent Plane
            //    gx pulls down the SE face (+X); gy pulls laterally into the center gully (-Y)
            Vector2 gTangent = new Vector2(
                GravityG * Mathf.Sin(thetaRad) * Mathf.Cos(phiRad),
                -GravityG * Mathf.Sin(phiRad)
            );

            // 2. Basal Coulomb Friction + Snow Plowing Drag
            float speed = tangentVelocityMS.magnitude;
            Vector2 moveDir = speed > 0.01f ? (tangentVelocityMS / speed) : new Vector2(1f, 0f);

            float normalForce = skierMassKg * GravityG * Mathf.Cos(thetaRad) * Mathf.Cos(phiRad);
            float basalFrictionMag = basalFrictionMuK * normalForce;

            // Carving edge resistance increases with sin(edgeAngle)
            float edgeBrakingMag = 0.35f * normalForce * Mathf.Sin(edgeAngleDeg * Mathf.Deg2Rad) * Mathf.Abs(carveTurnInput);

            // Combined aerodynamic + powder displacement drag
            float effectiveSnowArea = skiWaistWidthM * Mathf.Clamp(powderDepthM, 0.05f, 0.50f);
            float quadraticDragCoeff = 0.5f * (0.7f * aeroDragAreaM2 * AirDensityKgM3 + 1.8f * effectiveSnowArea * snowDensityKgM3);
            float dragMag = quadraticDragCoeff * speed * speed;

            // Lateral carving redirect force
            Vector2 lateralNormal = new Vector2(-moveDir.y, moveDir.x);
            float carveLateralMag = normalForce * Mathf.Sin(edgeAngleDeg * Mathf.Deg2Rad) * carveTurnInput * 0.85f;

            Vector2 netForce = (skierMassKg * gTangent)
                             - (moveDir * (basalFrictionMag + edgeBrakingMag + dragMag))
                             + (lateralNormal * carveLateralMag);

            Vector2 acceleration = netForce / skierMassKg;
            tangentVelocityMS += acceleration * dt;

            // Project tangent motion onto horizontal X/Y coordinates
            localPositionM.x += tangentVelocityMS.x * Mathf.Cos(thetaRad) * dt;
            localPositionM.y += tangentVelocityMS.y * dt;

            // Check if skier pulled out onto the safe Skier's Left Rib (Y > 20m in Zone 4)
            isParkedOnSafeRib = (localPositionM.y >= 20.0f && localPositionM.x >= 180.0f && localPositionM.x <= 260.0f);

            // 3. Voellmy-Salm Granular Sluff Wave Simulation
            StepVoellmySluffWave(dt, thetaRad);

            // 4. Evaluate Sluff Overtake & Choke Bottleneck Hazard
            EvaluateSluffCollisionHazard();
        }

        private void StepVoellmySluffWave(float dt, float thetaRad)
        {
            // Driving gravity minus basal dry friction
            float drivingTerm = Mathf.Max(0.0f, Mathf.Sin(thetaRad) - voellmyDryFrictionMuS * Mathf.Cos(thetaRad));
            float turbulentResistance = (GravityG / (voellmyTurbulentDragXi * Mathf.Max(0.05f, sluffFlowThicknessM)))
                                      * activeSluffSpeedMS * activeSluffSpeedMS;

            float sluffAccel = GravityG * drivingTerm - turbulentResistance;
            activeSluffSpeedMS = Mathf.Max(0.0f, activeSluffSpeedMS + sluffAccel * dt);
            activeSluffFrontX += activeSluffSpeedMS * Mathf.Cos(thetaRad) * dt;
        }

        private void EvaluateSluffCollisionHazard()
        {
            // If the skier is parked on the elevated looker's right / skier's left rib, the sluff bypasses via the center gully
            if (isParkedOnSafeRib) return;

            float distanceToSluffM = Mathf.Abs(localPositionM.x - activeSluffFrontX);
            float relativeSpeed = activeSluffSpeedMS - tangentVelocityMS.magnitude;

            // Funnel amplification in Zone 3 & Zone 2 Choke (X in 340m..415m)
            float funnelMultiplier = (localPositionM.x >= 340.0f && localPositionM.x <= 415.0f) ? 1.65f : 1.0f;

            if (distanceToSluffM < 2.5f && relativeSpeed > 1.5f)
            {
                float dynamicPressurePa = 0.5f * snowDensityKgM3 * (sluffFlowThicknessM * funnelMultiplier) * relativeSpeed * relativeSpeed;
                if (dynamicPressurePa > 1800.0f)
                {
                    isRagdollWipeout = true;
                }
            }
        }

        private void UpdateTerrainAnglesFromPosition(float x, float y, out float pitchDeg, out float tiltDeg, out float zElevM)
        {
            if (x < 15.0f)
            {
                // Zone 5: Summit & Blind Rollover
                pitchDeg = Mathf.Lerp(38.0f, 55.0f, x / 15.0f);
                tiltDeg = 9.0f;
                zElevM = 1820.0f - x * 1.0f;
            }
            else if (x < 240.0f)
            {
                // Zone 4: Main Diamond Face
                pitchDeg = Mathf.Lerp(54.5f, 50.0f, (x - 15.0f) / 225.0f);
                tiltDeg = Mathf.Lerp(8.0f, 5.0f, (x - 15.0f) / 225.0f);
                zElevM = 1805.0f - (x - 15.0f) * 1.266f;
            }
            else if (x < 375.0f)
            {
                // Zone 3: Lower Funnel Ramp
                pitchDeg = 49.0f;
                tiltDeg = 4.0f;
                zElevM = 1520.0f - (x - 240.0f) * 1.074f;
            }
            else if (x < 425.0f)
            {
                // Zone 2: Exit Choke & Bergschrund
                pitchDeg = 46.0f;
                tiltDeg = 1.5f;
                zElevM = 1375.0f - (x - 375.0f) * 0.70f;
            }
            else
            {
                // Zone 1: Glacier Apron Runout
                pitchDeg = Mathf.Lerp(28.0f, 10.0f, Mathf.Clamp01((x - 425.0f) / 425.0f));
                tiltDeg = 0.0f;
                zElevM = Mathf.Lerp(1340.0f, 1270.0f, Mathf.Clamp01((x - 425.0f) / 425.0f));
            }
        }
    }
}
