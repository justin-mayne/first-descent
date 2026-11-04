import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, PointerEvent as ReactPointerEvent, ReactElement } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import type { Heightmap } from "./geo/heightmap.js";
import type { Environment } from "./sim/environment.js";
import { decodeHeightfield, worldOf, type ContractBounds } from "./render/contract-load.js";
import { buildTerrainGeometryData } from "./render/terrain-view.js";
import { attachControls, type RideControls } from "./render/controls.js";
import { makeRide, dropInSkier, altitudeOf, type RideWorld } from "./ride/descent.js";
import { rideStep } from "./ride/descent.js";
import { physicsFor } from "./sim/snow-model.js";
import type { Skier as SimSkier } from "./sim/physics.js";

const BASE = import.meta.env.BASE_URL;
const DROP_IN = { lat: 60.6664, lon: -145.0694 }; // DSC_02, over the rollover

const WINTER: Environment = {
  latitude: 60.5,
  dayOfYear: 110,
  hour: 11,
  snowlineAltitude: 0,
  snowClimate: "maritime",
  storms: [{ daysAgo: 2, centimeters: 60 }],
  stormWindRad: null,
};

interface Loaded {
  map: Heightmap;
  bounds: ContractBounds;
  world: RideWorld;
}

function TerrainMesh({ map }: { map: Heightmap }): ReactElement {
  const geometry = useMemo(() => {
    const { positions, colors, indices } = buildTerrainGeometryData(map);
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    g.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    g.setIndex(new THREE.BufferAttribute(indices, 1));
    g.computeVertexNormals();
    return g;
  }, [map]);
  return (
    <mesh geometry={geometry}>
      <meshLambertMaterial vertexColors />
    </mesh>
  );
}

function Rider({
  world,
  start,
  controls,
}: {
  world: RideWorld;
  start: { x: number; z: number };
  controls: RideControls;
}): ReactElement {
  const mesh = useRef<THREE.Group>(null);
  const camera = useThree((s) => s.camera);
  const skier = useRef<SimSkier>(dropInSkier(world, start.x, start.z));
  const hud = useRef<HTMLDivElement | null>(null);
  const frame = useRef(0);
  const camPos = useRef(new THREE.Vector3(start.x, 2500, start.z + 60));

  useFrame((_, delta) => {
    if (controls.resetRequested) {
      skier.current = dropInSkier(world, start.x, start.z);
      controls.resetRequested = false;
    }
    if (controls.modeToggleRequested) {
      const s = skier.current;
      skier.current = { ...s, mode: s.mode === "ski" ? "climb" : "ski" };
      controls.modeToggleRequested = false;
    }
    const dt = Math.min(delta, 1 / 20);
    skier.current = rideStep(skier.current, controls.current, world, dt);
    const s = skier.current;
    const ground = world.terrain.height(s.x, s.z);

    if (mesh.current) {
      mesh.current.position.set(s.x, ground + 1.2, s.z);
      const speed = Math.hypot(s.vx, s.vz);
      if (speed > 0.5) mesh.current.rotation.y = -Math.atan2(s.vz, s.vx);
    }

    // chase camera: behind the velocity (or downhill), looking at the skier
    const dirx = s.vx;
    const dirz = s.vz;
    const len = Math.hypot(dirx, dirz) || 1;
    const back = 26;
    const target = new THREE.Vector3(s.x - (dirx / len) * back, ground + 11, s.z - (dirz / len) * back);
    camPos.current.lerp(target, Math.min(1, dt * 2.5));
    camera.position.copy(camPos.current);
    camera.lookAt(s.x, ground + 2, s.z);

    frame.current++;
    if (frame.current % 5 === 0) {
      if (!hud.current) hud.current = document.getElementById("hud") as HTMLDivElement | null;
      const at = world.snow.at(s.x, s.z);
      const p = physicsFor(at);
      const slope = world.terrain.height(s.x, s.z - 8) - world.terrain.height(s.x, s.z + 8);
      hud.current.innerHTML =
        `<b>${Math.hypot(s.vx, s.vz).toFixed(0)} m/s</b> · ${s.mode}` +
        ` · alt <b>${Math.round(altitudeOf(world, s))} m</b>` +
        ` · ${Math.round((Math.atan(slope / 16) * 180) / Math.PI)}°` +
        ` · ${at.surface}/${at.condition}` +
        ` · grip ${p.edgeGrip.toFixed(2)}`;
    }
  });

  return (
    <group ref={mesh}>
      <mesh>
        <capsuleGeometry args={[0.45, 1.4, 4, 8]} />
        <meshLambertMaterial color="#e3562f" />
      </mesh>
      <mesh position={[0, 1.1, 0]}>
        <sphereGeometry args={[0.32, 12, 12]} />
        <meshLambertMaterial color="#2b3f57" />
      </mesh>
    </group>
  );
}

