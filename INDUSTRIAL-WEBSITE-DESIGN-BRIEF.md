# Industrial Website Design Inspiration Brief

> Prepared from six live Chrome tabs on 2026-09-18. This is an inspiration and synthesis document—not a request to reproduce any source website, brand asset, copy, or layout.

## 1. Objective

Create a premium B2B industrial, energy, mining, or engineering website that feels:

- technically credible without feeling cold;
- confident without becoming visually aggressive;
- cinematic at first glance and easy to scan after that;
- human-centered while still showing machinery, infrastructure, and data;
- sustainability-aware without relying on generic green imagery or unsupported claims.

The recommended design direction is **Precision with Momentum**: editorial-scale typography, real operational photography, disciplined navigation, geometric framing, and one vivid brand accent.

## 2. Source references

### Aramco — cinematic storytelling and layered navigation

- URL: <https://aramco.com/en>
- Screenshot: [01-aramco-home.png](screenshots/01-aramco-home.png)
- Borrow the idea of a full-bleed operational image with a dark readability gradient.
- Keep the hero copy concise and pair it with one clear action.
- Use small story/category markers as orientation, not as competing calls to action.
- Strong below-fold pattern: large editorial statements, proof metrics, topic cards, and report/news modules.

![Aramco homepage reference](screenshots/01-aramco-home.png)

### Naftagaz — bold geometry and human scale

- URL: <https://naftagaz.com/en/?changeLang=en>
- Screenshot: [02-naftagaz-home.png](screenshots/02-naftagaz-home.png)
- Borrow the contrast between a muted photo and a large, high-saturation geometric brand field.
- Showing a worker at real scale makes the business feel tangible and accountable.
- Overlapping cards can create depth and lead directly from the hero into capabilities.
- Avoid reproducing the exact block geometry, logo treatment, or red/gray composition.

![Naftagaz homepage reference](screenshots/02-naftagaz-home.png)

### NOV — minimal chrome and a single commanding message

- URL: <https://www.nov.com/>
- Screenshot: [03-nov-home.png](screenshots/03-nov-home.png)
- Borrow the very large, plain-language headline over active operational footage.
- A compact utility cluster—search, account, menu—keeps the frame clean.
- The subtle underlined text link works when the headline and imagery already carry the visual weight.
- Strong content model below the fold: short company proposition, three primary routes, then current news.

![NOV homepage reference](screenshots/03-nov-home.png)

### ABB — disciplined hierarchy and high-confidence typography

- URL: <https://www.abb.com/global/en>
- Screenshot: [04-abb-home.png](screenshots/04-abb-home.png)
- Borrow the crisp separation between a white utility header and a dark cinematic hero.
- Use a small eyebrow, a forceful display headline, supporting sentence, then a filled CTA.
- Give video explicit pause/play controls and respect reduced-motion preferences.
- Below the fold, the site moves from industry outcomes to technology areas, stories, news, and contact routes—a useful enterprise sequence.

![ABB homepage reference](screenshots/04-abb-home.png)

### FLS — industrial optimism and softer organic framing

- URL: <https://fls.com/en>
- Screenshot: [05-fls-home.png](screenshots/05-fls-home.png)
- Borrow the warmer, more optimistic image treatment and generous whitespace.
- The curved transition between navigation, hero, and lower accent band softens an otherwise technical interface.
- A visible `Contact us` button in the global header is effective for enterprise conversion.
- Below the fold, product equipment, services, investor information, careers, and expert contact are separated into clear modules.

![FLS homepage reference](screenshots/05-fls-home.png)

### Hexagon — precise geometry and technology clarity

- URL: <https://hexagon.com/>
- Screenshot: [06-hexagon-home.png](screenshots/06-hexagon-home.png)
- Borrow the split hero, controlled whitespace, and geometry that appears to originate from the brand system.
- The announcement strip is useful when it has one timely message and can be dismissed.
- A concise headline, one explanatory paragraph, and one CTA create an unusually clear first screen.
- Below the fold, technology pillars, customer results, logos, and quantified proof establish credibility without requiring dense prose.

![Hexagon homepage reference](screenshots/06-hexagon-home.png)

## 3. Synthesis: what the new site should feel like

### Core visual language

