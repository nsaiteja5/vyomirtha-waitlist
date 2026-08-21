import { useEffect, useMemo, useRef, useState } from 'react'
import { getFoundingAccess, joinWaitlist, sendContact, subscribeToFoundingAccess } from './api.js'
import xLogo from '../x.png'

const stages = [
  { number: '01', label: 'Define your ICP', detail: 'B2B SaaS · 10–50 people · US / EU', type: 'profile' },
  { number: '02', label: 'Listen for relevant posts', detail: '12,481 posts matching your ICP', type: 'stream' },
  { number: '03', label: 'Add account history', detail: 'Historical behavior adds context', type: 'history' },
  { number: '04', label: 'Find matching accounts', detail: '1,284 accounts match your ICP', type: 'accounts' },
  { number: '05', label: 'Understand current state', detail: 'One account, across time', type: 'timeline' },
  { number: '06', label: 'Flag potential buyers', detail: 'Accounts with a problem you can solve.', type: 'priority' },
]

const fragments = [
  { id: 'a', name: 'Mira Chen', handle: '@mirafromops', time: '18m', copy: 'Has anyone moved away from Mixpanel lately?', stats: ['3', '11', '29'], depth: 'far' },
  { id: 'b', name: 'Leo Hart', handle: '@leohart', time: '31m', copy: 'Pricing is getting harder to justify as the team grows.', stats: ['6', '14', '47'], depth: 'mid' },
  { id: 'c', name: 'Aisha Khan', handle: '@aishak', time: '44m', copy: 'Looking for a recommendation from teams at our stage.', stats: ['2', '8', '28'], depth: 'near' },
  { id: 'd', name: 'Ravi Mehta', handle: '@ravimehta', time: '1h', copy: 'Revisiting the analytics stack before our next planning cycle.', stats: ['1', '7', '18'], depth: 'far' },
  { id: 'e', name: 'Sarah White', handle: '@sarahw', time: '2h', copy: 'Does anyone have experience migrating without losing history?', stats: ['4', '12', '33'], depth: 'mid' },
  { id: 'f', name: 'Product notes', handle: '@notesbyjo', time: '3h', copy: 'The reporting workflow is the real issue—not the dashboard.', stats: ['5', '15', '41'], depth: 'far' },
]

const gridColumns = 16
const gridRows = 10

function baselineRow(row) {
  return `M 0 ${(row / (gridRows - 1) * 100).toFixed(2)} L 100 ${(row / (gridRows - 1) * 100).toFixed(2)}`
}

function baselineColumn(column) {
  return `M ${(column / (gridColumns - 1) * 100).toFixed(2)} 0 L ${(column / (gridColumns - 1) * 100).toFixed(2)} 100`
}

function HeroGrid() {
  return (
    <svg className="hero-grid" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
      <g>
        {Array.from({ length: gridRows }, (_, row) => <path data-grid-row={row} d={baselineRow(row)} key={`r${row}`} />)}
        {Array.from({ length: gridColumns }, (_, column) => <path data-grid-column={column} d={baselineColumn(column)} key={`c${column}`} />)}
      </g>
    </svg>
  )
}

function Arrow() {
  return <span aria-hidden="true" className="arrow">↗</span>
}

function XLogo({ className = 'x-logo' }) {
  return <img className={className} src={xLogo} alt="X" />
}

function useFoundingAccess() {
  const [access, setAccess] = useState({ loading: true, data: null })

  useEffect(() => {
    let mounted = true
    const update = (data) => {
      if (mounted) setAccess({ loading: false, data })
    }
    const unavailable = () => {
      if (mounted) setAccess((current) => ({ ...current, loading: false }))
    }

    getFoundingAccess().then(update).catch(unavailable)
    const unsubscribe = subscribeToFoundingAccess(update, unavailable)
    return () => {
      mounted = false
      unsubscribe()
    }
  }, [])

  return access
}

function navigate(to) {
  window.location.hash = to
  window.scrollTo({ top: 0, behavior: 'auto' })
}

function useRoute() {
  const [route, setRoute] = useState(() => window.location.hash || '#/')

  useEffect(() => {
    const change = () => setRoute(window.location.hash || '#/')
    window.addEventListener('hashchange', change)
    return () => window.removeEventListener('hashchange', change)
  }, [])

  const [path, query = ''] = route.slice(1).split('?')
  return { path: path || '/', params: new URLSearchParams(query) }
}

