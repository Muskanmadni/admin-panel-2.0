import React, { useEffect, useState } from 'react'
import { ExternalLink, FileText, X } from 'lucide-react'
import {
  DEFAULT_POLICY_DOCUMENTS,
  fetchPolicyDocuments,
  type PolicyDocument,
} from '../lib/policyDocuments'
import '../styles/PolicyConsent.css'

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
  const [documents, setDocuments] = useState<PolicyDocument[]>(DEFAULT_POLICY_DOCUMENTS)
  const [loading, setLoading] = useState(true)
  const [viewing, setViewing] = useState<PolicyDocument | null>(null)

  const loadDocuments = () => fetchPolicyDocuments().then(setDocuments)

  useEffect(() => {
    loadDocuments().finally(() => setLoading(false))
  }, [])

  const openViewer = async (doc: PolicyDocument) => {
    const fresh = await fetchPolicyDocuments()
    setDocuments(fresh)
    setViewing(fresh.find(d => d.id === doc.id) || doc)
  }

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

  if (loading) {
    return (
      <div className="policy-consent">
        <p className="policy-consent-heading">
          <FileText size={16} />
          Loading policies...
        </p>
      </div>
    )
  }

  return (
    <>
      <div className="policy-consent">
        <p className="policy-consent-heading">
          <FileText size={16} />
          Review and accept before continuing
        </p>

        {documents.map(doc => (
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
                    void openViewer(doc)
                  }}
                >
                  {doc.label}
                </button>
              </span>
            </label>
            <button
              type="button"
              className="policy-view-btn"
              onClick={() => void openViewer(doc)}
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
