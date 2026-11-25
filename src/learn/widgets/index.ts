// Merges every src/widgets/<course>/registry-*.ts. Missing ids render a placeholder, not a crash.
import type { WidgetComponent, WidgetRegistry } from "./types.ts";

const modules = import.meta.glob<{ default: WidgetRegistry }>("./*/registry-*.ts", { eager: true });

export const widgets: WidgetRegistry = Object.assign({}, ...Object.values(modules).map((m) => m.default ?? {}));

export const getWidget = (id: string): WidgetComponent | undefined => widgets[id];
