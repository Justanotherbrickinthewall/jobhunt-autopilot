import { lazy } from "react";
import type { WidgetRegistry } from "../types";

const registry: WidgetRegistry = {
  "cloud08-kill-switch-drill": lazy(() => import("./Cloud08KillSwitchDrill")),
  "cloud08-iap-request": lazy(() => import("./Cloud08IapRequest")),
  "cloud08-review-verdict": lazy(() => import("./Cloud08ReviewVerdict")),
};
export default registry;
