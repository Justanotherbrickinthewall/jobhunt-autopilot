import { lazy } from "react";
import type { WidgetRegistry } from "../types";

const registry: WidgetRegistry = {
  "cloud04-private-path": lazy(() => import("./Cloud04PrivatePath")),
  "cloud04-secret-reference": lazy(() => import("./Cloud04SecretReference")),
};

export default registry;
