import { lazy } from "react";
import type { WidgetRegistry } from "../types";

const registry: WidgetRegistry = {
  "llmops01-slo-kind": lazy(() => import("./Llmops01SloKind")),
  "llmops01-count-rows": lazy(() => import("./Llmops01CountRows")),
  "llmops01-burn-rate": lazy(() => import("./Llmops01BurnRate")),
};

export default registry;
