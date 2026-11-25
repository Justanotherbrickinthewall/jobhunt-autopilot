import { lazy } from "react";
import type { WidgetRegistry } from "../types";

const registry: WidgetRegistry = {
  "cloud07-traffic-plan": lazy(() => import("./Cloud07TrafficPlan")),
  "cloud07-canary-verdict": lazy(() => import("./Cloud07CanaryVerdict")),
  "cloud07-quiet-rollout": lazy(() => import("./Cloud07QuietRollout")),
};
export default registry;
