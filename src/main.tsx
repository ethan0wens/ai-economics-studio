import { Component, StrictMode, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource-variable/inter';
import './styles.css';
import App from './app';

class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }

  render() {
    return this.state.failed ? <main className="padded" role="alert"><h1>The studio could not load</h1>
      <p>Reload the studio, then import an exported JSON file to recover saved work.</p>
      <button className="button" onClick={() => location.reload()}>Reload studio</button></main> : this.props.children;
  }
}

const root = createRoot(document.getElementById('root')!);
if (window.isSecureContext) {
  root.render(<StrictMode><ErrorBoundary><App /></ErrorBoundary></StrictMode>);
} else {
  const secure = new URL(location.href);
  secure.protocol = 'https:';
  root.render(<main className="padded"><h1>Open the studio over HTTPS</h1>
    <p>The studio needs a secure browser connection to create, open or export an environment.</p>
    <a className="button primary" href={secure.href}>Open HTTPS version</a></main>);
}
