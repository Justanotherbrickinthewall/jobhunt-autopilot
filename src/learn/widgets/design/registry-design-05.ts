import { lazy } from "react";
import type { WidgetRegistry } from "../types";

const registry: WidgetRegistry = {
  "design-sql-guard": lazy(() => import("./C05SqlGuard")),
  "design-schema-link": lazy(() => import("./C05SchemaLink")),
};
export default registry;
