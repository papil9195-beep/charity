import React from 'react'
import { Outlet, NavLink, Link, useLocation } from 'react-router-dom'
import Footer from './Footer.jsx'

const navItems = [
  { to: '/', label: 'Home' },
  { to: '/how-support-works', label: 'How Support Works' },
  { to: '/rights-consent', label: 'Rights & Consent' },
  { to: '/red-flags', label: 'Red Flags' },
  { to: '/faq', label: 'FAQ' },
  { to: '/contact', label: 'Enroll' },
]

export default function Layout() {
  const location = useLocation()
  const [mobileNavOpen, setMobileNavOpen] = React.useState(false)

  React.useEffect(() => {
    setMobileNavOpen(false)
  }, [location.pathname])

  React.useEffect(() => {
    function clampHorizontalScroll() {
      if (window.scrollX !== 0) {
        window.scrollTo(0, window.scrollY)
      }
    }

    clampHorizontalScroll()
    window.addEventListener('scroll', clampHorizontalScroll, { passive: true })
    window.addEventListener('resize', clampHorizontalScroll, { passive: true })

    return () => {
      window.removeEventListener('scroll', clampHorizontalScroll)
      window.removeEventListener('resize', clampHorizontalScroll)
    }
  }, [])

  return (
    <div className="appShell">
      <a className="skipLink" href="#main-content">Skip to main content</a>

      <header className="header" data-nav-open={mobileNavOpen ? 'true' : 'false'}>
        <div className="container headerRow">
          <Link className="brand" to="/" aria-label="Samaritan's Act home">
            <img className="brandMark" src="/brand-mark.svg" alt="" aria-hidden="true" />
            <span className="brandText">
              <span className="brandName">Samaritan&apos;s Act</span>
              <span className="brandTag">Faith-Based Care and Support</span>
            </span>
          </Link>

          <div className="headerActions">
            <div className="desktopNav" aria-label="Desktop navigation">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) => 'desktopNavLink' + (isActive ? ' active' : '')}
                  end={item.to === '/'}
                >
                  {item.label}
                </NavLink>
              ))}
            </div>

            <button
              type="button"
              className="btn btnGhost menuToggle"
              aria-expanded={mobileNavOpen}
              aria-controls="primary-navigation"
              onClick={() => setMobileNavOpen((open) => !open)}
            >
              {mobileNavOpen ? 'Close' : 'Menu'}
            </button>
          </div>
        </div>

        <nav id="primary-navigation" className="nav" aria-label="Primary navigation">
          <div className="container navInner">
            <div className="menuPanel">
              <div className="menuTopRow">
                <ThemeToggle className="menuThemeBtn" />
                <Link className="btn btnPrimary menuEnrollBtn" to="/contact" onClick={() => setMobileNavOpen(false)}>
                  Start Enrollment
                </Link>
              </div>

              <div className="navRow">
                {navItems.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) => 'navLink' + (isActive ? ' active' : '')}
                    end={item.to === '/'}
                    onClick={() => setMobileNavOpen(false)}
                  >
                    {item.label}
                  </NavLink>
                ))}
              </div>
            </div>
          </div>
        </nav>
      </header>

      <main id="main-content" className="main">
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
