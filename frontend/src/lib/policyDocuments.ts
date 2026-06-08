import { api } from './api'

export type PolicyId = 'terms' | 'policies'

export interface PolicyDocument {
  id: PolicyId
  label: string
  title: string
  url: string
  fileName?: string
  updatedAt?: string
}

export const DEFAULT_POLICY_DOCUMENTS: PolicyDocument[] = [
  {
    id: 'terms',
    label: 'Terms & Conditions',
    title: 'Remote Internship Compensation & Work Policy',
    url: '/policies/compensation-work-policy.pdf',
    fileName: 'compensation-work-policy.pdf',
  },
  {
    id: 'policies',
    label: 'Office Policies',
    title: 'Updated Office Policies 2025',
    url: '/policies/office-policies-2025.pdf',
    fileName: 'office-policies-2025.pdf',
  },
]

interface PolicyApiRow {
  id: string
  label: string
  title: string
  url: string
  file_name?: string | null
  updated_at?: string | null
}

function rowToDocument(row: PolicyApiRow): PolicyDocument {
  const fallback = DEFAULT_POLICY_DOCUMENTS.find(d => d.id === row.id)
  return {
    id: row.id as PolicyId,
    label: row.label,
    title: row.title,
    url: row.url || fallback?.url || '#',
    fileName: row.file_name || fallback?.fileName,
    updatedAt: row.updated_at || undefined,
  }
}

export async function fetchPolicyDocuments(): Promise<PolicyDocument[]> {
  try {
    const data = await api.getPublic<PolicyApiRow[]>(`/policies/?_=${Date.now()}`)
    if (!data?.length) {
      return DEFAULT_POLICY_DOCUMENTS
    }
    return data.map(rowToDocument)
  } catch (err) {
    console.warn('Failed to load policies from API, using defaults:', err)
    return DEFAULT_POLICY_DOCUMENTS
  }
}

export async function uploadPolicyDocument(
  id: PolicyId,
  file: File,
  meta?: { label?: string; title?: string },
): Promise<PolicyDocument> {
  if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
    throw new Error('Only PDF files are allowed')
  }
  if (file.size > 15 * 1024 * 1024) {
    throw new Error('PDF must be under 15MB')
  }

  const formData = new FormData()
  formData.append('file', file)
  if (meta?.label) formData.append('label', meta.label.trim())
  if (meta?.title) formData.append('title', meta.title.trim())

  const row = await api.uploadFile<PolicyApiRow>(`/policies/${id}/upload`, formData)
  return rowToDocument(row)
}

export async function savePolicyMetadata(
  id: PolicyId,
  label: string,
  title: string,
): Promise<PolicyDocument> {
  const row = await api.patch<PolicyApiRow>(`/policies/${id}`, {
    label: label.trim(),
    title: title.trim(),
  })
  return rowToDocument(row)
}

export function allPoliciesAccepted(
  accepted: Record<string, boolean>,
  documents: PolicyDocument[] = DEFAULT_POLICY_DOCUMENTS,
): boolean {
  const docs = documents.length ? documents : DEFAULT_POLICY_DOCUMENTS
  return docs.every(doc => accepted[doc.id])
}
