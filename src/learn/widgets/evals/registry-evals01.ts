import { lazy } from "react";
import type { WidgetRegistry } from "../types";

const registry: WidgetRegistry = {
  "evals01-pooled-or-sliced": lazy(() => import("./Evals01PooledOrSliced")),
  "evals01-rule-check": lazy(() => import("./Evals01RuleCheck")),
};

export default registry;
