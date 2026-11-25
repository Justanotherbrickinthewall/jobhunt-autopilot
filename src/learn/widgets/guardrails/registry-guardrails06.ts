import { lazy } from "react";
import type { WidgetRegistry } from "../types";

const registry: WidgetRegistry = {
  "guardrails06-decision-paths": lazy(() => import("./Guardrails06DecisionPaths")),
  "guardrails06-resume-twice": lazy(() => import("./Guardrails06ResumeTwice")),
  "guardrails06-expiry-clock": lazy(() => import("./Guardrails06ExpiryClock")),
};

export default registry;
