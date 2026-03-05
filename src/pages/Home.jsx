import React from 'react'
import EnrollmentCard from '../components/EnrollmentCard.jsx'
import FeatureGrid from '../components/FeatureGrid.jsx'
import Callout from '../components/Callout.jsx'

export default function Home() {
  return (
    <div>
      <section className="section heroSection">
        <div className="container enrollHero">
          <EnrollmentCard />

          <div className="heroCard heroInfoCard">
            <div className="heroGlow" aria-hidden="true" />
            <div className="heroInner">
              <div className="eyebrow">Community enrollment</div>
              <h1 className="heroTitle">Find a trusted charity support program serving your area.</h1>
              <p className="heroSubtitle">
                Samaritan&apos;s Act helps people begin enrollment with confidence. We present a clear starting point,
                explain what happens next, and keep the first step simple and easy to understand on mobile.
              </p>

              <div className="heroBadges" aria-label="Key assurances">
                <span className="badge">Area-based matching</span>
                <span className="badge">Simple first step</span>
                <span className="badge">Coordinator follow-up</span>
              </div>

              <div className="heroPoints">
                <div className="heroPoint">
                  <div className="heroPointTitle">Start with your name</div>
                  <p className="muted">Begin with your first, middle, and last name, then move straight into the full enrollment form.</p>
                </div>
                <div className="heroPoint">
                  <div className="heroPointTitle">Complete basic information</div>
                  <p className="muted">The next step collects your address, ZIP Code, and other required contact details in one place.</p>
                </div>
                <div className="heroPoint">
                  <div className="heroPointTitle">Receive guided next steps</div>
                  <p className="muted">If a suitable program is available, a coordinator can explain the next part of the process.</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="container">
          <div className="heroStats">
            <Stat k="Step 1" v="Start enrollment" />
            <Stat k="Step 2" v="Complete basic information" />
            <Stat k="Step 3" v="Receive program guidance" />
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <h2 className="h2">How enrollment works</h2>
          <p className="muted">
            The process is designed to be clear and mobile-friendly so visitors immediately understand how to begin.
          </p>
          <FeatureGrid />
        </div>
      </section>

      <section className="section">
        <div className="container">
          <Callout
            title="Need help before you enroll?"
            body="If you are unsure which program to select, start enrollment on the home page and use the basic information form to share the rest of your details with a coordinator."
            action={{ label: 'Open basic information', href: '/contact' }}
          />
        </div>
      </section>
    </div>
  )
}

function Stat({ k, v }) {
  return (
    <div className="stat">
      <div className="statKey">{k}</div>
      <div className="statVal">{v}</div>
    </div>
  )
}
