import { Component } from 'react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  render() {
    if (!this.state.error) return this.props.children

    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-950 px-6">
        <div className="max-w-md w-full pixel-ui text-center space-y-4">
          <h1 className="text-base font-bold text-red-400 uppercase tracking-wider">Something went wrong</h1>
          <p className="text-[10px] text-stone-400 leading-relaxed">
            {String(this.state.error?.message || 'An unexpected error occurred.')}
          </p>
          <button
            type="button"
            className="pixel-btn-primary"
            onClick={() => {
              this.setState({ error: null })
              window.location.reload()
            }}
          >
            Restart
          </button>
        </div>
      </div>
    )
  }
}
