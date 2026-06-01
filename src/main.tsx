import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './i18n'
import './index.css'
import { ThemeProvider } from './contexts/ThemeContext'
import { AuthProvider } from './contexts/AuthContext'
import { Navbar } from './components/Navbar'
import { Footer } from './components/Footer'
import App from './App'
import { LoginPage } from './pages/LoginPage'
import { RegisterPage } from './pages/RegisterPage'
import { AccountPage } from './pages/AccountPage'
import { LegalPage } from './pages/LegalPage'

function Root() {
  return (
    <div className="flex flex-col min-h-screen" style={{ background: 'var(--color-outer-bg)' }}>
      <Navbar />
      <div className="flex-1">
        <Routes>
          <Route path="/"           element={<App />} />
          <Route path="/login"      element={<LoginPage />} />
          <Route path="/cadastro"   element={<RegisterPage />} />
          <Route path="/conta"      element={<AccountPage />} />
          <Route path="/privacidade" element={<LegalPage page="privacidade" />} />
          <Route path="/termos"     element={<LegalPage page="termos" />} />
          <Route path="/reembolso"  element={<LegalPage page="reembolso" />} />
        </Routes>
      </div>
      <Footer />
    </div>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <Root />
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  </StrictMode>,
)
