import React from 'react'
import { useNavigate } from 'react-router-dom'

function sanitizeNameValue(value) {
  return value.replace(/[^A-Za-z\s'-]/g, '').replace(/\s{2,}/g, ' ')
}

export default function EnrollmentCard() {
  const navigate = useNavigate()
  const [form, setForm] = React.useState({
    firstName: '',
    middleName: '',
    lastName: '',
    email: '',
  })

  function updateField(field, value) {
    const nextValue = field === 'email' ? value : sanitizeNameValue(value)
    setForm((current) => ({ ...current, [field]: nextValue }))
  }

  const emailIsValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())
  const requiredFieldsRemaining = [
    form.firstName.trim() !== '',
    form.lastName.trim() !== '',
    emailIsValid,
  ].filter((complete) => !complete).length
  const canStartEnrollment = requiredFieldsRemaining === 0
  const progressMessage = canStartEnrollment
    ? 'Required fields are complete. Middle name is optional.'
    : `Complete ${requiredFieldsRemaining} more required ${requiredFieldsRemaining === 1 ? 'field' : 'fields'} to continue. Middle name is optional.`

  function onSubmit(e) {
    e.preventDefault()
    if (!canStartEnrollment) return

    navigate('/contact', {
      state: {
        firstName: form.firstName.trim(),
        middleName: form.middleName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim(),
      },
    })
  }

  return (
    <section className="enrollPanel">
      <div className="enrollStepBar" aria-label="Enrollment steps">
        <span className="stepDot active" />
        <span className="stepLine" />
        <span className="stepDot" />
        <span className="stepLine" />
        <span className="stepDot" />
      </div>

      <div className="eyebrow">Enrollment starts here</div>
      <h2 className="enrollTitle">Start your enrollment request.</h2>
      <p className="enrollLead">
        Enter your name and email here, then continue to the Basic Information form to finish the required details.
      </p>
      <div className="miniCard" aria-label="United States only notice">
        <div className="miniTitle">U.S. Applicants Only</div>
        <div className="muted">
          Enrollment is currently limited to applicants living in the United States, using a valid U.S. address,
          ZIP Code, and other required U.S. eligibility details.
        </div>
      </div>

      <form className="form" onSubmit={onSubmit}>
        <div className="fieldGrid3">
          <label className="label">
            First Name
            <input
              className="input"
              placeholder="First name"
              value={form.firstName}
              onChange={(e) => updateField('firstName', e.target.value)}
            />
          </label>

          <label className="label">
            Middle Name
            <input
              className="input"
              placeholder="Middle name"
              value={form.middleName}
              onChange={(e) => updateField('middleName', e.target.value)}
            />
          </label>

          <label className="label">
            Last Name
            <input
              className="input"
              placeholder="Last name"
              value={form.lastName}
              onChange={(e) => updateField('lastName', e.target.value)}
            />
          </label>
        </div>

        <label className="label">
          Email Address
          <input
            className="input"
            type="email"
            placeholder="you@example.com"
            value={form.email}
            onChange={(e) => updateField('email', e.target.value)}
          />
        </label>

        <p className="fieldHint">You will enter your address, ZIP Code, and assistance details on the next page.</p>

        <button className="btn btnPrimary enrollBtn" type="submit" disabled={!canStartEnrollment}>
          Start Enrollment
        </button>

        <p className="fieldHint" aria-live="polite">{progressMessage}</p>
      </form>
    </section>
  )
}
