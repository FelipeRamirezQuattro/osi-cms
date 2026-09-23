import type { DetailedHTMLProps, HTMLAttributes } from "react";

/**
 * <model-viewer> (@google/model-viewer) is a custom element, not a React
 * component — this declares it as a valid JSX intrinsic so
 * components/blocks/ar-model-client.tsx can use it directly. Only the
 * attributes this project actually sets are typed; anything else passed
 * through falls back to `unknown` via the HTMLAttributes base, matching
 * how a real custom element accepts arbitrary attributes.
 */
declare global {
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
