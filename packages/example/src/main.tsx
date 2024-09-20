import React from 'react'
import ReactDOM from 'react-dom/client'
import { createClient } from 'electron-brige-ipc/electron-sandbox'
import App from './App.tsx'
import './index.css'

await createClient()
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
