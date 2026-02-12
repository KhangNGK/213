import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { AuthProvider } from './contexts/AuthContext';

function mount() {
  const rootElement = document.getElementById('root');
  if (!rootElement) {
    console.error("Failed to find #root element");
    document.body.innerHTML = '<div style="color:red; padding: 20px;">Critical Error: Root element not found. Please refresh.</div>';
    return;
  }

  try {
    const root = ReactDOM.createRoot(rootElement);
    root.render(
      <React.StrictMode>
        <AuthProvider>
          <App />
        </AuthProvider>
      </React.StrictMode>
    );
  } catch (err) {
    console.error("Render error:", err);
    rootElement.innerHTML = `<div style="color:white; padding:20px;">Application crashed. Check console for details.<br/>${err}</div>`;
  }
}

// Ensure DOM is ready before mounting
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', mount);
} else {
  mount();
}