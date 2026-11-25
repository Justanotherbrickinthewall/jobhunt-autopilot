import { lazy } from "react";
import type { WidgetRegistry } from "../types";

const registry: WidgetRegistry = {
  "agents12-route-checker": lazy(() => import("./Agents12RouteChecker")),
  "agents12-state-stepper": lazy(() => import("./Agents12StateStepper")),
  "agents12-fit-check": lazy(() => import("./Agents12FitCheck")),
};
export default registry;
