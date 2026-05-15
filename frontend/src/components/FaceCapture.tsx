import React, { useRef, useState, useCallback, useEffect } from 'react'
import { Camera, RotateCcw, Check, ChevronRight } from 'lucide-react'
import { supabase } from '../lib/supabase'

const SHOTS = [
  { key: 'front', label: 'Front', instruction: 'Look straight at the camera' },
  { key: 'left',  label: 'Left',  instruction: 'Turn your head slightly to the left' },
  { key: 'right', label: 'Right', instruction: 'Turn your head slightly to the right' },
] as const

type ShotKey = typeof SHOTS[number]['key']
export type FacePhotoUrls = Record<ShotKey, string>

interface Props {
  userId: string
  onComplete: (urls: FacePhotoUrls) => void
  onError: (msg: string) => void
}

export default function FaceCapture({ userId, onComplete, onError }: Props) {
  const videoRef  = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const [step, setCameraStep]  = useState(0)
  const [previews, setPreviews] = useState<Partial<Record<ShotKey, string>>>({})
  const [uploading, setUploading] = useState(false)
  const [ready, setReady]       = useState(false)

  useEffect(() => {
    let active = true
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'user', width: 640, height: 480 } })
      .then(stream => {
        if (!active) { stream.getTracks().forEach(t => t.stop()); return }
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          videoRef.current.onloadedmetadata = () => setReady(true)
        }
      })
      .catch(() => onError('Camera access denied. Please allow camera permissions and try again.'))
    return () => {
      active = false
      streamRef.current?.getTracks().forEach(t => t.stop())
    }
  }, [onError])

  const capture = useCallback(() => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return
    canvas.width  = video.videoWidth
    canvas.height = video.videoHeight
    canvas.getContext('2d')!.drawImage(video, 0, 0)
    const key = SHOTS[step].key
    setPreviews(p => ({ ...p, [key]: canvas.toDataURL('image/jpeg', 0.85) }))
  }, [step])

  const retake = () => {
    const key = SHOTS[step].key
    setPreviews(p => { const n = { ...p }; delete n[key]; return n })
  }

  const next = async () => {
    if (step < SHOTS.length - 1) { setCameraStep(s => s + 1); return }

    // All 3 captured — upload to Supabase Storage
    setUploading(true)
    try {
      const urls: Partial<FacePhotoUrls> = {}
      for (const shot of SHOTS) {
        const blob = await (await fetch(previews[shot.key]!)).blob()
        const path = `${userId}/${shot.key}.jpg`
        const { error } = await supabase.storage
          .from('face-photos')
          .upload(path, blob, { contentType: 'image/jpeg', upsert: true })
        if (error) throw new Error(`Upload failed (${shot.key}): ${error.message}`)
        urls[shot.key] = supabase.storage.from('face-photos').getPublicUrl(path).data.publicUrl
      }
      onComplete(urls as FacePhotoUrls)
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const current    = SHOTS[step]
  const hasCurrent = !!previews[current.key]
  const isLast     = step === SHOTS.length - 1

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* Step pills */}
      <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
        {SHOTS.map((s, i) => (
          <div key={s.key} style={{
            display: 'flex', alignItems: 'center', gap: '4px',
            padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 500,
            background: i === step ? '#3b82f6' : previews[s.key] ? '#10b981' : '#374151',
            color: '#fff',
          }}>
            {previews[s.key] && <Check size={11} />} {s.label}
          </div>
        ))}
      </div>

      <p style={{ textAlign: 'center', fontSize: '13px', color: '#9ca3af', margin: 0 }}>
        {current.instruction}
      </p>

      {/* Camera / preview */}
      <div style={{ position: 'relative', borderRadius: '10px', overflow: 'hidden', background: '#111', aspectRatio: '4/3' }}>
        <video ref={videoRef} autoPlay playsInline muted
          style={{ width: '100%', display: hasCurrent ? 'none' : 'block', transform: 'scaleX(-1)' }} />
        {hasCurrent && (
          <img src={previews[current.key]} alt="preview"
            style={{ width: '100%', display: 'block', transform: 'scaleX(-1)' }} />
        )}
        {!ready && !hasCurrent && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6b7280', fontSize: '13px' }}>
            Starting camera…
          </div>
        )}
        {/* Oval face guide */}
        {!hasCurrent && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
            <div style={{ width: '42%', aspectRatio: '3/4', border: '2px dashed rgba(59,130,246,0.55)', borderRadius: '50%' }} />
          </div>
        )}
      </div>

      <canvas ref={canvasRef} style={{ display: 'none' }} />

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: '8px' }}>
        {!hasCurrent ? (
          <button type="button" onClick={capture} disabled={!ready} style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
            padding: '10px', borderRadius: '8px', border: 'none',
            background: ready ? '#3b82f6' : '#374151', color: '#fff', fontWeight: 600, fontSize: '14px',
            cursor: ready ? 'pointer' : 'not-allowed',
          }}>
            <Camera size={16} /> Capture {current.label}
          </button>
        ) : (
          <>
            <button type="button" onClick={retake} style={{
              flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
              padding: '10px', borderRadius: '8px', border: '1px solid #374151',
              background: 'transparent', color: '#9ca3af', fontSize: '14px', cursor: 'pointer',
            }}>
              <RotateCcw size={14} /> Retake
            </button>
            <button type="button" onClick={next} disabled={uploading} style={{
              flex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
              padding: '10px', borderRadius: '8px', border: 'none',
              background: uploading ? '#374151' : isLast ? '#10b981' : '#3b82f6',
              color: '#fff', fontWeight: 600, fontSize: '14px',
              cursor: uploading ? 'not-allowed' : 'pointer',
            }}>
              {uploading ? 'Uploading…' : isLast ? <><Check size={16} /> Save Photos</> : <>Next <ChevronRight size={16} /></>}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
