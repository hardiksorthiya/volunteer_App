import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { SendIcon, BotIcon, UserIcon, TrashIcon, PlusIcon, HistoryIcon } from '../components/Icons';
import api from '../config/api';
import '../css/Chat.css';

const Chat = () => {
  const navigate = useNavigate();
  const [conversations, setConversations] = useState([]);
  const [currentConversationId, setCurrentConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [aiConfigured, setAiConfigured] = useState(true);
  const [aiStatusMessage, setAiStatusMessage] = useState('');
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }

    // Load conversations from localStorage
    loadConversations();
    
    // Check AI chat status
    checkAiStatus();
  }, [navigate]);

  useEffect(() => {
    // Load messages for current conversation
    if (currentConversationId) {
      const conversation = conversations.find(c => c.id === currentConversationId);
      if (conversation) {
        setMessages(conversation.messages || []);
      }
    } else {
      setMessages([]);
    }
  }, [currentConversationId, conversations]);

  useEffect(() => {
    // Auto-scroll to bottom when new messages arrive
    scrollToBottom();
  }, [messages]);

  const checkAiStatus = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.warn('No token available for AI status check');
        return;
      }

      const response = await api.get('/chat/status');
      if (response.data.success) {
        setAiConfigured(response.data.configured);
        setAiStatusMessage(response.data.message);
      }
    } catch (error) {
      console.error('Error checking AI status:', error);
      // Only set as not configured if it's not an auth error
      // Auth errors will be handled by the interceptor
      if (error.response?.status === 401) {
        // Auth error - let the interceptor handle it
        console.error('Authentication failed during status check');
      } else {
        // Other errors (503, 500, etc.) - just mark as not configured
        setAiConfigured(false);
        setAiStatusMessage(error.response?.data?.message || 'Unable to check AI chat status');
      }
    }
  };

  const loadConversations = () => {
    const savedConversations = localStorage.getItem('chatConversations');
    if (savedConversations) {
      try {
        const parsed = JSON.parse(savedConversations);
        setConversations(parsed);
        // Set the most recent conversation as current
        if (parsed.length > 0) {
          const mostRecent = parsed.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))[0];
          setCurrentConversationId(mostRecent.id);
        }
      } catch (error) {
        console.error('Error loading conversations:', error);
      }
    }
  };

  const saveConversations = (updatedConversations) => {
    try {
      localStorage.setItem('chatConversations', JSON.stringify(updatedConversations));
      setConversations(updatedConversations);
    } catch (error) {
      console.error('Error saving conversations:', error);
    }
  };

  const createNewConversation = () => {
    const newConversation = {
      id: Date.now(),
      title: 'New Conversation',
      messages: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    const updated = [newConversation, ...conversations];
    saveConversations(updated);
    setCurrentConversationId(newConversation.id);
    setMessages([]);
  };

  const selectConversation = (conversationId) => {
    setCurrentConversationId(conversationId);
  };

  const deleteConversation = (conversationId, e) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this conversation?')) {
      const updated = conversations.filter(c => c.id !== conversationId);
      saveConversations(updated);
      if (conversationId === currentConversationId) {
        if (updated.length > 0) {
          setCurrentConversationId(updated[0].id);
        } else {
          setCurrentConversationId(null);
          setMessages([]);
        }
      }
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    
    if (!inputMessage.trim() || loading) return;

    // Create new conversation if none exists
    let conversationId = currentConversationId;
    if (!conversationId) {
      const newConversation = {
        id: Date.now(),
        title: inputMessage.trim().substring(0, 30) + (inputMessage.trim().length > 30 ? '...' : ''),
        messages: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      conversationId = newConversation.id;
      const updated = [newConversation, ...conversations];
      saveConversations(updated);
      setCurrentConversationId(conversationId);
    }

    const userMessage = {
      id: Date.now(),
      text: inputMessage.trim(),
      sender: 'user',
      timestamp: new Date().toISOString()
    };

    // Update conversation title from first user message if needed
    const currentConversation = conversations.find(c => c.id === conversationId);
    let conversationTitle = currentConversation?.title || 'New Conversation';
    if (currentConversation && currentConversation.messages.length === 0) {
      conversationTitle = inputMessage.trim().substring(0, 30) + (inputMessage.trim().length > 30 ? '...' : '');
    }

    // Store the message before clearing input
    const messageToSend = inputMessage.trim();
    
    // Add user message immediately
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInputMessage('');
    setLoading(true);

    // Update conversation immediately with user message
    const updatedConversations = conversations.map(conv => {
      if (conv.id === conversationId) {
        return {
          ...conv,
          title: conversationTitle,
          messages: updatedMessages,
          updatedAt: new Date().toISOString()
        };
      }
      return conv;
    });
    saveConversations(updatedConversations);

    // Convert messages to API format (role: 'user' or 'assistant', content: text)
    const conversationHistory = updatedMessages.slice(0, -1).map(msg => ({
      role: msg.sender === 'user' ? 'user' : 'assistant',
      content: msg.text
    }));

    // Call backend API
    try {
      // Verify token exists before making the request
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found. Please log in again.');
      }

      const response = await api.post('/chat', {
        message: messageToSend,
        conversationHistory: conversationHistory
      });

      if (response.data.success) {
        const aiMessage = {
          id: Date.now() + 1,
          text: response.data.message,
          sender: 'ai',
          timestamp: new Date().toISOString()
        };

        const finalMessages = [...updatedMessages, aiMessage];
        setMessages(finalMessages);

        // Update conversation with AI response
        const finalConversations = updatedConversations.map(conv => {
          if (conv.id === conversationId) {
            return {
              ...conv,
              messages: finalMessages,
              updatedAt: new Date().toISOString()
            };
          }
          return conv;
        });
        saveConversations(finalConversations);
      } else {
        throw new Error(response.data.message || 'Failed to get AI response');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      
      // Handle authentication errors specifically
      if (error.response?.status === 401) {
        // Token is invalid or expired - the interceptor will handle logout
        // But show a user-friendly message first
        const errorMessage = {
          id: Date.now() + 1,
          text: 'Your session has expired. Please log in again.',
          sender: 'ai',
          timestamp: new Date().toISOString()
        };

        const finalMessages = [...updatedMessages, errorMessage];
        setMessages(finalMessages);

        const finalConversations = updatedConversations.map(conv => {
          if (conv.id === conversationId) {
            return {
              ...conv,
              messages: finalMessages,
              updatedAt: new Date().toISOString()
            };
          }
          return conv;
        });
        saveConversations(finalConversations);
        
        // The API interceptor will handle the logout and redirect
        return;
      }
      
      // Show error message to user for other errors
      const errorMessage = {
        id: Date.now() + 1,
        text: error.response?.data?.message || error.message || 'Failed to get AI response. Please try again.',
        sender: 'ai',
        timestamp: new Date().toISOString()
      };

      const finalMessages = [...updatedMessages, errorMessage];
      setMessages(finalMessages);

      // Update conversation with error message
      const finalConversations = updatedConversations.map(conv => {
        if (conv.id === conversationId) {
          return {
            ...conv,
            messages: finalMessages,
            updatedAt: new Date().toISOString()
          };
        }
        return conv;
      });
      saveConversations(finalConversations);
    } finally {
      setLoading(false);
    }
  };


  const handleClearAllHistory = () => {
    if (window.confirm('Are you sure you want to clear all chat history?')) {
      setConversations([]);
      setCurrentConversationId(null);
      setMessages([]);
      localStorage.removeItem('chatConversations');
    }
  };

  const getConversationPreview = (conversation) => {
    if (conversation.messages.length === 0) return 'New conversation';
    const lastMessage = conversation.messages[conversation.messages.length - 1];
    return lastMessage.text.substring(0, 50) + (lastMessage.text.length > 50 ? '...' : '');
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now - date) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return date.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    } else {
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit', 
        minute: '2-digit' 
      });
    }
  };

  return (
    <div className="dashboard-content">
      <div className="container-fluid">
        {/* Page Header */}
        <div className="card shadow-sm border-0 mb-4" style={{ 
          background: 'linear-gradient(135deg, #1e3a8a 0%, #1e40af 50%, #2563eb 100%)',
          borderRadius: '16px',
          padding: '1.5rem 2rem'
        }}>
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <h1 className="mb-1 fw-bold text-white" style={{ fontSize: '1.75rem' }}>AI Chat</h1>
              <p className="text-white mb-0" style={{ opacity: 0.9 }}>Chat with our AI assistant for help and guidance</p>
            </div>
          </div>
        </div>

        <div className="row g-3">
          {/* History Sidebar - 30% */}
          <div className="col-lg-4 col-md-12">
            <div className="card shadow-sm border-0 h-100" style={{ borderRadius: '16px', overflow: 'hidden' }}>
              <div className="card-body p-0 d-flex flex-column" style={{ height: 'calc(100vh - 200px)', minHeight: '600px' }}>
                <div className="history-header p-3 border-bottom">
                  <div className="d-flex align-items-center justify-content-between">
                    <div className="d-flex align-items-center gap-2">
                      <HistoryIcon style={{ width: '20px', height: '20px', color: '#2563eb' }} />
                      <h3 className="mb-0 fw-bold" style={{ fontSize: '1.125rem', color: '#1e293b' }}>Chat History</h3>
                    </div>
                    <button 
                      onClick={createNewConversation}
                      className="btn btn-primary btn-sm d-flex align-items-center justify-content-center"
                      style={{ 
                        width: '36px',
                        height: '36px',
                        borderRadius: '8px',
                        padding: 0
                      }}
                      title="New Conversation"
                    >
                      <PlusIcon style={{ width: '18px', height: '18px' }} />
                    </button>
                  </div>
                </div>
                
                <div className="history-list flex-grow-1 overflow-auto p-2">
                  {conversations.length === 0 ? (
                    <div className="d-flex flex-column align-items-center justify-content-center h-100 text-center p-4">
                      <p className="text-muted mb-2">No conversations yet</p>
                      <p className="text-muted small">Start a new chat to begin!</p>
                    </div>
                  ) : (
                    conversations
                      .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
                      .map((conversation) => (
                        <div
                          key={conversation.id}
                          className={`p-3 mb-2 rounded border cursor-pointer transition-all ${
                            currentConversationId === conversation.id 
                              ? 'bg-primary text-white border-primary' 
                              : 'bg-light border-light hover-border-primary'
                          }`}
                          onClick={() => selectConversation(conversation.id)}
                          style={{ 
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            border: currentConversationId === conversation.id ? '2px solid #2563eb' : '1px solid #e5e7eb'
                          }}
                          onMouseEnter={(e) => {
                            if (currentConversationId !== conversation.id) {
                              e.target.style.borderColor = '#2563eb';
                              e.target.style.backgroundColor = '#f8f9fa';
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (currentConversationId !== conversation.id) {
                              e.target.style.borderColor = '#e5e7eb';
                              e.target.style.backgroundColor = '#f8f9fa';
                            }
                          }}
                        >
                          <div className="d-flex justify-content-between align-items-start gap-2">
                            <div className="flex-grow-1">
                              <div className={`fw-semibold mb-1 ${currentConversationId === conversation.id ? 'text-white' : 'text-dark'}`} style={{ fontSize: '0.9375rem' }}>
                                {conversation.title}
                              </div>
                              <div className={`small mb-1 ${currentConversationId === conversation.id ? 'text-white-50' : 'text-muted'}`}>
                                {getConversationPreview(conversation)}
                              </div>
                              <div className={`small ${currentConversationId === conversation.id ? 'text-white-50' : 'text-muted'}`}>
                                {formatTime(conversation.updatedAt)}
                              </div>
                            </div>
                            <button
                              onClick={(e) => deleteConversation(conversation.id, e)}
                              className="btn btn-link p-0"
                              style={{ 
                                color: currentConversationId === conversation.id ? '#ffffff' : '#dc2626',
                                minWidth: 'auto',
                                padding: '0.25rem'
                              }}
                              title="Delete conversation"
                            >
                              <TrashIcon style={{ width: '16px', height: '16px' }} />
                            </button>
                          </div>
                        </div>
                      ))
                  )}
                </div>

                {conversations.length > 0 && (
                  <div className="history-footer p-3 border-top">
                    <button 
                      onClick={handleClearAllHistory}
                      className="btn btn-outline-danger btn-sm w-100 d-flex align-items-center justify-content-center gap-2"
                      style={{ borderRadius: '8px' }}
                      title="Clear all history"
                    >
                      <TrashIcon style={{ width: '16px', height: '16px' }} />
                      <span>Clear All</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Chat Area - 70% */}
          <div className="col-lg-8 col-md-12">
            <div className="card shadow-sm border-0 h-100" style={{ borderRadius: '16px', overflow: 'hidden' }}>
              <div className="card-body p-0 d-flex flex-column" style={{ height: 'calc(100vh - 200px)', minHeight: '600px' }}>
                <div className="chat-header p-3 border-bottom bg-light">
                  <div className="d-flex align-items-center gap-3">
                    <div className="d-flex align-items-center justify-content-center" style={{ 
                      width: '40px', 
                      height: '40px', 
                      borderRadius: '50%', 
                      background: 'linear-gradient(135deg, #2563eb 0%, #1e40af 100%)' 
                    }}>
                      <BotIcon style={{ width: '24px', height: '24px', color: '#ffffff' }} />
                    </div>
                    <div>
                      <h2 className="mb-0 fw-bold" style={{ fontSize: '1.25rem', color: '#1e293b' }}>AI Assistant</h2>
                      <p className="mb-0 small text-muted">Your volunteer support assistant</p>
                    </div>
                  </div>
                </div>

                <div className="chat-messages flex-grow-1 overflow-auto p-4" style={{ backgroundColor: '#f8f9fa' }}>
                  {messages.length === 0 ? (
                    <div className="d-flex flex-column align-items-center justify-content-center h-100 text-center">
                      <div className="mb-4" style={{ 
                        width: '80px', 
                        height: '80px', 
                        borderRadius: '50%', 
                        background: 'linear-gradient(135deg, #2563eb 0%, #1e40af 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <BotIcon style={{ width: '40px', height: '40px', color: '#ffffff' }} />
                      </div>
                      <h3 className="fw-bold mb-3" style={{ color: '#1e293b' }}>Welcome to AI Chat!</h3>
                      <p className="text-muted mb-3">I'm here to help you with:</p>
                      <ul className="list-unstyled text-start mb-4">
                        <li className="mb-2">• Finding volunteer opportunities</li>
                        <li className="mb-2">• Managing your activities</li>
                        <li className="mb-2">• Answering questions about events</li>
                        <li className="mb-2">• Providing platform guidance</li>
                      </ul>
                      <p className="text-muted">Start a conversation by typing a message below!</p>
                    </div>
                  ) : (
                    messages.map((message) => (
                      <div
                        key={message.id}
                        className={`d-flex gap-3 mb-4 ${message.sender === 'user' ? 'justify-content-end' : 'justify-content-start'}`}
                      >
                        {message.sender === 'ai' && (
                          <div className="d-flex align-items-center justify-content-center" style={{ 
                            width: '36px', 
                            height: '36px', 
                            borderRadius: '50%', 
                            background: 'linear-gradient(135deg, #2563eb 0%, #1e40af 100%)',
                            flexShrink: 0
                          }}>
                            <BotIcon style={{ width: '20px', height: '20px', color: '#ffffff' }} />
                          </div>
                        )}
                        <div 
                          className={`rounded p-3 ai-message-container ${message.sender === 'user' ? 'user-message' : 'ai-message'}`}
                          style={{ 
                            maxWidth: '75%',
                            backgroundColor: message.sender === 'user' ? '#2563eb' : '#ffffff',
                            color: message.sender === 'user' ? '#ffffff' : '#1e293b',
                            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                            borderRadius: '12px',
                            overflow: 'auto'
                          }}
                        >
                          <div className="mb-1" style={{ fontSize: '0.9375rem', lineHeight: '1.6' }}>
                            {message.sender === 'ai' ? (
                              <ReactMarkdown 
                                className="markdown-content"
                                components={{
                                  code: ({ node, inline, className, children, ...props }) => {
                                    const match = /language-(\w+)/.exec(className || '');
                                    return inline ? (
                                      <code className="inline-code" {...props}>
                                        {children}
                                      </code>
                                    ) : (
                                      <pre className="code-block">
                                        <code className={className || ''} {...props}>
                                          {children}
                                        </code>
                                      </pre>
                                    );
                                  },
                                  h1: ({ node, ...props }) => <h4 className="markdown-heading" {...props} />,
                                  h2: ({ node, ...props }) => <h5 className="markdown-heading" {...props} />,
                                  h3: ({ node, ...props }) => <h6 className="markdown-heading" {...props} />,
                                  ul: ({ node, ...props }) => <ul className="markdown-list" {...props} />,
                                  ol: ({ node, ...props }) => <ol className="markdown-list" {...props} />,
                                  li: ({ node, ...props }) => <li className="markdown-list-item" {...props} />,
                                  blockquote: ({ node, ...props }) => <blockquote className="markdown-blockquote" {...props} />,
                                  a: ({ node, ...props }) => <a className="markdown-link" target="_blank" rel="noopener noreferrer" {...props} />,
                                  table: ({ node, ...props }) => <table className="markdown-table" {...props} />,
                                  p: ({ node, ...props }) => <p className="markdown-paragraph" {...props} />
                                }}
                              >
                                {message.text}
                              </ReactMarkdown>
                            ) : (
                              message.text
                            )}
                          </div>
                          <div className="small" style={{ 
                            opacity: 0.7,
                            fontSize: '0.75rem',
                            marginTop: '0.5rem'
                          }}>
                            {formatTime(message.timestamp)}
                          </div>
                        </div>
                        {message.sender === 'user' && (
                          <div className="d-flex align-items-center justify-content-center" style={{ 
                            width: '36px', 
                            height: '36px', 
                            borderRadius: '50%', 
                            background: '#e5e7eb',
                            flexShrink: 0
                          }}>
                            <UserIcon style={{ width: '20px', height: '20px', color: '#6b7280' }} />
                          </div>
                        )}
                      </div>
                    ))
                  )}
                  {loading && (
                    <div className="d-flex gap-3 mb-4">
                      <div className="d-flex align-items-center justify-content-center" style={{ 
                        width: '36px', 
                        height: '36px', 
                        borderRadius: '50%', 
                        background: 'linear-gradient(135deg, #2563eb 0%, #1e40af 100%)',
                        flexShrink: 0
                      }}>
                        <BotIcon style={{ width: '20px', height: '20px', color: '#ffffff' }} />
                      </div>
                      <div className="rounded p-3 bg-white" style={{ boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)', borderRadius: '12px' }}>
                        <div className="d-flex gap-1">
                          <span className="bg-primary rounded-circle" style={{ width: '8px', height: '8px', animation: 'bounce 1.4s infinite' }}></span>
                          <span className="bg-primary rounded-circle" style={{ width: '8px', height: '8px', animation: 'bounce 1.4s infinite 0.2s' }}></span>
                          <span className="bg-primary rounded-circle" style={{ width: '8px', height: '8px', animation: 'bounce 1.4s infinite 0.4s' }}></span>
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                <form onSubmit={handleSendMessage} className="chat-input-container p-3 border-top bg-white">
                  <div className="d-flex gap-2 align-items-center">
                    <input
                      ref={inputRef}
                      type="text"
                      value={inputMessage}
                      onChange={(e) => setInputMessage(e.target.value)}
                      placeholder={aiConfigured ? "Type your message here..." : "AI chat is not available"}
                      className="form-control"
                      style={{ 
                        borderRadius: '12px',
                        border: '2px solid #e5e7eb',
                        padding: '0.75rem 1rem',
                        fontSize: '0.9375rem'
                      }}
                      disabled={loading || !aiConfigured}
                    />
                    <button
                      type="submit"
                      className="btn btn-primary d-flex align-items-center justify-content-center"
                      style={{ 
                        width: '48px',
                        height: '48px',
                        borderRadius: '12px',
                        padding: 0,
                        boxShadow: '0 2px 8px rgba(37, 99, 235, 0.3)'
                      }}
                      disabled={!inputMessage.trim() || loading || !aiConfigured}
                    >
                      <SendIcon style={{ width: '20px', height: '20px' }} />
                    </button>
                  </div>
                  {!aiConfigured && (
                    <p className="text-danger small mt-2 mb-0">
                      ⚠️ {aiStatusMessage || 'AI chat is not configured'}
                    </p>
                  )}
                  {aiConfigured && (
                    <p className="text-muted small mt-2 mb-0">
                      AI Assistant powered by OpenAI
                    </p>
                  )}
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Chat;
