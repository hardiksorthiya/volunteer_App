import { useCallback, useEffect, useRef } from 'react';
import { Keyboard } from 'react-native';

const SCROLL_RETRY_MS = [0, 50, 120, 250, 400, 600];

/**
 * Keeps chat message lists pinned to the latest message when content changes.
 */
export function useChatAutoScroll(scrollRef, deps = []) {
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
    (animated = true, delays = SCROLL_RETRY_MS) => {
      clearTimers();
      delays.forEach((delay) => {
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
    const showSub = Keyboard.addListener('keyboardDidShow', () => {
      scrollToEndWithRetries(true);
    });
    return () => {
      showSub.remove();
    };
  }, [scrollToEndWithRetries]);

  useEffect(() => clearTimers, [clearTimers]);

  return scrollToEndWithRetries;
}
