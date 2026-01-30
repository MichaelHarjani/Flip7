import React, { Suspense, lazy } from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import App from './App.tsx'
import LoadingSpinner from './components/LoadingSpinner.tsx'
import './index.css'

// Lazy load the auth callback page (only needed during OAuth flow)
const AuthCallback = lazy(() => import('./pages/AuthCallback.tsx'))

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route
          path="/auth/callback"
          element={
            <Suspense fallback={<div className="min-h-screen bg-gray-900 flex items-center justify-center"><LoadingSpinner message="Completing sign in..." /></div>}>
              <AuthCallback />
            </Suspense>
          }
        />
        <Route path="/:roomCode" element={<App />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
)
