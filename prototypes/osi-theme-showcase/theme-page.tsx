import Image from "next/image";
import Link from "next/link";
import fieldEngineer from "./public/field-engineer.webp";
import operationsHero from "./public/operations-hero.webp";
import technologyTools from "./public/technology-tools.webp";
import { getTheme, showcaseContent as content, type ThemeSlug } from "./content";
import {
  ArrowRightIcon,
  ArrowUpRightIcon,
  ChevronDownIcon,
  FlowIcon,
  MeasureIcon,
  MenuIcon,
  PinIcon,
  ShieldIcon,
} from "./icons";
import { ThemeSelector } from "./theme-selector";

const capabilityIcons = [MeasureIcon, FlowIcon, ShieldIcon, PinIcon];

function Mark() {
  return (
    <span className="brand-mark" aria-label="Odessa Separator Inc.">
      <span className="brand-mark__monogram" aria-hidden="true">OSI</span>
      <span className="brand-mark__name">Odessa<br />Separator Inc.</span>
    </span>
  );
}

function ArrowLink({ children, href = "#" }: { children: React.ReactNode; href?: string }) {
  return (
    <a className="arrow-link" href={href}>
      <span>{children}</span>
      <ArrowUpRightIcon />
    </a>
  );
}

function Header({ theme }: { theme: ThemeSlug }) {
  return (
    <header className="theme-header">
      <a className="skip-link" href="#main-content">Skip to content</a>
      {theme === "vector" ? <div className="vector-readout" aria-hidden="true">LAT 31.8457° N <span /> LONG 102.3676° W</div> : null}
      {theme === "fieldwork" ? <div className="field-alert"><ShieldIcon /> Safety through preparation <span>ISO 9001:2015</span></div> : null}
      {theme === "horizon" ? <div className="horizon-note">Field-led engineering · Established 1995</div> : null}
      <div className="theme-header__inner">
        <a className="header-brand" href="#top"><Mark /></a>
        <nav className="desktop-nav" aria-label="Main navigation">
          {content.navigation.map((item) => <a key={item} href={`#${item.toLowerCase()}`}>{item}</a>)}
        </nav>
        <a className="header-cta" href="#contact">Contact <ArrowUpRightIcon /></a>
        <details className="mobile-nav">
          <summary aria-label="Open menu"><MenuIcon /></summary>
          <nav aria-label="Mobile navigation">
            {content.navigation.map((item) => <a key={item} href={`#${item.toLowerCase()}`}>{item}</a>)}
            <a href="#contact">Contact</a>
          </nav>
        </details>
      </div>
    </header>
  );
}

