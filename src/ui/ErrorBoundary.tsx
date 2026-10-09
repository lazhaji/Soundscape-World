import { Component } from 'react'
import type { ReactNode } from 'react'

interface Props { children: ReactNode; fallback: ReactNode }

export class ErrorBoundary extends Component<Props, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError() { return { failed: true } }

  render() { return this.state.failed ? this.props.fallback : this.props.children }
}
