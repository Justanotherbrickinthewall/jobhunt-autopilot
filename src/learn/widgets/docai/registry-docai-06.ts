import { lazy } from "react";
import type { WidgetRegistry } from "../types";

const registry: WidgetRegistry = {
  "docai-bundle-splitter": lazy(() => import("./C06BundleSplitter")),
  "docai-clause-finder": lazy(() => import("./C06ClauseFinder")),
};

export default registry;
