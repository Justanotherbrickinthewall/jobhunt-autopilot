import { lazy } from "react";
import type { WidgetRegistry } from "../types";

const registry: WidgetRegistry = {
  "c10-latency-budget": lazy(() => import("./C10LatencyBudget")),
  "c10-permission-leak": lazy(() => import("./C10PermissionLeak")),
  "c11-agent-decision": lazy(() => import("./C11AgentDecision")),
  "c11-contextual-chunk": lazy(() => import("./C11ContextualChunk")),
  "c11-pattern-matcher": lazy(() => import("./C11PatternMatcher")),
  "c12-framework-stepper": lazy(() => import("./C12FrameworkStepper")),
  "c12-tradeoff-picker": lazy(() => import("./C12TradeoffPicker")),
};

export default registry;
