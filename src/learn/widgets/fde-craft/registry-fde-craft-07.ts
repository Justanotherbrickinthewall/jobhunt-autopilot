import { lazy } from "react";
import type { WidgetRegistry } from "../types";

const registry: WidgetRegistry = {
  "fde-craft-roi-calc": lazy(() => import("./C07RoiCalc")),
  "fde-craft-adoption-dash": lazy(() => import("./C07AdoptionDash")),
};
export default registry;