function Hero({ theme }: { theme: ThemeSlug }) {
  if (theme === "forge") {
    return (
      <section className="hero hero--forge" id="top">
        <Image src={operationsHero} alt="Oilfield production equipment operating at dusk" fill loading="eager" sizes="100vw" />
        <div className="hero__shade" />
        <div className="hero__content">
          <p className="eyebrow">{content.hero.eyebrow}</p>
          <h1>Condition<br />the <em>flow.</em><br />Extend the run.</h1>
          <p className="hero__body">{content.hero.body}</p>
          <div className="hero__actions"><a className="button button--primary" href="#solutions">{content.hero.primaryAction}<ArrowRightIcon /></a></div>
        </div>
        <div className="hero__status"><span>Operating context</span><strong>Permian Basin</strong><small>Illustrative image · 31.8°N</small></div>
        <a className="hero__scroll" href="#solutions"><span>Scroll to explore</span><ChevronDownIcon /></a>
      </section>
    );
  }

  if (theme === "vector") {
    return (
      <section className="hero hero--vector" id="top">
        <div className="vector-coordinates" aria-hidden="true"><span>Y 08</span><span>OSI / FLUID SYSTEMS</span><span>X 24</span></div>
        <div className="hero__content">
          <p className="eyebrow">{content.hero.eyebrow}</p>
          <h1>Control the variables.<br /><em>Improve the outcome.</em></h1>
          <p className="hero__body">{content.hero.body}</p>
          <div className="hero__actions">
            <a className="button button--primary" href="#solutions">{content.hero.primaryAction}<ArrowRightIcon /></a>
            <a className="button button--text" href="#contact">{content.hero.secondaryAction}</a>
          </div>
          <div className="vector-spec"><span>Pressure</span><strong>Application-led</strong><span>Geometry</span><strong>Field-proven</strong></div>
        </div>
        <div className="hero__media">
          <Image src={technologyTools} alt="Precision-machined downhole tools arranged in a technical laboratory" fill loading="eager" sizes="(max-width: 767px) 100vw, 54vw" />
          <span className="crosshair crosshair--one" aria-hidden="true" /><span className="crosshair crosshair--two" aria-hidden="true" />
          <div className="media-caption"><span>FIG. 01</span> Precision fluid-conditioning systems</div>
        </div>
      </section>
    );
  }

  if (theme === "horizon") {
    return (
      <section className="hero hero--horizon" id="top">
        <div className="hero__content">
          <p className="eyebrow">{content.hero.eyebrow}</p>
          <h1>More productive wells.<br /><em>More thoughtful operations.</em></h1>
          <p className="hero__body">{content.hero.body}</p>
          <div className="hero__actions">
            <a className="button button--primary" href="#solutions">{content.hero.primaryAction}<ArrowRightIcon /></a>
            <a className="button button--text" href="#responsibility">Our approach to responsibility</a>
          </div>
        </div>
        <div className="hero__media">
          <Image src={operationsHero} alt="Oilfield production equipment beneath a broad evening sky" fill loading="eager" sizes="100vw" />
          <svg className="contour-lines" viewBox="0 0 900 420" preserveAspectRatio="none" aria-hidden="true"><path d="M-20 315c180-110 210 45 390-48s255-70 550-10"/><path d="M-20 345c180-110 210 45 390-48s255-70 550-10"/><path d="M-20 375c180-110 210 45 390-48s255-70 550-10"/></svg>
          <div className="media-caption">Designing for the full operating lifecycle</div>
        </div>
      </section>
    );
  }

  if (theme === "fieldwork") {
    return (
      <section className="hero hero--fieldwork" id="top">
        <div className="hero__media">
          <Image src={fieldEngineer} alt="Field engineer measuring a downhole tool in an oilfield service yard" fill loading="eager" sizes="(max-width: 767px) 100vw, 58vw" />
          <div className="work-order"><span>WORK ORDER</span><strong>FW—042</strong><small>Measure twice. Deploy once.</small></div>
        </div>
        <div className="hero__content">
          <p className="eyebrow">Built for the worksite</p>
          <h1>The right tool.<br /><em>The right setup.</em><br />A team that shows up.</h1>
          <p className="hero__body">{content.hero.body}</p>
          <div className="hero__actions"><a className="button button--primary" href="#solutions">See how we help<ArrowRightIcon /></a></div>
          <div className="field-facts"><span><strong>30+</strong> years in the field</span><span><strong>9+</strong> countries supported</span></div>
        </div>
      </section>
    );
  }

  return (
    <section className="hero hero--signal" id="top">
      <div className="hero__index"><span>01</span><span>Homepage</span></div>
      <div className="hero__content">
        <p className="eyebrow">{content.hero.eyebrow}</p>
        <h1>Condition the flow.<br /><em>Extend the run.</em></h1>
        <p className="hero__body">{content.hero.body}</p>
        <div className="hero__actions">
          <a className="button button--primary" href="#solutions">{content.hero.primaryAction}<ArrowRightIcon /></a>
          <a className="button button--text" href="#contact">{content.hero.secondaryAction}</a>
        </div>
      </div>
      <div className="hero__media">
        <Image src={operationsHero} alt="Oilfield production equipment at dusk" fill loading="eager" sizes="(max-width: 767px) 100vw, 48vw" />
        <div className="media-caption"><span>Operational reliability</span><span>Downhole engineering</span></div>
      </div>
      <div className="signal-ticker"><span>GAS SEPARATION</span><span>SAND CONTROL</span><span>CHEMICAL TREATMENT</span></div>
    </section>
  );
}

function SectionIntro({ eyebrow, title, body, index }: { eyebrow: string; title: string; body?: string; index?: string }) {
  return (
    <div className="section-intro">
      {index ? <span className="section-index">{index}</span> : null}
      <p className="eyebrow">{eyebrow}</p>
      <h2>{title}</h2>
      {body ? <p className="section-intro__body">{body}</p> : null}
    </div>
  );
}

function Outcomes() {
  return (
    <section className="section outcomes" id="solutions">
      <SectionIntro index="02" eyebrow="Outcome pathways" title="Start with what is limiting the well." body="Three recurring challenges. One application-led engineering approach." />
      <div className="outcome-grid">
        {content.outcomes.map((item) => (
          <article className="outcome-card" key={item.number}>
            <span className="outcome-card__number">{item.number}</span>
            <FlowIcon className="outcome-card__icon" />
            <h3>{item.title}</h3>
            <p>{item.body}</p>
            <a href="#technology"><span>{item.tag}</span><ArrowUpRightIcon /></a>
          </article>
        ))}
      </div>
    </section>
  );
}

function Capabilities() {
  return (
    <section className="section capabilities" id="products">
      <SectionIntro index="03" eyebrow="Core capabilities" title="Engineering that travels from desk to field." />
      <div className="capability-grid">
        {content.capabilities.map((item, index) => {
          const Icon = capabilityIcons[index];
          return <article key={item.title}><Icon /><span>0{index + 1}</span><h3>{item.title}</h3><p>{item.body}</p></article>;
        })}
      </div>
    </section>
  );
}

function Metrics() {
  return (
    <section className="metrics" aria-label="OSI proof points">
      <div className="metrics__head"><p>Public OSI proof points</p><span>Verify before production use</span></div>
      <div className="metric-grid">
        {content.metrics.map((metric) => <div key={metric.value}><strong>{metric.value}</strong><span>{metric.label}</span></div>)}
      </div>
    </section>
  );
}

