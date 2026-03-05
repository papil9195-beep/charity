import React from 'react'
import { Outlet, NavLink, Link, useLocation } from 'react-router-dom'
import Footer from './Footer.jsx'

const navItems = [
  { to: '/', label: 'Home', mobileLabel: 'Home' },
  { to: '/how-support-works', label: 'How Support Works', mobileLabel: 'Support' },
  { to: '/rights-consent', label: 'Rights & Consent', mobileLabel: 'Rights' },
  { to: '/red-flags', label: 'Red Flags', mobileLabel: 'Red Flags' },
  { to: '/faq', label: 'FAQ', mobileLabel: 'FAQ' },
  { to: '/contact', label: 'Enroll', mobileLabel: 'Enroll' },
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
            <ThemeToggle />
            <Link className="btn btnPrimary desktopOnly" to="/contact">Start Enrollment</Link>
            <button
              type="button"
              className="btn btnGhost menuToggle mobileOnly"
              aria-expanded={mobileNavOpen}
              aria-controls="primary-navigation"
              onClick={() => setMobileNavOpen((open) => !open)}
            >
              {mobileNavOpen ? 'Close' : 'Menu'}
            </button>
          </div>
        </div>

        <div className="container mobileQuickActions">
          <Link className="btn btnPrimary" to="/contact" onClick={() => setMobileNavOpen(false)}>
            Start Enrollment
          </Link>
        </div>

        <nav id="primary-navigation" className="nav" aria-label="Primary navigation">
          <div className="container navInner">
            <div className="navRow">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) => 'navLink' + (isActive ? ' active' : '')}
                  end={item.to === '/'}
                  onClick={() => setMobileNavOpen(false)}
                >
                  <span className="navLabelDesktop">{item.label}</span>
                  <span className="navLabelMobile">{item.mobileLabel}</span>
                </NavLink>
              ))}
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
