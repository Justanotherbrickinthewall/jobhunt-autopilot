import { lazy } from "react";
import type { WidgetRegistry } from "../types";

const registry: WidgetRegistry = {
  "design-approval-flow": lazy(() => import("./C03ApprovalFlow")),
  "design-blast-radius": lazy(() => import("./C03BlastRadius")),
};
export default registry;
