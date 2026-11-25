import { lazy } from "react";
import type { WidgetRegistry } from "../types";

const registry: WidgetRegistry = {
  "c07-rerank-before-after": lazy(() => import("./C07RerankBeforeAfter")),
  "c07-query-playground": lazy(() => import("./C07QueryPlayground")),
  "c08-context-packer": lazy(() => import("./C08ContextPacker")),
  "c08-citation-checker": lazy(() => import("./C08CitationChecker")),
  "c09-metrics-lab": lazy(() => import("./C09MetricsLab")),
  "c09-failure-triage": lazy(() => import("./C09FailureTriage")),
};
export default registry;
