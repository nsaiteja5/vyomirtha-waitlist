# Waitlist implementation plan

## Product objective

Build the first experience of an intelligence product that recognizes meaningful change in public X activity. The experience must make the visitor understand the value sequence: raw activity becomes context, context becomes a buying-window hypothesis, and the result is a short list of people worth speaking with today.

## Experience map

1. **Main waitlist (`#/`)** — cinematic signal environment, focused proposition, scroll-driven intelligence workflow, ROI proof, and two access paths.
2. **Founding checkout (`#/checkout`)** — deliberately sparse conversion view. It is ready to redirect to a hosted, PCI-safe checkout rather than collect payment details itself.
3. **Confirmation (`#/confirmation?type=free|founding`)** — tailored queue or founding-seat state with a concrete next step.

## Design decisions

- A layered near-black canvas, structural hairline borders, compact operational labels, and restrained blue/violet signal states form the shared product language.
- Hero fragments reference X activity without recreating an X/Twitter feed. They move slowly in depth and remain secondary to the copy.
- The core section is a connected system instead of a card grid. Scroll position progressively activates each visible stage, ending with a quiet opportunity state.
- The ROI message stays attached to the workflow, framing the product as revenue intelligence rather than analytics.
- The responsive version changes the wide workflow into a deliberate vertical sequence; it does not merely shrink desktop columns.

## Behavior and implementation

- React + Vite with hash-based routes so the three views work in a static deployment.
- Native semantic controls, visible keyboard focus, form validation, a honeypot field, and reduced-motion support.
- CSS-first motion with one scroll observer for workflow state. No WebGL, canvas, or independent animation loops.
- Free-waitlist submissions `POST` to `VITE_WAITLIST_API_URL` when supplied. Local preview falls back to browser storage so the journey is testable without a backend.
- Founding checkout redirects only to `VITE_FOUNDING_CHECKOUT_URL`; the app intentionally never accepts card data. A provider webhook should redirect to `#/confirmation?type=founding` only after verifying payment.

## Content and operations needed before launch

1. Confirm the product name/wordmark and approved founding benefits.
2. Set the waitlist endpoint and hosted payment link.
3. Supply truthful approved price, seat count, and any activity stats through environment variables. The UI hides unconfigured facts rather than inventing scarcity.
4. Configure the payment-success redirect and webhook so founding access cannot be granted by URL alone.
5. Connect the email confirmation/CRM workflow and run cross-browser, mobile, performance, and accessibility QA.

## Verification checklist

- Build succeeds with `npm run build`.
- Test keyboard navigation and an invalid/valid email submission.
- Check the workflow progression at a desktop viewport and at a narrow mobile viewport.
- Test with `prefers-reduced-motion` enabled.
- Confirm all live numbers and commercial claims are backed by live operational data.
