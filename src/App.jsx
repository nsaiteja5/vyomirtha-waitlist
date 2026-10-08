import { useEffect, useState } from 'react'
import '@fontsource/space-grotesk/400.css'
import '@fontsource/space-grotesk/500.css'
import '@fontsource/space-grotesk/700.css'

const X_URL = 'https://x.com/SaiTejaNmgyla'

function App() {
  const [isLight, setIsLight] = useState(false)
  const [hasEntered, setHasEntered] = useState(false)

  useEffect(() => {
    const timer = window.setTimeout(() => setHasEntered(true), 180)
    return () => window.clearTimeout(timer)
  }, [])

  return (
    <main className={`page-shell${isLight ? ' light-mode' : ''}`}>
      <button
        className="theme-mark"
        type="button"
        aria-label={isLight ? 'Switch to dark mode' : 'Switch to light mode'}
        aria-pressed={isLight}
        onClick={() => setIsLight((current) => !current)}
      >
        <span aria-hidden="true">☼</span>
      </button>

      <section className={`message${hasEntered ? ' is-visible' : ''}`} aria-labelledby="coming-soon-title">
        <h1 id="coming-soon-title">Coming soon..</h1>
        <p>
          <a href={X_URL} target="_blank" rel="noreferrer">@SaiTejaNmgyla</a> is cooking..!!
        </p>
      </section>
    </main>
  )
}

export default App
