import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SendIcon } from './Icons';
import api from '../config/api';
import './GuestAIChat.css';

export const GUEST_LIMIT = 3;
export const GUEST_COUNT_KEY = 'guestAiChatCount';
export const GUEST_MESSAGES_KEY = 'guestAiChatMessages';
export const GUEST_ID_KEY = 'guestAiChatId';
export const GUEST_LOCATION_KEY = 'guestAiLocation';

/**
 * Guest AI chat: 3 free messages without login (shared state with AIChatFloatingWidget).
 * @param {{ embedded?: boolean }} props — embedded = large panel on landing page
 */
const GuestAIChat = ({ embedded = false }) => {
  const navigate = useNavigate();
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState([]);
  const [guestCount, setGuestCount] = useState(0);
  const [locationContext, setLocationContext] = useState(null);

  useEffect(() => {
    try {
      const savedCount = Number(localStorage.getItem(GUEST_COUNT_KEY) || '0');
      const parsedCount = Number.isFinite(savedCount)
        ? Math.min(Math.max(savedCount, 0), GUEST_LIMIT)
        : 0;
      setGuestCount(parsedCount);

      const savedMessages = localStorage.getItem(GUEST_MESSAGES_KEY);
      if (savedMessages) {
        const parsed = JSON.parse(savedMessages);
        if (Array.isArray(parsed)) setMessages(parsed);
      }

      const savedLocation = localStorage.getItem(GUEST_LOCATION_KEY);
      if (savedLocation) {
        const parsedLocation = JSON.parse(savedLocation);
        if (parsedLocation && typeof parsedLocation === 'object') {
          setLocationContext(parsedLocation);
        }
      }
    } catch (error) {
      console.error('Failed loading guest AI chat state:', error);
    }
  }, []);

  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const payload = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy
        };
        setLocationContext(payload);
        localStorage.setItem(GUEST_LOCATION_KEY, JSON.stringify(payload));
      },
      () => {},
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 600000 }
    );
  }, []);

  const remaining = useMemo(() => Math.max(0, GUEST_LIMIT - guestCount), [guestCount]);

  const persistGuestState = (nextMessages, nextCount = guestCount) => {
    localStorage.setItem(GUEST_MESSAGES_KEY, JSON.stringify(nextMessages));
    localStorage.setItem(GUEST_COUNT_KEY, String(nextCount));
  };

  const getGuestId = () => {
    const existing = localStorage.getItem(GUEST_ID_KEY);
    if (existing) return existing;
    const created = `guest_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    localStorage.setItem(GUEST_ID_KEY, created);
    return created;
  };

  const handleSend = async (e) => {
    e.preventDefault();
    const messageToSend = input.trim();
    if (!messageToSend || loading) return;
    if (remaining <= 0) return;

    const userMessage = {
      id: Date.now(),
      sender: 'user',
      text: messageToSend
    };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput('');
    setLoading(true);

    try {
      const conversationHistory = updatedMessages.slice(0, -1).map((msg) => ({
        role: msg.sender === 'user' ? 'user' : 'assistant',
        content: msg.text
      }));

      const response = await api.post('/chat/guest', {
        guestId: getGuestId(),
        message: messageToSend,
        conversationHistory,
        locationContext
      });

      const aiMessage = {
        id: Date.now() + 1,
        sender: 'ai',
        text: response?.data?.message || 'Sorry, I could not generate a response.'
      };
      const finalMessages = [...updatedMessages, aiMessage];
      const nextCount = Math.min(GUEST_LIMIT, guestCount + 1);
      setMessages(finalMessages);
      setGuestCount(nextCount);
      persistGuestState(finalMessages, nextCount);
    } catch (error) {
      const status = error?.response?.status;
      if (status === 403) {
        setGuestCount(GUEST_LIMIT);
        persistGuestState(updatedMessages, GUEST_LIMIT);
      }

      const errMessage = {
        id: Date.now() + 1,
        sender: 'ai',
        text: error?.response?.data?.message || 'Something went wrong. Please try again.'
      };
      const finalMessages = [...updatedMessages, errMessage];
      setMessages(finalMessages);
      persistGuestState(finalMessages, status === 403 ? GUEST_LIMIT : guestCount);
    } finally {
      setLoading(false);
    }
  };

  const rootClass = embedded
    ? 'guest-ai-chat guest-ai-chat--embedded'
    : 'guest-ai-chat guest-ai-chat--popover';

  return (
    <div className={rootClass}>
      <div className="guest-ai-chat__header">
        <strong className="guest-ai-chat__title">AI assistant</strong>
        <span className="guest-ai-chat__badge">Volunteer Connect</span>
      </div>

      <div className="guest-ai-chat__quota">
        {remaining > 0
          ? `${remaining} free question${remaining === 1 ? '' : 's'} left without login`
          : 'Free limit reached — sign in to continue.'}
      </div>

      <div className="guest-ai-chat__messages">
        {messages.length === 0 && (
          <p className="guest-ai-chat__hint">
            Ask anything about volunteering. You can send {GUEST_LIMIT} messages without an account.
          </p>
        )}
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`guest-ai-chat__row guest-ai-chat__row--${msg.sender}`}
          >
            <div className="guest-ai-chat__bubble">{msg.text}</div>
          </div>
        ))}
        {loading && <p className="guest-ai-chat__typing">AI is typing…</p>}
      </div>

      <form onSubmit={handleSend} className="guest-ai-chat__form">
        <input
          type="text"
          className="guest-ai-chat__input"
          placeholder={remaining > 0 ? 'Ask your question…' : 'Sign in to continue'}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={loading || remaining <= 0}
          autoComplete="off"
        />
        <button
          type="submit"
          className="guest-ai-chat__send"
          disabled={loading || !input.trim() || remaining <= 0}
          aria-label="Send"
        >
          <SendIcon />
        </button>
      </form>

      {remaining <= 0 && (
        <div className="guest-ai-chat__login-cta">
          <button
            type="button"
            className="guest-ai-chat__login-btn"
            onClick={() => navigate('/login')}
          >
            Log in to continue
          </button>
        </div>
      )}
    </div>
  );
};

export default GuestAIChat;
