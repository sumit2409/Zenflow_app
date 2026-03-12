import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './styles/theme.css'
import { initAnalytics } from './utils/analytics'

initAnalytics()

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
