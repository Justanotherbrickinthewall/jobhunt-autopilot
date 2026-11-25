import { lazy } from "react";
import type { WidgetRegistry } from "../types";

const registry: WidgetRegistry = {
  "cloud03-workload-placer": lazy(() => import("./Cloud03WorkloadPlacer")),
  "cloud03-instance-sizer": lazy(() => import("./Cloud03InstanceSizer")),
  "cloud03-task-grants": lazy(() => import("./Cloud03TaskGrants")),
};

export default registry;
