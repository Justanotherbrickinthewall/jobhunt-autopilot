import { lazy } from "react";
import type { WidgetRegistry } from "../types";

const registry: WidgetRegistry = {
  "llmops03-span-attributes": lazy(() => import("./Llmops03SpanAttributes")),
  "llmops03-two-traces": lazy(() => import("./Llmops03TwoTraces")),
};
export default registry;
