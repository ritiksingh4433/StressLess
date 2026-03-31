// Polyfill performance API for Recharts compatibility
if (typeof window !== 'undefined' && window.performance) {
  if (!window.performance.clearMarks) {
    window.performance.clearMarks = () => {};
  }
  if (!window.performance.mark) {
    window.performance.mark = () => {};
  }
  if (!window.performance.measure) {
    window.performance.measure = () => {};
  }
  if (!window.performance.clearMeasures) {
    window.performance.clearMeasures = () => {};
  }
}

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { GoogleOAuthProvider } from '@react-oauth/google'
import { ThemeProvider } from './context/ThemeContext'
import './index.css'
import App from './App.jsx'

const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const appTree = (
  <ThemeProvider>
    <App />
  </ThemeProvider>
);

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {clientId ? (
      <GoogleOAuthProvider clientId={clientId}>
        {appTree}
      </GoogleOAuthProvider>
    ) : (
      appTree
    )}
  </StrictMode>,
)
