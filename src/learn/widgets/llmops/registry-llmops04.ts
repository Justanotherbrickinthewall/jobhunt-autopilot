import { lazy } from "react";
import type { WidgetRegistry } from "../types";

const registry: WidgetRegistry = {
  "llmops04-cost-ledger": lazy(() => import("./Llmops04CostLedger")),
  "llmops04-dearest-stage": lazy(() => import("./Llmops04DearestStage")),
  "llmops04-cut-test": lazy(() => import("./Llmops04CutTest")),
};

export default registry;
