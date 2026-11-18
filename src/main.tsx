import { Component, StrictMode, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource-variable/inter';
import './styles.css';
import App from './app';

class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }

  render() {
    return this.state.failed ? <main className="padded" role="alert"><h1>The studio encountered an error</h1>
      <p>Reload the app to open a fresh workspace. You can restore a previously exported JSON file.</p>
      <button className="button" onClick={() => location.reload()}>Reload studio</button></main> : this.props.children;
  }
}

createRoot(document.getElementById('root')!).render(<StrictMode><ErrorBoundary><App /></ErrorBoundary></StrictMode>);
