import { useEffect, useState } from 'react'

export function useInstallPrompt(iosDismissKey = 'ss-ios-banner-dismissed') {
  const [installPrompt, setInstallPrompt] = useState(null)
  const [showInstall, setShowInstall] = useState(false)
  const [showIosBanner, setShowIosBanner] = useState(false)

  useEffect(() => {
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      navigator.standalone === true

    if (isStandalone) return

    const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent)
    const isSafari = /safari/i.test(navigator.userAgent) && !/chrome|crios|fxios/i.test(navigator.userAgent)

    if (isIos && isSafari) {
      if (!localStorage.getItem(iosDismissKey)) setShowIosBanner(true)
      return
    }

    const onPrompt = (e) => {
      e.preventDefault()
      setInstallPrompt(e)
      setShowInstall(true)
    }
    const onInstalled = () => setShowInstall(false)

    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  async function handleInstall() {
    if (!installPrompt) return
    installPrompt.prompt()
    const { outcome } = await installPrompt.userChoice
    if (outcome === 'accepted') setShowInstall(false)
  }

  function dismissIosBanner() {
    localStorage.setItem(iosDismissKey, '1')
    setShowIosBanner(false)
  }

  return { showInstall, handleInstall, showIosBanner, dismissIosBanner }
}
