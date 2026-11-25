import { lazy } from "react";
import type { WidgetRegistry } from "../types";

const registry: WidgetRegistry = {
  "llmops06-counter-matrix": lazy(() => import("./Llmops06CounterMatrix")),
  "llmops06-burn-rule-tester": lazy(() => import("./Llmops06BurnRuleTester")),
};

export default registry;
