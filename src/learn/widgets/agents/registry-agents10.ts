import { lazy } from "react";
import type { WidgetRegistry } from "../types";

const registry: WidgetRegistry = {
  "agents10-architecture-chooser": lazy(() => import("./Agents10ArchitectureChooser")),
  "agents10-who-picks": lazy(() => import("./Agents10WhoPicks")),
};
export default registry;
