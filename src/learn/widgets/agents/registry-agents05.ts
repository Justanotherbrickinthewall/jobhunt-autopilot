import { lazy } from "react";
import type { WidgetRegistry } from "../types";

const registry: WidgetRegistry = {
  "agents05-call-trace": lazy(() => import("./Agents05CallTrace")),
  "agents05-gap-cost": lazy(() => import("./Agents05GapCost")),
};
export default registry;
