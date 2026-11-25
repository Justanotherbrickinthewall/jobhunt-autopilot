import { lazy } from "react";
import type { WidgetRegistry } from "../types";

const registry: WidgetRegistry = {
  "architecture03-stack-picker": lazy(() => import("./Architecture03StackPicker")),
  "architecture03-swap-breaks": lazy(() => import("./Architecture03SwapBreaks")),
  "architecture03-tie-or-win": lazy(() => import("./Architecture03TieOrWin")),
};

export default registry;
