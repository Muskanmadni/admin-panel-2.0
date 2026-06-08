import React, { useEffect, useRef, useState } from 'react'
import { ExternalLink, FileText, Upload, Check, AlertCircle } from 'lucide-react'
import {
  DEFAULT_POLICY_DOCUMENTS,
  fetchPolicyDocuments,
  savePolicyMetadata,
  uploadPolicyDocument,
  type PolicyDocument,
  type PolicyId,
} from '../lib/policyDocuments'

interface PolicyDraft {
  label: string
  title: string
}

const AUTO_SAVE_MS = 900

export default function PolicySettingsSection() {
  const fileInputs = useRef<Record<PolicyId, HTMLInputElement | null>>({
    terms: null,
    policies: null,
  })
  const saveTimers = useRef<Partial<Record<PolicyId, ReturnType<typeof setTimeout>>>>({})
  const readyForAutoSave = useRef(false)
  const lastSaved = useRef<Record<PolicyId, PolicyDraft>>({
    terms: { label: '', title: '' },
    policies: { label: '', title: '' },
  })

  const [documents, setDocuments] = useState<PolicyDocument[]>(DEFAULT_POLICY_DOCUMENTS)
  const [drafts, setDrafts] = useState<Record<PolicyId, PolicyDraft>>({
    terms: { label: '', title: '' },
    policies: { label: '', title: '' },
  })
  const [loading, setLoading] = useState(true)
  const [uploadingId, setUploadingId] = useState<PolicyId | null>(null)
  const [savingId, setSavingId] = useState<PolicyId | null>(null)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    fetchPolicyDocuments()
      .then(docs => {
        setDocuments(docs)
        const nextDrafts = {
          terms: {
            label: docs.find(d => d.id === 'terms')?.label || '',
            title: docs.find(d => d.id === 'terms')?.title || '',
          },
          policies: {
            label: docs.find(d => d.id === 'policies')?.label || '',
            title: docs.find(d => d.id === 'policies')?.title || '',
          },
        }
        setDrafts(nextDrafts)
        lastSaved.current = nextDrafts
      })
      .finally(() => {
        setLoading(false)
        readyForAutoSave.current = true
      })
  }, [])

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text })
    setTimeout(() => setMessage(null), 3500)
  }

  const persistMetadata = async (id: PolicyId, showSuccess = true) => {
    const draft = drafts[id]
    const saved = lastSaved.current[id]
    if (draft.label === saved.label && draft.title === saved.title) return

    if (!draft.label.trim() || !draft.title.trim()) {
      showMessage('error', 'Display label and document title cannot be empty.')
      return
    }

    setSavingId(id)
    try {
      const updated = await savePolicyMetadata(id, draft.label, draft.title)
      setDocuments(prev => prev.map(doc => (doc.id === id ? updated : doc)))
      lastSaved.current[id] = {
        label: updated.label,
        title: updated.title,
      }
      if (showSuccess) {
        showMessage('success', 'Saved. Signup page will show the updated title.')
      }
    } catch (err) {
      showMessage('error', err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSavingId(null)
    }
  }

  const queueAutoSave = (id: PolicyId) => {
    if (!readyForAutoSave.current) return
    if (saveTimers.current[id]) clearTimeout(saveTimers.current[id])
    saveTimers.current[id] = setTimeout(() => {
      void persistMetadata(id, true)
    }, AUTO_SAVE_MS)
  }

  const handleDraftChange = (id: PolicyId, field: keyof PolicyDraft, value: string) => {
    setDrafts(prev => ({
      ...prev,
      [id]: { ...prev[id], [field]: value },
    }))
    queueAutoSave(id)
  }

  const handleUpload = async (id: PolicyId, file: File) => {
    if (saveTimers.current[id]) clearTimeout(saveTimers.current[id])
    setUploadingId(id)
    try {
      const updated = await uploadPolicyDocument(id, file, drafts[id])
      setDocuments(prev => prev.map(doc => (doc.id === id ? updated : doc)))
      lastSaved.current[id] = { label: updated.label, title: updated.title }
      setDrafts(prev => ({
        ...prev,
        [id]: { label: updated.label, title: updated.title },
      }))
      showMessage('success', `${updated.label} PDF updated. Signup page will use the new file.`)
    } catch (err) {
      showMessage('error', err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploadingId(null)
    }
  }

  if (loading) {
    return (
      <div className="dash-card sett-card sett-card-full">
        <p className="sett-desc">Loading policy documents...</p>
      </div>
    )
  }

  return (
    <div className="sett-grid">
      <div className="dash-card sett-card sett-card-full">
        <h3 className="sett-section-title"><FileText size={16} /> Signup Policies & Terms</h3>
        <p className="sett-desc">
          Upload PDF files and edit how they appear on the signup page. Title and label save automatically.
        </p>

        {message && (
          <div className={`sett-policy-alert ${message.type}`}>
            <AlertCircle size={15} />
            {message.text}
          </div>
        )}

        <div className="sett-policy-list">
          {documents.map(doc => (
            <div key={doc.id} className="sett-policy-item">
              <div className="sett-policy-item-head">
                <div>
                  <p className="sett-policy-type">{drafts[doc.id].label || doc.label}</p>
                  <h4>{drafts[doc.id].title || doc.title}</h4>
                  <p className="sett-policy-preview-note">Preview of signup display</p>
                </div>
                <a
                  href={doc.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="sett-policy-preview"
                >
                  Preview PDF <ExternalLink size={13} />
                </a>
              </div>

              <div className="sett-fields">
                <div className="sett-field">
                  <label>Signup link text</label>
                  <input
                    type="text"
                    value={drafts[doc.id].label}
                    onChange={e => handleDraftChange(doc.id, 'label', e.target.value)}
                    onBlur={() => void persistMetadata(doc.id, false)}
                    placeholder="Terms & Conditions"
                  />
                  <span className="sett-hint">Shown in the checkbox: &quot;I agree to the [this text]&quot;</span>
                </div>
                <div className="sett-field">
                  <label>Title in viewer</label>
                  <input
                    type="text"
                    value={drafts[doc.id].title}
                    onChange={e => handleDraftChange(doc.id, 'title', e.target.value)}
                    onBlur={() => void persistMetadata(doc.id, false)}
                    placeholder="Policy document title"
                  />
                  <span className="sett-hint">Shown as the heading when the employee opens the PDF</span>
                </div>
              </div>

              <div className="sett-policy-file-meta">
                <span>
                  Current file: <strong>{doc.fileName || 'Default PDF'}</strong>
                </span>
                {doc.updatedAt && (
                  <span>Updated: {new Date(doc.updatedAt).toLocaleString()}</span>
                )}
                {savingId === doc.id && <span>Saving...</span>}
              </div>

              <div className="sett-policy-actions">
                <button
                  type="button"
                  className="sett-upload-btn"
                  disabled={uploadingId === doc.id}
                  onClick={() => fileInputs.current[doc.id]?.click()}
                >
                  <Upload size={14} />
                  {uploadingId === doc.id ? 'Uploading...' : 'Replace PDF'}
                </button>
                <input
                  ref={el => { fileInputs.current[doc.id] = el }}
                  type="file"
                  accept="application/pdf,.pdf"
                  style={{ display: 'none' }}
                  onChange={e => {
                    const file = e.target.files?.[0]
                    if (file) handleUpload(doc.id, file)
                    e.target.value = ''
                  }}
                />
                <button
                  type="button"
                  className="sett-policy-save-btn"
                  disabled={savingId === doc.id}
                  onClick={() => void persistMetadata(doc.id, true)}
                >
                  {savingId === doc.id ? 'Saving...' : <><Check size={14} /> Save Now</>}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
