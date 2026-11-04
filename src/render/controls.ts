import { NEUTRAL_CONTROLS, type Controls } from "../sim/physics.js";

export interface RideControls {
  current: Controls;
  resetRequested: boolean;
  modeToggleRequested: boolean;
  dispose(): void;
}

/** Keyboard + touch controls: A/D edge, S brake, W effort, R reset, C mode. */
export function attachControls(doc: Document): RideControls {
  const state: RideControls = {
    current: { ...NEUTRAL_CONTROLS },
    resetRequested: false,
    modeToggleRequested: false,
    dispose: () => undefined,
  };
  const down = new Set<string>();
  const apply = (): void => {
    state.current = {
      edge: (down.has("a") ? -1 : 0) + (down.has("d") ? 1 : 0),
      brake: down.has("s") ? 1 : 0,
      power: down.has("w") ? 1 : 0.65,
    };
  };
  const onDown = (e: KeyboardEvent): void => {
    const k = e.key.toLowerCase();
    down.add(k);
    if (k === "r") state.resetRequested = true;
    if (k === "c") state.modeToggleRequested = true;
    apply();
  };
  const onUp = (e: KeyboardEvent): void => {
    down.delete(e.key.toLowerCase());
    apply();
  };
  doc.addEventListener("keydown", onDown);
  doc.addEventListener("keyup", onUp);
  state.dispose = () => {
    doc.removeEventListener("keydown", onDown);
    doc.removeEventListener("keyup", onUp);
  };
  return state;
}
