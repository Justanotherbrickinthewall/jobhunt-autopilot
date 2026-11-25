import { lazy } from "react";
import type { WidgetRegistry } from "../types";

const registry: WidgetRegistry = {
  "agents19-who-acts": lazy(() => import("./Agents19WhoActs")),
  "agents19-stale-write": lazy(() => import("./Agents19StaleWrite")),
};
export default registry;
