import React, { useEffect, useState } from 'react'
import { ExternalLink, FileText, X } from 'lucide-react'
import '../styles/PolicyConsent.css'

export interface PolicyDocument {
  id: string
  label: string
  title: string
  url: string
}

export const POLICY_DOCUMENTS: PolicyDocument[] = [
  {
    id: 'terms',
    label: 'Terms & Conditions',
    title: 'Remote Internship Compensation & Work Policy',
    url: '/policies/compensation-work-policy.pdf',
  },
  {
    id: 'policies',
    label: 'Office Policies',
    title: 'Updated Office Policies 2025',
    url: '/policies/office-policies-2025.pdf',
  },
]

interface PolicyConsentProps {
  accepted: Record<string, boolean>
  onAcceptedChange: (id: string, value: boolean) => void
  errors?: Record<string, string>
}

export default function PolicyConsent({
  accepted,
  onAcceptedChange,
  errors = {},
}: PolicyConsentProps) {
  const [viewing, setViewing] = useState<PolicyDocument | null>(null)

  useEffect(() => {
    if (!viewing) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setViewing(null)
    }
    document.addEventListener('keydown', onKeyDown)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = ''
    }
  }, [viewing])

  return (
    <>
      <div className="policy-consent">
        <p className="policy-consent-heading">
          <FileText size={16} />
          Review and accept before continuing
        </p>

        {POLICY_DOCUMENTS.map(doc => (
          <div key={doc.id} className={`policy-consent-item${errors[doc.id] ? ' has-error' : ''}`}>
            <label className="policy-consent-label">
              <input
                type="checkbox"
                checked={!!accepted[doc.id]}
                onChange={e => onAcceptedChange(doc.id, e.target.checked)}
              />
              <span>
                I have read and agree to the{' '}
                <button
                  type="button"
                  className="policy-view-link"
                  onClick={e => {
                    e.preventDefault()
                    setViewing(doc)
                  }}
                >
                  {doc.label}
                </button>
              </span>
            </label>
            <button
              type="button"
              className="policy-view-btn"
              onClick={() => setViewing(doc)}
            >
              View <ExternalLink size={13} />
            </button>
            {errors[doc.id] && <span className="policy-consent-error">{errors[doc.id]}</span>}
          </div>
        ))}
      </div>

      {viewing && (
        <div
          className="policy-modal-overlay"
          onClick={() => setViewing(null)}
          role="presentation"
        >
          <div
            className="policy-modal"
            onClick={e => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="policy-modal-title"
          >
            <div className="policy-modal-header">
              <div>
                <p className="policy-modal-label">{viewing.label}</p>
                <h3 id="policy-modal-title">{viewing.title}</h3>
              </div>
              <button
                type="button"
                className="policy-modal-close"
                onClick={() => setViewing(null)}
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>
            <iframe
              src={viewing.url}
              title={viewing.title}
              className="policy-modal-frame"
            />
            <div className="policy-modal-footer">
              <a href={viewing.url} target="_blank" rel="noopener noreferrer" className="policy-open-tab">
                Open in new tab <ExternalLink size={14} />
              </a>
              <button
                type="button"
                className="policy-accept-btn"
                onClick={() => {
                  onAcceptedChange(viewing.id, true)
                  setViewing(null)
                }}
              >
                I Agree
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export function allPoliciesAccepted(accepted: Record<string, boolean>): boolean {
  return POLICY_DOCUMENTS.every(doc => accepted[doc.id])
}
