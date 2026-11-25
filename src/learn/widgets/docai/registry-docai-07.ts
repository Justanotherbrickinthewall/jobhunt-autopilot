import { lazy } from "react";
import type { WidgetRegistry } from "../types";

const registry: WidgetRegistry = {
  "docai-page-cost": lazy(() => import("./C07PageCost")),
  "docai-vlm-or-layout": lazy(() => import("./C07VlmOrLayout")),
};

export default registry;
