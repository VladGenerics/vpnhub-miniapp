import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { AppStoreProvider } from './store/AppStore'
import { ToastProvider } from './components/Toast'
import { initTelegram } from './lib/telegram'
import './styles/global.css'
import './styles/palettes.css'

initTelegram()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AppStoreProvider>
        <ToastProvider>
          <App />
        </ToastProvider>
      </AppStoreProvider>
    </BrowserRouter>
  </StrictMode>,
)
