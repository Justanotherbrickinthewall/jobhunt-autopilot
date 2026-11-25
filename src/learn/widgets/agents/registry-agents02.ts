import { lazy } from "react";
import type { WidgetRegistry } from "../types";

const registry: WidgetRegistry = {
  "agents02-tool-doctor": lazy(() => import("./Agents02ToolDoctor")),
  "agents02-error-replay": lazy(() => import("./Agents02ErrorReplay")),
};
export default registry;
