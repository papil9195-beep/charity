import React from 'react'
import { Link } from 'react-router-dom'

function isExternalLink(href) {
  return /^https?:\/\//i.test(href)
}

export default function HeroCard({ eyebrow, title, subtitle, primary, secondary }) {
  return (
    <div className="heroCard">
      <div className="heroGlow" aria-hidden="true" />
      <div className="heroInner">
        <div className="eyebrow">{eyebrow}</div>
        <h1 className="heroTitle">{title}</h1>
        <p className="heroSubtitle">{subtitle}</p>

        <div className="heroCtas">
          {isExternalLink(primary.href) ? (
            <a className="btn btnPrimary" href={primary.href}>{primary.label}</a>
          ) : (
            <Link className="btn btnPrimary" to={primary.href}>{primary.label}</Link>
          )}
          {isExternalLink(secondary.href) ? (
            <a className="btn btnSecondary" href={secondary.href}>{secondary.label}</a>
          ) : (
            <Link className="btn btnSecondary" to={secondary.href}>{secondary.label}</Link>
          )}
        </div>

        <div className="heroBadges" aria-label="Key promises">
          <span className="badge">Consent-led</span>
          <span className="badge">Privacy-aware</span>
          <span className="badge">Anti-exploitation</span>
        </div>
      </div>
    </div>
  )
}
