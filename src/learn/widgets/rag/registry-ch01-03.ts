import { lazy } from "react";
import type { WidgetRegistry } from "../types";

const registry: WidgetRegistry = {
  "c01-context-budget": lazy(() => import("./C01ContextBudget")),
  "c01-knowledge-sorter": lazy(() => import("./C01KnowledgeSorter")),
  "c02-pipeline-stepper": lazy(() => import("./C02PipelineStepper")),
  "c02-parse-damage": lazy(() => import("./C02ParseDamage")),
  "c02-idempotent-ingest": lazy(() => import("./C02IdempotentIngest")),
  "c03-chunk-slider": lazy(() => import("./C03ChunkSlider")),
  "c03-strategy-matcher": lazy(() => import("./C03StrategyMatcher")),
  "c03-parent-child": lazy(() => import("./C03ParentChild")),
};
export default registry;
