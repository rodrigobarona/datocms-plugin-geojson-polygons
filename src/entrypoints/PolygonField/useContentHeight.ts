import { useEffect, useRef } from 'react';
import type { RenderFieldExtensionCtx } from 'datocms-plugin-sdk';

const FRAME_BOTTOM_SPACE = 24;

/**
 * DatoCMS measures every element, including rows inside a scroll box, and
 * grows the iframe to the lowest one. Report this frame's own height instead.
 */
export function useContentHeight(ctx: RenderFieldExtensionCtx) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = ref.current;

    if (!node) {
      return;
    }

    const report = () => {
      ctx.updateHeight(Math.ceil(node.offsetHeight + FRAME_BOTTOM_SPACE));
    };

    report();
    const observer = new ResizeObserver(report);
    observer.observe(node);

    return () => {
      observer.disconnect();
    };
  }, [ctx]);

  return ref;
}
