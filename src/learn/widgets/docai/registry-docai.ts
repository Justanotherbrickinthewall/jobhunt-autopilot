import { lazy } from "react";
import type { WidgetRegistry } from "../types";

const registry: WidgetRegistry = {
  "docai-layer-peeler": lazy(() => import("./C01LayerPeeler")),
  "docai-digital-or-scan": lazy(() => import("./C01DigitalOrScan")),
  "docai-prebuilt-or-custom": lazy(() => import("./C02PrebuiltOrCustom")),
  "docai-label-split": lazy(() => import("./C02LabelSplit")),
  "docai-extractor-picker": lazy(() => import("./C03ExtractorPicker")),
  "docai-hybrid-router": lazy(() => import("./C03HybridRouter")),
  "docai-cross-field-check": lazy(() => import("./C04CrossFieldCheck")),
  "docai-confidence-calibration": lazy(() => import("./C04ConfidenceCalibration")),
  "docai-pipeline-stepper": lazy(() => import("./C05PipelineStepper")),
  "docai-poison-or-transient": lazy(() => import("./C05PoisonOrTransient")),
};

export default registry;
