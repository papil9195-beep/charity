import React from 'react'
import { Outlet, NavLink, Link, useLocation } from 'react-router-dom'
import Footer from './Footer.jsx'

const navItems = [
  { to: '/', label: 'Home', mobileLabel: 'Home' },
  { to: '/how-support-works', label: 'How Support Works', mobileLabel: 'Support' },
  { to: '/rights-consent', label: 'Rights & Consent', mobileLabel: 'Rights' },
  { to: '/red-flags', label: 'Red Flags', mobileLabel: 'Warnings' },
  { to: '/faq', label: 'FAQ', mobileLabel: 'FAQ' },
  { to: '/contact', label: 'Enroll', mobileLabel: 'Enroll' },
]

export default function Layout() {
  const location = useLocation()
  const [isNavOpen, setIsNavOpen] = React.useState(false)

  React.useEffect(() => {
    setIsNavOpen(false)
  }, [location.pathname])

  return (
    <div className="appShell">
      <header className="header">
        <div className="container headerRow">
          <Link className="brand" to="/" aria-label="Samaritan's Act home">
            <img className="brandMark" src="/brand-mark.svg" alt="" aria-hidden="true" />
            <span className="brandText">
              <span className="brandName">Samaritan&apos;s Act</span>
              <span className="brandTag">Faith-Based Care and Support</span>
            </span>
          </Link>

          <div className="headerActions">
            <ThemeToggle className="desktopOnly" />
            <Link className="btn btnPrimary desktopOnly" to="/contact">Start Enrollment</Link>
            <button
              type="button"
              className="btn btnGhost menuToggle"
              onClick={() => setIsNavOpen((open) => !open)}
              aria-expanded={isNavOpen}
              aria-controls="site-nav"
            >
              {isNavOpen ? 'Close' : 'Menu'}
            </button>
          </div>
        </div>

        <nav id="site-nav" className={'nav' + (isNavOpen ? ' isOpen' : '')}>
          <div className="container navInner">
            <div className="mobileQuickActions mobileOnly">
              <Link className="btn btnPrimary navAction" to="/contact" onClick={() => setIsNavOpen(false)}>
                Start Enrollment
              </Link>
              <ThemeToggle className="navAction" />
            </div>

            <div className="navRow">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) => 'navLink' + (isActive ? ' active' : '')}
                  end={item.to === '/'}
                  onClick={() => setIsNavOpen(false)}
                >
                  <span className="navLabelDesktop">{item.label}</span>
                  <span className="navLabelMobile">{item.mobileLabel}</span>
                </NavLink>
              ))}
            </div>
          </div>
        </nav>
      </header>

      <main className="main">
        <Outlet />
      </main>

      <Footer />
    </div>
  )
}

function ThemeToggle({ className = '' }) {
  const [mode, setMode] = React.useState(() => {
    return localStorage.getItem('ea_theme') || 'light'
  })

  React.useEffect(() => {
    document.documentElement.dataset.theme = mode
    localStorage.setItem('ea_theme', mode)
  }, [mode])

  return (
    <button
      type="button"
      className={`btn btnGhost${className ? ` ${className}` : ''}`}
      onClick={() => setMode((m) => (m === 'light' ? 'dark' : 'light'))}
      aria-label="Toggle theme"
      title="Toggle theme"
    >
      {mode === 'light' ? 'Dark' : 'Light'}
    </button>
  )
}
