import { lazy } from "react";
import type { WidgetRegistry } from "../types";

const registry: WidgetRegistry = {
  "design-intake-capacity": lazy(() => import("./C02IntakeCapacity")),
  "design-intake-failure": lazy(() => import("./C02IntakeFailure")),
};

export default registry;
