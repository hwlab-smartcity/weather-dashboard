import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import LinkTree from './pages/LinkTree.jsx'
import VibeControl from './pages/VibeControl.jsx'
import useVibeRedirect from './useVibeRedirect.js'

const routerBase = import.meta.env.BASE_URL.replace(/\/$/, '') || '/'

export function GlobalMqttRedirector() {
  useVibeRedirect()
  return null
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter basename={routerBase}>
      <GlobalMqttRedirector />
      <Routes>
        <Route path="/" element={<LinkTree />} />
        <Route path="/weather" element={<App />} />
        <Route path="/vibe" element={<VibeControl />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)