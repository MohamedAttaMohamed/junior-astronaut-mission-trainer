import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { getAvatarDefinition } from '../../pages/__stubs__/avatarAdapter'
import { AvatarPreview } from './AvatarPreview'

interface CustomCharacterModalProps {
  currentPhoto: string | null
  onSave: (photoDataUrl: string) => void
  onClear: () => void
  onClose: () => void
}

export function CustomCharacterModal({
  currentPhoto,
  onSave,
  onClear,
  onClose,
}: CustomCharacterModalProps) {
  const [activeTab, setActiveTab] = useState<'camera' | 'upload'>('camera')
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(currentPhoto)
  const [isCapturing, setIsCapturing] = useState(false)

  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Start webcam when camera tab is active
  useEffect(() => {
    let currentStream: MediaStream | null = null

    if (activeTab === 'camera' && !isCapturing) {
      navigator.mediaDevices?.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 640 },
          height: { ideal: 640 },
        },
      })
        .then((mediaStream) => {
          currentStream = mediaStream
          setStream(mediaStream)
          setCameraError(null)
          if (videoRef.current) {
            videoRef.current.srcObject = mediaStream
            videoRef.current.play().catch(() => {})
          }
        })
        .catch((err) => {
          console.warn('Camera access error:', err)
          setCameraError(
            'Unable to access camera. Please check browser permissions or use the Upload Photo tab.'
          )
        })
    }

    return () => {
      if (currentStream) {
        currentStream.getTracks().forEach((track) => track.stop())
      }
    }
  }, [activeTab, isCapturing])

  // Stop camera stream when component unmounts
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop())
      }
    }
  }, [stream])

  const handleSnapPhoto = () => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return

    const size = Math.min(video.videoWidth || 480, video.videoHeight || 480)
    canvas.width = 320
    canvas.height = 320
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Center crop square and mirror horizontal for natural selfie feel
    const startX = ((video.videoWidth || 480) - size) / 2
    const startY = ((video.videoHeight || 480) - size) / 2

    ctx.translate(canvas.width, 0)
    ctx.scale(-1, 1)
    ctx.drawImage(video, startX, startY, size, size, 0, 0, canvas.width, canvas.height)

    const dataUrl = canvas.toDataURL('image/jpeg', 0.85)
    setPreviewPhoto(dataUrl)
    setIsCapturing(true)

    // Stop camera track after capture
    if (stream) {
      stream.getTracks().forEach((track) => track.stop())
      setStream(null)
    }
  }

  const handleRetake = () => {
    setIsCapturing(false)
    setPreviewPhoto(currentPhoto)
  }

  const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setPreviewPhoto(reader.result)
        setIsCapturing(true)
      }
    }
    reader.readAsDataURL(file)
  }

  const handleConfirm = () => {
    if (previewPhoto) {
      onSave(previewPhoto)
      onClose()
    }
  }

  const customAvatarDef = getAvatarDefinition('avatar-custom')

  return (
    <div className="custom-character-modal-backdrop" role="presentation">
      <div
        className="custom-character-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="custom-modal-title"
      >
        <button
          type="button"
          className="custom-character-modal__close"
          onClick={onClose}
          aria-label="Close modal"
        >
          ×
        </button>

        <header className="custom-character-modal__header">
          <span className="eyebrow">MISSION CONTROL · CADET SUIT FITTER</span>
          <h2 id="custom-modal-title">Customize Your Astronaut Face</h2>
          <p>
            Put yourself in the spacesuit! Take a quick photo with your camera or upload a picture
            to wear it on your astronaut’s visor during Mars missions.
          </p>
        </header>

        <div className="custom-character-modal__body">
          {/* Left: Camera / Upload Controls */}
          <div className="custom-character-modal__source">
            <div className="custom-character-tabs" role="tablist">
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'camera'}
                className={`custom-tab-btn ${activeTab === 'camera' ? 'custom-tab-btn--active' : ''}`}
                onClick={() => {
                  setActiveTab('camera')
                  setIsCapturing(false)
                }}
              >
                📷 Open Camera
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'upload'}
                className={`custom-tab-btn ${activeTab === 'upload' ? 'custom-tab-btn--active' : ''}`}
                onClick={() => setActiveTab('upload')}
              >
                📁 Upload Photo
              </button>
            </div>

            {activeTab === 'camera' && (
              <div className="camera-viewport-card">
                {!isCapturing ? (
                  <>
                    {cameraError ? (
                      <div className="camera-error-box">
                        <p>{cameraError}</p>
                        <button
                          type="button"
                          className="secondary-button"
                          onClick={() => setActiveTab('upload')}
                        >
                          Switch to Photo Upload
                        </button>
                      </div>
                    ) : (
                      <div className="camera-live-wrap">
                        <video
                          ref={videoRef}
                          playsInline
                          autoPlay
                          muted
                          className="camera-video-feed"
                        />
                        <div className="camera-face-guide">
                          <span className="face-oval-guide" />
                          <small>Align face inside helmet guide</small>
                        </div>
                      </div>
                    )}
                    <button
                      type="button"
                      className="primary-button snap-btn"
                      disabled={Boolean(cameraError)}
                      onClick={handleSnapPhoto}
                    >
                      📸 Snap Photo
                    </button>
                  </>
                ) : (
                  <div className="camera-snap-preview">
                    <img src={previewPhoto!} alt="Snapped face" className="snapped-img" />
                    <div className="snap-actions">
                      <button type="button" className="secondary-button" onClick={handleRetake}>
                        🔄 Retake
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'upload' && (
              <div className="upload-viewport-card">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  style={{ display: 'none' }}
                />
                <button
                  type="button"
                  className="upload-dropzone"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <span className="upload-icon">📂</span>
                  <strong>Choose a photo from your device</strong>
                  <small>JPG, PNG, WebP supported</small>
                </button>

                {previewPhoto && (
                  <div className="upload-photo-preview">
                    <img src={previewPhoto} alt="Uploaded face" className="snapped-img" />
                    <button
                      type="button"
                      className="secondary-button small-btn"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      Change Photo
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right: Live Astronaut Suit Preview */}
          <div className="custom-character-modal__preview">
            <span className="section-kicker">SUIT VISOR PREVIEW</span>
            <div className="preview-astronaut-box">
              <AvatarPreview
                avatar={customAvatarDef}
                customPhotoUrl={previewPhoto}
              />
              <span className="preview-cadet-name">Cadet You</span>
              <p className="preview-help">
                {previewPhoto
                  ? 'Great fit! Your photo will be shown inside your visor across Aster Base and in 3D Mars exploration.'
                  : 'Take or choose a photo to see your astronaut suit.'}
              </p>
            </div>
          </div>
        </div>

        <canvas ref={canvasRef} style={{ display: 'none' }} />

        <footer className="custom-character-modal__footer">
          {currentPhoto && (
            <button
              type="button"
              className="danger-button"
              onClick={() => {
                onClear()
                setPreviewPhoto(null)
                onClose()
              }}
            >
              Reset to Standard Suit
            </button>
          )}
          <button type="button" className="secondary-button" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="primary-button"
            disabled={!previewPhoto}
            onClick={handleConfirm}
          >
            Equip My Astronaut 🚀
          </button>
        </footer>
      </div>
    </div>
  )
}
