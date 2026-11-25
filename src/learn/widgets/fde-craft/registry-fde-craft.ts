import { lazy } from "react";
import type { WidgetRegistry } from "../types";

const registry: WidgetRegistry = {
  "fde-craft-discovery-questions": lazy(() => import("./C01DiscoveryQuestions")),
  "fde-craft-problem-reframe": lazy(() => import("./C01ProblemReframe")),
  "fde-craft-scope-cutter": lazy(() => import("./C02ScopeCutter")),
  "fde-craft-demo-honesty": lazy(() => import("./C02DemoHonesty")),
  "fde-craft-handover-checklist": lazy(() => import("./C03HandoverChecklist")),
  "fde-craft-risk-register": lazy(() => import("./C03RiskRegister")),
  "fde-craft-diff-review": lazy(() => import("./C04DiffReview")),
  "fde-craft-gate-order": lazy(() => import("./C04GateOrder")),
  "fde-craft-claim-sorter": lazy(() => import("./C05ClaimSorter")),
  "fde-craft-story-builder": lazy(() => import("./C05StoryBuilder")),
};
export default registry;