- **Layout:** wide desktop canvas, 12-column grid, strong alignment, generous negative space.
- **Hero:** 78–90vh on desktop; either a full-bleed photo/video or a 5/7 split composition.
- **Imagery:** real people, equipment, materials, and operational environments. Prefer documentary photography over glossy stock imagery.
- **Typography:** modern grotesk with confident scale, tight display leading, and highly readable body copy.
- **Shapes:** one recurring geometric device—angled crop, contour line, arc, or measured grid—derived from the new brand, not from any reference site.
- **Color:** deep industrial neutrals plus one electric accent. Use a second accent only for charts or status semantics.
- **Motion:** restrained and informative. Slow hero media, 150–300ms interface transitions, and no decorative motion that delays access to content.

### Recommended palette

| Token | Value | Use |
|---|---:|---|
| `ink-950` | `#08111C` | Dark hero overlays, footer, primary text on light surfaces |
| `steel-700` | `#334657` | Secondary text, iconography, supporting UI |
| `mist-100` | `#E9EFF3` | Dividers, alternate backgrounds, quiet cards |
| `paper-50` | `#F8FAFB` | Main background |
| `signal-600` | `#1261D8` | Primary CTA, active states, links |
| `signal-400` | `#2F89FF` | Data highlights and controlled gradients |
| `safety-500` | `#FF5A36` | Optional sparing accent for alerts or one featured statistic |

Do not use both blue and orange as competing primary actions. If the final brand already has a signature color, replace `signal-*` and keep the neutral system.

### Recommended typography

- **Display/headings:** Manrope, 600–700 weight; alternatively use the brand typeface.
- **Body/UI:** Source Sans 3, 400–600 weight.
- **Desktop H1:** `clamp(3.5rem, 7vw, 7.5rem)`, line-height `0.92–1.02`.
- **Section H2:** `clamp(2.25rem, 4vw, 4.5rem)`, line-height `1.0–1.12`.
- **Body:** 18–20px for lead copy; 16–18px for standard copy; line-height `1.5–1.65`.
- **Measure:** keep body text near 60–72 characters per line.

### Spacing and surfaces

- Base spacing unit: 8px.
- Page gutters: 24px mobile, 40px tablet, 64–80px desktop.
- Section spacing: 80px mobile, 128–160px desktop.
- Use mostly square or subtly rounded cards (`8–12px`). Reserve larger organic radii for a single branded framing device.
- Prefer borders and tonal surface shifts over heavy shadows.

## 4. Recommended homepage architecture

1. **Optional announcement strip**
   - One timely message, one link, dismiss control.
   - Do not turn this into a permanent second navigation bar.

2. **Global header**
   - Logo.
   - 4–6 primary destinations: Solutions, Industries, Technology, Sustainability, Company, Insights.
   - Search and language/region utilities.
   - Persistent primary CTA: `Talk to an expert` or `Contact us`.
   - On mobile, use a labeled menu button and keep the CTA inside the menu to preserve space.

3. **Hero**
   - Eyebrow of 2–5 words.
   - Benefit-led headline of no more than 8–12 words.
   - Supporting copy of no more than 24–32 words.
   - One primary CTA and, only if necessary, one quiet text link.
   - Use an image/video with a person, machine, or measurable outcome—not an abstract technology collage.
   - If video is used, provide pause/play and a static poster fallback.

4. **Outcome pathways**
   - Three to six routes such as `Increase throughput`, `Reduce downtime`, `Lower emissions`, and `Improve safety`.
   - Let users enter by goal before asking them to understand the company’s internal structure.

5. **Capabilities / technology system**
   - 3–4 core technology pillars with short descriptions and supporting visuals.
   - Use a stable grid, not an auto-rotating carousel, for critical navigation.

6. **Proof at scale**
   - Three audited metrics with labels, dates, and sources.
   - Examples: active sites, uptime achieved, installed base, operating regions, or emissions avoided.
   - Avoid large unsupported numbers presented only for decoration.

7. **Featured customer story**
   - Large editorial image.
   - Challenge → intervention → quantified outcome.
   - One CTA to the full case study.

8. **Sustainability / responsibility**
   - Explain the operational mechanism, not only the ambition.
   - Link claims to targets, methods, and reports.

9. **Insights and news**
   - One featured story plus 2–3 compact cards.
   - Show content type and date consistently.

10. **Conversion band**
    - Direct question such as `What are you trying to improve?`
    - Primary CTA to contact/sales and a secondary route to locations or support.

11. **Footer**
    - Group links by task, not company org chart.
    - Include contact, support, careers, legal, social, and region/language controls.

## 5. Reusable component inventory

