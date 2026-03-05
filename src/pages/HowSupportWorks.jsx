import React from 'react'
import { Link } from 'react-router-dom'
import InfoCard from '../components/InfoCard.jsx'

export default function HowSupportWorks() {
  return (
    <div className="section">
      <div className="container">
        <header className="pageHeader">
          <h1 className="h1">How responsible support services operate</h1>
          <p className="muted">
            Professional support programs prioritize safety, eligibility, continuity of care, and clear
            documentation. Information is gathered to coordinate services responsibly and protect the people being
            served.
          </p>
        </header>

        <div className="grid2">
          <InfoCard title="Why information is requested" icon="01">
            <ul className="list">
              <li><b>Safety and wellbeing:</b> details about health risks, allergies, or emergency contacts can prevent harm.</li>
              <li><b>Eligibility and funding:</b> some services require records to confirm qualification for support.</li>
              <li><b>Continuity of care:</b> notes help staff coordinate housing, health, training, or follow-up services.</li>
              <li><b>Service integrity:</b> documentation helps prevent duplication, error, and misuse.</li>
            </ul>
          </InfoCard>

          <InfoCard title="Common records and their purpose" icon="02">
            <ul className="list">
              <li><b>Identification (when available):</b> confirms identity when a service requires it.</li>
              <li><b>Intake assessment:</b> records needs, circumstances, and the support requested.</li>
              <li><b>Consent forms:</b> confirm when information may be shared with partner services.</li>
              <li><b>Support plan:</b> outlines agreed goals, next steps, and review points.</li>
            </ul>
          </InfoCard>
        </div>

        <div className="spacer" />

        <InfoCard title="What is not acceptable" icon="03">
          <p className="muted">
            The following practices are not part of ethical care:
          </p>
          <ul className="list">
            <li>Keeping original identity documents to force compliance.</li>
            <li>Threatening consequences if someone chooses to leave.</li>
            <li>Monitoring a phone or location without informed consent.</li>
            <li>Cutting a person off from family, friends, or independent advice.</li>
          </ul>
          <p className="muted">
            If you see these patterns, review the <Link to="/red-flags">Red Flags</Link> page.
          </p>
        </InfoCard>
      </div>
    </div>
  )
}
