import { lazy } from "react";
import type { WidgetRegistry } from "../types";

const registry: WidgetRegistry = {
  "fde-craft-scope-drill": lazy(() => import("./C06ScopeDrill")),
  "fde-craft-estimate-ladder": lazy(() => import("./C06EstimateLadder")),
};
export default registry;
