import { lazy } from "react";
import type { WidgetRegistry } from "../types";

const registry: WidgetRegistry = {
  "guardrails02-citation-check": lazy(() => import("./Guardrails02CitationCheck")),
  "guardrails02-action-chooser": lazy(() => import("./Guardrails02ActionChooser")),
  "guardrails02-held-stream": lazy(() => import("./Guardrails02HeldStream")),
};

export default registry;
