import { lazy } from "react";
import type { WidgetRegistry } from "../types";

const registry: WidgetRegistry = {
  "agents27-crash-replay": lazy(() => import("./Agents27CrashReplay")),
  "agents27-safeguard-picker": lazy(() => import("./Agents27SafeguardPicker")),
};
export default registry;
