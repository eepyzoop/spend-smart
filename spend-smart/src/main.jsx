import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Analytics } from '@vercel/analytics/react'
import './index.css'
import Signup from './Signup.jsx'
import Login from './Login.jsx'
import Dashboard from './Dashboard.jsx'
import History from './History.jsx'
import Settings from './Settings.jsx'
import Profile from './Profile.jsx'
import WallOfLove from './WallOfLove.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <Analytics />
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/history" element={<History />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/wall" element={<WallOfLove />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
