import { Check, X } from 'lucide-react'
import { useEffect, useId, useRef } from 'react'
import { createPortal } from 'react-dom'

type SuccessPopupProps = {
  isOpen: boolean
  title: string
  message: string
  onClose: () => void
}

export function SuccessPopup({ isOpen, title, message, onClose }: SuccessPopupProps) {
  const titleId = useId()
  const messageId = useId()
  const okButtonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!isOpen) return

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    okButtonRef.current?.focus()

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  return createPortal(
    <div className="success-popup" role="presentation">
      <button className="success-popup__backdrop" type="button" aria-label="Tutup popup" onClick={onClose} />
      <section className="success-popup__dialog" role="dialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={messageId}>
        <button className="success-popup__close" type="button" aria-label="Tutup popup" onClick={onClose}><X size={23} /></button>
        <div className="success-popup__icon" aria-hidden="true"><span><Check size={31} strokeWidth={2.5} /></span></div>
        <h2 id={titleId}>{title}</h2>
        <p id={messageId}>{message}</p>
        <button ref={okButtonRef} className="success-popup__ok" type="button" onClick={onClose}>OK</button>
      </section>
    </div>,
    document.body,
  )
}
