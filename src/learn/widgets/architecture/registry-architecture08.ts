import { lazy } from "react";
import type { WidgetRegistry } from "../types";

const registry: WidgetRegistry = {
  "architecture08-bill-levers": lazy(() => import("./Architecture08BillLevers")),
  "architecture08-failure-walk": lazy(() => import("./Architecture08FailureWalk")),
  "architecture08-claim-audit": lazy(() => import("./Architecture08ClaimAudit")),
};
export default registry;
