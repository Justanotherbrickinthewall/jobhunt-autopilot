import { lazy } from "react";
import type { WidgetRegistry } from "../types";

const registry: WidgetRegistry = {
  "agents04-handoff-update": lazy(() => import("./Agents04HandoffUpdate")),
  "agents04-edge-or-command": lazy(() => import("./Agents04EdgeOrCommand")),
};

export default registry;
