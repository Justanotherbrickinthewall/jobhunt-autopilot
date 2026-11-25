import { lazy } from "react";
import type { WidgetRegistry } from "../types";

const registry: WidgetRegistry = {
  "architecture02-cheapest-passing": lazy(() => import("./Architecture02CheapestPassing")),
  "architecture02-fallback-trace": lazy(() => import("./Architecture02FallbackTrace")),
  "architecture02-month-projection": lazy(() => import("./Architecture02MonthProjection")),
};

export default registry;
