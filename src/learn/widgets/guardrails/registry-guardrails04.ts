import { lazy } from "react";
import type { WidgetRegistry } from "../types";

const registry: WidgetRegistry = {
  "guardrails04-read-response": lazy(() => import("./Guardrails04ReadResponse")),
  "guardrails04-confidence-level": lazy(() => import("./Guardrails04ConfidenceLevel")),
  "guardrails04-latency-budget": lazy(() => import("./Guardrails04LatencyBudget")),
};

export default registry;