function Header() {
  const [compact, setCompact] = useState(false)

  useEffect(() => {
    let frame = 0
    const update = () => {
      setCompact(window.scrollY > 26)
      frame = 0
    }
    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(update)
    }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      if (frame) window.cancelAnimationFrame(frame)
    }
  }, [])

  return (
    <header className={`site-header ${compact ? 'is-compact' : ''}`}>
      <a className="brand" href="#/" aria-label="VYOMIRTHA home">
        <span>VYOMIRTHA <i>— wait-list</i></span>
      </a>
      <nav aria-label="Primary navigation">
        <a href="#how-it-works">How it works</a>
        <a href="#access">Access</a>
        <a href="#/contact">Contact</a>
      </nav>
      <a className="header-cta" href="#access">Join the waitlist <Arrow /></a>
    </header>
  )
}

function Hero() {
  const heroRef = useRef(null)

  useEffect(() => {
    const hero = heroRef.current
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    if (!hero || media.matches) return undefined

    let frame = 0
    let pointerX = -.5
    let pointerY = -.5
    const paint = () => {
      const rect = hero.getBoundingClientRect()
      const points = Array.from({ length: gridRows }, (_, row) => Array.from({ length: gridColumns }, (_, column) => {
        const x = column / (gridColumns - 1) * 100
        const y = row / (gridRows - 1) * 100
        if (pointerX < 0 || pointerY < 0) return { x, y }
        const deltaX = (x / 100 - pointerX) * rect.width
        const deltaY = (y / 100 - pointerY) * rect.height
        const distance = Math.hypot(deltaX, deltaY)
        const force = distance < 190 ? ((190 - distance) / 190) ** 2 * 15 : 0
        const safeDistance = Math.max(distance, 1)
        return { x: x + (deltaX / safeDistance * force / rect.width * 100), y: y + (deltaY / safeDistance * force / rect.height * 100) }
      }))
      const grid = hero.querySelector('.hero-grid')
      grid.querySelectorAll('[data-grid-row]').forEach((line) => {
        const row = Number(line.dataset.gridRow)
        line.setAttribute('d', `M ${points[row].map((point) => `${point.x.toFixed(2)} ${point.y.toFixed(2)}`).join(' L ')}`)
      })
      grid.querySelectorAll('[data-grid-column]').forEach((line) => {
        const column = Number(line.dataset.gridColumn)
        line.setAttribute('d', `M ${points.map((row) => `${row[column].x.toFixed(2)} ${row[column].y.toFixed(2)}`).join(' L ')}`)
      })
      frame = 0
    }
    const move = (event) => {
      const rect = hero.getBoundingClientRect()
      pointerX = (event.clientX - rect.left) / rect.width
      pointerY = (event.clientY - rect.top) / rect.height
      if (!frame) frame = window.requestAnimationFrame(paint)
    }
    const reset = () => {
      pointerX = -.5
      pointerY = -.5
      if (!frame) frame = window.requestAnimationFrame(paint)
    }
    hero.addEventListener('pointermove', move, { passive: true })
    hero.addEventListener('pointerleave', reset)
    return () => {
      hero.removeEventListener('pointermove', move)
      hero.removeEventListener('pointerleave', reset)
      if (frame) window.cancelAnimationFrame(frame)
    }
  }, [])

  return (
    <section ref={heroRef} className="hero" aria-labelledby="hero-title">
      <HeroGrid />
      <div className="signal-field" aria-hidden="true">
        {fragments.map((fragment) => (
          <article className={`signal-fragment signal-fragment--${fragment.depth} frag-${fragment.id}`} key={fragment.id}>
            <div className="fragment-head"><span className="avatar">{fragment.name.slice(0, 1)}</span><div><b>{fragment.name}<i className="verified">✓</i></b><span>{fragment.handle} · {fragment.time}</span></div><span className="post-more">•••</span></div>
            <p>{fragment.copy}</p>
            <div className="fragment-meta"><span>◌ {fragment.stats[0]}</span><span>⟲ {fragment.stats[1]}</span><span>♡ {fragment.stats[2]}</span><span>⌁</span></div>
          </article>
        ))}
      </div>
      <div className="hero-content section-shell">
        <h1 id="hero-title">Your next customer<br />is already talking on <XLogo /></h1>
        <p className="hero-lede">Qualify accounts behind relevant posts.</p>
        <div className="hero-platform"><span>BUILT FOR</span><XLogo /></div>
        <div className="hero-actions">
          <a className="button button--primary" href="#access">Join the waitlist <Arrow /></a>
          <a className="text-link" href="#how-it-works">See how it works <span aria-hidden="true">↓</span></a>
        </div>
      </div>
    </section>
  )
}

