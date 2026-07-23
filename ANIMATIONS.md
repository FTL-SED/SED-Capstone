# NavQuest - Frontend Animation Review

A consolidated reference of every animation in the NavQuest frontend. 

Each entry shows the actual code, what it does, and where it lives.

**Stack note:** no animation libraries (no Framer Motion, GSAP, react-spring, etc.).
Everything is hand-written **CSS `@keyframes` + `transition`/`transform`**, plus the
native **View Transitions API** for page-to-page motion. Every ambient animation is
disabled under `prefers-reduced-motion: reduce` (for accessibility purposes).

## 1. Signature scene animations

Each page paints its own full-bleed golden-hour world. The ambient motion is
intentionally slow and subtle so the content stays the focus.

### 1.1 Landing Page Hero Section

**File:** `frontend/src/pages/LandingPage/HeroSection/HeroSection.css`

Three clouds share one long left-to-right traversal; negative `animation-delay`s
space them evenly so the wrap always happens off-screen. A plane crosses
occasionally, fading in and out with a long pause between passes.

```css
/* Clouds drift slowly across the sky - equal negative delays keep the three
   evenly spaced; the wrap is always off-screen. */
.hero__cloud--1 { animation: hero-drift 96s linear infinite; }
.hero__cloud--2 { animation: hero-drift 96s linear infinite; animation-delay: -32s; }
.hero__cloud--3 { animation: hero-drift 96s linear infinite; animation-delay: -64s; }

@keyframes hero-drift {
  from { transform: translateX(0); }
  to   { transform: translateX(1780px); }
}

/* A small plane crosses the sky every so often (long pause between passes) */
.hero__plane { animation: hero-plane 34s linear infinite; }

@keyframes hero-plane {
  0%   { transform: translate(0, 0);       opacity: 0; }
  4%   { opacity: 0.75; }
  44%  { opacity: 0.75; }
  48%  { transform: translate(1600px, 0);  opacity: 0; }
  100% { transform: translate(1600px, 0);  opacity: 0; }
}
```

### 1.2 Auth pages

**File:** `frontend/src/components/AuthCard/AuthCard.css`

The richest scene: clouds drift, birds fly across, each bird also bobs up/down,
and each bird flaps by cross-fading between a wings-up and wings-down frame.
Different durations (9s/11s/13s) and offset delays keep the three birds out of sync.

```css
/* Clouds - same shared traversal as the hero */
.auth-cloud--1 { animation: auth-drift 90s linear infinite; }
.auth-cloud--2 { animation: auth-drift 90s linear infinite; animation-delay: -30s; }
.auth-cloud--3 { animation: auth-drift 90s linear infinite; animation-delay: -60s; }

@keyframes auth-drift {
  from { transform: translateX(0); }
  to   { transform: translateX(1780px); }
}

/* Birds fly left-to-right and wrap around */
.auth-bird-fly--1 { animation: auth-fly 76s linear infinite; }
.auth-bird-fly--2 { animation: auth-fly 76s linear infinite; animation-delay: -25.3s; }
.auth-bird-fly--3 { animation: auth-fly 76s linear infinite; animation-delay: -50.6s; }

@keyframes auth-fly {
  from { transform: translateX(0); }
  to   { transform: translateX(1580px); }
}

/* …each bird bobs gently up and down… */
.auth-bird--1 { animation: auth-bird 9s ease-in-out infinite; }
.auth-bird--2 { animation: auth-bird 11s ease-in-out infinite; }
.auth-bird--3 { animation: auth-bird 13s ease-in-out infinite; }

@keyframes auth-bird {
  0%, 100% { transform: translateY(0); }
  50%      { transform: translateY(-9px); }
}

/* …and flaps by swapping the wings-up / wings-down artwork every 2s.
   The down frame is hidden by default so a single correct pose shows
   when motion is disabled. */
.auth-bird__frame--down { opacity: 0; }
.auth-bird__frame--up   { animation: auth-flap-up 4s linear infinite; }
.auth-bird__frame--down { animation: auth-flap-down 4s linear infinite; }

@keyframes auth-flap-up {
  0%, 49.999% { opacity: 1; }
  50%, 100%   { opacity: 0; }
}

@keyframes auth-flap-down {
  0%, 49.999% { opacity: 0; }
  50%, 100%   { opacity: 1; }
}
```