function TouchPad({ controls }: { controls: RideControls }): ReactElement {
  const hold = (set: (down: boolean) => void): {
    onPointerDown: (e: ReactPointerEvent<HTMLButtonElement>) => void;
    onPointerUp: () => void;
    onPointerLeave: () => void;
  } => ({
    onPointerDown: (e) => {
      e.preventDefault();
      set(true);
    },
    onPointerUp: () => set(false),
    onPointerLeave: () => set(false),
  });
  const style: CSSProperties = {
    position: "fixed",
    bottom: 16,
    width: 74,
    height: 74,
    borderRadius: 12,
    border: "1px solid #2a3644",
    background: "rgba(10,14,20,0.6)",
    color: "#dfe7ee",
    fontSize: 22,
    zIndex: 20,
    userSelect: "none",
    touchAction: "none",
  };
  return (
    <>
      <button style={{ ...style, left: 16 }} {...hold((d) => (controls.current.edge = d ? -1 : 0))}>
        ◀
      </button>
      <button style={{ ...style, left: 104 }} {...hold((d) => (controls.current.edge = d ? 1 : 0))}>
        ▶
      </button>
      <button style={{ ...style, right: 16 }} {...hold((d) => (controls.current.brake = d ? 1 : 0))}>
        ❚❚
      </button>
    </>
  );
}

export function App(): ReactElement {
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [controls, setControls] = useState<RideControls | null>(null);

  useEffect(() => {
    const c = attachControls(document);
    setControls(c);
    return () => c.dispose();
  }, []);

  useEffect(() => {
    void (async () => {
      try {
        const [boundsRes, rawRes] = await Promise.all([
          fetch(`${BASE}assets/sphinx/bounds.json`),
          fetch(`${BASE}assets/sphinx/heightmap-16bit.raw`),
        ]);
        if (!boundsRes.ok || !rawRes.ok) throw new Error("asset contract not found");
        const bounds = (await boundsRes.json()) as ContractBounds;
        const raw = new Uint8Array(await rawRes.arrayBuffer());
        const map = decodeHeightfield(raw, bounds);
        setLoaded({ map, bounds, world: makeRide(map, WINTER) });
      } catch (e) {
        setError(String(e));
      }
    })();
  }, []);

  if (error) return <div style={{ padding: 24 }}>Failed to load the mountain: {error}</div>;
  if (!loaded || !controls) return <div style={{ padding: 24 }}>Loading The Sphinx…</div>;

  const start = worldOf(loaded.bounds.frame, DROP_IN.lat, DROP_IN.lon);
  const midX = (loaded.map.width * loaded.map.spacing) / 2;
  const midZ = (loaded.map.height * loaded.map.spacing) / 2;
  return (
    <>
      <Canvas
        camera={{ fov: 62, near: 0.5, far: 12000, position: [start.x, 2300, start.z + 60] }}
        onCreated={({ scene }) => {
          scene.background = new THREE.Color("#8fa7c2");
          scene.fog = new THREE.Fog("#8fa7c2", 900, 5500);
        }}
      >
        <ambientLight intensity={0.55} />
        <directionalLight position={[midX - 1200, 3800, midZ - 900]} intensity={1.1} />
        <TerrainMesh map={loaded.map} />
        <Rider world={loaded.world} start={start} controls={controls} />
      </Canvas>
      <TouchPad controls={controls} />
    </>
  );
}
