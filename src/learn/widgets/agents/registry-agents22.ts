import { lazy } from "react";
import type { WidgetRegistry } from "../types";

const registry: WidgetRegistry = {
  "agents22-layer-referee": lazy(() => import("./Agents22LayerReferee")),
  "agents22-allowlist-designer": lazy(() => import("./Agents22AllowlistDesigner")),
  "agents22-redaction-regex": lazy(() => import("./Agents22RedactionRegex")),
};
export default registry;
