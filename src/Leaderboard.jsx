import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import html2canvas from 'html2canvas'
import xLogo from '../x.png'
import {
  getCurrentUser, getStoredToken, storeToken, clearToken, getXAuthUrl,
  fetchLeaderboard, fetchConfig, fetchActivity, subscribeToLeaderboard,
  subscribeToActivity, updateProfile, createOrder, verifyPayment, parseUserFromToken,
} from './leaderboard-api.js'

/* ═══════════════════════════════════════
   INDIAN FLAG SVG COMPONENT
   ═══════════════════════════════════════ */

export function IndianFlag({ className = 'lb-flag-svg', width = 20, height = 13, style = {} }) {
  return (
    <svg
      className={className}
      width={width}
      height={height}
      viewBox="0 0 24 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: 'inline-block', verticalAlign: 'middle', borderRadius: 2, flexShrink: 0, ...style }}
      aria-label="India"
    >
      {/* Top saffron band */}
      <rect width="24" height="5.333" fill="#FF9933" />
      {/* Middle white band */}
      <rect y="5.333" width="24" height="5.333" fill="#FFFFFF" />
      {/* Bottom green band */}
      <rect y="10.666" width="24" height="5.334" fill="#138808" />
      {/* Ashoka Chakra Outer Ring */}
      <circle cx="12" cy="8" r="2.2" stroke="#000080" strokeWidth="0.45" fill="none" />
      {/* Ashoka Chakra Hub */}
      <circle cx="12" cy="8" r="0.45" fill="#000080" />
      {/* Ashoka Chakra 24 Spokes */}
      <g stroke="#000080" strokeWidth="0.22" opacity="0.95">
        <line x1="12" y1="5.8" x2="12" y2="10.2" />
        <line x1="9.8" y1="8" x2="14.2" y2="8" />
        <line x1="10.45" y1="6.45" x2="13.55" y2="9.55" />
        <line x1="10.45" y1="9.55" x2="13.55" y2="6.45" />
        <line x1="11.14" y1="5.95" x2="12.86" y2="10.05" />
        <line x1="12.86" y1="5.95" x2="11.14" y2="10.05" />
        <line x1="9.95" y1="7.14" x2="14.05" y2="8.86" />
        <line x1="9.95" y1="8.86" x2="14.05" y2="7.14" />
        <line x1="10.8" y1="6.15" x2="13.2" y2="9.85" />
        <line x1="13.2" y1="6.15" x2="10.8" y2="9.85" />
        <line x1="10.15" y1="7.55" x2="13.85" y2="8.45" />
        <line x1="10.15" y1="8.45" x2="13.85" y2="7.55" />
      </g>
    </svg>
  )
}

/* ═══════════════════════════════════════
   INDIAN STATES & LANGUAGES CONSTANTS
   ═══════════════════════════════════════ */

export const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
  'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
  'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
  'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Andaman and Nicobar Islands', 'Chandigarh', 'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi (NCT)', 'Jammu and Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry'
]

export const NATIVE_LANGUAGES = [
  'English (English)',
  'Hindi (हिन्दी)',
  'Telugu (తెలుగు)',
  'Tamil (தமிழ்)',
  'Kannada (ಕನ್ನಡ)',
  'Malayalam (മലയാളം)',
  'Marathi (मराठी)',
  'Bengali (বাংলা)',
  'Gujarati (ગુજરાતી)',
  'Punjabi (ਪੰਜਾਬੀ)',
  'Odia (ଓଡ଼ିଆ)',
  'Assamese (অসমীয়া)',
  'Urdu (اردو)',
  'Sanskrit (संस्कृतम्)',
  'Maithili (मैथिली)',
  'Santali (ᱥᱟᱱᱛᱟᱲᱤ)',
  'Kashmiri (کٲشُر)',
  'Nepali (नेपाली)',
  'Konkani (कोंकणी)',
  'Sindhi (سنڌي)',
  'Dogri (डोगरी)',
  'Bodo (बड़ो)',
  'Manipuri (মৈতৈলোন্)',
]

/* ═══════════════════════════════════════
   DYNAMIC SAVAGE COPY SYSTEM (~10 VARIANTS PER EVENT)
   ═══════════════════════════════════════ */

const SAVAGE_HERO_COPY = [
  "Someone's sitting at #1. Are you really okay with that?",
  "Someone less ambitious is currently above you.",
  "You call yourself a builder. Prove it.",
  "Don't enter if you're scared of getting outranked.",
  "₹1 gets you on the board. What's stopping you?",
  "There is a hierarchy of Indian builders. You're not in it yet.",
  "You can leave. Your rank won't wait.",
  "Someone took the spot you think you deserve. Take it back.",
  "Someone thinks they're better than you.",
  "The game doesn't pause when you close this tab.",
  "Your rank is only safe until someone spends ₹1 more than you.",
  "No algorithms. No nepotism. Pure proof of conviction.",
]

const OUTBID_COPY = [
  "Bro. Someone just took your spot.",
  "You got pushed down. Fix it.",
  "#{pos} is gone. Take it back.",
  "Someone thinks they're better than you.",
  "You really gonna let that happen?",
  "Your rank just got stolen.",
  "You were #{old}. Not anymore.",
  "They bought your spot. Your move.",
  "You just got humbled. Climb back up.",
  "#{pos} looks good on you. Wanna do something about it?",
]

const SUCCESS_SHARE_VARIANTS = [
  "#{pos} on India's Builder Board. Put some respect on it. 🇮🇳\n\n₹{amt} conviction locked in.\n\nhttps://vyomirtha.com/leaderboard",
  "Talk is cheap. Shipping isn't. Just locked #{pos} in India's builder hierarchy 🇮🇳\n\n₹{amt} down.\n\nhttps://vyomirtha.com/leaderboard",
  "Built in silence, holding #{pos} in public 🇮🇳\n\n₹{amt} skin in the game.\n\nhttps://vyomirtha.com/leaderboard",
  "They debate who's actually shipping in India. I just locked #{pos} to settle it 🇮🇳\n\n₹{amt} conviction.\n\nhttps://vyomirtha.com/leaderboard",
  "Conviction backed by real skin in the game. Sitting at #{pos} on the national board 🇮🇳\n\nhttps://vyomirtha.com/leaderboard",
  "If you're really building from India, your proof should be on this board. Holding #{pos} 🇮🇳\n\n₹{amt} secured.\n\nhttps://vyomirtha.com/leaderboard",
  "Decided to see where I rank among Indian builders. Turns out it's #{pos} 🇮🇳\n\n₹{amt} locked in.\n\nhttps://vyomirtha.com/leaderboard",
  "Proof of work > Proof of talk. Rank #{pos} secured in the hierarchy 🇮🇳\n\n₹{amt} conviction.\n\nhttps://vyomirtha.com/leaderboard",
  "Put my conviction where my code is. Holding #{pos} on India's Builder Board 🇮🇳\n\nhttps://vyomirtha.com/leaderboard",
  "The national hierarchy of Indian builders is live. Currently holding #{pos} 🇮🇳\n\n₹{amt} secured.\n\nhttps://vyomirtha.com/leaderboard",
  "Not waiting for anyone's permission. Rank #{pos} is mine on the national board 🇮🇳\n\n₹{amt} skin in the game.\n\nhttps://vyomirtha.com/leaderboard",
  "Real builders put numbers on the board. Holding #{pos} in India 🇮🇳\n\n₹{amt} conviction.\n\nhttps://vyomirtha.com/leaderboard",
]

const PROUD_VICTORY_COPY = [
  "👑 RANK #{pos} SECURED. YOU ARE OFFICIALLY IN THE HIERARCHY.",
  "⚡ RANK #{pos} IS LOCKED. PROOF OF WORK OVER PROOF OF TALK.",
  "🇮🇳 YOU JUST TOOK #{pos} ON INDIA'S NATIONAL BUILDER BOARD.",
  "🔥 CONVICTION PROVEN. SITTING AT #{pos} IN INDIA'S ARENA.",
  "🏆 #{pos} SECURED. YOU PUT REAL SKIN IN THE GAME.",
  "🚀 OFFICIALLY HOLDING #{pos} AMONG INDIA'S TOP BUILDERS.",
  "👑 YOU DON'T JUST TALK. YOU SHIP. RANK #{pos} IS YOURS.",
  "⚡ RANK #{pos} CLAIMED. YOUR SPOT ON THE NATIONAL BOARD IS LIVE.",
  "🇮🇳 BUILT WITH REAL CONVICTION. RANK #{pos} IS OFFICIALLY LOCKED.",
  "🏆 REAL NUMBERS ON THE BOARD. YOU ARE HOLDING #{pos} IN INDIA.",
  "🔥 CONVICTION RECOGNIZED. RANK #{pos} AMONG INDIA'S SHIPPERS.",
  "👑 RANK #{pos} IS YOURS. YOU BACKED YOUR AMBITION WITH REAL PROOF.",
]

/* ═══════════════════════════════════════
   UTILITY HELPERS
   ═══════════════════════════════════════ */

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}

function formatAmount(n) {
  if (n == null) return '₹0'
  return '₹' + Number(n).toLocaleString('en-IN')
}

