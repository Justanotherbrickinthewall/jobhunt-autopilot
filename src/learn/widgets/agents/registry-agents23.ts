import { lazy } from "react";
import type { WidgetRegistry } from "../types";

const registry: WidgetRegistry = {
  "agents23-risk-sorter": lazy(() => import("./Agents23RiskSorter")),
  "agents23-check-judge": lazy(() => import("./Agents23CheckJudge")),
  "agents23-pause-resume": lazy(() => import("./Agents23PauseResume")),
};
export default registry;
