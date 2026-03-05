import React from 'react'
import { Link } from 'react-router-dom'

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container footerRow">
        <div className="footerLeft">
          <div className="footerBrand">
            <img className="brandMark small" src="/brand-mark.svg" alt="" aria-hidden="true" />
            <div>
              <div className="footerTitle">Samaritan&apos;s Act</div>
              <div className="footerSub">Faith-Based Care and Support</div>
            </div>
          </div>

          <p className="footerNote">
            This website provides general information about support services and safeguarding. If someone may be in
            immediate danger, contact emergency services or a qualified local support organization.
          </p>
        </div>

        <div className="footerRight">
          <div className="footerLinks">
            <Link to="/rights-consent">Rights & Consent</Link>
            <Link to="/red-flags">Red Flags</Link>
            <Link to="/faq">FAQ</Link>
            <Link to="/contact">Contact</Link>
          </div>

          <div className="footerMeta">
            <span>Copyright {new Date().getFullYear()} Samaritan&apos;s Act</span>
            <span className="dot">|</span>
            <span>Faith, dignity, and practical care</span>
          </div>
        </div>
      </div>
    </footer>
  )
}
