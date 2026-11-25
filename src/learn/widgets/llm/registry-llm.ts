import { lazy } from "react";
import type { WidgetRegistry } from "../types";

const registry: WidgetRegistry = {
  "llm-sampling-dial": lazy(() => import("./C01SamplingDial")),
  "llm-cache-prefix": lazy(() => import("./C01CachePrefix")),
  "llm-prompt-anatomy": lazy(() => import("./C02PromptAnatomy")),
  "llm-fewshot-picker": lazy(() => import("./C02FewshotPicker")),
  "llm-validation-ladder": lazy(() => import("./C03ValidationLadder")),
  "llm-repair-loop": lazy(() => import("./C03RepairLoop")),
  "llm-error-classifier": lazy(() => import("./C04ErrorClassifier")),
  "llm-backoff-sim": lazy(() => import("./C04BackoffSim")),
  "llm-model-scorecard": lazy(() => import("./C05ModelScorecard")),
  "llm-benchmark-trap": lazy(() => import("./C05BenchmarkTrap")),
  "llm-run-manifest": lazy(() => import("./C06RunManifest")),
  "llm-harmless-edit": lazy(() => import("./C06HarmlessEdit")),
};
export default registry;