### 1.3 Account "basecamp"

**File:** `frontend/src/pages/AccountPage/AccountPage.css`

The same cloud + bird ecosystem as the auth scene, but slower (100s clouds, 80s
birds) so the two pages read as one continuous sky. Keyframes mirror the auth set
(`account-drift`, `account-fly`, `account-bird`, `account-flap-up/down`).

```css
.account-cloud--1 { animation: account-drift 100s linear infinite; }
.account-cloud--2 { animation: account-drift 100s linear infinite; animation-delay: -33s; }
.account-cloud--3 { animation: account-drift 100s linear infinite; animation-delay: -66s; }

@keyframes account-drift {
  from { transform: translateX(0); }
  to   { transform: translateX(1780px); }
}

.account-bird-fly--1 { animation: account-fly 80s linear infinite; }
.account-bird-fly--2 { animation: account-fly 80s linear infinite; animation-delay: -26.6s; }
.account-bird-fly--3 { animation: account-fly 80s linear infinite; animation-delay: -53.2s; }

@keyframes account-fly {
  from { transform: translateX(0); }
  to   { transform: translateX(1580px); }
}

.account-bird--1 { animation: account-bird 9s ease-in-out infinite; }
.account-bird--2 { animation: account-bird 11s ease-in-out infinite; }
.account-bird--3 { animation: account-bird 13s ease-in-out infinite; }

@keyframes account-bird {
  0%, 100% { transform: translateY(0); }
  50%      { transform: translateY(-9px); }
}

/* Wing cross-fade - same technique as auth */
@keyframes account-flap-up {
  0%, 49.999% { opacity: 1; }
  50%, 100%   { opacity: 0; }
}

@keyframes account-flap-down {
  0%, 49.999% { opacity: 0; }
  50%, 100%   { opacity: 1; }
}
```

### 1.4 Create Itinerary

**File:** `frontend/src/pages/CreateItineraryPage/CreateItineraryPage.css`

A small car drives the length of the street beneath the skyline, then wraps back
around off-screen. The whole scene is blurred and scaled slightly so the form card
stays the clear focus.

```css
/* The car drives the street, then wraps back around to the left.
   Starts off-screen left (-160) and exits off-screen right (past 1440). */
.create-city__car-track { animation: create-car-drive 14s linear infinite; }

@keyframes create-car-drive {
  from { transform: translateX(-160px); }
  to   { transform: translateX(1520px); }
}
```

### 1.5 Dashboard + Discover

**Files:** `frontend/src/pages/HomePage/HomePage.css`,
`frontend/src/pages/DiscoverPage/DiscoverPage.css`

Both pages use the same idea: a fixed, oversized cloud layer (radial gradients)
gently drifts back and forth with `alternate` so it never wraps or pops. The layer
is 140% wide and offset `-20%` so its soft edges stay off-screen. Both keyframes are
identical apart from the name.

```css
/* HomePage.css - the fixed cloud layer */
.home-page::after {
  /* …oversized, blurred radial-gradient clouds… */
  animation: dash-cloud-drift 120s linear infinite alternate;
}

/* A gentle back-and-forth so clouds never wrap or pop. */
@keyframes dash-cloud-drift {
  from { transform: translate3d(0, 0, 0); }
  to   { transform: translate3d(4%, 0, 0); }
}
```

```css
/* DiscoverPage.css - same effect, own keyframe name */
.discover-page::after {
  animation: discover-cloud-drift 120s linear infinite alternate;
}

@keyframes discover-cloud-drift {
  from { transform: translate3d(0, 0, 0); }
  to   { transform: translate3d(4%, 0, 0); }
}
```

