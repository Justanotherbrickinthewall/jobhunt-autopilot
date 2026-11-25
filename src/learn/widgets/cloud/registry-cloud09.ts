import { lazy } from "react";
import type { WidgetRegistry } from "../types";

const registry: WidgetRegistry = {
  "cloud09-service-matcher": lazy(() => import("./Cloud09ServiceMatcher")),
  "cloud09-port-sorter": lazy(() => import("./Cloud09PortSorter")),
};

export default registry;
