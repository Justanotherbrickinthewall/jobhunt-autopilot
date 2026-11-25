import { lazy } from "react";
import type { WidgetRegistry } from "../types";

const registry: WidgetRegistry = {
  "llmops05-trace-sampler": lazy(() => import("./Llmops05TraceSampler")),
  "llmops05-candidate-triage": lazy(() => import("./Llmops05CandidateTriage")),
  "llmops05-label-budget": lazy(() => import("./Llmops05LabelBudget")),
};

export default registry;
