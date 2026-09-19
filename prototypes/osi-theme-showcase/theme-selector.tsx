import Link from "next/link";
import { themes, type ThemeSlug } from "./content";

export function ThemeSelector({ active }: { active?: ThemeSlug }) {
  return (
    <nav className="prototype-selector" aria-label="Theme comparison">
      <Link className="prototype-selector__index" href="/theme-showcase">
        <span aria-hidden="true">←</span> Compare
      </Link>
      <div className="prototype-selector__themes">
        {themes.map((theme, index) => (
          <Link
            key={theme.slug}
            href={`/${theme.slug}`}
            className={active === theme.slug ? "is-active" : undefined}
            aria-current={active === theme.slug ? "page" : undefined}
          >
            <span>{String(index + 1).padStart(2, "0")}</span>
            {theme.name}
          </Link>
        ))}
      </div>
    </nav>
  );
}
