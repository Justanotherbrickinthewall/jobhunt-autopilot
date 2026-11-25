import { lazy } from "react";
import type { WidgetRegistry } from "../types";

const registry: WidgetRegistry = {
  "guardrails05-role-source": lazy(() => import("./Guardrails05RoleSource")),
  "guardrails05-audit-fields": lazy(() => import("./Guardrails05AuditFields")),
};

export default registry;
