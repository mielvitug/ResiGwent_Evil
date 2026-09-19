import { Component } from 'react'
import Button from './components/ui/Button'

class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('ResiGwent Evil encountered a fault:', error, info)
  }

  render() {
    if (this.state.error) {
      return (
        <main className="error-boundary" role="alert">
          <p className="eyebrow">System fault</p>
          <h1>Connection Lost</h1>
          <p>The operation terminated unexpectedly. Command has re-established the uplink.</p>
          <Button label="Return to Command Center" onClick={() => this.setState({ error: null })} />
        </main>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
