import { useCallback, useEffect } from 'react';
import { useKeyboardInset } from './useKeyboardInset';

/**
 * Keeps chat message lists pinned to the latest message when content or keyboard changes.
 */
export function useChatAutoScroll(scrollRef, deps = []) {
  const keyboardInset = useKeyboardInset();

  const scrollToEnd = useCallback(
    (animated = true) => {
      requestAnimationFrame(() => {
        scrollRef.current?.scrollToEnd?.({ animated });
      });
    },
    [scrollRef],
  );

  useEffect(() => {
    scrollToEnd(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, scrollToEnd]);

  useEffect(() => {
    if (keyboardInset <= 0) {
      return undefined;
    }
    const timer = setTimeout(() => scrollToEnd(true), 80);
    return () => clearTimeout(timer);
  }, [keyboardInset, scrollToEnd]);

  return scrollToEnd;
}
