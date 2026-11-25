import { Component, type ErrorInfo, type ReactNode } from 'react'

// Catches an unexpected throw while rendering one top-level tab, so the other tabs keep working.
// `label` names the tab in the message. Switching tabs remounts the boundary through its key.
export class TabBoundary extends Component<{ label: string; children: ReactNode }, { error: Error | null }> {
  state: { error: Error | null } = { error: null }
  static getDerivedStateFromError(error: Error) { return { error } }
  componentDidCatch(error: Error, info: ErrorInfo) { console.error(`${this.props.label} tab failed`, error, info.componentStack) }
  render() {
    if (!this.state.error) return this.props.children
    return (
      <div className="scroll">
        <div className="empty">
          <h1>The {this.props.label} tab hit an error</h1>
          <p>The other tabs still work. Reload the page once the cause is fixed.</p>
          <p className="muted"><code>{this.state.error.message}</code></p>
        </div>
      </div>
    )
  }
}
