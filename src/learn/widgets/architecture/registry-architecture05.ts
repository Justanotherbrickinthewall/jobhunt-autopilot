import { lazy } from "react";
import type { WidgetRegistry } from "../types";

const registry: WidgetRegistry = {
  "architecture05-cache-key": lazy(() => import("./Architecture05CacheKey")),
  "architecture05-redelivery": lazy(() => import("./Architecture05Redelivery")),
  "architecture05-cache-or-queue": lazy(() => import("./Architecture05CacheOrQueue")),
};
export default registry;
