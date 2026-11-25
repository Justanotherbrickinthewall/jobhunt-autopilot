import { lazy } from "react";
import type { WidgetRegistry } from "../types";

const registry: WidgetRegistry = {
  "agents07-lost-ticket": lazy(() => import("./Agents07LostTicket")),
  "agents07-ticket-key": lazy(() => import("./Agents07TicketKey")),
  "agents07-resume-replay": lazy(() => import("./Agents07ResumeReplay")),
};
export default registry;
