import { lazy } from "react";
import type { WidgetRegistry } from "../types";

const registry: WidgetRegistry = {
  "design-permission-trim": lazy(() => import("./C04PermissionTrim")),
  "design-connector-plan": lazy(() => import("./C04ConnectorPlan")),
};
export default registry;
