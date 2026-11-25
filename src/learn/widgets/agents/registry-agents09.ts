import { lazy } from "react";
import type { WidgetRegistry } from "../types";

const registry: WidgetRegistry = {
  "agents09-event-stream": lazy(() => import("./Agents09EventStream")),
  "agents09-surface-picker": lazy(() => import("./Agents09SurfacePicker")),
  "agents09-port-map": lazy(() => import("./Agents09PortMap")),
};
export default registry;
