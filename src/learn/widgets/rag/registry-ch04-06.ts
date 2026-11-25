import { lazy } from "react";
import type { WidgetRegistry } from "../types";

const registry: WidgetRegistry = {
  "c04-embedding-map": lazy(() => import("./C04EmbeddingMap")),
  "c04-metric-calc": lazy(() => import("./C04MetricCalc")),
  "c04-storage-calc": lazy(() => import("./C04StorageCalc")),
  "c05-hnsw-walk": lazy(() => import("./C05HnswWalk")),
  "c05-ivf-probes": lazy(() => import("./C05IvfProbes")),
  "c05-filter-trap": lazy(() => import("./C05FilterTrap")),
  "c06-dense-vs-sparse": lazy(() => import("./C06DenseVsSparse")),
  "c06-bm25-tuner": lazy(() => import("./C06Bm25Tuner")),
  "c06-rrf-calc": lazy(() => import("./C06RrfCalc")),
};

export default registry;
