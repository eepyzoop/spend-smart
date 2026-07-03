function InstallBanner({ onDismiss }) {
  return (
    <div className="bg-emerald-800 dark:bg-emerald-950 text-white text-xs px-4 py-2.5 flex items-center gap-3">
      <span className="flex-1">
        Tap <span className="font-semibold">Share</span> then <span className="font-semibold">Add to Home Screen</span> to install SpendSmart
      </span>
      <button
        onClick={onDismiss}
        className="text-emerald-300 hover:text-white text-lg leading-none flex-shrink-0 transition-colors"
        aria-label="Dismiss"
      >
        ×
      </button>
    </div>
  )
}

export default InstallBanner
