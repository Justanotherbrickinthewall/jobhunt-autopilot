import { lazy } from "react";
import type { WidgetRegistry } from "../types";

const registry: WidgetRegistry = {
  "cloud02-plan-reader": lazy(() => import("./Cloud02PlanReader")),
  "cloud02-subject-match": lazy(() => import("./Cloud02SubjectMatch")),
};

export default registry;
