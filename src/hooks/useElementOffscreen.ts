import { type RefObject, useEffect, useState } from 'react';

/**
 * True once the referenced element has left the viewport (and false again when it returns).
 * Starts false, so callers that reveal duplicate controls stay hidden on first paint.
 */
export function useElementOffscreen(ref: RefObject<HTMLElement | null>) {
  const [offscreen, setOffscreen] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node || typeof IntersectionObserver === 'undefined') return undefined;
    const observer = new IntersectionObserver(([entry]) => setOffscreen(!entry.isIntersecting), { threshold: 0 });
    observer.observe(node);
    return () => observer.disconnect();
  }, [ref]);

  return offscreen;
}
