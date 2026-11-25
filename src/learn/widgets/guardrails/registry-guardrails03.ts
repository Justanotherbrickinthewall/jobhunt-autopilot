import { lazy } from "react";
import type { WidgetRegistry } from "../types";

const registry: WidgetRegistry = {
  "guardrails03-spotlight": lazy(() => import("./Guardrails03Spotlight")),
  "guardrails03-rule-tester": lazy(() => import("./Guardrails03RuleTester")),
  "guardrails03-allow-list": lazy(() => import("./Guardrails03AllowList")),
};

export default registry;
