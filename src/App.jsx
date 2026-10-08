import { useEffect, useState } from 'react'

const X_URL = 'https://x.com/SaiTejaNmgyla'

function App() {
  const [isVisible, setIsVisible] = useState(false)
  const [isLight, setIsLight] = useState(false)

  useEffect(() => {
    const timer = window.setTimeout(() => setIsVisible(true), 180)
    return () => window.clearTimeout(timer)
  }, [])

  return (
    <main className={`page-shell ${isLight ? 'light-mode' : ''}`}>
      <button
        className="theme-mark"
        type="button"
        aria-label={isLight ? 'Switch to dark mode' : 'Switch to light mode'}
        aria-pressed={isLight}
        onClick={() => setIsLight((current) => !current)}
      >
        <span aria-hidden="true">☼</span>
      </button>
      <section className={`message ${isVisible ? 'is-visible' : ''}`} aria-labelledby="coming-soon-title">
        <h1 id="coming-soon-title" style={{ color: isLight ? '#171719' : '#f1f1f3' }}>Coming soon..</h1>
        <p style={{ color: isLight ? '#77777b' : '#8e8e96' }}>
          <a href={X_URL} target="_blank" rel="noreferrer" style={{ color: isLight ? '#303034' : '#c4c4ca' }}>@SaiTejaNmgyla</a> is cooking..!!
        </p>
      </section>
    </main>
  )
}

export default App