---

## 2. Page transitions (View Transitions API)

**Files:** `frontend/src/App.css`, `frontend/src/hooks/useSkyTransition.js`

The landing and auth pages share one continuous sky, so navigating between them
feels like moving *through* it. Two kinds:

- **`ascend`** - Landing to Login/Register: the ground drops away as we rise and the
  destination settles in from above, clearing a cloud haze.
- **`card`** - Login to Register: the sky is held perfectly still and only the auth
  card morphs between the two forms (via a shared `view-transition-name`).

Because the app uses the declarative `<BrowserRouter>` (which ignores `<Link
viewTransition>`), the transition is driven manually: tag the kind on `<html>`, then
swap routes inside `startViewTransition` + `flushSync`.

```js
// frontend/src/hooks/useSkyTransition.js
export default function useSkyTransition() {
  const navigate = useNavigate();

  // kind: "ascend" (leaving landing) or "card" (between auth pages)
  return (to, kind) => {
    document.documentElement.dataset.skyTransition = kind;

    if (typeof document.startViewTransition !== 'function') {
      navigate(to); // browsers without the API just navigate normally
      return;
    }

    document.startViewTransition(() => {
      flushSync(() => { navigate(to); });
    });
  };
}
```

```css
/* App.css - the "ascend" animation */
:root[data-sky-transition="ascend"]::view-transition-old(root) {
  animation: sky-ascend-out 700ms cubic-bezier(0.4, 0, 0.2, 1) both;
}
:root[data-sky-transition="ascend"]::view-transition-new(root) {
  animation: sky-ascend-in 700ms cubic-bezier(0.4, 0, 0.2, 1) both;
}

@keyframes sky-ascend-out {
  from { opacity: 1; transform: translateY(0) scale(1); }
  to   { opacity: 0; transform: translateY(30%) scale(1.15); }
}

@keyframes sky-ascend-in {
  from { opacity: 0; transform: translateY(-12%) scale(1.02); filter: blur(10px); }
  to   { opacity: 1; transform: translateY(0) scale(1);       filter: blur(0); }
}

/* "card" switch - hold the sky still, morph just the auth card */
:root[data-sky-transition="card"]::view-transition-old(root),
:root[data-sky-transition="card"]::view-transition-new(root) {
  animation: none;
  mix-blend-mode: normal;
}
:root[data-sky-transition="card"] .auth-card {
  view-transition-name: auth-card;
}
:root[data-sky-transition="card"]::view-transition-group(auth-card) {
  animation-duration: 480ms;
  animation-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
}
```

---

## 3. Feedback animations

### 3.1 Loading spinner

**File:** `frontend/src/pages/LoadingPage/LoadingSpinner/LoadingSpinner.css`

A classic ring spinner - a circle with one accent-colored border edge rotated
continuously.

```css
.loading-spinner {
  width: 44px; height: 44px;
  border: 4px solid var(--border);
  border-top-color: var(--accent);
  border-radius: 50%;
  animation: loading-spinner-spin 0.8s linear infinite;
}

@keyframes loading-spinner-spin {
  to { transform: rotate(360deg); }
}
```

### 3.2 Card skeleton pulse

**Files:** `frontend/src/components/CardCarousel/CardCarousel.css`,
`frontend/src/components/ItinerariesGrid/ItinerariesGrid.css`

While itineraries load, placeholder cards pulse their opacity so the loading state
reads as "content is coming."

```css
.card-carousel__track .itinerary-card--placeholder {
  animation: card-placeholder-pulse 1.2s ease-in-out infinite;
}

@keyframes card-placeholder-pulse {
  0%, 100% { opacity: 1; }
  50%      { opacity: 0.5; }
}
```

---

## 4. Micro-interactions (hover / focus)

Small `transition` + `transform` touches applied consistently across buttons,
cards, inputs, and nav. A representative sample:

**Card hover lift** - `frontend/src/App.css` (shared `.itinerary-card`); dashboard
and discover use a bigger 4px lift on the cover.

