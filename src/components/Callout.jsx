import React from 'react'
import { Link } from 'react-router-dom'

function isExternalLink(href) {
  return /^https?:\/\//i.test(href)
}

export default function Callout({ title, body, action }) {
  return (
    <div className="callout">
      <div className="calloutIcon" aria-hidden="true">i</div>
      <div className="calloutBody">
        <div className="calloutTitle">{title}</div>
        <div className="muted">{body}</div>
      </div>
      <div className="calloutAction">
        {isExternalLink(action.href) ? (
          <a className="btn btnSecondary" href={action.href}>{action.label}</a>
        ) : (
          <Link className="btn btnSecondary" to={action.href}>{action.label}</Link>
        )}
      </div>
    </div>
  )
}
