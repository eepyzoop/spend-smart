const BILLS = [
  { top:  7, size: 15, duration: 14, delay:   0, goRight: true  },
  { top: 21, size: 12, duration: 19, delay:  -5, goRight: true  },
  { top: 36, size: 18, duration: 12, delay: -10, goRight: false },
  { top: 50, size: 14, duration: 17, delay:  -3, goRight: true  },
  { top: 63, size: 16, duration: 21, delay:  -8, goRight: true  },
  { top: 78, size: 11, duration: 15, delay: -14, goRight: false },
  { top: 13, size: 13, duration: 23, delay:  -7, goRight: true  },
  { top: 44, size: 17, duration: 13, delay:  -2, goRight: false },
  { top: 72, size: 12, duration: 18, delay: -11, goRight: true  },
  { top: 88, size: 15, duration: 16, delay:  -6, goRight: true  },
]

function WingedDollar({ size, flipped }) {
  const h = size
  const w = Math.round(size * 3)
  return (
    <svg
      width={w}
      height={h}
      viewBox="0 0 60 20"
      fill="none"
      style={flipped ? { transform: 'scaleX(-1)' } : undefined}
    >
      {/* Left wing */}
      <path d="M16 10 C12 7, 6 4, 2 7 C0 9, 4 14, 16 12" fill="#059669" />
      {/* Right wing */}
      <path d="M44 10 C48 7, 54 4, 58 7 C60 9, 56 14, 44 12" fill="#059669" />
      {/* Bill body */}
      <rect x="15" y="5" width="30" height="12" rx="2.5" fill="#059669" />
      {/* Oval detail left */}
      <ellipse cx="21" cy="11" rx="3.5" ry="4.5" fill="#047857" />
      {/* Oval detail right */}
      <ellipse cx="39" cy="11" rx="3.5" ry="4.5" fill="#047857" />
      {/* Dollar sign */}
      <text x="30" y="14.5" textAnchor="middle" fontSize="7" fill="white" fontWeight="700" fontFamily="sans-serif">$</text>
    </svg>
  )
}

function FlyingDollars() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 0 }}>
      {BILLS.map(({ top, size, duration, delay, goRight }, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            top: `${top}%`,
            left: 0,
            opacity: 0.09,
            animation: `${goRight ? 'flyRight' : 'flyLeft'} ${duration}s ${delay}s linear infinite`,
          }}
        >
          <WingedDollar size={size} flipped={!goRight} />
        </div>
      ))}
    </div>
  )
}

export default FlyingDollars
