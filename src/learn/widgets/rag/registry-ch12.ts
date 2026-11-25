import { lazy } from "react";
import type { WidgetRegistry } from "../types";

const registry: WidgetRegistry = {
  "c12-schema-explorer": lazy(() => import("./C12SchemaExplorer")),
  "c12-hybrid-query": lazy(() => import("./C12HybridQuery")),
};

export default registry;
