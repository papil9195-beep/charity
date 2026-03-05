import React from 'react'
import InfoCard from '../components/InfoCard.jsx'
import Callout from '../components/Callout.jsx'

export default function RightsConsent() {
  return (
    <div className="section">
      <div className="container">
        <header className="pageHeader">
          <h1 className="h1">Rights, consent, and confidentiality</h1>
          <p className="muted">
            Genuine support strengthens personal choice. Consent should be informed, voluntary, and reviewed whenever
            circumstances change.
          </p>
        </header>

        <div className="grid2">
          <InfoCard title="Core rights in any support setting" icon="01">
            <ul className="list">
              <li><b>Freedom to leave:</b> adults should generally be able to exit a program at any time.</li>
              <li><b>Clear explanations:</b> you should understand what is being offered and what is being signed.</li>
              <li><b>Privacy and confidentiality:</b> personal information should be limited, protected, and shared appropriately.</li>
              <li><b>Respectful treatment:</b> no threats, humiliation, or punitive control.</li>
            </ul>
          </InfoCard>

          <InfoCard title="Responsible information practices" icon="02">
            <ul className="list">
              <li>Collect only the information needed for care, safety, and service delivery.</li>
              <li>Explain how records are stored, used, and protected.</li>
              <li>Obtain permission before sharing information with other agencies, unless required by law.</li>
              <li>Provide a clear process for correcting inaccurate records.</li>
            </ul>
          </InfoCard>
        </div>

        <div className="spacer" />

        <Callout
          title="A clear safeguarding reminder"
          body="Tracking someone's movements, restricting their freedom, or using intimidation is not standard care. Trustworthy organizations retain people through safety, quality service, and respect for personal choice."
          action={{ label: 'Review warning signs', href: '/red-flags' }}
        />
      </div>
    </div>
  )
}
