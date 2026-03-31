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

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <GoogleOAuthProvider clientId={clientId}>
      <ThemeProvider>
        <App />
      </ThemeProvider>
    </GoogleOAuthProvider>
  </StrictMode>,
)
