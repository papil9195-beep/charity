import React from 'react'

export default function InfoCard({ title, icon, children }) {
  return (
    <section className="card">
      <div className="cardHeader">
        <div className="cardIcon" aria-hidden="true">{icon}</div>
        <h3 className="cardTitle">{title}</h3>
      </div>
      <div className="cardBody">{children}</div>
    </section>
  )
}
