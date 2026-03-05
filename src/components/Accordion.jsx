import React from 'react'

export default function Accordion({ items }) {
  const [open, setOpen] = React.useState(0)

  return (
    <div className="accordion">
      {items.map((item, index) => {
        const isOpen = open === index

        return (
          <div key={item.q} className={'accItem' + (isOpen ? ' open' : '')}>
            <button
              type="button"
              className="accBtn"
              onClick={() => setOpen(isOpen ? -1 : index)}
              aria-expanded={isOpen}
            >
              <span>{item.q}</span>
              <span className="accChevron" aria-hidden="true">{isOpen ? '-' : '+'}</span>
            </button>
            {isOpen && (
              <div className="accPanel">
                <p className="muted">{item.a}</p>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
