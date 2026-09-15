# Quattro — Motion, Shape & Layout System (color-agnostic)

Everything from the Quattro build that's reusable regardless of brand palette: animation/motion language, border-radius system, shadow *structure*, spacing rhythm, type scale, and component shape patterns. Anywhere the source used the brand blue in a shadow/glow, it's called out with a `{accent}` placeholder so you can drop in a different client's color.

---

## 1. Animations & Keyframes

From `tailwind.config.ts` — five named animations, reusable as-is:

```ts
animation: {
  "gradient-shift": "gradientShift 8s ease infinite",
  float: "float 6s ease-in-out infinite",
  "pulse-glow": "pulseGlow 2s ease-in-out infinite",
  marquee: "marquee 30s linear infinite",
  "spin-slow": "spin 8s linear infinite",
},
keyframes: {
  gradientShift: {
    "0%, 100%": { backgroundPosition: "0% 50%" },
    "50%": { backgroundPosition: "100% 50%" },
  },
  float: {
    "0%, 100%": { transform: "translateY(0px)" },
    "50%": { transform: "translateY(-20px)" },
  },
  pulseGlow: {
    "0%, 100%": { boxShadow: "0 0 20px {accent}4d" },   // ~0.3 alpha
    "50%": { boxShadow: "0 0 40px {accent}b3" },          // ~0.7 alpha
  },
  marquee: {
    "0%": { transform: "translateX(0%)" },
    "100%": { transform: "translateX(-50%)" },
  },
},
backgroundSize: { "300%": "300%" },
```

