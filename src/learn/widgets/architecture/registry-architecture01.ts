import { lazy } from "react";
import type { WidgetRegistry } from "../types";

const registry: WidgetRegistry = {
  "architecture01-requirement-check": lazy(() => import("./Architecture01RequirementCheck")),
  "architecture01-number-meets": lazy(() => import("./Architecture01NumberMeets")),
  "architecture01-adr-sorter": lazy(() => import("./Architecture01AdrSorter")),
};

export default registry;
