import { useEffect, useState } from 'react'

const CONTENT_MAX_WIDTH = 672 // max-w-2xl

// pct = position across the margin (0 = screen edge, 1 = near content)
const BILL_CONFIGS = [
  { side: 'left',  pct: 0.15, size: 16, duration: 14, delay:   0 },
  { side: 'left',  pct: 0.55, size: 13, duration: 19, delay:  -5 },
  { side: 'left',  pct: 0.30, size: 17, duration: 16, delay: -10 },
  { side: 'left',  pct: 0.70, size: 14, duration: 21, delay:  -7 },
  { side: 'left',  pct: 0.45, size: 12, duration: 13, delay:  -3 },
  { side: 'right', pct: 0.20, size: 15, duration: 17, delay:  -2 },
  { side: 'right', pct: 0.60, size: 13, duration: 20, delay:  -8 },
  { side: 'right', pct: 0.35, size: 17, duration: 15, delay: -13 },
  { side: 'right', pct: 0.10, size: 12, duration: 22, delay:  -6 },
  { side: 'right', pct: 0.75, size: 16, duration: 12, delay: -11 },
]

function WingedDollar({ size }) {
  const h = size
  const w = Math.round(size * 3)
  return (
    <svg width={w} height={h} viewBox="0 0 60 20" fill="none">
      <path d="M16 10 C12 7, 6 4, 2 7 C0 9, 4 14, 16 12" fill="#047857"/>
      <path d="M44 10 C48 7, 54 4, 58 7 C60 9, 56 14, 44 12" fill="#047857"/>
      <rect x="15" y="5" width="30" height="12" rx="2.5" fill="#047857"/>
      <ellipse cx="21" cy="11" rx="3.5" ry="4.5" fill="#065f46"/>
      <ellipse cx="39" cy="11" rx="3.5" ry="4.5" fill="#065f46"/>
      <text x="30" y="14.5" textAnchor="middle" fontSize="7" fill="white" fontWeight="700" fontFamily="sans-serif">$</text>
    </svg>
  )
}

function FlyingDollars() {
  const [marginWidth, setMarginWidth] = useState(0)

  useEffect(() => {
    const update = () => {
      const margin = Math.max((window.innerWidth - CONTENT_MAX_WIDTH) / 2 - 24, 0)
      setMarginWidth(margin)
    }
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  if (marginWidth < 50) return null

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 0 }}>
      {BILL_CONFIGS.map(({ side, pct, size, duration, delay }, i) => {
        const billWidth = Math.round(size * 3)
        const maxX = Math.max(marginWidth - billWidth - 8, 0)
        const x = Math.round(pct * maxX)
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              top: 0,
              [side]: `${x}px`,
              opacity: 0.22,
              animation: `flyDown ${duration}s ${delay}s linear infinite`,
            }}
          >
            <WingedDollar size={size} />
          </div>
        )
      })}
    </div>
  )
}

export default FlyingDollars
