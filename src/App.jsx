import { useEffect, useState } from 'react'

const X_URL = 'https://x.com/SaiTejaNmgyla'

function App() {
  const [isLight, setIsLight] = useState(false)
  const [hasEntered, setHasEntered] = useState(false)

  useEffect(() => {
    const timer = window.setTimeout(() => setHasEntered(true), 140)
    return () => window.clearTimeout(timer)
  }, [])

  return (
    <main className={`page-shell${isLight ? ' light-mode' : ''}`}>
      <button
        className="theme-toggle"
        type="button"
        aria-label={isLight ? 'Switch to dark mode' : 'Switch to light mode'}
        aria-pressed={isLight}
        onClick={() => setIsLight((current) => !current)}
      >
        <span className="sun-icon" aria-hidden="true">☼</span>
      </button>

      <section className={`hero${hasEntered ? ' is-visible' : ''}`} aria-labelledby="coming-soon-title">
        <h1 id="coming-soon-title">Coming soon..</h1>
        <p>
          <a href={X_URL} target="_blank" rel="noreferrer">@SaiTejaNmgyla</a> is cooking..!!
        </p>
      </section>
    </main>
  )
}

export default App
