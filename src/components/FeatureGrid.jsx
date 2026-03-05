import React from 'react'
import InfoCard from './InfoCard.jsx'

export default function FeatureGrid() {
  const steps = [
    {
      title: 'Start enrollment',
      icon: '1',
      body: 'Enter your name and email to begin, then move directly into the full enrollment request.',
    },
    {
      title: 'Complete basic information',
      icon: '2',
      body: 'Finish your address, ZIP Code, and required contact details in the first step of the enrollment form.',
    },
    {
      title: 'Choose assistance',
      icon: '3',
      body: 'Select the charity assistance you need so only the matching intake section appears.',
    },
    {
      title: 'Receive follow-up',
      icon: '4',
      body: 'A coordinator reviews your request, explains next steps, and outlines any supporting documents you may need.',
    },
  ]

  return (
    <div className="grid2">
      {steps.map((step) => (
        <InfoCard key={step.title} title={step.title} icon={step.icon}>
          <p className="muted">{step.body}</p>
        </InfoCard>
      ))}
    </div>
  )
}
