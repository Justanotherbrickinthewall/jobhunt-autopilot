import { lazy } from "react";
import type { WidgetRegistry } from "../types";

const registry: WidgetRegistry = {
  "agents26-gate-run": lazy(() => import("./Agents26GateRun")),
  "agents26-which-layer": lazy(() => import("./Agents26WhichLayer")),
};
export default registry;
