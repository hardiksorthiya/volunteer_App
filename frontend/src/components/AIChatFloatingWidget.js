import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import chatbotImg from './images/chatbot.png';
import GuestAIChat from './GuestAIChat';

const AIChatFloatingWidget = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);

  const token = localStorage.getItem('token');
  const isChatPage = location.pathname === '/chat';

  const openChat = () => {
    if (token) {
      navigate('/chat');
      return;
    }
    setOpen(true);
  };

  if (isChatPage) {
    return null;
  }

  return (
    <>
      <button
        type="button"
        onClick={openChat}
        title="AI Chat"
        className="ai-chat-fab"
      >
        <img
          src={chatbotImg}
          alt="AI chat"
          width={32}
          height={32}
          style={{ display: 'block', objectFit: 'contain' }}
        />
      </button>

      {open && !token && (
        <div className="ai-chat-fab-panel">
          <button
            type="button"
            className="ai-chat-fab-close"
            onClick={() => setOpen(false)}
            aria-label="Close"
          >
            ×
          </button>
          <GuestAIChat embedded={false} />
        </div>
      )}
    </>
  );
};

export default AIChatFloatingWidget;
