import { lazy } from "react";
import type { WidgetRegistry } from "../types";

const registry: WidgetRegistry = {
  "architecture06-store-sorter": lazy(() => import("./Architecture06StoreSorter")),
  "architecture06-copy-clock": lazy(() => import("./Architecture06CopyClock")),
  "architecture06-region-hops": lazy(() => import("./Architecture06RegionHops")),
};

export default registry;
