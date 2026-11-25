import { lazy } from "react";
import type { WidgetRegistry } from "../types";

const registry: WidgetRegistry = {
  "c13-sse-stream": lazy(() => import("./C13SseStream")),
  "c13-mcp-handshake": lazy(() => import("./C13McpHandshake")),
};
export default registry;
