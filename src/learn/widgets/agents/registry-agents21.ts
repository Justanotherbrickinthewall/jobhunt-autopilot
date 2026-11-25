import { lazy } from "react";
import type { WidgetRegistry } from "../types";

const registry: WidgetRegistry = {
  "agents21-trajectory-modes": lazy(() => import("./Agents21TrajectoryModes")),
  "agents21-pass-k": lazy(() => import("./Agents21PassK")),
  "agents21-judge-audit": lazy(() => import("./Agents21JudgeAudit")),
};
export default registry;