function timeAgo(ts) {
  if (!ts) return 'just now'
  const diff = (Date.now() - new Date(ts).getTime()) / 1000
  if (diff < 15) return 'just now'
  if (diff < 60) return `${Math.floor(diff)}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

function XLogo({ className = 'x-logo' }) {
  return <img className={className} src={xLogo} alt="X" />
}

/* ═══════════════════════════════════════
   CONFETTI PARTICLE SYSTEM (CANVAS)
   ═══════════════════════════════════════ */

function ConfettiCanvas() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    let animId = 0

    canvas.width = window.innerWidth
    canvas.height = window.innerHeight

    const colors = ['#e5bd6e', '#ff9933', '#ffffff', '#138808', '#169cf5', '#ab79ff']
    const particles = Array.from({ length: 100 }, () => ({
      x: canvas.width * 0.5 + (Math.random() - 0.5) * 220,
      y: canvas.height * 0.35 + (Math.random() - 0.5) * 120,
      vx: (Math.random() - 0.5) * 20,
      vy: (Math.random() - 0.8) * 24 - 6,
      size: Math.random() * 8 + 4,
      color: colors[Math.floor(Math.random() * colors.length)],
      rotation: Math.random() * 360,
      rotSpeed: (Math.random() - 0.5) * 14,
      gravity: 0.52,
      opacity: 1,
      decay: Math.random() * 0.008 + 0.006,
    }))

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      let alive = false

      particles.forEach((p) => {
        if (p.opacity <= 0) return
        alive = true
        p.x += p.vx
        p.y += p.vy
        p.vy += p.gravity
        p.vx *= 0.98
        p.rotation += p.rotSpeed
        p.opacity = Math.max(0, p.opacity - p.decay)

        ctx.save()
        ctx.translate(p.x, p.y)
        ctx.rotate((p.rotation * Math.PI) / 180)
        ctx.fillStyle = p.color
        ctx.globalAlpha = p.opacity
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6)
        ctx.restore()
      })

      if (alive) {
        animId = requestAnimationFrame(render)
      }
    }

    animId = requestAnimationFrame(render)
    return () => cancelAnimationFrame(animId)
  }, [])

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 9999,
      }}
    />
  )
}

/* ═══════════════════════════════════════
   HOOKS
   ═══════════════════════════════════════ */

function useXAuth() {
  const [user, setUser] = useState(() => getCurrentUser())
  const [authError, setAuthError] = useState(null)

  useEffect(() => {
    // Check both search query string and hash for xtoken or auth_error
    const searchParams = new URLSearchParams(window.location.search)
    const hash = window.location.hash
    const hashMatch = hash.match(/[?&]xtoken=([^&]+)/)
    const token = searchParams.get('xtoken') || (hashMatch ? decodeURIComponent(hashMatch[1]) : null)

    if (token) {
      storeToken(token)
      setUser(parseUserFromToken(token))
      // Clean query params from URL
      try {
        const url = new URL(window.location.href)
        url.searchParams.delete('xtoken')
        window.history.replaceState({}, '', url.pathname + (url.hash && !url.hash.includes('xtoken') ? url.hash : ''))
      } catch {}
    }

    const errMatch = hash.match(/[?&]auth_error=([^&]+)/)
    const errCode = searchParams.get('auth_error') || (errMatch ? decodeURIComponent(errMatch[1]) : null)
    if (errCode) {
      const messages = {
        denied: 'Access was denied by X authorization.',
        invalid_state: 'Session timed out. Please try logging in again.',
        token_failed: 'Failed to exchange authorization token with X API.',
        no_token: 'No access token received from X.',
        profile_failed: 'Failed to fetch user profile from X.',
        missing_client_id: 'X_CLIENT_ID is not configured in Vercel Environment Variables. Please add it in project settings.',
      }
      setAuthError(messages[errCode] || `X authentication error: ${errCode}`)
      try {
        const url = new URL(window.location.href)
        url.searchParams.delete('auth_error')
        window.history.replaceState({}, '', url.pathname + (url.hash && !url.hash.includes('auth_error') ? url.hash : ''))
      } catch {}
    }
  }, [])

  const login = useCallback(() => {
    window.location.href = getXAuthUrl()
  }, [])

  const logout = useCallback(() => {
    clearToken()
    setUser(null)
  }, [])

  const clearAuthError = useCallback(() => setAuthError(null), [])

  return { user, login, logout, isAuthenticated: !!user, authError, clearAuthError }
}

function useLeaderboard() {
  const [rawData, setRawData] = useState({ leaderboard: [], total: 0 })
  const [loading, setLoading] = useState(true)
  const prevRef = useRef([])

  useEffect(() => {
    let mounted = true
    const unsub = subscribeToLeaderboard(
      (d) => { if (mounted) { setRawData(d); setLoading(false) } },
      () => { if (mounted) setLoading(false) }
    )
    return () => { mounted = false; unsub() }
  }, [])

  // Dynamic modular leaderboard data directly from Firebase
  const leaderboard = useMemo(() => {
    const list = (rawData.leaderboard || []).filter((r) => r && r.id)
    // Sort descending by accumulated balance
    list.sort((a, b) => (b.balance || 0) - (a.balance || 0))
    // Assign sequential ranks 1..N
    return list.map((item, idx) => ({
      ...item,
      position: idx + 1,
    }))
  }, [rawData.leaderboard])

  const flashed = useMemo(() => {
    const prev = prevRef.current
    const changed = new Set()
    leaderboard.forEach((entry) => {
      const old = prev.find((p) => p.id === entry.id)
      if (old && old.position !== entry.position) changed.add(entry.id)
    })
    prevRef.current = leaderboard
    return changed
  }, [leaderboard])

  return { leaderboard, total: leaderboard.length, loading, flashed }
}

function useActivity() {
  const [events, setEvents] = useState([])

  useEffect(() => {
    let mounted = true
    const unsub = subscribeToActivity(
      (d) => { if (mounted) setEvents(d.activity || []) },
      () => {}
    )
    return () => { mounted = false; unsub() }
  }, [])

  return events
}

function useConfig() {
  const [config, setConfig] = useState({ showDemoProfiles: true, minBid: 1 })

  useEffect(() => {
    fetchConfig().then(setConfig).catch(() => {})
  }, [])

  return config
}

function useCompactHeader() {
  const [compact, setCompact] = useState(false)
  useEffect(() => {
    let frame = 0
    const update = () => { setCompact(window.scrollY > 20); frame = 0 }
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(update) }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => { window.removeEventListener('scroll', onScroll); if (frame) cancelAnimationFrame(frame) }
  }, [])
  return compact
}

/* ═══════════════════════════════════════
   1. HEADER
   ═══════════════════════════════════════ */

function LeaderboardHeader({ user, onLogin, onLogout }) {
  const compact = useCompactHeader()

  const scrollToSection = (id) => {
    const el = document.getElementById(id)
    if (el) el.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <header className={`lb-header ${compact ? 'is-compact' : ''}`}>
      <a
        className="brand"
        href="/leaderboard"
        onClick={(e) => {
          e.preventDefault()
          window.scrollTo({ top: 0, behavior: 'smooth' })
        }}
        aria-label="Leaderboard home"
      >
        <span>VYOMIRTHA <i className="lb-brand-tag">ARENA <IndianFlag width={15} height={10} /></i></span>
      </a>
      <div className="lb-header-nav">
        <a
          href="/"
          onClick={(e) => {
            e.preventDefault()
            window.history.pushState({}, '', '/')
            window.dispatchEvent(new Event('popstate'))
          }}
        >
          Waitlist
        </a>
        <button
          type="button"
          className="lb-nav-link"
          onClick={() => scrollToSection('where-you-belong')}
        >
          Bid Arena
        </button>
        <button
          type="button"
          className="lb-nav-link"
          onClick={() => scrollToSection('how-lb-works')}
        >
          Arena Rules
        </button>
        {user ? (
          <div className="lb-user-pill">
            {user.avatar
              ? <img className="lb-user-avatar" src={user.avatar} alt="" />
              : <span className="lb-user-avatar lb-avatar-placeholder" style={{ width: 26, height: 26 }}>{user.name?.[0]}</span>
            }
            <span className="lb-user-name">{user.name}</span>
            <button className="lb-logout-btn" onClick={onLogout} title="Logout">✕</button>
          </div>
        ) : (
          <button className="lb-connect-btn" onClick={onLogin}>
            <XLogo /> Connect X
          </button>
        )}
      </div>
    </header>
  )
}

/* ═══════════════════════════════════════
   2. LIVE ARENA SOCIAL PROOF STRIP (100% DYNAMIC)
   ═══════════════════════════════════════ */

function LiveArenaStrip({ entries, events, onOpenModal }) {
  const totalBuilders = entries.length
  const totalSecured = useMemo(() => {
    return entries.reduce((acc, e) => acc + (e.balance || 0), 0)
  }, [entries])

  const displayEvents = useMemo(() => {
    if (events && events.length > 0) {
      return events.slice(0, 10).map((ev) => ({
        id: ev.id || `${ev.userId}-${ev.timestamp}`,
        userHandle: ev.userHandle || ev.userName || 'builder',
        type: ev.type || 'claim',
        position: ev.position || 1,
        amount: ev.newBalance || ev.amount || 10,
        timeStr: timeAgo(ev.timestamp),
      }))
    }
    return entries.slice(0, 5).map((e) => ({
      id: e.id,
      userHandle: e.handle || e.name || 'builder',
      type: e.position === 1 ? 'reclaim' : 'claim',
      position: e.position,
      amount: e.balance,
      timeStr: timeAgo(e.lastPaidAt),
    }))
  }, [events, entries])

  return (
    <div className="lb-proof-strip">
      <div className="lb-proof-inner">
        <div className="lb-proof-stat">
          <span className="lb-live-dot" />
          <strong className="lb-proof-highlight">{totalBuilders} BUILDERS ON BOARD</strong>
        </div>

        <div className="lb-proof-divider" />

        <div className="lb-proof-stat">
          <span className="lb-proof-label">TOTAL SECURED:</span>
          <strong className="lb-proof-amount">{formatAmount(totalSecured)}</strong>
        </div>

        <div className="lb-proof-divider" />

        {/* Live Battle Feed Marquee */}
        <div className="lb-ticker-wrap">
          <div className="lb-ticker-track">
            {displayEvents.concat(displayEvents).map((item, idx) => (
              <div className="lb-ticker-item" key={`${item.id}-${idx}`}>
                <span className={`lb-ticker-badge lb-ticker-badge--${item.type}`}>
                  {item.type === 'reclaim' ? '🔥 OUTBID' : item.type === 'topup' ? '⚡ BOOST' : '⚔️ ENTERED'}
                </span>
                <span className="lb-ticker-handle">@{item.userHandle}</span>
                <span className="lb-ticker-action">
                  {item.type === 'reclaim' ? 'retook' : item.type === 'topup' ? 'climbed to' : 'took'}
                </span>
                <strong className="lb-ticker-rank">#{String(item.position).padStart(2, '0')}</strong>
                <span className="lb-ticker-amt">({formatAmount(item.amount)})</span>
                <span className="lb-ticker-time">{item.timeStr}</span>
              </div>
            ))}
          </div>
        </div>

        <button className="lb-quick-enter-btn" onClick={() => onOpenModal(1)}>
          JOIN ARENA → ₹1
        </button>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════
   3. HERO — SAVAGE & AGGRESSIVE (DYNAMIC)
   ═══════════════════════════════════════ */

function LeaderboardHero({ topUser, user, onClaim, onTakeSpot, onSelectBuilder }) {
  const [savageIndex, setSavageIndex] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => {
      setSavageIndex((prev) => (prev + 1) % SAVAGE_HERO_COPY.length)
    }, 4200)
    return () => clearInterval(timer)
  }, [])

  const currentCopy = SAVAGE_HERO_COPY[savageIndex]
  const topAmount = topUser?.balance || 0
  const isMeTop = topUser && user && topUser.id === user.id
  const takeTopPrice = topUser ? topAmount + 1 : 1

  return (
    <section className="lb-hero" aria-labelledby="lb-hero-title">
      <div className="lb-hero-grid" aria-hidden="true" />
      <div className="lb-hero-glow" aria-hidden="true" />

      <div className="lb-hero-content lb-section-shell">
        <div className="lb-hero-eyebrow-wrap">
          <span className="lb-hero-tag"><IndianFlag width={17} height={11} /> INDIA'S BUILDER HIERARCHY</span>
          <span className="lb-hero-pulse-badge">LIVE ARENA</span>
        </div>

        <h1 id="lb-hero-title" className="lb-hero-heading">
          WHO'S THE #1 BUILDER<br />
          <span className="lb-heading-gradient">IN INDIA?</span> <IndianFlag className="lb-hero-flag-svg" width={38} height={25} />
        </h1>

        <p className="lb-hero-challenger-text">
          {topUser ? (
            <><strong>@{topUser.handle || topUser.name}</strong> is sitting at #1 right now with {formatAmount(topAmount)}. <strong>Are you really okay with that?</strong></>
          ) : (
            <>The #1 spot is currently unclaimed. <strong>Be the first Indian builder to claim it.</strong></>
          )}
        </p>

        {/* Current #1 Trophy Spotlight */}
        <div className="lb-spotlight-card">
          <div className="lb-spotlight-top">
            <div className="lb-spotlight-rank-badge">
              <span className="lb-crown-icon">👑</span> #01 IN INDIA <IndianFlag width={15} height={10} />
            </div>
            <div className="lb-spotlight-status">
              <span className="lb-live-pulse" /> CURRENTLY HOLDING #1
            </div>
          </div>

          <div className="lb-spotlight-body">
            {topUser ? (
              <>
                <div
                  className="lb-spotlight-avatar-wrap lb-clickable"
                  onClick={() => onSelectBuilder(topUser)}
                  title="View full builder profile"
                >
                  {topUser.avatar ? (
                    <img className="lb-spotlight-avatar" src={topUser.avatar} alt="" />
                  ) : (
                    <span className="lb-spotlight-avatar lb-avatar-placeholder">{topUser.name?.[0] || 'V'}</span>
                  )}
                  <span className="lb-spotlight-flag"><IndianFlag width={16} height={11} /></span>
                </div>

                <div className="lb-spotlight-info">
                  <h3
                    className="lb-spotlight-name lb-clickable"
                    onClick={() => onSelectBuilder(topUser)}
                  >
                    {topUser.name}
                    {topUser.state && <span className="lb-state-pill">{topUser.state}</span>}
                    {topUser.handle && (
                      <a
                        href={`https://x.com/${topUser.handle}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="lb-spotlight-x-link"
                        title="View on X"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <XLogo />
                      </a>
                    )}
                  </h3>
                  <div className="lb-spotlight-meta">
                    <span className="lb-spotlight-handle">@{topUser.handle}</span>
                    {topUser.bio && <span className="lb-spotlight-bio-snippet">· {topUser.bio}</span>}
                  </div>

                  {/* Featured projects preview */}
                  {topUser.projects && topUser.projects.length > 0 && (
                    <div className="lb-spotlight-projects">
                      {topUser.projects.slice(0, 2).map((proj, idx) => (
                        <a
                          key={idx}
                          href={proj.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="lb-proj-chip"
                          onClick={(e) => e.stopPropagation()}
                        >
                          📦 {proj.name} ↗
                        </a>
                      ))}
                    </div>
                  )}
                </div>

                <div className="lb-spotlight-amount-box">
                  <span className="lb-spotlight-amt-label">SECURED</span>
                  <span className="lb-spotlight-amount">{formatAmount(topAmount)}</span>
                </div>
              </>
            ) : (
              <div className="lb-spotlight-empty-state">
                <div className="lb-empty-badge">#01 IS UNCLAIMED</div>
                <p>Be the first Indian builder to sit at #1 on the board.</p>
              </div>
            )}
          </div>

          {/* Direct Outbid Trigger */}
          <div className="lb-spotlight-action">
            <button
              className="lb-take-one-btn"
              onClick={() => onTakeSpot(topUser || { balance: 0, name: '#1', position: 1 })}
            >
              {isMeTop ? `⚡ EXTEND YOUR #01 LEAD (+₹${topAmount + 1})` : `🔥 TAKE HIS SPOT → ${formatAmount(takeTopPrice)}`}
            </button>
            <div className="lb-spotlight-footer-note">
              Starting at just <strong>₹1</strong>. <em>Yes. We're serious.</em>
            </div>
          </div>
        </div>

        {/* Dynamic Savage Rotating Banner */}
        <div className="lb-savage-banner">
          <span className="lb-savage-flame">⚔️</span>
          <span className="lb-savage-text" key={savageIndex}>{currentCopy}</span>
        </div>

        {/* Action Buttons */}
        <div className="lb-hero-actions">
          <button className="lb-claim-btn" onClick={onClaim}>
            CLAIM YOUR POSITION NOW <span>↗</span>
          </button>
          <a href="#where-you-belong" className="lb-jump-link">
            See where you'll land ↓
          </a>
        </div>
      </div>
    </section>
  )
}

