import { Component, Suspense, useCallback, type ReactNode } from "react";
import { getWidget } from "../widgets/index.ts";
import { recordWidget, useChapterProgress } from "../engine/progress.ts";

class Boundary extends Component<{ id: string; children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  render() {
    if (this.state.error) {
      return (
        <div className="w-panel widget-missing" role="alert">
          <p><strong>The widget "{this.props.id}" crashed.</strong></p>
          <p className="muted">{this.state.error.message}</p>
          <button type="button" className="btn ghost small" onClick={() => this.setState({ error: null })}>Try again</button>
        </div>
      );
    }
    return this.props.children;
  }
}

export function WidgetHost({ id, chapterId }: { id: string; chapterId: string }) {
  const Widget = getWidget(id);
  const progress = useChapterProgress(chapterId);
  const verdict = progress.widgets[id];
  const onComplete = useCallback((v: string) => recordWidget(chapterId, id, v), [chapterId, id]);
  if (!Widget) {
    return (
      <div className="w-panel widget-missing">
        <p><strong>Widget "{id}" is not built yet.</strong></p>
        <p className="muted">Register it in a src/widgets/&lt;course&gt;/registry-*.ts file and it will appear here.</p>
      </div>
    );
  }
  return (
    <Boundary id={id}>
      <Suspense fallback={<div className="w-panel widget-loading"><span className="spinner" /></div>}>
        <Widget onComplete={onComplete} />
      </Suspense>
      {verdict && <p className="widget-done">Done. Your verdict: {verdict}</p>}
    </Boundary>
  );
}
