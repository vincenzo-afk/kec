import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('App crashed:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', padding: 24 }}>
          <div className="card" style={{ maxWidth: 560, width: '100%', textAlign: 'center' }}>
            <h2 style={{ marginBottom: 10 }}>Something went wrong</h2>
            <p className="text-sm text-muted" style={{ marginBottom: 16 }}>A runtime error occurred. You can reload and continue.</p>
            <button className="btn btn-primary" onClick={() => window.location.reload()}>Reload App</button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