```css
.itinerary-card {
  transition: transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease;
}
.itinerary-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow);
  border-color: var(--border-strong);
}
```

**Next button** - hover lift + the arrow icon nudges right
(`frontend/src/components/Inputs/NextButton/NextButton.css`).

```css
.next-button {
  transition: background-color 0.18s ease, transform 0.18s ease, box-shadow 0.18s ease;
}
.next-button:hover { transform: translateY(-1px); box-shadow: var(--shadow-sm); }

.next-button svg        { transition: transform 0.18s ease; }
.next-button:hover svg  { transform: translateX(2px); }
```

**Nav link underline wipe** - a sunset underline wipes in on hover/active
(`frontend/src/components/Navbar/Navbar.css`).

```css
.navbar--hero .nav-link::after {
  content: "";
  position: absolute; left: 0; right: 100%; bottom: -2px; height: 2px;
  background: #e1783c;
  transition: right 0.24s ease;          /* wipes from left to right */
}
.navbar--hero .nav-link:hover::after,
.navbar--hero .nav-link--active::after { right: 0; }
```

**Shared action buttons** (Edit/Save/Delete/Like, etc.) - `frontend/src/App.css`:
`transition: ... transform 0.18s ease ...` with a `translateY(-1px)` hover lift.

Other hover/focus transitions (all `transition`-only, ~0.15s ease) live in the
input, button, and nav component CSS - e.g. `TextInput`, `PasswordInput`,
`TimeInput`, `DropdownInput`, `TagPills`, `SubmitButton`, `BackButton`,
`LoadMoreButton`, `CarouselArrow`, `MapPin`, `CloseButton`, `Step`, and the
Account/Create form controls. They all share the same subtle border-color /
background / box-shadow easing.

---

## 5. Summary table

| Animation | Type | File | What it does |
|---|---|---|---|
| `hero-drift` | `@keyframes` | HeroSection.css | Clouds drift across the landing sky |
| `hero-plane` | `@keyframes` | HeroSection.css | Plane crosses the sky, fading in/out |
| `auth-drift` | `@keyframes` | AuthCard.css | Clouds drift across the auth sky |
| `auth-fly` | `@keyframes` | AuthCard.css | Birds fly left-to-right |
| `auth-bird` | `@keyframes` | AuthCard.css | Birds bob up/down |
| `auth-flap-up` / `auth-flap-down` | `@keyframes` | AuthCard.css | Wing-frame cross-fade (flapping) |
| `account-drift` | `@keyframes` | AccountPage.css | Clouds drift (slower, shared sky) |
| `account-fly` | `@keyframes` | AccountPage.css | Birds fly across |
| `account-bird` | `@keyframes` | AccountPage.css | Birds bob up/down |
| `account-flap-up` / `account-flap-down` | `@keyframes` | AccountPage.css | Wing cross-fade |
| `create-car-drive` | `@keyframes` | CreateItineraryPage.css | Car drives the street + wraps |
| `dash-cloud-drift` | `@keyframes` | HomePage.css | Parallax cloud drift (alternating) |
| `discover-cloud-drift` | `@keyframes` | DiscoverPage.css | Parallax cloud drift (alternating) |
| `sky-ascend-out` / `sky-ascend-in` | View Transitions | App.css | Landing to auth "ascend into clouds" |
| `auth-card` group | View Transitions | App.css | Login ↔ Register card morph |
| `loading-spinner-spin` | `@keyframes` | LoadingSpinner.css | Rotating loading ring |
| `card-placeholder-pulse` | `@keyframes` | CardCarousel.css, ItinerariesGrid.css | Skeleton loading pulse |
| Hover lifts / underline wipe / focus rings | `transition` + `transform` | App.css + component CSS | ~40 micro-interactions across buttons, cards, inputs, nav |

**Accessibility:** every ambient `@keyframes` animation and every View Transition is
turned off under `@media (prefers-reduced-motion: reduce)`.
