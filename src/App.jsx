import { useEffect, useState } from 'react'

const X_URL = 'https://x.com/SaiTejaNmgyla'

function App() {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const timer = window.setTimeout(() => setIsVisible(true), 180)
    return () => window.clearTimeout(timer)
  }, [])

  return (
    <main className="page-shell">
      <div className="theme-mark" aria-hidden="true">☼</div>
      <section className={`message ${isVisible ? 'is-visible' : ''}`} aria-labelledby="coming-soon-title">
        <h1 id="coming-soon-title">Coming soon..</h1>
        <p>
          <a href={X_URL} target="_blank" rel="noreferrer">@SaiTejaNmgyla</a> (x account link) is cooking..!!
        </p>
      </section>
    </main>
  )
}

export default App
