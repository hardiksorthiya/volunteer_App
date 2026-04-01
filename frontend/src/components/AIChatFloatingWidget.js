import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { BotIcon, SendIcon } from './Icons';
import api from '../config/api';

const GUEST_LIMIT = 3;
const GUEST_COUNT_KEY = 'guestAiChatCount';
const GUEST_MESSAGES_KEY = 'guestAiChatMessages';
const GUEST_ID_KEY = 'guestAiChatId';
const GUEST_LOCATION_KEY = 'guestAiLocation';

const AIChatFloatingWidget = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState([]);
  const [guestCount, setGuestCount] = useState(0);
  const [locationContext, setLocationContext] = useState(null);

  const token = localStorage.getItem('token');
  const isChatPage = location.pathname === '/chat';
  const isAuthPage = ['/login', '/register', '/forgot-password'].includes(location.pathname) || location.pathname.startsWith('/reset-password');

  useEffect(() => {
    try {
      const savedCount = Number(localStorage.getItem(GUEST_COUNT_KEY) || '0');
      const parsedCount = Number.isFinite(savedCount) ? Math.min(Math.max(savedCount, 0), GUEST_LIMIT) : 0;
      setGuestCount(parsedCount);

      const savedMessages = localStorage.getItem(GUEST_MESSAGES_KEY);
      if (savedMessages) {
        const parsed = JSON.parse(savedMessages);
        if (Array.isArray(parsed)) {
          setMessages(parsed);
        }
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

  const requestLocation = () => {
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
      (error) => {
        console.warn('Guest geolocation permission denied or unavailable:', error.message);
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 600000 }
    );
  };

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

  const openChat = () => {
    if (token) {
      navigate('/chat');
      return;
    }
    requestLocation();
    setOpen(true);
  };

  const handleSend = async (e) => {
    e.preventDefault();
    const messageToSend = input.trim();
    if (!messageToSend || loading) return;

    if (remaining <= 0) {
      return;
    }

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
      const conversationHistory = updatedMessages.slice(0, -1).map(msg => ({
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

  if (isChatPage || isAuthPage) {
    return null;
  }

  return (
    <>
      <button
        type="button"
        onClick={openChat}
        title="AI Chat"
        style={{
          position: 'fixed',
          right: '22px',
          bottom: '22px',
          width: '58px',
          height: '58px',
          borderRadius: '50%',
          border: 'none',
          background: 'linear-gradient(135deg, #2563eb 0%, #1e40af 100%)',
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 8px 24px rgba(37, 99, 235, 0.35)',
          zIndex: 1200,
          cursor: 'pointer'
        }}
      >
        <BotIcon />
      </button>

      {open && !token && (
        <div style={{ position: 'fixed', right: '22px', bottom: '90px', width: '340px', maxWidth: '90vw', zIndex: 1201 }}>
          <div className="card shadow border-0">
            <div className="card-body p-0 d-flex flex-column" style={{ height: '440px' }}>
              <div className="p-3 border-bottom d-flex justify-content-between align-items-center">
                <strong>AI Quick Chat</strong>
                <button type="button" className="btn btn-sm btn-light" onClick={() => setOpen(false)}>x</button>
              </div>

              <div className="px-3 py-2 border-bottom bg-light small">
                {remaining > 0
                  ? `${remaining} free question${remaining === 1 ? '' : 's'} left without login`
                  : 'Free limit reached. Please login to continue.'}
              </div>

              <div className="flex-grow-1 overflow-auto p-3" style={{ background: '#f8fafc' }}>
                {messages.length === 0 && (
                  <p className="text-muted small mb-0">Ask anything about volunteering. You can ask 3 questions without login.</p>
                )}
                {messages.map(msg => (
                  <div key={msg.id} className={`mb-2 d-flex ${msg.sender === 'user' ? 'justify-content-end' : 'justify-content-start'}`}>
                    <div
                      style={{
                        maxWidth: '85%',
                        borderRadius: '10px',
                        padding: '8px 10px',
                        fontSize: '0.9rem',
                        background: msg.sender === 'user' ? '#2563eb' : '#ffffff',
                        color: msg.sender === 'user' ? '#ffffff' : '#111827',
                        border: msg.sender === 'user' ? 'none' : '1px solid #e5e7eb'
                      }}
                    >
                      {msg.text}
                    </div>
                  </div>
                ))}
                {loading && <p className="small text-muted mb-0">AI is typing...</p>}
              </div>

              <form onSubmit={handleSend} className="p-2 border-top">
                <div className="d-flex gap-2">
                  <input
                    type="text"
                    className="form-control"
                    placeholder={remaining > 0 ? 'Ask your question...' : 'Login to continue'}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    disabled={loading || remaining <= 0}
                  />
                  <button type="submit" className="btn btn-primary" disabled={loading || !input.trim() || remaining <= 0}>
                    <SendIcon />
                  </button>
                </div>
              </form>

              {remaining <= 0 && (
                <div className="p-2 border-top bg-light">
                  <button type="button" className="btn btn-success w-100" onClick={() => navigate('/login')}>
                    Login to continue AI chat
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AIChatFloatingWidget;
