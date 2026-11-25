import { lazy } from "react";
import type { WidgetRegistry } from "../types";

const registry: WidgetRegistry = {
  "evals06-path-grader": lazy(() => import("./Evals06PathGrader")),
  "evals06-pass-k": lazy(() => import("./Evals06PassK")),
};

export default registry;
