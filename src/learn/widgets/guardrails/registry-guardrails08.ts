import { lazy } from "react";
import type { WidgetRegistry } from "../types";

const registry: WidgetRegistry = {
  "guardrails08-switch-order": lazy(() => import("./Guardrails08SwitchOrder")),
  "guardrails08-card-review": lazy(() => import("./Guardrails08CardReview")),
  "guardrails08-questionnaire": lazy(() => import("./Guardrails08Questionnaire")),
};

export default registry;
