import { lazy } from "react";
import type { WidgetRegistry } from "../types";

const registry: WidgetRegistry = {
  "design-sequencer": lazy(() => import("./C01Sequencer")),
  "design-requirements-probe": lazy(() => import("./C01RequirementsProbe")),
};

export default registry;
