import { useEffect, useMemo, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import api from '../config/api';

export const GUEST_LIMIT = 3;
export const GUEST_COUNT_KEY = 'mobileGuestAiChatCount';
export const GUEST_MESSAGES_KEY = 'mobileGuestAiChatMessages';
export const GUEST_ID_KEY = 'mobileGuestAiChatId';
export const GUEST_LOCATION_KEY = 'mobileGuestAiLocation';

export function useGuestAiChat({ enabled = true } = {}) {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState([]);
  const [guestCount, setGuestCount] = useState(0);
  const [locationContext, setLocationContext] = useState(null);

  const loadState = useCallback(async () => {
    try {
      const [savedCount, savedMessages, savedLocation] = await Promise.all([
        AsyncStorage.getItem(GUEST_COUNT_KEY),
        AsyncStorage.getItem(GUEST_MESSAGES_KEY),
        AsyncStorage.getItem(GUEST_LOCATION_KEY),
      ]);

      const parsedCount = Number(savedCount || '0');
      setGuestCount(Number.isFinite(parsedCount) ? Math.min(Math.max(parsedCount, 0), GUEST_LIMIT) : 0);

      if (savedMessages) {
        const parsedMessages = JSON.parse(savedMessages);
        if (Array.isArray(parsedMessages)) setMessages(parsedMessages);
      }

      if (savedLocation) {
        const parsedLocation = JSON.parse(savedLocation);
        if (parsedLocation && typeof parsedLocation === 'object') {
          setLocationContext(parsedLocation);
        }
      }
    } catch (error) {
      console.error('Failed loading guest AI mobile state:', error);
    }
  }, []);

  useEffect(() => {
    if (enabled) loadState();
  }, [enabled, loadState]);

  const remaining = useMemo(() => Math.max(0, GUEST_LIMIT - guestCount), [guestCount]);

  const persistGuestState = async (nextMessages, nextCount = guestCount) => {
    try {
      await AsyncStorage.multiSet([
        [GUEST_MESSAGES_KEY, JSON.stringify(nextMessages)],
        [GUEST_COUNT_KEY, String(nextCount)],
      ]);
    } catch (error) {
      console.error('Failed saving guest AI state:', error);
    }
  };

  const getGuestId = async () => {
    const existing = await AsyncStorage.getItem(GUEST_ID_KEY);
    if (existing) return existing;
    const created = `mobile_guest_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    await AsyncStorage.setItem(GUEST_ID_KEY, created);
    return created;
  };

  const requestLocation = useCallback(async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const payload = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
      };
      setLocationContext(payload);
      await AsyncStorage.setItem(GUEST_LOCATION_KEY, JSON.stringify(payload));
    } catch (error) {
      console.warn('Location unavailable for guest AI chat:', error.message);
    }
  }, []);

  const handleSend = async () => {
    const messageToSend = input.trim();
    if (!messageToSend || loading || remaining <= 0) return;

    const userMessage = {
      id: Date.now(),
      sender: 'user',
      text: messageToSend,
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput('');
    setLoading(true);

    try {
      const conversationHistory = updatedMessages.slice(0, -1).map((msg) => ({
        role: msg.sender === 'user' ? 'user' : 'assistant',
        content: msg.text,
      }));

      const response = await api.post('/chat/guest', {
        guestId: await getGuestId(),
        message: messageToSend,
        conversationHistory,
        locationContext,
      });

      const aiMessage = {
        id: Date.now() + 1,
        sender: 'ai',
        text: response?.data?.message || 'Sorry, I could not generate a response.',
      };
      const finalMessages = [...updatedMessages, aiMessage];
      const nextCount = Math.min(GUEST_LIMIT, guestCount + 1);

      setMessages(finalMessages);
      setGuestCount(nextCount);
      await persistGuestState(finalMessages, nextCount);
    } catch (error) {
      const status = error?.response?.status;
      const loginRequired = status === 403;
      const nextCount = loginRequired ? GUEST_LIMIT : guestCount;

      setGuestCount(nextCount);

      const errorMessage = {
        id: Date.now() + 1,
        sender: 'ai',
        text: error?.response?.data?.message || 'Something went wrong. Please try again.',
      };
      const finalMessages = [...updatedMessages, errorMessage];
      setMessages(finalMessages);
      await persistGuestState(finalMessages, nextCount);
    } finally {
      setLoading(false);
    }
  };

  return {
    input,
    setInput,
    loading,
    messages,
    guestCount,
    remaining,
    locationContext,
    requestLocation,
    handleSend,
  };
}
