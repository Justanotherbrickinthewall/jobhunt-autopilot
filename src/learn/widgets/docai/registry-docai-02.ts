import { lazy } from "react";
import type { WidgetRegistry } from "../types";

const registry: WidgetRegistry = {
  "docai-field-scorer": lazy(() => import("./C02FieldScorer")),
};

export default registry;
