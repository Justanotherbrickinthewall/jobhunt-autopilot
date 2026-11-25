import { lazy } from "react";
import type { WidgetRegistry } from "../types";

const registry: WidgetRegistry = {
  "guardrails01-entry-map": lazy(() => import("./Guardrails01EntryMap")),
  "guardrails01-chain-run": lazy(() => import("./Guardrails01ChainRun")),
};

export default registry;
