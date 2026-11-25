import { lazy } from "react";
import type { WidgetRegistry } from "../types";

const registry: WidgetRegistry = {
  "agents14-who-catches": lazy(() => import("./Agents14WhoCatches")),
  "agents14-round-cost": lazy(() => import("./Agents14RoundCost")),
};
export default registry;
