import { lazy } from "react";
import type { WidgetRegistry } from "../types";

const registry: WidgetRegistry = {
  "agents25-run-walker": lazy(() => import("./Agents25RunWalker")),
  "agents25-mail-fill": lazy(() => import("./Agents25MailFill")),
};
export default registry;
