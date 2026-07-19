import { useEffect, useRef } from 'react'

export function InteractiveBackground() {
  const backgroundRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const background = backgroundRef.current
    if (!background || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    let animationFrame = 0
    let pointerX = window.innerWidth * 0.5
    let pointerY = window.innerHeight * 0.35

    function renderSpotlight() {
      if (!background) return
      background.style.setProperty('--spotlight-x', `${pointerX}px`)
      background.style.setProperty('--spotlight-y', `${pointerY}px`)
      animationFrame = 0
    }

    function handlePointerMove(event: PointerEvent) {
      pointerX = event.clientX
      pointerY = event.clientY
      if (!animationFrame) animationFrame = window.requestAnimationFrame(renderSpotlight)
    }

    window.addEventListener('pointermove', handlePointerMove, { passive: true })
    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      if (animationFrame) window.cancelAnimationFrame(animationFrame)
    }
  }, [])

  return (
    <div ref={backgroundRef} className="interactive-background" aria-hidden="true">
      <div className="interactive-background__blob interactive-background__blob--coral" />
      <div className="interactive-background__blob interactive-background__blob--gold" />
      <div className="interactive-background__blob interactive-background__blob--sage" />
      <svg className="interactive-background__routes" viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice">
        <path className="interactive-background__route interactive-background__route--one" d="M-70 690 C145 520 210 690 405 515 S735 310 910 435 S1160 680 1510 390" />
        <path className="interactive-background__route interactive-background__route--two" d="M105 -35 C185 150 95 280 295 355 S625 305 750 170 S1025 35 1125 205 S1260 485 1515 545" />
        <path className="interactive-background__route interactive-background__route--three" d="M-40 215 C180 125 320 205 455 315 S665 605 880 655 S1185 570 1475 760" />
        <g className="interactive-background__stops">
          <circle cx="295" cy="355" r="6" />
          <circle cx="750" cy="170" r="5" />
          <circle cx="910" cy="435" r="6" />
          <circle cx="1125" cy="205" r="5" />
          <circle cx="405" cy="515" r="5" />
          <circle cx="880" cy="655" r="6" />
        </g>
      </svg>
      <div className="interactive-background__spotlight" />
    </div>
  )
}
