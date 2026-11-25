import { lazy } from "react";
import type { WidgetRegistry } from "../types";

const registry: WidgetRegistry = {
  "architecture04-duty-owner": lazy(() => import("./Architecture04DutyOwner")),
  "architecture04-evidence-sorter": lazy(() => import("./Architecture04EvidenceSorter")),
};

export default registry;
