import React, { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean, error: Error | null }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: '2rem',
          fontFamily: 'system-ui, sans-serif',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          backgroundColor: '#f9f9f9',
          color: '#333'
        }}>
          <div style={{ maxWidth: '600px', width: '100%' }}>
            <h1 style={{ marginBottom: '1rem', color: '#e11d48' }}>NetViz failed to load</h1>
            <p style={{ marginBottom: '1rem' }}>An unexpected error occurred preventing the application from starting.</p>
            <div style={{
              background: '#fff',
              padding: '1.5rem',
              borderRadius: '0.5rem',
              border: '1px solid #e5e7eb',
              overflow: 'auto',
              boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1)'
            }}>
              <p style={{ fontWeight: 500, marginBottom: '0.5rem' }}>Error details:</p>
              <pre style={{ fontSize: '0.875rem', color: '#666', whiteSpace: 'pre-wrap' }}>
                {this.state.error?.toString()}
              </pre>
            </div>
            <p style={{ marginTop: '1rem', fontSize: '0.875rem', color: '#666' }}>
              Please check the browser console for more technical details.
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
