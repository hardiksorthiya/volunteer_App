import { useCallback, useEffect, useRef } from 'react';
import { useKeyboardInset } from './useKeyboardInset';

const SCROLL_RETRY_MS = [0, 50, 120, 250, 400, 600];

/**
 * Keeps chat message lists pinned to the latest message when content or keyboard changes.
 * Retries scroll several times so async layouts (Markdown, long AI replies) are fully visible.
 */
export function useChatAutoScroll(scrollRef, deps = [], options = {}) {
  const { scrollOnKeyboard = true } = options;
  const keyboardInset = useKeyboardInset();
  const timersRef = useRef([]);

  const clearTimers = useCallback(() => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  }, []);

  const scrollToEnd = useCallback(
    (animated = true) => {
      requestAnimationFrame(() => {
        scrollRef.current?.scrollToEnd?.({ animated });
      });
    },
    [scrollRef],
  );

  const scrollToEndWithRetries = useCallback(
    (animated = true) => {
      clearTimers();
      SCROLL_RETRY_MS.forEach((delay) => {
        const timer = setTimeout(() => scrollToEnd(animated && delay === 0), delay);
        timersRef.current.push(timer);
      });
    },
    [clearTimers, scrollToEnd],
  );

  useEffect(() => {
    scrollToEndWithRetries(true);
    return clearTimers;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, scrollToEndWithRetries]);

  useEffect(() => {
    if (!scrollOnKeyboard || keyboardInset <= 0) {
      return undefined;
    }
    const timers = SCROLL_RETRY_MS.map((delay) =>
      setTimeout(() => scrollToEnd(true), 80 + delay),
    );
    return () => timers.forEach(clearTimeout);
  }, [keyboardInset, scrollOnKeyboard, scrollToEnd]);

  useEffect(() => clearTimers, [clearTimers]);

  return scrollToEndWithRetries;
}