function Story() {
  return (
    <section className="section story" id="industries">
      <div className="story__media"><Image src={fieldEngineer} alt="Engineer checking dimensional accuracy of a downhole assembly" fill sizes="(max-width: 767px) 100vw, 52vw" /><span>Illustrative field scenario</span></div>
      <div className="story__content">
        <SectionIntro index="04" eyebrow={content.story.eyebrow} title={content.story.title} body={content.story.body} />
        <div className="story__stat"><strong>{content.story.stat}</strong><span>{content.story.statLabel}</span></div>
        <p className="placeholder-note">{content.story.note}</p>
        <ArrowLink href="#contact">Discuss your application</ArrowLink>
      </div>
    </section>
  );
}

function Technology() {
  return (
    <section className="section technology" id="technology">
      <div className="technology__content">
        <SectionIntro index="05" eyebrow={content.technology.eyebrow} title={content.technology.title} body={content.technology.body} />
        <ol className="process-list">
          {content.technology.steps.map((step, index) => <li key={step}><span>0{index + 1}</span><strong>{step}</strong><small>{index === 0 ? "Operating conditions" : index === 1 ? "System geometry" : index === 2 ? "Field fit" : "Performance loop"}</small></li>)}
        </ol>
      </div>
      <div className="technology__media"><Image src={technologyTools} alt="Machined fluid-conditioning tools in an engineering lab" fill sizes="(max-width: 767px) 100vw, 50vw" /><div className="technical-label"><span>OSI / ENGINEERING</span><strong>Application → Geometry</strong></div></div>
    </section>
  );
}

function Responsibility() {
  return (
    <section className="section responsibility" id="responsibility">
      <div className="responsibility__orbit" aria-hidden="true"><span /><span /><span /></div>
      <SectionIntro index="06" eyebrow={content.responsibility.eyebrow} title={content.responsibility.title} body={content.responsibility.body} />
      <ul>{content.responsibility.points.map((point, index) => <li key={point}><span>0{index + 1}</span>{point}</li>)}</ul>
      <p className="evidence-note"><ShieldIcon /> Evidence-led language only. Production claims require an approved source.</p>
    </section>
  );
}

function Insights() {
  return (
    <section className="section insights" id="resources">
      <SectionIntro index="07" eyebrow="Insights and resources" title="Useful thinking for difficult wells." />
      <div className="insight-grid">
        {content.insights.map((insight, index) => (
          <article key={insight.title} className={index === 0 ? "insight-card insight-card--featured" : "insight-card"}>
            <div className="insight-card__visual" aria-hidden="true"><span>{String(index + 1).padStart(2, "0")}</span><FlowIcon /></div>
            <div><p>{insight.type}<span>{insight.date}</span></p><h3>{insight.title}</h3><a href="#contact" aria-label={`Read ${insight.title}`}><ArrowUpRightIcon /></a></div>
          </article>
        ))}
      </div>
    </section>
  );
}

function Contact() {
  return (
    <section className="contact-band" id="contact">
      <p className="eyebrow">{content.contact.eyebrow}</p>
      <h2>{content.contact.title}</h2>
      <p>{content.contact.body}</p>
      <div><a className="button button--primary" href="#prototype-static-note">Talk to an engineer<ArrowRightIcon /></a><a className="button button--text" href="#locations">Find a location</a></div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="theme-footer" id="company">
      <div className="theme-footer__lead"><Mark /><p>World-class downhole fluid-conditioning systems, engineered around real operating challenges.</p></div>
      <div><h3>Explore</h3><a href="#solutions">Solutions</a><a href="#products">Capabilities</a><a href="#resources">Resources</a></div>
      <div><h3>Connect</h3><a href="#contact">Contact</a><a href="#locations" id="locations">Locations</a><a href="#company">Careers</a></div>
      <div><h3>Prototype</h3><Link href="/theme-showcase">Compare themes</Link><a href="#top">Back to top</a></div>
      <div className="theme-footer__bottom"><span>© 2026 Odessa Separator Inc.</span><span id="prototype-static-note">Design validation prototype · Static content only</span></div>
    </footer>
  );
}

export function ThemePage({ slug }: { slug: ThemeSlug }) {
  const theme = getTheme(slug);
  return (
    <div className={`prototype-page theme-${slug}`} data-theme={slug}>
      <ThemeSelector active={slug} />
      <div className="theme-canvas">
        <Header theme={slug} />
        <main id="main-content" tabIndex={-1}>
          <Hero theme={slug} />
          <Outcomes />
          <Capabilities />
          <Metrics />
          <Story />
          <Technology />
          <Responsibility />
          <Insights />
          <Contact />
        </main>
        <Footer />
      </div>
      <div className="concept-label" aria-hidden="true"><span>{theme.name}</span><span>{theme.label}</span></div>
    </div>
  );
}