function WorkflowVisual() {
  const [active, setActive] = useState(-1)
  const [reduced, setReduced] = useState(false)

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const updateMotion = () => setReduced(media.matches)
    updateMotion()
    media.addEventListener('change', updateMotion)

    const section = document.getElementById('workflow-scroll')
    let ticking = false
    const update = () => {
      if (!section || reduced) return
      const rect = section.getBoundingClientRect()
      const range = Math.max(1, rect.height - window.innerHeight)
      const progress = Math.max(0, Math.min(.999, -rect.top / range))
      const delayedProgress = Math.max(0, (progress - .1) / .9)
      setActive(Math.min(stages.length - 1, Math.floor(delayedProgress * stages.length)))
      ticking = false
    }
    const onScroll = () => {
      if (!ticking) {
        ticking = true
        window.requestAnimationFrame(update)
      }
    }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      media.removeEventListener('change', updateMotion)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [reduced])

  const current = stages[Math.max(active, 0)]
  return (
    <div className="workflow-scroll" id="workflow-scroll">
      <div className="workflow-sticky">
        <div className="section-shell">
          <div className="workflow-wrap" data-stage={active}>
            <aside className="workflow-rail" aria-label="Intelligence stages">
              <div className="rail-caption">FROM X POSTS TO POTENTIAL BUYERS</div>
              {stages.map((stage, index) => (
                <div className={`rail-stage ${index <= active ? 'is-active' : ''} ${index === active ? 'is-current' : ''}`} key={stage.number}>
                  <span>{stage.number}</span>{stage.label}<i />
                </div>
              ))}
            </aside>
            <div className="workflow-main">
              <div className="system-topline"><span>INTELLIGENCE SYSTEM / {String(Math.max(1, active + 1)).padStart(2, '0')}</span><span className="system-state"><i /> {active < 0 ? 'Awaiting scroll signal' : 'Processing live context'}</span></div>
              <div className="workflow-network" aria-live="polite">
                <div className={`node node--icp ${active >= 0 ? 'is-active' : ''}`}>
                  <span className="node-index">01 / INPUT</span>
                  <h3>Your ICP</h3>
                  <div className="icp-list"><span>B2B SaaS</span><span>10–50 employees</span><span>US / EU</span><span>Modern stack</span></div>
                </div>
                <div className={`flow-line flow-one ${active >= 1 ? 'is-active' : ''}`}><i /></div>
                <div className={`node node--signals ${active >= 1 ? 'is-active' : ''}`}>
                  <span className="node-index">02 / SIGNALS</span>
                  <h3>Relevant posts</h3>
                  <strong>12,481</strong><p>posts matching your ICP</p>
                  <div className="signal-bars"><i /><i /><i /><i /><i /><i /></div>
                </div>
                <div className={`flow-line flow-two ${active >= 2 ? 'is-active' : ''}`}><i /></div>
                <div className={`node node--history ${active >= 2 ? 'is-active' : ''}`}>
                  <span className="node-index">03 / CONTEXT</span>
                  <h3>Historical activity</h3>
                  <div className="mini-history"><span>6 MO</span><i /><i /><i /><b>NOW</b></div>
                  <p>Changes gain meaning over time.</p>
                </div>
                <div className={`convergence ${active >= 3 ? 'is-active' : ''}`}><i /><i /><i /></div>
                <div className={`node node--accounts ${active >= 3 ? 'is-active' : ''}`}>
                  <span className="node-index">04 / ACCOUNTS</span>
                  <h3>Matching accounts</h3>
                  <strong>1,284</strong><p>match your ICP</p>
                  <div className="account-stack"><span>VC</span><span>MN</span><span>OK</span><span>+1,281</span></div>
                </div>
                <div className={`flow-line flow-three ${active >= 4 ? 'is-active' : ''}`}><i /></div>
                <div className={`node node--timeline ${active >= 4 ? 'is-active' : ''}`}>
                  <span className="node-index">05 / ACCOUNT TIMELINE</span>
                  <h3>Current state, in context</h3>
                  <ul>
                    <li><time>3W</time><span>Asked about alternatives</span></li>
                    <li><time>2H</time><span>Pricing friction mentioned</span></li>
                    <li><time>47M</time><span>Requested a recommendation</span></li>
                  </ul>
                </div>
                <div className={`flow-line flow-four ${active >= 5 ? 'is-active' : ''}`}><i /></div>
                <div className={`opportunity ${active >= 5 ? 'is-active' : ''}`}>
                  <div className="opportunity-head"><span className="status-flame">✦</span><span>POTENTIAL BUYER FLAGGED</span><span>92% confidence</span></div>
                  <div className="opportunity-body"><p>Account behavior assessed</p><h3>7 accounts worth<br />talking to today.</h3><span>Join the waitlist <Arrow /></span></div>
                </div>
              </div>
              <div className="workflow-current"><span>{active < 0 ? 'READY' : 'NOW'}</span><b>{active < 0 ? '00' : current.number}</b><div><strong>{active < 0 ? 'Begin the intelligence sequence' : current.label}</strong><p>{active < 0 ? 'Scroll to move raw activity through the system.' : current.detail}</p></div></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function Intelligence() {
  return (
    <section className="intelligence" id="how-it-works" aria-labelledby="intelligence-title">
      <div className="section-shell intelligence-intro">
        <p className="eyebrow">From X posts to potential buyers</p>
        <div>
          <h2 id="intelligence-title">Activity is not intent.<br /><em>Change is.</em></h2>
          <p>Most prospecting sees one post. VYOMIRTHA reads the account history behind it—so your team can tell whether a real problem is emerging and whether you can solve it.</p>
        </div>
      </div>
      <WorkflowVisual />
      <div className="section-shell value-strip">
        <p className="eyebrow">The commercial outcome</p>
        <div className="value-copy"><h3>Spend less time prospecting.<br />Spend more time with potential buyers.</h3><p>Start with accounts already showing a problem you can solve—instead of chasing every post that sounds interesting.</p></div>
        <div className="value-chain" aria-label="Commercial outcomes"><span>Less wasted prospecting</span><i>↓</i><span>More qualified accounts</span><i>↓</i><span>Better timing</span><i>↓</i><span>More opportunities created</span></div>
      </div>
    </section>
  )
}

function Access() {
  const foundingAccess = useFoundingAccess()
  const totalSeats = foundingAccess.data?.totalSeats
  const remainingSeats = foundingAccess.data?.remainingSeats
  const claimedSeats = foundingAccess.data?.claimedSeats
  const foundingPrice = import.meta.env.VITE_FOUNDING_PRICE || '$29/mo'
  const publicPrice = import.meta.env.VITE_PUBLIC_PRICE || '$49/mo'
  const soldOut = Boolean(totalSeats && remainingSeats === 0)
  return (
    <section id="access" className="access section-shell" aria-labelledby="access-title">
      <div className="access-heading"><p className="eyebrow">Get access</p><h2 id="access-title">Get on the list<br />before launch.</h2><p>Start with the signal. Keep the founding price while VYOMIRTHA becomes part of your prospecting system.</p></div>
      <div className="access-options">
        <article className="access-option">
          <div className="option-top"><span className="option-kicker">FREE</span><span className="option-number">01</span></div>
          <div className="plan-limit"><strong>15</strong><span>leads / month</span></div>
          <h3>See the<br />signal work.</h3>
          <p>Enough intelligence to validate which accounts are worth pursuing before you commit to more.</p>
          <ul className="plan-list">
            <li>Basic X account history</li>
            <li>Potential-buyer flags</li>
            <li>Account prioritization</li>
            <li>Basic account timeline</li>
            <li>Track one ICP</li>
          </ul>
          <a className="button button--primary access-cta" href="#/submission?tier=free">Join the free waitlist <Arrow /></a>
        </article>
        <article className={`access-option access-option--founding ${soldOut ? 'access-option--sold-out' : ''}`}>
          <div className="founding-line" aria-hidden="true" />
          <span className="founding-glare" aria-hidden="true" />
          <div className="option-top"><span className="option-kicker"><i /> {soldOut ? 'FOUNDING ACCESS FILLED' : 'FOUNDING ACCESS'}</span><span className="option-number">02</span></div>
          <div className="founding-seat-block">
            <span>{foundingAccess.loading ? 'Checking seats…' : totalSeats ? `${claimedSeats} / ${totalSeats} seats claimed` : 'Seat availability unavailable'}</span>
            <div className="seat-meter" aria-label={totalSeats ? `${claimedSeats} of ${totalSeats} founding seats claimed` : 'Founding seat availability unavailable'}><i style={{ '--seats-claimed': totalSeats ? `${claimedSeats / totalSeats * 100}%` : '0%' }} /></div>
          </div>
          <h3>{soldOut ? <>{publicPrice}<br />public access.</> : <>{foundingPrice}, locked<br />for life.</>}</h3>
          <div className="founding-price"><strong>{soldOut ? 'First batch complete' : publicPrice}</strong><span>{soldOut ? `All ${totalSeats} founding seats are claimed` : 'after founding access closes'}</span></div>
          <p className="founder-advantage"><b>{soldOut ? 'The founding rate is now closed.' : 'Save $240/year permanently.'}</b><span>{soldOut ? 'Join the free waitlist to hear when public access opens.' : `Founding access closes permanently when all ${totalSeats ?? 'available'} seats are claimed.`}</span></p>
          <ul className="plan-list">
            <li><b>60 qualified leads / month — 4× Free capacity</b></li>
            <li>Deep X account history + change detection</li>
            <li>Advanced account prioritization</li>
            <li>Full account timelines</li>
            <li>Priority potential-buyer alerts</li>
            <li>Track multiple ICPs</li>
          </ul>
          <div className="founding-footer">
            <a className="button button--outline" href={soldOut ? '#/submission?tier=free' : '#/submission?tier=founding'}>{soldOut ? 'Join the free waitlist' : 'Claim founding access'} <Arrow /></a>
          </div>
          {totalSeats && <p className="founder-activity"><i /> {soldOut ? `All ${totalSeats} founding seats are filled.` : `${claimedSeats} founders are already inside.`}</p>}
        </article>
      </div>
      <p className="access-note">Founding members retain the {foundingPrice} rate for life. After all {totalSeats ?? 'available'} seats are claimed, Founding Access closes and public pricing is {publicPrice}.</p>
    </section>
  )
}

function Footer() {
  return <footer className="footer section-shell"><a className="brand" href="#/"><span>VYOMIRTHA</span></a><p>We don’t just find activity. We understand change.</p><span><a href="#/contact">Contact</a> · © {new Date().getFullYear()}</span></footer>
}

function Landing() {
  return <div className="site-frame"><Header /><main><Hero /><Intelligence /><Access /></main><Footer /></div>
}

function Submission({ tier = 'free' }) {
  const founding = tier === 'founding'
  const [form, setForm] = useState({ name: '', company: '', email: '', service: '', icp: '' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const foundingAccess = useFoundingAccess()
  const totalSeats = foundingAccess.data?.totalSeats
  const remainingSeats = foundingAccess.data?.remainingSeats
  const claimedSeats = foundingAccess.data?.claimedSeats

  function update(field) {
    return (event) => setForm((current) => ({ ...current, [field]: event.target.value }))
  }

  async function submit(event) {
    event.preventDefault()
    if (form.name.trim().length < 2) return setError('Enter your name to continue.')
    if (form.company.trim().length < 2) return setError('Enter your company name to continue.')
    if (!/^\S+@\S+\.\S+$/.test(form.email)) return setError('Enter a valid email address to continue.')
    if (founding && !foundingAccess.data) return setError('Founding seat availability is unavailable. Please try again shortly.')
    if (founding && form.service.trim().length < 2) return setError('Tell us what you sell so we can prepare your access.')
    if (founding && form.icp.trim().length < 2) return setError('Describe the ICP you want to monitor first.')

    setBusy(true)
    setError('')
    try {
      const result = await joinWaitlist({
        name: form.name.trim(),
        company: form.company.trim(),
        email: form.email.trim(),
        service: founding ? form.service.trim() : undefined,
        icp: founding ? form.icp.trim() : undefined,
        source: founding ? 'founding-access-submission' : 'free-waitlist-submission',
      })
      const query = new URLSearchParams({ type: founding ? 'founding' : 'free', status: 'submitted', email: form.email.trim(), name: form.name.trim() })
      if (result?.seatNumber) query.set('seat', result.seatNumber)
      navigate(`#/confirmation?${query.toString()}`)
    } catch (submissionError) {
      setError(submissionError.message)
      setBusy(false)
    }
  }

  const title = founding ? <>Reserve your<br />Founding access.</> : <>Join the<br />Free waitlist.</>
  const description = founding
    ? 'Tell us how your team sells and who you want to find. This lets us make your Founding Access onboarding specific from the start.'
    : 'A small amount of context is enough to put you on the right early-access path.'

  return (
    <main className="checkout-page submission-page">
      <a className="brand checkout-brand" href="#/"><span>VYOMIRTHA</span></a>
      <section className={`checkout-panel submission-panel ${founding ? 'submission-panel--founding' : ''}`} aria-labelledby="submission-title">
        <div className="checkout-top"><p className="eyebrow">{founding && <i />}{founding ? 'Founding access' : 'Free tier'}</p>{founding ? <span>{totalSeats ? `${claimedSeats} / ${totalSeats} CLAIMED` : 'SEATS UPDATING'}</span> : <span>EARLY ACCESS</span>}</div>
        <h1 id="submission-title">{title}</h1>
        <p className="checkout-value">{description}</p>
        {founding && <p className="submission-founder-note"><i /> {remainingSeats ?? '—'} seats remain. $29/mo is locked only after your Founding payment is completed.</p>}
        <form className="submission-form" onSubmit={submit} noValidate>
          <label><span>Name</span><input value={form.name} onChange={update('name')} name="name" autoComplete="name" placeholder="Your name" /></label>
          <label><span>Company name</span><input value={form.company} onChange={update('company')} name="company" autoComplete="organization" placeholder="Company name" /></label>
          <label className={founding ? '' : 'submission-field--wide'}><span>{founding ? 'Work email' : 'Email'}</span><input value={form.email} onChange={update('email')} name="email" inputMode="email" autoComplete="email" placeholder="you@company.com" /></label>
          {founding && <><label><span>What do you sell?</span><input value={form.service} onChange={update('service')} name="service" placeholder="Product or service" /></label><label className="submission-field--wide"><span>Who is your ICP?</span><textarea value={form.icp} onChange={update('icp')} name="icp" rows="4" placeholder="The companies and people you want to monitor" /></label></>}
          <input className="honeypot" tabIndex="-1" autoComplete="off" name="company_site" aria-hidden="true" />
          {error && <p className="submission-error" role="alert">{error}</p>}
          <button type="submit" className="button button--primary checkout-button" disabled={busy}>{busy ? 'Submitting…' : founding ? 'Reserve Founding access' : 'Join Free waitlist'} <Arrow /></button>
        </form>
        <p className="secure-note">{founding ? 'This reserves your request, not a payment. We’ll share the secure payment step before any charge.' : 'We use this only to prepare your early-access invite.'}</p>
      </section>
      <div className="checkout-bg" aria-hidden="true"><span /><span /><span /></div>
    </main>
  )
}

function Confirmation({ type, email, status, seat, paidAt, receiptEmail }) {
  const founding = type === 'founding'
  const state = status || (founding ? 'paid' : 'registered')
  const foundingAccess = useFoundingAccess()
  const totalSeats = foundingAccess.data?.totalSeats
  const seatNumber = Number(seat) || 0
  const seatLabel = seatNumber ? String(seatNumber).padStart(3, '0') : '—'
  const totalSeatsLabel = totalSeats ? String(totalSeats).padStart(3, '0') : '—'
  const paymentDate = paidAt || new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date())
  const receiptTo = receiptEmail || email

  if (state === 'failed') {
    return (
      <main className="confirmation-page confirmation-page--failed">
        <a className="brand checkout-brand" href="#/"><span>VYOMIRTHA</span></a>
        <section className="confirmation-panel confirmation-panel--failed" aria-labelledby="confirmation-title">
          <p className="eyebrow">Payment incomplete</p>
          <h1 id="confirmation-title">Your seat isn’t<br />reserved yet.</h1>
          <p className="confirmation-copy">No payment was captured and no Founding seat has been claimed. You can safely return to your submission and try again.</p>
          <div className="confirmation-status-row"><span>STATUS</span><b>PAYMENT NOT COMPLETED</b></div>
          <div className="confirmation-actions"><a className="button button--primary" href="#/submission?tier=founding">Return to submission <Arrow /></a><a className="text-link" href="#/">Back to VYOMIRTHA</a></div>
        </section>
      </main>
    )
  }

  if (state === 'already') {
    return (
      <main className="confirmation-page">
        <a className="brand checkout-brand" href="#/"><span>VYOMIRTHA</span></a>
        <section className="confirmation-panel confirmation-panel--status" aria-labelledby="confirmation-title">
          <p className="eyebrow">Access status</p>
          <h1 id="confirmation-title">You’re already in.</h1>
          <p className="confirmation-copy">{founding ? 'Your Founding Access is secured at $29/mo for life.' : 'Your waitlist place is confirmed. We’ll notify you when your access is ready.'}</p>
          <div className="confirmation-status-row"><span>{founding ? `FOUNDING BATCH / SEAT #${seatLabel}` : 'WAITLIST STATUS'}</span><b>{founding ? 'FOUNDING ACCESS SECURED' : 'EARLY ACCESS QUEUED'}</b></div>
          {email && <p className="submitted-email">Registered to <b>{email}</b></p>}
          <a className="button button--outline confirmation-return" href="#/">Back to VYOMIRTHA <Arrow /></a>
        </section>
      </main>
    )
  }

  if (!founding) {
    return (
      <main className="confirmation-page">
        <a className="brand checkout-brand" href="#/"><span>VYOMIRTHA</span></a>
        <section className="confirmation-panel confirmation-panel--free" aria-labelledby="confirmation-title">
          <p className="eyebrow">Waitlist confirmed</p>
          <h1 id="confirmation-title">You’re on<br />the waitlist.</h1>
          <p className="confirmation-copy">Your place is confirmed. We’ll send a concise update when there is a release milestone or access window worth knowing about.</p>
          <div className="confirmation-status-row"><span>ACCESS STATUS</span><b>EARLY ACCESS QUEUED</b></div>
          {email && <p className="submitted-email">Registered to <b>{email}</b></p>}
          <div className="next-step"><span>WHAT HAPPENS NEXT</span><p><b>01</b> We’ll prepare your early-access invite.</p><p><b>02</b> Bring the ICP you want to monitor first.</p></div>
          <a className="button button--outline" href="#/">Back to VYOMIRTHA <Arrow /></a>
        </section>
      </main>
    )
  }

  if (state === 'submitted') {
    return (
      <main className="confirmation-page confirmation-page--founding">
        <a className="brand checkout-brand" href="#/"><span>VYOMIRTHA</span></a>
        <section className="confirmation-panel confirmation-panel--founding confirmation-panel--requested" aria-labelledby="confirmation-title">
          <div className="credential" aria-label="Founding Access request credential">
            <span className="credential-spark" aria-hidden="true">✦</span>
            <div className="credential-top"><span>FOUNDING ACCESS</span><span>REQUEST RECEIVED</span></div>
            <strong>#{seatLabel}<i>/ FOUNDING BATCH</i></strong>
            <p>VYOMIRTHA · ACCESS REQUEST</p>
          </div>
          <p className="eyebrow"><i /> Founding access request</p>
          <h1 id="confirmation-title">Your request<br />is in.</h1>
          <p className="confirmation-copy">We received your Founding Access details{email ? ` for ${email}` : ''}. Before anything is charged, we’ll send you the secure payment step and confirm your $29/mo Founding rate.</p>
          <div className="credential-details">
            <section><span>REQUESTED ACCESS</span><ul><li>60 leads / month</li><li>Deep account history</li><li>Priority potential-buyer alerts</li><li>Multiple ICPs</li></ul></section>
            <section><span>FOUNDER RATE</span><p><b>$29 / month</b><small>Locked only after payment is completed</small></p></section>
            <section><span>WHAT HAPPENS NEXT</span><p><b>We review your fit.</b><small>Then we send the secure payment and onboarding step.</small></p></section>
          </div>
          <a className="button button--outline" href="#/">Back to VYOMIRTHA <Arrow /></a>
        </section>
      </main>
    )
  }

  return (
    <main className="confirmation-page confirmation-page--founding">
      <a className="brand checkout-brand" href="#/"><span>VYOMIRTHA</span></a>
      <section className="confirmation-panel confirmation-panel--founding" aria-labelledby="confirmation-title">
        <div className="credential" aria-label={`Founding member credential, seat ${seatLabel} of ${totalSeatsLabel}`}>
          <span className="credential-spark" aria-hidden="true">✦</span>
          <div className="credential-top"><span>FOUNDING MEMBER</span><span>FOUNDING BATCH</span></div>
          <strong>#{seatLabel}<i>/ {totalSeatsLabel}</i></strong>
          <p>VYOMIRTHA · FOUNDING ACCESS</p>
        </div>
        <p className="eyebrow"><i /> Founding access · Founding Batch / seat #{seatLabel}</p>
        <h1 id="confirmation-title">Founding access<br />secured.</h1>
        <p className="confirmation-copy">Your $29/mo Founding rate is locked for life. Your seat is reserved for the first release.</p>
        <div className="credential-details">
          <section><span>ACCESS</span><ul><li>60 leads / month</li><li>Deep account history</li><li>Priority potential-buyer alerts</li><li>Multiple ICPs</li></ul></section>
          <section><span>PRICE</span><p><b>$29 / month</b><small>Locked for Founding members</small></p></section>
          <section><span>PAYMENT</span><p><b>Paid · {paymentDate}</b>{receiptTo ? <a href={`mailto:${receiptTo}?subject=VYOMIRTHA%20Founding%20Access%20Receipt`}>Receipt → {receiptTo}</a> : <small>Receipt sent to your payment email</small>}</p></section>
        </div>
        <div className="next-step"><span>WHAT HAPPENS NEXT</span><p><b>01</b> We prepare your access.</p><p><b>02</b> You’ll receive your onboarding link.</p><p><b>03</b> Bring the ICP you want to monitor first.</p></div>
        <a className="button button--outline" href={`#/confirmation?type=founding&status=already&seat=${seatNumber}`}>View your access status <Arrow /></a>
      </section>
    </main>
  )
}

function Contact() {
  const [form, setForm] = useState({ name: '', email: '', message: '' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)

  function update(field) {
    return (event) => setForm((current) => ({ ...current, [field]: event.target.value }))
  }

  async function submit(event) {
    event.preventDefault()
    if (form.name.trim().length < 2) return setError('Please enter your name.')
    if (!/^\S+@\S+\.\S+$/.test(form.email)) return setError('Enter a valid email address.')
    if (form.message.trim().length < 10) return setError('Tell us a little more so we can help.')
    setBusy(true)
    setError('')
    try {
      await sendContact({ name: form.name.trim(), email: form.email.trim(), message: form.message.trim() })
      setSent(true)
    } catch (submissionError) {
      setError(submissionError.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="contact-page">
      <a className="brand checkout-brand" href="#/"><span>VYOMIRTHA</span></a>
      <section className="contact-panel" aria-labelledby="contact-title">
        <div className="contact-top"><p className="eyebrow">Contact</p><span>SUPPORT / PARTNERSHIPS</span></div>
        <h1 id="contact-title">Start a<br />conversation.</h1>
        <p className="contact-intro">For enquiries, bug reports, partnerships, or anything else you need to put in front of the team.</p>
        <form className="contact-form" onSubmit={submit} noValidate>
          <label><span>Name</span><input value={form.name} onChange={update('name')} name="name" autoComplete="name" placeholder="Your name" /></label>
          <label><span>Email</span><input value={form.email} onChange={update('email')} name="email" inputMode="email" autoComplete="email" placeholder="you@company.com" /></label>
          <label className="contact-message"><span>Message</span><textarea value={form.message} onChange={update('message')} name="message" placeholder="What can we help with?" rows="6" /></label>
          <input className="honeypot" tabIndex="-1" autoComplete="off" name="company_site" aria-hidden="true" />
          {error && <p className="contact-error" role="alert">{error}</p>}
          <button className="button button--primary" type="submit" disabled={busy}>{busy ? 'Sending…' : 'Send message'} <Arrow /></button>
        </form>
      </section>
      {sent && <div className="contact-modal-backdrop" role="presentation"><section className="contact-success" role="dialog" aria-modal="true" aria-labelledby="contact-success-title"><span className="contact-success-spark" aria-hidden="true">✦</span><p className="eyebrow">Ticket received</p><h2 id="contact-success-title">Your ticket<br />was sent.</h2><p>You’ll receive a response at <b>{form.email}</b> within 24 hours. Thank you.</p><div><span>REFERENCE</span><b>VYOMIRTHA / SUPPORT</b></div><a className="button button--outline" href="#/">Back to VYOMIRTHA <Arrow /></a></section></div>}
    </main>
  )
}

export default function App() {
  const { path, params } = useRoute()
  const view = useMemo(() => {
    if (path === '/submission' || path === '/checkout') return <Submission tier={params.get('tier') === 'founding' || path === '/checkout' ? 'founding' : 'free'} />
    if (path === '/confirmation') return <Confirmation type={params.get('type')} email={params.get('email')} status={params.get('status')} seat={params.get('seat')} paidAt={params.get('paidAt')} receiptEmail={params.get('receiptEmail')} />
    if (path === '/contact') return <Contact />
    return <Landing />
  }, [path, params])
  return view
}
