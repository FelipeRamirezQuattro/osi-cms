import { vi } from "vitest";
import "@testing-library/jest-dom/vitest";

// next/font loaders are build-time functions and are not executable in
// Vitest's jsdom transform. Keep their public contract available so component
// tests can import the same public font registry used by real renders.
vi.mock("next/font/google", () => {
  const loader = (options: { variable?: string } = {}) => ({
    className: "mock-font",
    variable: options.variable ? `mock-${options.variable.slice(2)}` : "mock-font-variable",
    style: { fontFamily: "Mock Font" },
  });
  return {
    Fraunces: loader,
    Inter: loader,
    Montserrat: loader,
    Orbitron: loader,
    Poppins: loader,
    Rajdhani: loader,
    Source_Sans_3: loader,
  };
});

// jsdom doesn't implement IntersectionObserver, which motion/react's
// useInView (lib/motion/use-reveal-in-view.ts, behind every AnimatedGroup/
// AnimatedItem/RevealSection) sets up in a useEffect on mount. Without
// this stub, component tests that render anything wrapping LabelPlateGrid
// (product-grid-client, recommendations-client) throw
// "IntersectionObserver is not defined" the moment RTL's render() flushes
// effects — this is test-environment plumbing, not a behavior change.
class MockIntersectionObserver implements IntersectionObserver {
  readonly root: Element | Document | null = null;
  readonly rootMargin: string = "";
  readonly thresholds: ReadonlyArray<number> = [];
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }
}
vi.stubGlobal("IntersectionObserver", MockIntersectionObserver);
