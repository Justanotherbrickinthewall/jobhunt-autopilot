import type { ComponentType, LazyExoticComponent } from "react";

// A widget is a self-contained interactive lesson. Contract: setup/SPEC.md.
// A single-decision widget calls onComplete on the first correct answer, or after
// the second attempt with the explanation shown. A multi-case widget calls it once,
// when the last case is resolved, never mid-sequence. A pure calculator calls it
// once, at a verdict.
export type WidgetProps = { onComplete?: (verdict: string) => void };

export type WidgetComponent =
  | ComponentType<WidgetProps>
  | LazyExoticComponent<ComponentType<WidgetProps>>;

export type WidgetRegistry = Record<string, WidgetComponent>;
