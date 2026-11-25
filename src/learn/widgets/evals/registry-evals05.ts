import { lazy } from "react";
import type { WidgetRegistry } from "../types";

const registry: WidgetRegistry = {
  "evals05-silent-scorer": lazy(() => import("./Evals05SilentScorer")),
  "evals05-delta-reader": lazy(() => import("./Evals05DeltaReader")),
};

export default registry;