**Usage guide:**
- `animate-float` — used on floating hero illustrations/icons, gives a slow ambient bob. Good for hero graphics, badges, decorative shapes.
- `animate-gradient-shift` (paired with `bg-[length:300%_300%]` or `bg-size-[300%]`) — animated gradient backgrounds/text.
- `animate-pulse-glow` — draws attention to a CTA or highlighted card without being a hard blink.
- `animate-marquee` — infinite horizontal scroll for logo strips/testimonial ticker; requires duplicating the track content once (`translateX(-50%)` assumes two copies of the content back-to-back).
- `animate-spin-slow` — slow-rotating decorative rings/icons (8s per rotation vs Tailwind's default 1s `animate-spin`).

**CSS-only utility classes** (defined in `globals.css`, no Tailwind config equivalent — port these as literal classes):

```css
/* Animated gradient mesh background */
.gradient-mesh {
  background: linear-gradient(-45deg, {surface-1}, {surface-2}, {surface-3}, {surface-4});
  background-size: 400% 400%;
  animation: gradientShift 12s ease infinite;
}

/* Animated grid overlay (subtle moving graph-paper texture) */
.grid-overlay {
  background-image:
    linear-gradient({accent}12 1px, transparent 1px),
    linear-gradient(90deg, {accent}12 1px, transparent 1px);
  background-size: 60px 60px;
}

/* Shimmer border sweep */
@keyframes shimmerBorder { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
.shimmer-border {
  background: linear-gradient(90deg, {border-color} 0%, {accent} 50%, {border-color} 100%);
  background-size: 200% 100%;
  animation: shimmerBorder 2s linear infinite;
}

/* Glow pulse (two-layer shadow bloom) */
.glow-pulse { animation: pulseGlow 2s ease-in-out infinite; }

/* Gradient text sweep */
.gradient-text {
  background: linear-gradient(90deg, {accent-1}, {accent-2}, {accent-1});
  background-size: 200% auto;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  animation: gradientShift 4s linear infinite;
}

/* Card hover glow (structure only — see §3 for the exact layered shadow) */
.card-glow:hover {
  box-shadow: 0 0 0 1px {accent}, 0 8px 32px {accent}40, 0 0 60px {accent}1a;
}
```

**General motion conventions:**
- Standard interactive transition: `transition-all duration-200` (buttons, links) or `transition-colors` / `transition-shadow` when only one property actually changes — prefer the narrower one where you can, it's cheaper to paint.
- Card/section transitions run slightly slower: `transition-all duration-300`.
- Scroll-reveal pattern (via Framer Motion `AnimatedItem`/`AnimatedSection` wrappers, not raw CSS): fade + slight translate-Y on viewport entry, staggered per child in a grid.
- Hover-tilt on cards (`TiltCard` wrapper): subtle 3D perspective tilt following cursor position, not a CSS-only effect — implemented with Framer Motion.

---

## 2. Border Radius System

No custom radius scale — default Tailwind values, but used **semantically and consistently**, which is the actual reusable pattern:

| Radius | Usage |
|---|---|
| `rounded-full` | Pills, badges, avatars, dots, nav underline bar, timeline nodes |
| `rounded-2xl` | Cards — the dominant "card" radius across the whole site |
| `rounded-xl` | Buttons, icon tiles, form inputs on dark sections |
| `rounded-lg` | Smaller form inputs, compact buttons, social icon buttons |
| `rounded-md` | Small hit-areas only (nav links) |
| `rounded-3xl` | Reserved for a handful of large "hero panel" elements (testimonial carousel shell, newsletter panel, contact page card) — used sparingly to signal something special |

**Rule of thumb to port:** pick one radius per "tier" of element (button vs card vs pill vs hero-panel) and apply it everywhere that tier appears — don't vary radius within the same element type.

---

## 3. Shadow System

Two shadow systems coexist in the source; both are portable independent of color:

**A. Flat elevation shadows** (Tailwind built-ins) — used on light-background cards/forms:
```
shadow-sm    /* subtle resting elevation */
shadow-md    /* hover state for shadow-sm cards */
shadow-lg / shadow-xl / shadow-2xl   /* modals, dropdowns, floating panels */
```

**B. Glow shadows** — dark-theme signature look, structure is what's reusable (swap `{accent}` for the new brand color):
```css
/* Button resting / hover */
shadow-[0_0_20px_{accent}66]
hover:shadow-[0_0_30px_{accent}99]

/* Hero CTA (bigger, more dramatic) */
shadow-[0_0_30px_{accent}80]
hover:shadow-[0_0_50px_{accent}b3]

/* Nav bar, scrolled state (neutral, not brand-colored) */
shadow-[0_4px_30px_rgba(0,0,0,0.4)]

/* Card resting shadow (neutral) */
style={{ boxShadow: "0 4px 30px rgba(0,0,0,0.3)" }}

/* Canonical layered "card glow" on hover — 3 stacked shadows: */
box-shadow:
  0 0 0 1px {accent},               /* hairline ring */
  0 8px 32px {accent} @ 25% alpha,  /* mid bloom */
  0 0 60px {accent} @ 10% alpha;    /* wide ambient halo */
```

**Pattern to reuse:** glow shadows always pair a tight, higher-opacity inner layer with a wide, low-opacity outer layer — never a single flat blur. This two-layer (or three-layer) stacking is what makes the glow read as "light source" rather than "drop shadow."

---

## 4. Spacing & Layout Rhythm

**Breakpoints:**
```ts
screens: { xs: "375px" } // + Tailwind defaults sm:640 md:768 lg:1024 xl:1280 2xl:1536
```
Responsive scaling convention: almost everything steps at `base → sm → lg` only (rarely touches `xl`/`2xl` — keeps the responsive logic simple).

**Section vertical rhythm:**
- Standard section: `py-16 sm:py-20 lg:py-24`
- Page-hero section: `py-20 sm:py-24 lg:py-32`

**Container width tiers** (pick by content type, not per-page):
- `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8` — full nav/footer width
- `max-w-6xl mx-auto px-4 sm:px-6 lg:px-8` — standard content sections
- `max-w-4xl` — hero copy blocks, CTA banners (narrower = more focused)

**Gap scale frequency** (most → least common — gives a sense of the "default" spacing used when in doubt): `gap-2` > `gap-1` > `gap-3` > `gap-5` ≈ `gap-4` > `gap-6` > `gap-8` > `gap-10`/`gap-12`/`gap-16`.

---

## 5. Typography Scale (structure, not the specific fonts)

Three-role font system — swap the actual typefaces, keep the role split:
- **Display face** — bold, used only for headings/CTAs/wordmark (weights 600–800)
- **Body face** — used for all paragraph text, form fields, nav links (weights 300–700, most content sits at 400/500)
- **Mono face** — reserved *only* for small uppercase tracked-out labels (eyebrows, badges) — never used for real body copy

**Type scale patterns (sizes/weights/tracking — reusable verbatim):**
```
Hero H1:        text-4xl sm:text-6xl lg:text-7xl   font-bold   leading-[1.1] sm:leading-tight
Section H2:      text-2xl sm:text-4xl lg:text-5xl   font-bold
Card title:      text-lg sm:text-xl                 font-bold
Eyebrow/kicker:  text-sm                             tracking-widest uppercase  (mono face, precedes every H2)
Body/lede:       text-base sm:text-lg  (standard) / text-xl (hero subtext)
```
**Rule to port:** every section heading is preceded by a small mono/uppercase/tracked-out eyebrow label — this two-line "kicker + headline" combo is the single most repeated typographic pattern in the whole site and reads as very intentional/branded regardless of what colors or fonts you put behind it.

---

## 6. Component Shape Patterns (structure only)

**Button** — shape/sizing, drop the color classes:
```
base:  inline-flex items-center justify-center gap-2 font-medium rounded-xl transition-all duration-200
sizes: sm → px-4 py-1.5 text-sm
       md → px-5 py-2.5 text-sm
       lg → px-8 py-3.5 text-base
disabled: opacity-60 cursor-not-allowed
```

**Badge/pill:**
```
inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium tracking-wider uppercase
```

**Card (dark-surface pattern):**
```
h-full flex flex-col p-8 rounded-2xl border transition-all duration-300 group
+ layered glow shadow on hover (see §3)
```

**Card (light-surface pattern):**
```
flex gap-4 sm:gap-5 p-6 sm:p-8 rounded-2xl border shadow-sm hover:shadow-md transition-shadow
```

**Navbar shape:**
```
sticky top-0 z-50, translucent background + backdrop-blur(12px)
on scroll: adds bottom border + neutral elevation shadow
nav links: px-3 py-2 text-sm rounded-md, active state = animated underline bar (h-0.5 rounded-full, shared layoutId for smooth slide between items)
```

---

## What to swap per new client

Everything above is color-neutral except the `{accent}`/`{surface}` placeholders in §1 and §3 — drop in the new brand's primary color there and the entire motion/shape/spacing language carries over unchanged.