- Announcement bar with dismissal state.
- Responsive global header and accessible mega menu.
- Hero media frame with gradient overlay and media controls.
- Eyebrow + display headline + short copy + CTA group.
- Outcome pathway cards.
- Capability cards with consistent icon or image treatment.
- Metric/proof strip with source annotation.
- Editorial case-study feature.
- News/insight cards with type and date metadata.
- Logo cloud with monochrome assets and accessible names.
- Contact conversion band.
- Structured enterprise footer.

Every interactive component must include default, hover, active, focus-visible, disabled, loading, and—where relevant—expanded states.

## 6. Interaction and motion rules

- Navigation must work with keyboard, touch, and pointer input.
- Minimum target size: 44×44px; keep at least 8px between adjacent controls.
- Use 150–300ms transitions with transform and opacity only where possible.
- Do not rely on hover to reveal essential information.
- Preserve scroll and filter state when users return from detail pages.
- Respect `prefers-reduced-motion`; replace autoplay effects with static states.
- If cards slide, provide visible previous/next controls and do not auto-advance critical content.
- Maintain a strong, visible focus ring on every interactive element.

## 7. Responsive rules

- **Mobile (375px):** content first, single column, no text over visually busy media, 16px minimum body text.
- **Tablet (768px):** two-column card grids and simplified navigation.
- **Desktop (1024–1440px):** 12-column grid, asymmetric editorial compositions, capped content width around 1440px.
- Do not simply crop desktop heroes on mobile; select a dedicated mobile crop or move text onto a solid surface.
- Keep sticky headers compact and reserve layout space so content is not hidden underneath.

## 8. Accessibility and performance constraints

- WCAG AA contrast: 4.5:1 for normal text and 3:1 for large text and meaningful graphical elements.
- Use semantic headings in order and provide a skip-to-content link.
- All icon-only controls require accessible names.
- Images need meaningful alt text; decorative geometry should be hidden from assistive technology.
- Use AVIF/WebP, responsive sources, explicit dimensions/aspect ratios, and lazy-loading below the fold.
- Load a static hero poster before any video and avoid blocking the initial render on video playback.
- Keep the page functional without motion and without autoplay.
- Avoid layout shift by reserving space for media, cards, and asynchronously loaded content.

## 9. Anti-copy and anti-pattern guardrails

- Do not reproduce any source logo, headline, brand color combination, geometric motif, image, animation, or exact section order.
- Do not mix all six visual languages. Choose one hero model and one recurring brand device.
- Avoid generic stock imagery of handshakes, holograms, or anonymous skylines.
- Avoid vague claims such as `building a better future` unless followed immediately by evidence.
- Avoid multiple equally prominent CTAs in the same viewport.
- Avoid carousels for core navigation or information needed to understand the offer.
- Avoid tiny uppercase body text and low-contrast gray-on-gray copy.
- Avoid oversized cookie banners that obscure the main experience; use a compact, accessible consent interface.

## 10. AI implementation brief

Use the following as the build directive:

```text
Design a premium responsive website for a B2B industrial/engineering brand using the direction “Precision with Momentum.” The experience should combine cinematic real-world operational imagery, concise editorial-scale typography, a clean enterprise navigation system, and one original geometric framing device derived from the new brand identity.

Start with an optional dismissible announcement, a compact global header, and a hero with one benefit-led headline, one short paragraph, and one primary CTA. Follow with outcome-based entry points, core capabilities, sourced proof metrics, a quantified customer story, evidence-based sustainability content, recent insights, and a direct contact band.

Use deep industrial neutrals, an off-white background, and one electric brand accent. Use Manrope for display type and Source Sans 3 for body copy unless brand fonts are provided. Keep layouts spacious, aligned to a 12-column desktop grid, and fully responsive from 375px to 1440px.

Create original composition, copy, shapes, and assets. Do not recreate the source websites, their logos, their color combinations, or their distinctive layouts. Use the reference set only for high-level principles: photographic credibility, strong hierarchy, geometric precision, concise messaging, and clear proof.

Meet WCAG AA, provide visible focus states and 44px interaction targets, respect reduced motion, provide video controls and poster fallbacks, optimize responsive images, reserve media dimensions, and prevent layout shift.
```

## 11. Definition of done

- The first screen communicates who the company helps, what outcome it creates, and the next action within five seconds.
- The navigation supports both industry-first and solution-first discovery.
- At least one person and one real operational context appear in the visual system.
- Every major claim is paired with evidence, a source, or a clear route to detail.
- Mobile is intentionally composed rather than being a compressed desktop layout.
- Keyboard, reduced-motion, and contrast checks pass before launch.
- The final result feels inspired by the reference set but cannot be mistaken for any individual source site.
