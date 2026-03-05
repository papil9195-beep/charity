import React from 'react'
import Accordion from '../components/Accordion.jsx'

export default function FAQ() {
  const items = [
    {
      q: 'Do legitimate charities hold documents to stop people from leaving?',
      a: 'No. Reputable organizations may review documents for identification or eligibility, but they should not hold personal documents to control an adult\'s movement.',
    },
    {
      q: 'Can an organization monitor someone\'s location?',
      a: 'Only with informed consent and a clear safeguarding reason. Secret or coercive tracking is a serious warning sign and may be unlawful.',
    },
    {
      q: 'Why might someone remain in a program voluntarily?',
      a: 'People often stay because a service provides safety, shelter, counseling, or practical support. That is appropriate when the arrangement is transparent and voluntary.',
    },
    {
      q: 'What is a support plan?',
      a: 'A support plan is a clear record of agreed goals, services, and next steps. In ethical settings, it is collaborative, reviewed regularly, and never used as a punishment.',
    },
  ]

  return (
    <div className="section">
      <div className="container">
        <header className="pageHeader">
          <h1 className="h1">Frequently Asked Questions</h1>
          <p className="muted">Clear answers to common questions about safe and responsible support.</p>
        </header>

        <Accordion items={items} />
      </div>
    </div>
  )
}
