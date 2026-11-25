import { lazy } from "react";
import type { WidgetRegistry } from "../types";

const registry: WidgetRegistry = {
  "evals08-interval": lazy(() => import("./Evals08Interval")),
  "evals08-gate-verdict": lazy(() => import("./Evals08GateVerdict")),
  "evals08-exit-code": lazy(() => import("./Evals08ExitCode")),
};

export default registry;
