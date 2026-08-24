import type { DetailedHTMLProps, HTMLAttributes } from 'react';

/**
 * `<vturb-smartplayer>` — the custom element the Vturb player script defines.
 *
 * TypeScript rejects any tag it does not know, and a web component registered
 * at runtime is invisible to it. Declaring the tag here is what lets step 15
 * write the vendor's markup as JSX instead of reaching for
 * `dangerouslySetInnerHTML` or a `createElement` cast — both of which would put
 * the element outside React's tree and make its lifecycle ours to manage.
 *
 * Typed as a plain HTMLElement: every attribute the embed sets (`id`, `style`)
 * is a standard one, so nothing custom needs describing. The player reads its
 * configuration from the `id`, not from properties.
 */
declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'vturb-smartplayer': DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement>;
    }
  }
}

/**
 * `window._plt` — the timestamp the Vturb player subtracts from to report its
 * `player.ttpi` metric. Written by whichever of the vendor's inline snippet,
 * VturbPreload, or smartplayer.js itself runs first; all three guard with `||`.
 */
declare global {
  interface Window {
    _plt?: number;
  }
}

export {};