/* ═══════════════════════════════════════
   4. TOP 3 STATUS TROPHY PODIUM (100% DYNAMIC)
   ═══════════════════════════════════════ */

function TopThreeShowcase({ entries, onTakeSpot, onSelectBuilder }) {
  const top1 = entries[0] || null
  const top2 = entries[1] || null
  const top3 = entries[2] || null

  return (
    <div className="lb-trophy-section">
      <div className="lb-trophy-header">
        <div className="lb-trophy-title-wrap">
          <span className="lb-trophy-eyebrow">THE TOP THREE PODIUM</span>
          <h2>India's Current Heavyweights <IndianFlag width={24} height={16} /></h2>
        </div>
        <p className="lb-trophy-sub">
          See what India's top builders have actually built. Outbid them by ₹1 to steal their rank.
        </p>
      </div>

      <div className="lb-trophy-grid">
        {/* #2 Silver (Left) */}
        <div className="lb-trophy-card lb-trophy-card--2">
          <div className="lb-trophy-glow" />
          <div className="lb-trophy-top">
            <span className="lb-trophy-rank">#02 <IndianFlag width={16} height={11} /></span>
            <span className="lb-trophy-tier-badge">SILVER TIER</span>
          </div>

          {top2 ? (
            <>
              <div
                className="lb-trophy-avatar-wrap lb-clickable"
                onClick={() => onSelectBuilder(top2)}
                title="View profile"
              >
                {top2.avatar ? (
                  <img className="lb-trophy-avatar" src={top2.avatar} alt="" />
                ) : (
                  <span className="lb-trophy-avatar lb-avatar-placeholder">{top2.name?.[0]}</span>
                )}
                <span className="lb-trophy-num-chip">2</span>
              </div>
              <h3
                className="lb-trophy-name lb-clickable"
                onClick={() => onSelectBuilder(top2)}
              >
                {top2.name}
              </h3>
              <p className="lb-trophy-handle">@{top2.handle}</p>
              {top2.state && <span className="lb-trophy-state-tag">{top2.state}</span>}
              {top2.bio && <p className="lb-trophy-bio">{top2.bio}</p>}

              {top2.projects && top2.projects.length > 0 && (
                <div className="lb-trophy-projects-mini">
                  {top2.projects.slice(0, 1).map((p, i) => (
                    <a
                      key={i}
                      href={p.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="lb-proj-chip"
                      onClick={(e) => e.stopPropagation()}
                    >
                      📦 {p.name} ↗
                    </a>
                  ))}
                </div>
              )}

              {top2.achievement && <div className="lb-trophy-achievement">⚡ {top2.achievement}</div>}
              <div className="lb-trophy-amount">{formatAmount(top2.balance)}</div>
              <button className="lb-trophy-take-btn" onClick={() => onTakeSpot(top2)}>
                TAKE #02 SPOT → {formatAmount(top2.balance + 1)}
              </button>
            </>
          ) : (
            <div className="lb-trophy-open">
              <div className="lb-trophy-open-icon">+</div>
              <h4>OPEN SPOT #02</h4>
              <p>No builder here yet.</p>
              <button className="lb-trophy-claim-open" onClick={() => onTakeSpot({ balance: 0, position: 2 })}>
                CLAIM #02 FOR ₹1 ↗
              </button>
            </div>
          )}
        </div>

        {/* #1 Gold (Center - King) */}
        <div className="lb-trophy-card lb-trophy-card--1">
          <div className="lb-trophy-crown">👑</div>
          <div className="lb-trophy-glow" />
          <div className="lb-trophy-top">
            <span className="lb-trophy-rank">#01 <IndianFlag width={18} height={12} /></span>
            <span className="lb-trophy-tier-badge lb-gold-badge">🔥 #1 IN INDIA</span>
          </div>

          {top1 ? (
            <>
              <div
                className="lb-trophy-avatar-wrap lb-gold-avatar-wrap lb-clickable"
                onClick={() => onSelectBuilder(top1)}
                title="View profile"
              >
                {top1.avatar ? (
                  <img className="lb-trophy-avatar" src={top1.avatar} alt="" />
                ) : (
                  <span className="lb-trophy-avatar lb-avatar-placeholder">{top1.name?.[0]}</span>
                )}
                <span className="lb-trophy-num-chip lb-gold-chip">1</span>
              </div>
              <h3
                className="lb-trophy-name lb-gold-name lb-clickable"
                onClick={() => onSelectBuilder(top1)}
              >
                {top1.name}
              </h3>
              <p className="lb-trophy-handle">@{top1.handle}</p>
              {top1.state && <span className="lb-trophy-state-tag lb-gold-state">{top1.state}</span>}
              {top1.bio && <p className="lb-trophy-bio">{top1.bio}</p>}

              {top1.projects && top1.projects.length > 0 && (
                <div className="lb-trophy-projects-mini">
                  {top1.projects.slice(0, 2).map((p, i) => (
                    <a
                      key={i}
                      href={p.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="lb-proj-chip"
                      onClick={(e) => e.stopPropagation()}
                    >
                      📦 {p.name} ↗
                    </a>
                  ))}
                </div>
              )}

              {top1.achievement && <div className="lb-trophy-achievement lb-gold-flex">⚡ {top1.achievement}</div>}
              <div className="lb-trophy-amount lb-gold-amount">{formatAmount(top1.balance)}</div>
              <button className="lb-trophy-take-btn lb-gold-take-btn" onClick={() => onTakeSpot(top1)}>
                🔥 TAKE #01 SPOT → {formatAmount(top1.balance + 1)}
              </button>
            </>
          ) : (
            <div className="lb-trophy-open">
              <div className="lb-trophy-open-icon lb-gold-icon">👑</div>
              <h4 className="lb-gold-name">#01 IS UNCLAIMED</h4>
              <p>Sit at the very top of India's Builder Board.</p>
              <button className="lb-trophy-claim-open lb-gold-take-btn" onClick={() => onTakeSpot({ balance: 0, position: 1 })}>
                CLAIM #01 FOR ₹1 ↗
              </button>
            </div>
          )}
        </div>

        {/* #3 Bronze (Right) */}
        <div className="lb-trophy-card lb-trophy-card--3">
          <div className="lb-trophy-glow" />
          <div className="lb-trophy-top">
            <span className="lb-trophy-rank">#03 <IndianFlag width={16} height={11} /></span>
            <span className="lb-trophy-tier-badge">BRONZE TIER</span>
          </div>

          {top3 ? (
            <>
              <div
                className="lb-trophy-avatar-wrap lb-clickable"
                onClick={() => onSelectBuilder(top3)}
                title="View profile"
              >
                {top3.avatar ? (
                  <img className="lb-trophy-avatar" src={top3.avatar} alt="" />
                ) : (
                  <span className="lb-trophy-avatar lb-avatar-placeholder">{top3.name?.[0]}</span>
                )}
                <span className="lb-trophy-num-chip">3</span>
              </div>
              <h3
                className="lb-trophy-name lb-clickable"
                onClick={() => onSelectBuilder(top3)}
              >
                {top3.name}
              </h3>
              <p className="lb-trophy-handle">@{top3.handle}</p>
              {top3.state && <span className="lb-trophy-state-tag">{top3.state}</span>}
              {top3.bio && <p className="lb-trophy-bio">{top3.bio}</p>}

              {top3.projects && top3.projects.length > 0 && (
                <div className="lb-trophy-projects-mini">
                  {top3.projects.slice(0, 1).map((p, i) => (
                    <a
                      key={i}
                      href={p.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="lb-proj-chip"
                      onClick={(e) => e.stopPropagation()}
                    >
                      📦 {p.name} ↗
                    </a>
                  ))}
                </div>
              )}

              {top3.achievement && <div className="lb-trophy-achievement">⚡ {top3.achievement}</div>}
              <div className="lb-trophy-amount">{formatAmount(top3.balance)}</div>
              <button className="lb-trophy-take-btn" onClick={() => onTakeSpot(top3)}>
                TAKE #03 SPOT → {formatAmount(top3.balance + 1)}
              </button>
            </>
          ) : (
            <div className="lb-trophy-open">
              <div className="lb-trophy-open-icon">+</div>
              <h4>OPEN SPOT #03</h4>
              <p>No builder here yet.</p>
              <button className="lb-trophy-claim-open" onClick={() => onTakeSpot({ balance: 0, position: 3 })}>
                CLAIM #03 FOR ₹1 ↗
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════
   5. BUILDER PROFILE POPUP MODAL
   ═══════════════════════════════════════ */

function BuilderProfileModal({ builder, onClose, onTakeSpot }) {
  if (!builder) return null
  const isTopThree = builder.position <= 3

  return (
    <div className="lb-modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`lb-profile-modal ${isTopThree ? 'lb-profile-modal--top' : ''}`} role="dialog" aria-modal="true">
        <button className="lb-modal-close" onClick={onClose} aria-label="Close">×</button>

        <div className="lb-profile-modal-top">
          <div className="lb-profile-modal-rank-badge">
            #{String(builder.position).padStart(2, '0')} <IndianFlag width={18} height={12} />
            {builder.position === 1 && <span className="lb-profile-king-tag">👑 #01 IN INDIA</span>}
          </div>
          <div className="lb-profile-modal-secured">
            {formatAmount(builder.balance)} SECURED
          </div>
        </div>

        <div className="lb-profile-modal-header">
          <div className="lb-profile-modal-avatar-col">
            {builder.avatar ? (
              <img className="lb-profile-modal-avatar" src={builder.avatar} alt="" />
            ) : (
              <span className="lb-profile-modal-avatar lb-avatar-placeholder">{builder.name?.[0] || 'B'}</span>
            )}
          </div>

          <div className="lb-profile-modal-title-col">
            <h2 className="lb-profile-modal-name">
              {builder.name}
              {builder.handle && (
                <a
                  href={`https://x.com/${builder.handle}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="lb-profile-modal-x-btn"
                  title="View on X"
                >
                  <XLogo /> @{builder.handle} ↗
                </a>
              )}
            </h2>

            <div className="lb-profile-badges-row">
              {builder.state && (
                <span className="lb-profile-badge">
                  📍 {builder.state}
                </span>
              )}
              {builder.language && (
                <span className="lb-profile-badge">
                  🗣️ {builder.language}
                </span>
              )}
              {builder.achievement && (
                <span className="lb-profile-badge lb-profile-badge--achieve">
                  ⚡ {builder.achievement}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Motto Callout */}
        {builder.motto && (
          <div className="lb-profile-motto-box">
            <span className="lb-quote-mark">“</span>
            <p className="lb-profile-motto-text">{builder.motto}</p>
          </div>
        )}

        {/* Bio */}
        {builder.bio && (
          <div className="lb-profile-bio-wrap">
            <span className="lb-profile-section-label">WHAT THEY BUILD</span>
            <p className="lb-profile-bio">{builder.bio}</p>
          </div>
        )}

        {/* Projects / Startups / Websites */}
        {builder.projects && builder.projects.length > 0 && (
          <div className="lb-profile-projects-section">
            <span className="lb-profile-section-label">PROOF OF WORK ({builder.projects.length})</span>
            <div className="lb-profile-projects-grid">
              {builder.projects.map((proj, idx) => (
                <a
                  key={idx}
                  href={proj.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="lb-profile-proj-card"
                >
                  <div className="lb-profile-proj-header">
                    <strong>📦 {proj.name}</strong>
                    <span className="lb-proj-arrow">↗</span>
                  </div>
                  {proj.description && <p className="lb-profile-proj-desc">{proj.description}</p>}
                  <span className="lb-profile-proj-url">{proj.url.replace(/^https?:\/\//, '')}</span>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Social / External Links */}
        {builder.links && (builder.links.github || builder.links.linkedin || builder.links.website) && (
          <div className="lb-profile-links-wrap">
            <span className="lb-profile-section-label">CONNECT & CODE</span>
            <div className="lb-profile-links-row">
              {builder.links.github && (
                <a
                  href={`https://github.com/${builder.links.github.replace(/^https?:\/\/github\.com\//, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="lb-profile-link-btn"
                >
                  🐙 GitHub ↗
                </a>
              )}
              {builder.links.linkedin && (
                <a
                  href={builder.links.linkedin.startsWith('http') ? builder.links.linkedin : `https://linkedin.com/in/${builder.links.linkedin}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="lb-profile-link-btn"
                >
                  💼 LinkedIn ↗
                </a>
              )}
              {builder.links.website && (
                <a
                  href={builder.links.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="lb-profile-link-btn"
                >
                  🌐 Website ↗
                </a>
              )}
            </div>
          </div>
        )}

        {/* Challenge Action */}
        <div className="lb-profile-modal-footer">
          <div className="lb-profile-modal-action-note">
            This is the person you're trying to outrank. <em>Prove you deserve this spot more.</em>
          </div>
          <button
            className="lb-profile-take-spot-btn"
            onClick={() => {
              onClose()
              onTakeSpot(builder)
            }}
          >
            🔥 TAKE #{String(builder.position).padStart(2, '0')} SPOT → {formatAmount(builder.balance + 1)} ↗
          </button>
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════
   6. WHERE DO YOU THINK YOU BELONG? (FOMO BID ENGINE)
   ═══════════════════════════════════════ */

function BidSection({ entries, user, config, onOpenModal }) {
  const [amount, setAmount] = useState('5')
  const minBid = config.minBid || 1

  // Dynamic: cost of position K = max(1, balance_of_position_(K-1) - 1)
  const getPositionPrice = (pos) => {
    if (entries.length === 0) return 1
    const above = entries.find((e) => e.position === pos - 1)
    if (above) return Math.max(1, above.balance - 1)
    // If position above isn't occupied, find closest occupied above and subtract distance
    const closestAbove = [...entries].filter((e) => e.position < pos).sort((a, b) => b.position - a.position)[0]
    if (!closestAbove) return 1
    return Math.max(1, closestAbove.balance - (pos - closestAbove.position))
  }

  const targetExample = useMemo(() => {
    if (entries.length >= 3) {
      const e = entries[Math.min(entries.length - 1, 2)]
      return { pos: e.position, cost: e.balance, nextCost: e.balance + 1 }
    }
    if (entries.length > 0) {
      const last = entries[entries.length - 1]
      return { pos: last.position, cost: last.balance, nextCost: last.balance + 1 }
    }
    return { pos: 1, cost: 0, nextCost: 1 }
  }, [entries])

  const preview = useMemo(() => {
    const val = Number(amount)
    if (!val || val < 1) return null
    const me = entries.find((e) => e.id === user?.id)
    const myCurrent = me?.balance || 0
    const newBalance = myCurrent + val

    let pos = 1
    let leapfrogUser = null

    for (const entry of entries) {
      if (entry.id === user?.id) continue
      if (entry.balance >= newBalance) {
        pos++
      } else if (!leapfrogUser && entry.balance < newBalance) {
        leapfrogUser = entry
      }
    }
    return {
      position: pos,
      newBalance,
      leapfrogUser,
    }
  }, [amount, entries, user])

  const handleQuickSelect = (val) => {
    setAmount(String(val))
  }

  const handleTakeTopOne = () => {
    const topBal = entries[0]?.balance || 0
    const me = entries.find((e) => e.id === user?.id)
    const myCurrent = me?.balance || 0
    const needed = Math.max(1, topBal - myCurrent + 1)
    setAmount(String(needed))
  }

  const handleBidSubmit = () => {
    const val = Number(amount)
    if (!val || val < 1) return
    onOpenModal(val)
  }

  return (
    <section className="lb-bid-section" id="where-you-belong">
      <div className="lb-section-shell">
        <div className="lb-bid-container">
          <div className="lb-bid-left">
            <span className="lb-bid-eyebrow">⚡ THE FOMO CALCULATOR</span>
            <h2 className="lb-bid-title">WHERE DO YOU THINK YOU BELONG?</h2>

            <div className="lb-fomo-callout">
              <div className="lb-fomo-stat">
                <strong>#{String(targetExample.pos).padStart(2, '0')} is only {formatAmount(targetExample.cost)}.</strong>
                <span>Someone can take it for <strong>{formatAmount(targetExample.nextCost)}</strong> right now.</span>
              </div>
            </div>

            <p className="lb-bid-desc">
              Your payments accumulate. Every rupee increases your standing in the hierarchy. Pay more anytime to jump ahead of anyone.
            </p>

            {/* Quick preset buttons */}
            <div className="lb-preset-group">
              <span className="lb-preset-label">QUICK JUMPS:</span>
              <div className="lb-preset-buttons">
                <button
                  type="button"
                  className={`lb-preset-btn ${amount === '1' ? 'is-active' : ''}`}
                  onClick={() => handleQuickSelect(1)}
                >
                  ₹1 (Entry)
                </button>
                <button
                  type="button"
                  className={`lb-preset-btn ${amount === '20' ? 'is-active' : ''}`}
                  onClick={() => handleQuickSelect(20)}
                >
                  ₹20
                </button>
                <button
                  type="button"
                  className={`lb-preset-btn ${amount === '25' ? 'is-active' : ''}`}
                  onClick={() => handleQuickSelect(25)}
                >
                  ₹25
                </button>
                <button
                  type="button"
                  className={`lb-preset-btn ${amount === '50' ? 'is-active' : ''}`}
                  onClick={() => handleQuickSelect(50)}
                >
                  ₹50
                </button>
                <button
                  type="button"
                  className="lb-preset-btn lb-preset-gold"
                  onClick={handleTakeTopOne}
                >
                  👑 TAKE #01 SPOT
                </button>
              </div>
            </div>
          </div>

          {/* Interactive Calculator Card */}
          <div className="lb-bid-card">
            <div className="lb-bid-card-header">
              <span className="lb-card-label">ENTER CONVICTION</span>
              <span className="lb-card-min">MIN: {formatAmount(minBid)}</span>
            </div>

            <div className="lb-bid-input-wrap">
              <span className="lb-bid-currency">₹</span>
              <input
                className="lb-bid-input"
                type="number"
                min="1"
                placeholder={String(minBid)}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleBidSubmit()}
              />
            </div>

            {preview && (
              <div className="lb-bid-preview is-valid">
                <div className="lb-preview-rank-row">
                  <span className="lb-preview-label">PROJECTED RANK:</span>
                  <span className="lb-bid-preview-rank">
                    #{String(preview.position).padStart(2, '0')} <IndianFlag width={16} height={11} />
                  </span>
                </div>
                <div className="lb-preview-sub-row">
                  <span>Total Balance: <strong>{formatAmount(preview.newBalance)}</strong></span>
                  {preview.leapfrogUser && (
                    <span className="lb-leapfrog-tag">
                      🔥 Leaps over @{preview.leapfrogUser.handle || preview.leapfrogUser.name}
                    </span>
                  )}
                </div>
              </div>
            )}

            <button
              className="lb-bid-submit"
              disabled={!amount || Number(amount) < 1}
              onClick={handleBidSubmit}
            >
              {user
                ? `TAKE #${preview ? String(preview.position).padStart(2, '0') : 'SPOT'} → PAY ${formatAmount(Number(amount) || 0)}`
                : `CONNECT WITH X & TAKE #${preview ? String(preview.position).padStart(2, '0') : 'SPOT'}`} ↗
            </button>

            <p className="lb-bid-warning">
              ⚠️ <em>Someone less ambitious is currently occupying your spot. Don't enter if you're scared of getting outranked.</em>
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ═══════════════════════════════════════
   7. FULL BOARD (50-RANK STADIUM GRID)
   ═══════════════════════════════════════ */

function LeaderboardBoard({ entries, flashed, onTakeSpot, onSelectBuilder }) {
  const rows = entries.slice(3)
  const totalSlotsToShow = Math.max(15, entries.length + 5)
  const currentCount = entries.length
  const openSlotsCount = Math.max(0, totalSlotsToShow - currentCount)
  const openSlots = Array.from({ length: openSlotsCount }, (_, idx) => currentCount + idx + 1)

  // Dynamic pricing: cost of open position K = max(1, balance_of_position_(K-1) - 1)
  const getOpenSlotPrice = (pos) => {
    const above = entries.find((e) => e.position === pos - 1)
    if (above) return Math.max(1, above.balance - 1)
    const closestAbove = [...entries].filter((e) => e.position < pos).sort((a, b) => b.position - a.position)[0]
    if (!closestAbove) return 1
    return Math.max(1, closestAbove.balance - (pos - closestAbove.position))
  }

  return (
    <div className="lb-board-container">
      <div className="lb-board-header">
        <div className="lb-board-title">
          <h2>THE FULL HIERARCHY <IndianFlag width={20} height={13} /></h2>
          <span className="lb-board-count">{entries.length} CLAIMS RECORDED</span>
        </div>
        <div className="lb-board-live">
          <span className="lb-live-dot" />
          <span>REAL-TIME ARENA</span>
        </div>
      </div>

      <div className="lb-rows">
        {/* Real Builder Rows */}
        {rows.map((entry) => (
          <div
            className={`lb-row ${flashed.has(entry.id) ? 'lb-row--flash' : ''}`}
            key={entry.id}
            onClick={() => onSelectBuilder(entry)}
          >
            <div className="lb-row-rank">
              <span className="lb-rank-hash">#</span>
              <span className="lb-rank-digits">{String(entry.position).padStart(2, '0')}</span>
            </div>

            <div className="lb-row-avatar-col">
              {entry.avatar ? (
                <img className="lb-row-avatar" src={entry.avatar} alt="" />
              ) : (
                <span className="lb-row-avatar lb-avatar-placeholder">{entry.name?.[0]}</span>
              )}
            </div>

            <div className="lb-row-info">
              <div className="lb-row-name-line">
                <span className="lb-row-name">{entry.name}</span>
                <IndianFlag width={15} height={10} />
                {entry.state && <span className="lb-state-pill">{entry.state}</span>}
              </div>
              <div className="lb-row-meta">
                <a
                  href={`https://x.com/${entry.handle}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="lb-row-handle"
                  onClick={(e) => e.stopPropagation()}
                >
                  @{entry.handle}
                </a>
                {entry.projects && entry.projects.length > 0 && (
                  <span className="lb-row-proj-tag">
                    📦 {entry.projects[0].name}
                  </span>
                )}
                {entry.achievement && <span className="lb-row-flex">⚡ {entry.achievement}</span>}
              </div>
            </div>

            <div className="lb-row-right">
              <div className="lb-row-amount">{formatAmount(entry.balance)}</div>
              <button
                className="lb-row-take-btn"
                onClick={(e) => {
                  e.stopPropagation()
                  onTakeSpot(entry)
                }}
              >
                TAKE SPOT → {formatAmount(entry.balance + 1)}
              </button>
            </div>
          </div>
        ))}

        {/* Open Stadium Slots */}
        {openSlots.map((pos) => {
          const slotPrice = getOpenSlotPrice(pos)
          return (
          <div className="lb-row lb-row--open" key={`open-${pos}`}>
            <div className="lb-row-rank lb-open-rank">
              <span className="lb-rank-hash">#</span>
              <span className="lb-rank-digits">{String(pos).padStart(2, '0')}</span>
            </div>

            <div className="lb-row-avatar-col">
              <span className="lb-open-avatar-slot">+</span>
            </div>

            <div className="lb-row-info">
              <div className="lb-open-name-line">
                <span className="lb-open-title">OPEN POSITION #{String(pos).padStart(2, '0')}</span>
                <span className="lb-open-tag">UNCLAIMED</span>
              </div>
              <div className="lb-open-meta">
                <span>Grab this spot in India's builder hierarchy for just {formatAmount(slotPrice)}.</span>
              </div>
            </div>

            <div className="lb-row-right">
              <span className="lb-open-price">{formatAmount(slotPrice)}</span>
              <button
                className="lb-open-claim-btn"
                onClick={() => onTakeSpot({ balance: slotPrice - 1, position: pos })}
              >
                CLAIM SPOT ↗
              </button>
            </div>
          </div>
          )
        })}
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════
   8. LIVE ACTIVITY STREAM
   ═══════════════════════════════════════ */

function LiveActivity({ events, entries }) {
  const displayList = useMemo(() => {
    if (events && events.length > 0) return events.slice(0, 15)
    return entries.slice(0, 5).map((e) => ({
      id: e.id,
      userHandle: e.handle || e.name,
      userName: e.name,
      type: e.position === 1 ? 'reclaim' : 'claim',
      position: e.position,
      newBalance: e.balance,
      timeStr: timeAgo(e.lastPaidAt),
    }))
  }, [events, entries])

  return (
    <section className="lb-activity">
      <div className="lb-section-shell">
        <div className="lb-activity-header">
          <div className="lb-activity-title">
            <span className="lb-live-dot" />
            <h3>ARENA BATTLE LOG <IndianFlag width={18} height={12} /></h3>
          </div>
          <span className="lb-activity-badge">LIVE EVENT STREAM</span>
        </div>

        <div className="lb-activity-list">
          {displayList.map((event, i) => (
            <div className="lb-activity-item" key={event.id || i}>
              <span className={`lb-activity-tag lb-activity-tag--${event.type || 'claim'}`}>
                {event.type === 'reclaim' ? '🔥 OUTBID' : event.type === 'topup' ? '⚡ BOOST' : '⚔️ CLAIM'}
              </span>
              <span className="lb-activity-user">
                @{event.userHandle || event.userName || 'builder'}
              </span>
              <span className="lb-activity-desc">
                {event.type === 'reclaim' && 'retook position'}
                {event.type === 'topup' && 'climbed to'}
                {(!event.type || event.type === 'claim') && 'secured position'}
              </span>
              <strong className="lb-activity-rank">#{String(event.position).padStart(2, '0')}</strong>
              <span className="lb-activity-amount">· {formatAmount(event.newBalance || event.amount || 10)}</span>
              <span className="lb-activity-time">{event.timeStr || timeAgo(event.timestamp)}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ═══════════════════════════════════════
   9. HOW IT WORKS / ARENA RULES
   ═══════════════════════════════════════ */

function HowItWorks() {
  return (
    <section className="lb-how" id="how-lb-works">
      <div className="lb-section-shell">
        <div className="lb-how-header">
          <span className="lb-how-tag"><IndianFlag width={16} height={11} /> SAVAGE RULES</span>
          <h3>HOW THE ARENA WORKS</h3>
          <p>No algorithms. No paywalled nepotism. Pure proof of conviction.</p>
        </div>

        <div className="lb-how-steps">
          <div className="lb-how-step">
            <div className="lb-how-num">01</div>
            <h4>Connect with X</h4>
            <p>Your X identity is your public builder card. Connect once, you enter the national arena.</p>
          </div>
          <div className="lb-how-step">
            <div className="lb-how-num">02</div>
            <h4>Pay & Take Any Spot</h4>
            <p>Starting at just ₹1. Your balance accumulates — pay more anytime to climb higher.</p>
          </div>
          <div className="lb-how-step">
            <div className="lb-how-num">03</div>
            <h4>Someone Outbids You? Fight Back.</h4>
            <p>Nobody stays safe. When someone steals your rank, pay the difference + ₹1 to push them down.</p>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ═══════════════════════════════════════
   10. WIN CONFIRMATION SCREEN (X EXCLUSIVE WEAPON)
   ═══════════════════════════════════════ */

function SuccessReveal({ position, balance, user, entries, profile, onClose }) {
  const cardRef = useRef(null)
  const [generating, setGenerating] = useState(false)
  const [shareNotice, setShareNotice] = useState('')

  const posFormatted = String(position).padStart(2, '0')
  const amtFormatted = Number(balance).toLocaleString('en-IN')

  // Resolve identity: prefer fresh profile from bid flow, fallback to leaderboard entry
  const me = entries?.find((e) => e.id === user?.id)
  const displayName = profile?.name || me?.name || user?.name || 'Indian Builder'
  const displayHandle = user?.handle || me?.handle || 'builder'
  const displayState = profile?.state || me?.state || ''
  const displayLanguage = profile?.language || me?.language || ''
  const displayMotto = profile?.motto || me?.motto || ''
  const displayBio = profile?.bio || me?.bio || ''

  // Extract just the native script from language string like "Kannada (ಕನ್ನಡ)"
  const nativeScript = displayLanguage ? (displayLanguage.match(/\(([^)]+)\)/)?.[1] || displayLanguage) : ''

  // Random selection of savage post template
  const shareTemplate = useMemo(() => pickRandom(SUCCESS_SHARE_VARIANTS), [])
  const shareText = useMemo(() => {
    return shareTemplate
      .replace(/#{pos}/g, `#${posFormatted}`)
      .replace(/{amt}/g, amtFormatted)
  }, [shareTemplate, posFormatted, amtFormatted])

  const shareUrl = `https://x.com/intent/post?text=${encodeURIComponent(shareText)}`

  // Proud victory headline — randomly selected from PROUD_VICTORY_COPY
  const proudHeadline = useMemo(() => {
    const template = pickRandom(PROUD_VICTORY_COPY)
    return template.replace(/#{pos}/g, `#${posFormatted}`)
  }, [posFormatted])

  // Helper to generate high-resolution PNG of the builder card
  const generateCardBlob = async () => {
    if (!cardRef.current) return null
    try {
      const canvas = await html2canvas(cardRef.current, {
        scale: 2.5,
        backgroundColor: '#0c0f14',
        useCORS: true,
        allowTaint: true,
        logging: false,
      })
      return new Promise((resolve) => canvas.toBlob(resolve, 'image/png'))
    } catch (err) {
      console.error('Failed to capture builder card:', err)
      return null
    }
  }

  // Primary Action: Share on X (downloads sticker card + opens x.com/intent/post)
  const handleShareOnX = async () => {
    setGenerating(true)
    setShareNotice('Generating your builder card…')

    try {
      const blob = await generateCardBlob()
      if (blob) {
        const fileName = `vyomirtha-rank-${posFormatted}-${displayHandle}.png`

        // 1. Download the high-res sticker PNG directly
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = fileName
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        setTimeout(() => URL.revokeObjectURL(url), 2000)

        // 2. Also attempt to copy image to clipboard
        try {
          if (navigator.clipboard && window.ClipboardItem) {
            await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
          }
        } catch (clipErr) {
          console.warn('Clipboard write failed:', clipErr)
        }

        setShareNotice('👑 Builder card saved & copied! Attach your card image to flex on X.')
      }

      // 3. Open X post composer
      window.open(shareUrl, '_blank', 'noopener,noreferrer')
    } catch (err) {
      console.error('Share on X failed:', err)
      window.open(shareUrl, '_blank', 'noopener,noreferrer')
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="lb-success-backdrop">
      <ConfettiCanvas />
      <div className="lb-success-panel" role="dialog" aria-modal="true">
        <button className="lb-modal-close" onClick={onClose} aria-label="Close">×</button>

        <div className="lb-success-confetti">🎉 <IndianFlag width={32} height={21} /> ⚡</div>

        <div className="lb-success-hero-tag">
          <IndianFlag width={18} height={12} /> YOU'RE IN THE ARENA
        </div>

        {/* ── Buyer-First Identity Card ── */}
        <div className="lb-trophy-share-card" ref={cardRef}>
          <div className="lb-trophy-share-card-header">
            <span className="lb-trophy-share-brand">VYOMIRTHA ARENA <IndianFlag width={14} height={9} /></span>
            <span className="lb-trophy-share-nat">INDIA'S BUILDER BOARD</span>
          </div>

          <div className="lb-trophy-share-card-body">
            <h2 className="lb-trophy-share-rank">#{posFormatted}</h2>
            <div className="lb-trophy-share-user">
              {user?.avatar && <img src={user.avatar} alt="" className="lb-trophy-share-avatar" />}
              <div className="lb-trophy-share-user-info">
                <strong>{displayName} <IndianFlag width={14} height={9} /></strong>
                <span>@{displayHandle}{displayBio ? ` · ${displayBio}` : ''}</span>
              </div>
            </div>
            <div className="lb-trophy-share-amount">{formatAmount(balance)} SECURED</div>
          </div>

          {/* State + Language row */}
          {(displayState || nativeScript) && (
            <div className="lb-trophy-share-identity">
              <IndianFlag width={12} height={8} />
              <span>
                {displayState}{displayState && nativeScript ? ' · ' : ''}{nativeScript}
              </span>
            </div>
          )}

          {/* Personal motto */}
          {displayMotto ? (
            <div className="lb-trophy-share-motto">
              “{displayMotto}”
            </div>
          ) : (
            <div className="lb-trophy-share-motto">
              “Proof of work over proof of talk. Built in India 🇮🇳”
            </div>
          )}
        </div>

        {/* ── Proud Victory Headline ── */}
        <p className="lb-success-savage-headline">
          {proudHeadline}
        </p>

        {/* ── X Share Action ── */}
        <div className="lb-success-actions">
          <button
            className="lb-weapon-share-btn"
            onClick={handleShareOnX}
            disabled={generating}
          >
            <XLogo /> {generating ? 'PREPARING CARD STICKER…' : 'SHARE YOUR SPOT ON X ↗'}
          </button>

          {shareNotice && (
            <div className="lb-share-notice-pill">
              {shareNotice}
            </div>
          )}

          <button className="lb-back-btn" onClick={onClose}>
            Back to arena leaderboard ↗
          </button>
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════
   11. MULTI-STEP BID MODAL (USEFUL BUILDER ONBOARDING)
   ═══════════════════════════════════════ */

function BidModal({ isOpen, onClose, user, entries, initialAmount, onLogin }) {
  const [step, setStep] = useState(0)
  const [amount, setAmount] = useState(initialAmount || '25')
  const [profile, setProfile] = useState({
    name: '',
    state: '',
    language: '',
    bio: '',
    motto: '',
    achievement: '',
    projects: [{ name: '', url: '', description: '' }],
    website: '',
    github: '',
    linkedin: '',
  })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState(null)

  useEffect(() => {
    if (isOpen) {
      setStep(user ? 0 : -1)
      setAmount(initialAmount || '25')
      setError('')
      setResult(null)
    }
  }, [isOpen, initialAmount, user])

  useEffect(() => {
    if (user) {
      const me = entries.find((e) => e.id === user.id)
      if (me) {
        setProfile({
          name: me.name || user.name || '',
          state: me.state || '',
          language: me.language || '',
          bio: me.bio || '',
          motto: me.motto || '',
          achievement: me.achievement || '',
          projects: me.projects && me.projects.length > 0 ? me.projects : [{ name: '', url: '', description: '' }],
          website: me.links?.website || '',
          github: me.links?.github || '',
          linkedin: me.links?.linkedin || '',
        })
      } else {
        setProfile((p) => ({
          ...p,
          name: user.name || '',
        }))
      }
    }
  }, [user, entries])

  if (!isOpen) return null

  const previewPosition = (() => {
    const val = Number(amount)
    if (!val || val < 1) return null
    const me = entries.find((e) => e.id === user?.id)
    const newBalance = (me?.balance || 0) + val
    let pos = 1
    for (const entry of entries) {
      if (entry.id === user?.id) continue
      if (entry.balance >= newBalance) pos++
    }
    return { position: pos, newBalance }
  })()

  const handleAddProject = () => {
    setProfile((p) => ({
      ...p,
      projects: [...p.projects, { name: '', url: '', description: '' }],
    }))
  }

  const handleProjectChange = (index, field, value) => {
    setProfile((p) => {
      const updated = [...p.projects]
      updated[index] = { ...updated[index], [field]: value }
      return { ...p, projects: updated }
    })
  }

  const handleRemoveProject = (index) => {
    setProfile((p) => ({
      ...p,
      projects: p.projects.filter((_, i) => i !== index),
    }))
  }

  const handleProfileSave = async () => {
    setError('')
    const validProjects = profile.projects
      .filter((p) => p.name.trim() || p.url.trim())
      .map((p) => ({
        name: p.name.trim(),
        url: p.url.trim(),
        description: p.description.trim(),
      }))

    try {
      await updateProfile({
        name: profile.name.trim() || user?.name || 'Indian Builder',
        state: profile.state,
        language: profile.language,
        bio: profile.bio.trim(),
        motto: profile.motto.trim(),
        achievement: profile.achievement.trim(),
        projects: validProjects,
        links: {
          website: profile.website.trim(),
          github: profile.github.trim(),
          linkedin: profile.linkedin.trim(),
        },
      })
      setStep(2)
    } catch (e) {
      console.error('Failed to update profile:', e)
      setError(e.message || 'Failed to update profile. Please try logging in again.')
    }
  }

  const handlePay = async () => {
    const val = Number(amount)
    if (!val || val < 1) return setError('Enter a valid amount.')
    setBusy(true)
    setError('')
    try {
      const orderResp = await createOrder(val)
      const { orderId, paymentSessionId, environment, simulated } = orderResp

      if (simulated || (paymentSessionId && paymentSessionId.startsWith('session_sim_'))) {
        const verification = await verifyPayment(orderId)
        setResult({
          position: verification.position || 1,
          balance: verification.balance || val,
          amount: verification.amount || val,
        })
        setStep(4)
        return
      }

      const cashfreeEnv = environment === 'PROD' ? 'production' : 'sandbox'

      if (window.Cashfree) {
        const cashfree = window.Cashfree({ mode: cashfreeEnv })
        const checkoutRes = await cashfree.checkout({ paymentSessionId, redirectTarget: '_modal' })

        if (checkoutRes?.error) {
          setError(checkoutRes.error.message || 'Payment was cancelled or failed.')
          setBusy(false)
          return
        }

        const verification = await verifyPayment(orderId)
        if (verification.status === 'completed') {
          setResult({
            position: verification.position,
            balance: verification.balance,
            amount: verification.amount,
          })
          setStep(4)
        } else {
          setError('Payment verification pending. Your position will update shortly.')
        }
      } else {
        setError('Payment gateway is loading. Please retry in a moment.')
      }
    } catch (e) {
      setError(e.message || 'Payment creation failed.')
    } finally {
      setBusy(false)
    }
  }

  const totalSteps = 3
  const currentStep = Math.max(0, Math.min(step, totalSteps - 1))

  return (
    <div className="lb-modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="lb-modal" role="dialog" aria-modal="true">
        <button className="lb-modal-close" onClick={onClose} aria-label="Close">×</button>

        {step < 3 && step >= 0 && (
          <div className="lb-modal-step">
            {Array.from({ length: totalSteps }, (_, i) => (
              <span key={i} className={`${i <= currentStep ? 'is-active' : ''} ${i < currentStep ? 'is-done' : ''}`} />
            ))}
          </div>
        )}

        {/* Auth required */}
        {step === -1 && (
          <div className="lb-modal-auth">
            <span className="lb-modal-auth-flag"><IndianFlag width={48} height={32} /></span>
            <h2>CONNECT WITH X TO ENTER</h2>
            <p>Your X handle is your public badge in India's builder hierarchy.</p>
            <button className="lb-connect-btn lb-connect-btn--large" onClick={onLogin}>
              <XLogo /> Connect with X
            </button>
          </div>
        )}

        {/* Step 0: Amount */}
        {step === 0 && (
          <>
            <h2>ENTER THE ARENA</h2>
            <p>Payments accumulate. Enter any amount to claim your target rank.</p>
            <div className="lb-bid-input-wrap">
              <span className="lb-bid-currency">₹</span>
              <input
                className="lb-bid-input"
                type="number"
                min="1"
                placeholder="25"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                autoFocus
              />
            </div>
            {previewPosition && (
              <div className="lb-bid-preview is-valid">
                <span className="lb-bid-preview-rank">→ PROJECTED: #{String(previewPosition.position).padStart(2, '0')} <IndianFlag width={15} height={10} /></span>
                <span className="lb-bid-preview-cost">Accumulated Balance: {formatAmount(previewPosition.newBalance)}</span>
              </div>
            )}
            {error && <p className="lb-modal-error">{error}</p>}
            <div className="lb-modal-actions">
              <button
                className="button button--primary"
                disabled={!amount || Number(amount) < 1}
                onClick={() => { if (Number(amount) >= 1) { setError(''); setStep(1) } else setError('Enter at least ₹1') }}
              >
                Next: Your Proof of Work ↗
              </button>
            </div>
          </>
        )}

        {/* Step 1: Useful Builder Identity Onboarding */}
        {step === 1 && (
          <>
            <h2>YOUR BUILDER IDENTITY</h2>
            <p className="lb-modal-subtext">
              This isn't just a popularity board. Show visitors what you have actually built so they know whether you deserve your rank.
            </p>

            <div className="lb-modal-form">
              {/* Full Name & X Handle */}
              <div className="lb-modal-row">
                <label>
                  <span>FULL NAME</span>
                  <input
                    value={profile.name}
                    onChange={(e) => setProfile((p) => ({ ...p, name: e.target.value }))}
                    placeholder="Your Full Name"
                  />
                </label>
                <label>
                  <span>X USERNAME</span>
                  <input
                    value={`@${user?.handle || ''}`}
                    disabled
                    style={{ opacity: 0.7, cursor: 'not-allowed' }}
                  />
                </label>
              </div>

              {/* State & Native Language Dropdowns */}
              <div className="lb-modal-row">
                <label>
                  <span>STATE / UT <IndianFlag width={13} height={9} /></span>
                  <select
                    className="lb-select-input"
                    value={profile.state}
                    onChange={(e) => setProfile((p) => ({ ...p, state: e.target.value }))}
                  >
                    <option value="">Select your State</option>
                    {INDIAN_STATES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </label>

                <label>
                  <span>NATIVE LANGUAGE</span>
                  <select
                    className="lb-select-input"
                    value={profile.language}
                    onChange={(e) => setProfile((p) => ({ ...p, language: e.target.value }))}
                  >
                    <option value="">Select Native Language</option>
                    {NATIVE_LANGUAGES.map((l) => (
                      <option key={l} value={l}>{l}</option>
                    ))}
                  </select>
                </label>
              </div>

              {/* Short Bio */}
              <label>
                <span>WHAT DO YOU BUILD / WHAT DO YOU DO?</span>
                <textarea
                  value={profile.bio}
                  onChange={(e) => setProfile((p) => ({ ...p, bio: e.target.value }))}
                  placeholder="e.g. Shipping agentic pipelines and developer tools in public."
                  rows={2}
                />
              </label>

              {/* Motto */}
              <label>
                <span>MOTTO (ONE INSPIRATIONAL SENTENCE)</span>
                <input
                  value={profile.motto}
                  onChange={(e) => setProfile((p) => ({ ...p, motto: e.target.value }))}
                  placeholder="e.g. Building systems that scale across a billion Indians."
                />
              </label>

              {/* Projects / Startups / Websites */}
              <div className="lb-projects-form-group">
                <div className="lb-projects-form-header">
                  <span className="lb-form-section-title">PROJECTS / STARTUPS / WEBSITES</span>
                  <button type="button" className="lb-add-proj-btn" onClick={handleAddProject}>
                    + Add Project
                  </button>
                </div>

                {profile.projects.map((proj, idx) => (
                  <div key={idx} className="lb-project-entry-box">
                    <div className="lb-modal-row">
                      <input
                        placeholder="Project Name (e.g. DevForge)"
                        value={proj.name}
                        onChange={(e) => handleProjectChange(idx, 'name', e.target.value)}
                      />
                      <input
                        placeholder="URL (https://yourproduct.com)"
                        value={proj.url}
                        onChange={(e) => handleProjectChange(idx, 'url', e.target.value)}
                      />
                    </div>
                    <div className="lb-proj-desc-row">
                      <input
                        placeholder="Short description (e.g. Distributed workflow orchestrator)"
                        value={proj.description}
                        onChange={(e) => handleProjectChange(idx, 'description', e.target.value)}
                      />
                      {profile.projects.length > 1 && (
                        <button
                          type="button"
                          className="lb-remove-proj-btn"
                          onClick={() => handleRemoveProject(idx)}
                          title="Remove project"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Optional Achievement Metric */}
              <label>
                <span>KEY METRIC / ACHIEVEMENT (OPTIONAL)</span>
                <input
                  value={profile.achievement}
                  onChange={(e) => setProfile((p) => ({ ...p, achievement: e.target.value }))}
                  placeholder="e.g. 1.4k ⭐ on GitHub / $8k MRR"
                />
              </label>

              {/* Links */}
              <div className="lb-modal-row">
                <label>
                  <span>GITHUB USERNAME</span>
                  <input
                    value={profile.github}
                    onChange={(e) => setProfile((p) => ({ ...p, github: e.target.value }))}
                    placeholder="octocat"
                  />
                </label>
                <label>
                  <span>LINKEDIN URL OR HANDLE</span>
                  <input
                    value={profile.linkedin}
                    onChange={(e) => setProfile((p) => ({ ...p, linkedin: e.target.value }))}
                    placeholder="in/username"
                  />
                </label>
              </div>
            </div>

            {error && <p className="lb-modal-error">{error}</p>}

            <div className="lb-modal-actions">
              <button className="button button--outline" onClick={() => setStep(0)}>Back</button>
              <button className="button button--primary" onClick={handleProfileSave}>Review & Claim ↗</button>
            </div>
          </>
        )}

        {/* Step 2: Review */}
        {step === 2 && (
          <>
            <h2>CONFIRM YOUR TAKEOVER</h2>
            <p>Review your rank target and status card before completing payment.</p>
            <div className="lb-preview-card">
              <div className="lb-preview-header">
                <span className="lb-preview-rank">#{previewPosition ? String(previewPosition.position).padStart(2, '0') : '--'}</span>
                {user?.avatar
                  ? <img className="lb-preview-avatar" src={user.avatar} alt="" />
                  : <span className="lb-preview-avatar lb-avatar-placeholder" style={{ width: 44, height: 44, fontSize: 18 }}>{user?.name?.[0]}</span>
                }
                <div>
                  <h4 className="lb-preview-name">{profile.name || user?.name} <IndianFlag width={15} height={10} /></h4>
                  <span className="lb-preview-handle">@{user?.handle} {profile.state && `· ${profile.state}`}</span>
                </div>
                <span className="lb-preview-amount">{formatAmount(previewPosition?.newBalance)}</span>
              </div>
              {profile.bio && <p className="lb-preview-bio">{profile.bio}</p>}
              {profile.projects && profile.projects.length > 0 && profile.projects[0].name && (
                <div className="lb-preview-projs">
                  <strong>📦 {profile.projects[0].name}</strong> — {profile.projects[0].url}
                </div>
              )}
            </div>
            <div className="lb-bid-preview is-valid" style={{ marginBottom: 20 }}>
              <span>Payment: <strong>{formatAmount(Number(amount))}</strong></span>
              <span className="lb-bid-preview-rank">→ #{previewPosition ? String(previewPosition.position).padStart(2, '0') : '--'} <IndianFlag width={15} height={10} /></span>
            </div>
            {error && <p className="lb-modal-error">{error}</p>}
            <div className="lb-modal-actions">
              <button className="button button--outline" onClick={() => setStep(1)}>Back</button>
              <button className="button button--primary" disabled={busy} onClick={handlePay}>
                {busy ? 'Securing Spot…' : `Pay ${formatAmount(Number(amount))} & Take Rank`} ↗
              </button>
            </div>
          </>
        )}

        {/* Step 3: Paying */}
        {step === 3 && (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <h2>PROCESSING TRANSACTION…</h2>
            <p>Complete payment in the checkout window.</p>
          </div>
        )}

        {/* Step 4: Success */}
        {step === 4 && result && (
          <SuccessReveal
            position={result.position}
            balance={result.balance}
            user={user}
            entries={entries}
            profile={profile}
            onClose={onClose}
          />
        )}
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════
   12. OUTBID ALERT BANNER
   ═══════════════════════════════════════ */

function OutbidNotification({ oldPosition, newPosition, outbidBy, reclaimAmount, onTakeBack, onDismiss }) {
  const copy = useMemo(() => {
    const template = pickRandom(OUTBID_COPY)
    return template
      .replace(/#\{pos\}/g, `#${newPosition}`)
      .replace(/#\{old\}/g, `#${oldPosition}`)
  }, [oldPosition, newPosition])

  return (
    <div className="lb-outbid" role="alert">
      <button className="lb-outbid-dismiss" onClick={onDismiss} aria-label="Dismiss">×</button>
      <p className="lb-outbid-title">🚨 YOU GOT PUSHED TO #{newPosition}!</p>
      {outbidBy && <p className="lb-outbid-by">Overtaken by <strong>@{outbidBy}</strong></p>}
      <p className="lb-outbid-copy">{copy}</p>
      <button className="lb-outbid-take" onClick={onTakeBack}>
        TAKE IT BACK → {formatAmount(reclaimAmount || 10)} ↗
      </button>
    </div>
  )
}

/* ═══════════════════════════════════════
   13. FOOTER
   ═══════════════════════════════════════ */

function LeaderboardFooter() {
  const scrollToSection = (id) => {
    const el = document.getElementById(id)
    if (el) el.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <footer className="lb-footer lb-section-shell">
      <div className="lb-footer-brand">
        <a
          className="brand"
          href="/leaderboard"
          onClick={(e) => {
            e.preventDefault()
            window.scrollTo({ top: 0, behavior: 'smooth' })
          }}
        >
          <span>VYOMIRTHA <i>ARENA</i></span>
        </a>
        <span>India's Builder Board · <IndianFlag width={15} height={10} /> © {new Date().getFullYear()}</span>
      </div>
      <div className="lb-footer-links">
        <a
          href="/"
          onClick={(e) => {
            e.preventDefault()
            window.history.pushState({}, '', '/')
            window.dispatchEvent(new Event('popstate'))
          }}
        >
          Waitlist
        </a>
        <button
          type="button"
          className="lb-nav-link"
          onClick={() => scrollToSection('where-you-belong')}
        >
          Bid Arena
        </button>
        <button
          type="button"
          className="lb-nav-link"
          onClick={() => scrollToSection('how-lb-works')}
        >
          Rules
        </button>
      </div>
    </footer>
  )
}

/* ═══════════════════════════════════════
   MAIN LEADERBOARD PAGE COMPONENT
   ═══════════════════════════════════════ */

export default function LeaderboardPage() {
  const { user, login, logout, authError, clearAuthError } = useXAuth()
  const { leaderboard, loading, flashed } = useLeaderboard()
  const events = useActivity()
  const config = useConfig()

  const [modalOpen, setModalOpen] = useState(false)
  const [modalAmount, setModalAmount] = useState('25')
  const [selectedBuilder, setSelectedBuilder] = useState(null)
  const [outbid, setOutbid] = useState(null)

  const prevPositionRef = useRef(null)
  useEffect(() => {
    if (!user) return
    const me = leaderboard.find((e) => e.id === user.id)
    if (!me) return
    const prevPos = prevPositionRef.current
    if (prevPos !== null && me.position > prevPos) {
      // Find who is now sitting above the user
      const occupant = leaderboard.find((e) => e.position === prevPos)
      const myBal = me.balance || 0
      const occBal = occupant?.balance || 0
      const needed = Math.max(1, occBal - myBal + 1)
      setOutbid({
        oldPosition: prevPos,
        newPosition: me.position,
        outbidBy: occupant?.handle || occupant?.name || 'someone',
        reclaimAmount: needed,
      })
    }
    prevPositionRef.current = me.position
  }, [leaderboard, user])

  const topUser = leaderboard[0] || null

  const handleClaim = () => {
    setModalAmount('25')
    setModalOpen(true)
  }

  const handleTakeSpot = (entry) => {
    const me = leaderboard.find((e) => e.id === user?.id)
    const myBalance = me?.balance || 0
    const needed = Math.max(1, (entry.balance || 0) - myBalance + 1)
    setModalAmount(String(needed))
    setModalOpen(true)
  }

  const handleOutbidTakeBack = () => {
    const amt = outbid?.reclaimAmount || 25
    setOutbid(null)
    setModalAmount(String(amt))
    setModalOpen(true)
  }

  return (
    <div className="lb-page">
      {/* Top Header */}
      <LeaderboardHeader user={user} onLogin={login} onLogout={logout} />

      {/* Social Proof Strip (Live counts, Marquee Battle Ticker, Total Board ₹) */}
      <LiveArenaStrip
        entries={leaderboard}
        events={events}
        onOpenModal={(amt) => { setModalAmount(String(amt)); setModalOpen(true) }}
      />

      <main>
        {authError && (
          <div className="lb-auth-error-banner">
            <span>⚠️ <strong>X Auth Error:</strong> {authError}</span>
            <button onClick={clearAuthError} aria-label="Dismiss">✕</button>
          </div>
        )}

        {/* 1. Savage Aggressive Hero */}
        <LeaderboardHero
          topUser={topUser}
          user={user}
          onClaim={handleClaim}
          onTakeSpot={handleTakeSpot}
          onSelectBuilder={setSelectedBuilder}
        />

        {/* 2. Top 3 Status Trophy Podium */}
        <section className="lb-section">
          <div className="lb-section-shell">
            <TopThreeShowcase
              entries={leaderboard.slice(0, 3)}
              onTakeSpot={handleTakeSpot}
              onSelectBuilder={setSelectedBuilder}
            />
          </div>
        </section>

        {/* 3. Where Do You Think You Belong? (FOMO Bid Engine) */}
        <BidSection
          entries={leaderboard}
          user={user}
          config={config}
          onOpenModal={(amount) => { setModalAmount(String(amount)); setModalOpen(true) }}
        />

        {/* 4. Full Board (50-Rank Stadium Grid) */}
        <section className="lb-section">
          <div className="lb-section-shell">
            <LeaderboardBoard
              entries={leaderboard}
              flashed={flashed}
              onTakeSpot={handleTakeSpot}
              onSelectBuilder={setSelectedBuilder}
            />
          </div>
        </section>

        {/* 5. Live Arena Battle Activity Stream */}
        <LiveActivity events={events} entries={leaderboard} />

        {/* 6. Arena Rules / How It Works */}
        <HowItWorks />
      </main>

      <LeaderboardFooter />

      {/* Payment / Onboarding Modal */}
      <BidModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        user={user}
        entries={leaderboard}
        initialAmount={modalAmount}
        onLogin={login}
      />

      {/* Builder Profile Popup Modal */}
      <BuilderProfileModal
        builder={selectedBuilder}
        onClose={() => setSelectedBuilder(null)}
        onTakeSpot={handleTakeSpot}
      />

      {/* Outbid Alert Notification */}
      {outbid && (
        <OutbidNotification
          oldPosition={outbid.oldPosition}
          newPosition={outbid.newPosition}
          outbidBy={outbid.outbidBy}
          reclaimAmount={outbid.reclaimAmount}
          onTakeBack={handleOutbidTakeBack}
          onDismiss={() => setOutbid(null)}
        />
      )}
    </div>
  )
}
