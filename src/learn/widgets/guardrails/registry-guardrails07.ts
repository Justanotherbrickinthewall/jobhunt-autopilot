import { lazy } from "react";
import type { WidgetRegistry } from "../types";

const registry: WidgetRegistry = {
  "guardrails07-layer-switch": lazy(() => import("./Guardrails07LayerSwitch")),
  "guardrails07-gate-bar": lazy(() => import("./Guardrails07GateBar")),
};

export default registry;
