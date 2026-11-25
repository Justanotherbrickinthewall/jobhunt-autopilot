import { lazy } from "react";
import type { WidgetRegistry } from "../types";

const registry: WidgetRegistry = {
  "cloud01-role-audit": lazy(() => import("./Cloud01RoleAudit")),
  "cloud01-trust-subject": lazy(() => import("./Cloud01TrustSubject")),
  "cloud01-budget-alerts": lazy(() => import("./Cloud01BudgetAlerts")),
};

export default registry;
