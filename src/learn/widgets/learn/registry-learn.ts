import { lazy } from "react";
import type { WidgetRegistry } from "../types";

const registry: WidgetRegistry = {
  "learn-predict-cache": lazy(() => import("./PredictCache")),
  "learn-habit-sorter": lazy(() => import("./HabitSorter")),
  "learn-forgetting-curve": lazy(() => import("./ForgettingCurve")),
  "learn-fluency-trap": lazy(() => import("./FluencyTrap")),
  "learn-teach-back": lazy(() => import("./TeachBack")),
  "learn-week-plan": lazy(() => import("./WeekPlan")),
};

export default registry;
