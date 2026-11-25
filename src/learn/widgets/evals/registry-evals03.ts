import { lazy } from "react";
import type { WidgetRegistry } from "../types";

const registry: WidgetRegistry = {
  "evals03-judge-grid": lazy(() => import("./Evals03JudgeGrid")),
  "evals03-bias-flip": lazy(() => import("./Evals03BiasFlip")),
};

export default registry;
