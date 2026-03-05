import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout.jsx'

import Home from './pages/Home.jsx'
import HowSupportWorks from './pages/HowSupportWorks.jsx'
import RightsConsent from './pages/RightsConsent.jsx'
import RedFlags from './pages/RedFlags.jsx'
import FAQ from './pages/FAQ.jsx'
import Contact from './pages/Contact.jsx'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/how-support-works" element={<HowSupportWorks />} />
        <Route path="/rights-consent" element={<RightsConsent />} />
        <Route path="/red-flags" element={<RedFlags />} />
        <Route path="/faq" element={<FAQ />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
