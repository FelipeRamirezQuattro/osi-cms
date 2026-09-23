import type { DetailedHTMLProps, HTMLAttributes } from "react";

/**
 * <model-viewer> (@google/model-viewer) is a custom element, not a React
 * component — this declares it as a valid JSX intrinsic so
 * components/blocks/ar-model-client.tsx can use it directly. Only the
 * attributes this project actually sets are typed; anything else passed
 * through falls back to `unknown` via the HTMLAttributes base, matching
 * how a real custom element accepts arbitrary attributes.
 *
 * Augments the "react" module's own `JSX` namespace rather than the
 * global `JSX` namespace: with `"jsx": "react-jsx"` (this project's
 * tsconfig) and @types/react 19, TypeScript resolves intrinsic elements
 * through `React.JSX.IntrinsicElements` (re-exported from
 * react/jsx-runtime), not a global `namespace JSX` — a `declare global {
 * namespace JSX { ... } }` version of this file type-checked but was
 * silently never consulted, surfacing only once ar-model-client.tsx
 * (Task 7) actually used the `<model-viewer>` tag.
 */
declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      "model-viewer": DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement> & {
        src?: string;
        "ios-src"?: string;
        poster?: string;
        alt?: string;
        ar?: boolean;
        "ar-modes"?: string;
        "camera-controls"?: boolean;
      };
    }
  }
}

export {};
