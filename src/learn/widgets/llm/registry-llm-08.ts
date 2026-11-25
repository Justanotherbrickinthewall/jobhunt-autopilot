import { lazy } from "react";
import type { WidgetRegistry } from "../types";

const registry: WidgetRegistry = {
  "llm-tune-or-not": lazy(() => import("./C08TuneOrNot")),
  "llm-distil-cost": lazy(() => import("./C08DistilCost")),
};
export default registry;
