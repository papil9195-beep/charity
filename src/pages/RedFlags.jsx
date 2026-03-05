import React from 'react'
import InfoCard from '../components/InfoCard.jsx'

export default function RedFlags() {
  const flags = [
    { t: 'Isolation', d: 'Someone is cut off from family, friends, independent advice, or outside support.' },
    { t: 'Threats', d: 'Fear is used to pressure compliance, including warnings about punishment if the person leaves.' },
    { t: 'Document control', d: 'Personal identity documents are withheld to limit choice or force obedience.' },
    { t: 'Surveillance', d: 'A phone, location, or movements are monitored without informed consent and clear justification.' },
    { t: 'Financial coercion', d: 'Invented debts or repayment demands are used to control behavior, money, or labor.' },
    { t: 'Shame and humiliation', d: 'Embarrassment, guilt, or public pressure is used to keep the person dependent.' },
  ]

  return (
    <div className="section">
      <div className="container">
        <header className="pageHeader">
          <h1 className="h1">Warning signs of coercive or unsafe support</h1>
          <p className="muted">
            Support becomes dangerous when it is used to create fear, dependence, or control. The following behaviors
            should be treated as serious safeguarding concerns.
          </p>
        </header>

        <div className="grid3">
          {flags.map((flag) => (
            <InfoCard key={flag.t} title={flag.t} icon="!">
              <p className="muted">{flag.d}</p>
            </InfoCard>
          ))}
        </div>

        <div className="spacer" />

        <InfoCard title="What trustworthy support looks like" icon="OK">
          <ul className="list">
            <li>Policies, boundaries, and referral processes are explained clearly.</li>
            <li>Programs focus on safety, stability, skills, and long-term independence.</li>
            <li>You can ask who has access to your information and how complaints are handled.</li>
            <li>In urgent situations, contact emergency services or an established local hotline or authority.</li>
          </ul>
        </InfoCard>
      </div>
    </div>
  )
}
