import { lazy } from "react";
import type { WidgetRegistry } from "../types";

const registry: WidgetRegistry = {
  "agents16-vote-counter": lazy(() => import("./Agents16VoteCounter")),
  "agents16-vote-value": lazy(() => import("./Agents16VoteValue")),
};
export default registry;
