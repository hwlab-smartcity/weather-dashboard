import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import VibeControl from './pages/VibeControl.jsx'
import useVibeRedirect from './useVibeRedirect.js'

function GlobalMqttRedirector() {
  useVibeRedirect()
  return null
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <GlobalMqttRedirector />
      <Routes>
        <Route path="weather/" element={<App />} />
        <Route path="/vibe" element={<VibeControl />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)