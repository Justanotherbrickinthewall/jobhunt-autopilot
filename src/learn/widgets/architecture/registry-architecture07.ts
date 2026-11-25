import { lazy } from "react";
import type { WidgetRegistry } from "../types";

const registry: WidgetRegistry = {
  "architecture07-path-placer": lazy(() => import("./Architecture07PathPlacer")),
  "architecture07-wait-budget": lazy(() => import("./Architecture07WaitBudget")),
};

export default registry;
