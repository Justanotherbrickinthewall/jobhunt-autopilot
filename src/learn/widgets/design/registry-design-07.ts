import { lazy } from "react";
import type { WidgetRegistry } from "../types";

const registry: WidgetRegistry = {
  "design-followup-drill": lazy(() => import("./C07FollowupDrill")),
  "design-tradeoff-ledger": lazy(() => import("./C07TradeoffLedger")),
};

export default registry;
