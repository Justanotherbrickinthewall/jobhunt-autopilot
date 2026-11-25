import { lazy } from "react";
import type { WidgetRegistry } from "../types";

const registry: WidgetRegistry = {
  "rag-first-failing-stage": lazy(() => import("./C09FirstFailingStage")),
};
export default registry;
