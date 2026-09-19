import Image from "next/image";
import Link from "next/link";
import operationsHero from "./public/operations-hero.webp";
import fieldEngineer from "./public/field-engineer.webp";
import technologyTools from "./public/technology-tools.webp";
import { themes } from "./content";
import { ArrowRightIcon, ArrowUpRightIcon } from "./icons";
import { PrototypeLogo } from "./prototype-logo";

const previewImages = {
  forge: operationsHero,
  vector: technologyTools,
  horizon: operationsHero,
  fieldwork: fieldEngineer,
  signal: operationsHero,
};

export function ComparisonGallery() {
  return (
    <main className="comparison-page" id="top">
      <header className="comparison-header">
        <Link href="/" className="comparison-brand" aria-label="OSI production homepage"><PrototypeLogo /><small>Theme study<br />September 2026</small></Link>
        <div><span className="comparison-kicker">Design validation prototype · 05 directions</span><p>One story. Five distinct ways to tell it.</p></div>
      </header>

      <section className="comparison-hero">
        <p className="eyebrow">OSI visual direction study</p>
        <h1>Choose the signal<br />before we build the system.</h1>
        <p>Every concept below uses the same public-facing OSI content. Compare hierarchy, personality, image treatment, and the kind of credibility each direction creates.</p>
        <div className="comparison-legend"><span>01 — 05</span><span>Desktop + mobile</span><span>Static fixtures only</span></div>
      </section>

      <section className="comparison-grid" aria-labelledby="directions-heading">
        <h2 id="directions-heading" className="sr-only">Theme directions</h2>
        {themes.map((theme, index) => (
          <article className={`comparison-card comparison-card--${theme.slug}`} key={theme.slug}>
            <Link href={`/${theme.slug}`} className="comparison-card__preview" aria-label={`Open ${theme.name} theme`}>
              <Image src={previewImages[theme.slug]} alt="" fill sizes="(max-width: 767px) 100vw, 50vw" />
              <span className="comparison-card__number">0{index + 1}</span>
              <div className="comparison-card__mock">
                <span>OSI</span><i /><i /><i />
                <strong>{theme.slug === "fieldwork" ? "Built for the worksite." : theme.slug === "horizon" ? "Progress, made practical." : theme.slug === "vector" ? "Control the variables." : theme.slug === "signal" ? "Condition the flow." : "Extend the run."}</strong>
              </div>
              <span className="comparison-card__open"><ArrowUpRightIcon /></span>
            </Link>
            <div className="comparison-card__body">
              <div className="comparison-card__title"><div><span>Direction 0{index + 1}</span><h2>{theme.name}</h2><p>{theme.label}</p></div><div className="palette" aria-label={`${theme.name} color palette`}>{theme.palette.map((color) => <i key={color} style={{ backgroundColor: color }} title={color} />)}</div></div>
              <p className="comparison-card__personality">{theme.personality}</p>
              <dl><div><dt>Ideal use</dt><dd>{theme.idealUse}</dd></div><div><dt>Defining character</dt><dd>{theme.characteristics}</dd></div><div><dt>Strength</dt><dd>{theme.strengths}</dd></div><div><dt>Tradeoff</dt><dd>{theme.tradeoffs}</dd></div></dl>
              <Link href={`/${theme.slug}`} className="comparison-card__link">View full homepage <ArrowRightIcon /></Link>
            </div>
          </article>
        ))}
      </section>

      <section className="decision-matrix" aria-labelledby="matrix-heading">
        <div className="decision-matrix__intro"><p className="eyebrow">Decision support</p><h2 id="matrix-heading">Side-by-side matrix</h2><p>Use this as a starting point—not a scorecard. The right choice depends on which part of OSI’s story needs to lead.</p></div>
        <div className="decision-table-wrap">
          <table>
            <thead><tr><th>Direction</th><th>Personality</th><th>Strongest use case</th><th>Accessibility</th><th>Complexity</th><th>Production work</th></tr></thead>
            <tbody>{themes.map((theme) => <tr key={theme.slug}><th><Link href={`/${theme.slug}`}>{theme.name}<ArrowUpRightIcon /></Link></th><td>{theme.personality}</td><td>{theme.idealUse}</td><td>{theme.accessibility}</td><td>{theme.complexity}</td><td>{theme.production}</td></tr>)}</tbody>
          </table>
        </div>
      </section>

      <footer className="comparison-footer"><span>OSI theme comparison</span><p>Purpose-built for visual direction selection. Not connected to the CMS or production data.</p><a href="#top" aria-label="Back to top">↑</a></footer>
    </main>
  );
}
