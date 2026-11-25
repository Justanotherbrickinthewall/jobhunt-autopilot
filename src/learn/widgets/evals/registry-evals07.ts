import { lazy } from "react";
import type { WidgetRegistry } from "../types";

const registry: WidgetRegistry = {
  "evals07-failure-coder": lazy(() => import("./Evals07FailureCoder")),
  "evals07-weak-slices": lazy(() => import("./Evals07WeakSlices")),
  "evals07-synthetic-filter": lazy(() => import("./Evals07SyntheticFilter")),
};

export default registry;
