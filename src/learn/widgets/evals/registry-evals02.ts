import { lazy } from "react";
import type { WidgetRegistry } from "../types";

const registry: WidgetRegistry = {
  "evals02-grader-picker": lazy(() => import("./Evals02GraderPicker")),
  "evals02-args-match": lazy(() => import("./Evals02ArgsMatch")),
};

export default registry;
