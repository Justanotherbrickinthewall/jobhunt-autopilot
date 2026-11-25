import { lazy } from "react";
import type { WidgetRegistry } from "../types";

const registry: WidgetRegistry = {
  "agents28-arch-picker": lazy(() => import("./Agents28ArchPicker")),
  "agents28-answer-scorer": lazy(() => import("./Agents28AnswerScorer")),
  "agents28-trap-spotter": lazy(() => import("./Agents28TrapSpotter")),
};
export default registry;
