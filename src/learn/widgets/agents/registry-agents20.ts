import { lazy } from "react";
import type { WidgetRegistry } from "../types";

const registry: WidgetRegistry = {
  "agents20-drain-time": lazy(() => import("./Agents20DrainTime")),
  "agents20-redelivery": lazy(() => import("./Agents20Redelivery")),
  "agents20-pull-push": lazy(() => import("./Agents20PullPush")),
};
export default registry;
