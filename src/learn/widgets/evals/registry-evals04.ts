import { lazy } from "react";
import type { WidgetRegistry } from "../types";

const registry: WidgetRegistry = {
  "evals04-score-reader": lazy(() => import("./Evals04ScoreReader")),
  "evals04-tool-picker": lazy(() => import("./Evals04ToolPicker")),
};

export default registry;
