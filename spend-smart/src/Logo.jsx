function Logo({ size = 32 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="32" height="32" rx="7" fill="#059669"/>
      <rect x="7" y="20" width="4.5" height="7" rx="1.25" fill="white" fillOpacity="0.55"/>
      <rect x="13.75" y="14" width="4.5" height="13" rx="1.25" fill="white" fillOpacity="0.8"/>
      <rect x="20.5" y="8" width="4.5" height="19" rx="1.25" fill="white"/>
      <line x1="6.5" y1="27.75" x2="25.5" y2="27.75" stroke="white" strokeWidth="1.25" strokeOpacity="0.25" strokeLinecap="round"/>
    </svg>
  )
}

export default Logo
