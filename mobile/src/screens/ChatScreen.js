import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  RefreshControl,
  Alert,
  ActivityIndicator,
  Dimensions,
  Animated,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Markdown from 'react-native-markdown-display';
import Header from '../components/Header';
import { BotIcon, UserIcon, SendIcon, HistoryIcon, TrashIcon, PlusIcon, MenuIcon } from '../components/Icons';
import api from '../config/api';

const { width } = Dimensions.get('window');

const ChatScreen = () => {
  const [conversations, setConversations] = useState([]);
  const [currentConversationId, setCurrentConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [aiConfigured, setAiConfigured] = useState(true);
  const [aiStatusMessage, setAiStatusMessage] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const messagesEndRef = useRef(null);
  const scrollViewRef = useRef(null);
  const sidebarAnimation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loadData = async () => {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        return;
      }
      loadConversations();
      checkAiStatus();
    };
    loadData();
  }, []);

  useEffect(() => {
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
    Animated.timing(sidebarAnimation, {
      toValue: sidebarVisible ? 1 : 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [sidebarVisible]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const checkAiStatus = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        setAiConfigured(false);
        setAiStatusMessage('Please log in to use AI chat');
        return;
      }
      const response = await api.get('/chat/status');
      if (response.data.success) {
        setAiConfigured(response.data.configured);
        setAiStatusMessage(response.data.message);
        if (!response.data.configured) {
          console.warn('⚠️ AI Chat not configured:', response.data.message);
        }
      }
    } catch (error) {
      console.error('Error checking AI status:', error);
      if (error.response?.status === 401) {
        setAiConfigured(false);
        setAiStatusMessage('Please log in to use AI chat');
      } else if (error.response?.status === 503) {
        setAiConfigured(false);
        setAiStatusMessage(error.response?.data?.message || 'AI chat service is not configured');
      } else {
        setAiConfigured(false);
        setAiStatusMessage(error.response?.data?.message || 'Unable to check AI chat status');
      }
    }
  };

  const loadConversations = () => {
    AsyncStorage.getItem('chatConversations').then(savedConversations => {
      if (savedConversations) {
        try {
          const parsed = JSON.parse(savedConversations);
          setConversations(parsed);
          if (parsed.length > 0) {
            const mostRecent = parsed.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))[0];
            setCurrentConversationId(mostRecent.id);
          }
        } catch (error) {
          console.error('Error loading conversations:', error);
        }
      }
    });
  };

  const saveConversations = (updatedConversations) => {
    try {
      AsyncStorage.setItem('chatConversations', JSON.stringify(updatedConversations));
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
    setSidebarVisible(false); // Close sidebar when conversation is selected
  };

  const deleteConversation = (conversationId) => {
    Alert.alert(
      'Delete Conversation',
      'Are you sure you want to delete this conversation?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
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
        }
      ]
    );
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || loading) return;

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

    const currentConversation = conversations.find(c => c.id === conversationId);
    let conversationTitle = currentConversation?.title || 'New Conversation';
    if (currentConversation && currentConversation.messages.length === 0) {
      conversationTitle = inputMessage.trim().substring(0, 30) + (inputMessage.trim().length > 30 ? '...' : '');
    }

    const messageToSend = inputMessage.trim();
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInputMessage('');
    setLoading(true);

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

    const conversationHistory = updatedMessages.slice(0, -1).map(msg => ({
      role: msg.sender === 'user' ? 'user' : 'assistant',
      content: msg.text
    }));

    try {
      const token = await AsyncStorage.getItem('token');
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
      console.error('Error details:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message
      });
      
      if (error.response?.status === 401) {
        const errorMessage = {
          id: Date.now() + 1,
          text: 'Your session has expired. Please log in again.',
          sender: 'ai',
          timestamp: new Date().toISOString()
        };
        const finalMessages = [...updatedMessages, errorMessage];
        setMessages(finalMessages);
        return;
      }
      
      if (error.response?.status === 503) {
        const errorMessage = {
          id: Date.now() + 1,
          text: 'AI chat is not configured. Please contact the administrator to set up OpenAI API key.',
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
        return;
      }
      
      const errorMessage = {
        id: Date.now() + 1,
        text: error.response?.data?.message || error.message || 'Failed to get AI response. Please try again.',
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
    } finally {
      setLoading(false);
    }
  };

  const handleClearAllHistory = () => {
    Alert.alert(
      'Clear All History',
      'Are you sure you want to clear all chat history?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: () => {
            setConversations([]);
            setCurrentConversationId(null);
            setMessages([]);
            AsyncStorage.removeItem('chatConversations');
          }
        }
      ]
    );
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
    <View style={styles.container}>
      <Header />
      
      {/* Gradient Header */}
      <View style={styles.headerCard}>
        <View style={styles.headerContent}>
          <View style={styles.headerLeft}>
            <Text style={styles.headerTitle}>AI Chat</Text>
            <Text style={styles.headerSubtitle}>Chat with our AI assistant for help and guidance</Text>
          </View>
          <TouchableOpacity
            onPress={() => setSidebarVisible(!sidebarVisible)}
            style={styles.menuButton}
          >
            <MenuIcon size={24} color="#ffffff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Overlay for sidebar */}
      {sidebarVisible && (
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={() => setSidebarVisible(false)}
        />
      )}

      {/* Main Content */}
      <View style={styles.mainContent}>
        {/* History Sidebar */}
        <Animated.View style={[
          styles.sidebar,
          {
            transform: [{
              translateX: sidebarAnimation.interpolate({
                inputRange: [0, 1],
                outputRange: [-width, 0],
              }),
            }],
          },
        ]}>
          <View style={styles.sidebarHeader}>
            <View style={styles.sidebarHeaderLeft}>
              <HistoryIcon size={20} color="#2563eb" />
              <Text style={styles.sidebarTitle}>Chat History</Text>
            </View>
            <View style={styles.sidebarHeaderRight}>
              <TouchableOpacity
                onPress={createNewConversation}
                style={styles.newConversationButton}
              >
                <PlusIcon size={18} color="#ffffff" />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setSidebarVisible(false)}
                style={styles.closeSidebarButton}
              >
                <Text style={styles.closeSidebarText}>✕</Text>
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView
            style={styles.historyList}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={async () => {
                  setRefreshing(true);
                  loadConversations();
                  await checkAiStatus();
                  setRefreshing(false);
                }}
                colors={['#2563eb']}
                tintColor="#2563eb"
              />
            }
          >
            {conversations.length === 0 ? (
              <View style={styles.emptyHistory}>
                <Text style={styles.emptyHistoryText}>No conversations yet</Text>
                <Text style={styles.emptyHistorySubtext}>Start a new chat to begin!</Text>
              </View>
            ) : (
              conversations
                .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
                .map((conversation) => (
                  <TouchableOpacity
                    key={conversation.id}
                    style={[
                      styles.conversationItem,
                      currentConversationId === conversation.id && styles.conversationItemActive
                    ]}
                    onPress={() => selectConversation(conversation.id)}
                  >
                    <View style={styles.conversationContent}>
                      <Text style={[
                        styles.conversationTitle,
                        currentConversationId === conversation.id && styles.conversationTitleActive
                      ]}>
                        {conversation.title}
                      </Text>
                      <Text style={[
                        styles.conversationPreview,
                        currentConversationId === conversation.id && styles.conversationPreviewActive
                      ]}>
                        {getConversationPreview(conversation)}
                      </Text>
                      <Text style={[
                        styles.conversationTime,
                        currentConversationId === conversation.id && styles.conversationTimeActive
                      ]}>
                        {formatTime(conversation.updatedAt)}
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => deleteConversation(conversation.id)}
                      style={styles.deleteButton}
                    >
                      <TrashIcon size={16} color={currentConversationId === conversation.id ? '#ffffff' : '#dc2626'} />
                    </TouchableOpacity>
                  </TouchableOpacity>
                ))
            )}
          </ScrollView>

          {conversations.length > 0 && (
            <View style={styles.sidebarFooter}>
              <TouchableOpacity
                onPress={handleClearAllHistory}
                style={styles.clearAllButton}
              >
                <TrashIcon size={16} color="#dc2626" />
                <Text style={styles.clearAllButtonText}>Clear All</Text>
              </TouchableOpacity>
            </View>
          )}
        </Animated.View>

        {/* Chat Area */}
        <View style={styles.chatArea}>
          <View style={styles.chatHeader}>
            <View style={styles.chatHeaderIcon}>
              <BotIcon size={24} color="#ffffff" />
            </View>
            <View>
              <Text style={styles.chatHeaderTitle}>AI Assistant</Text>
              <Text style={styles.chatHeaderSubtitle}>Your volunteer support assistant</Text>
            </View>
          </View>

      <ScrollView 
            ref={scrollViewRef}
        style={styles.messagesContainer}
        contentContainerStyle={styles.messagesContent}
      >
            {messages.length === 0 ? (
              <View style={styles.welcomeContainer}>
                <View style={styles.welcomeIcon}>
                  <BotIcon size={40} color="#ffffff" />
                </View>
                <Text style={styles.welcomeTitle}>Welcome to AI Chat!</Text>
                <Text style={styles.welcomeText}>I'm here to help you with:</Text>
                <View style={styles.welcomeList}>
                  <Text style={styles.welcomeListItem}>• Finding volunteer opportunities</Text>
                  <Text style={styles.welcomeListItem}>• Managing your activities</Text>
                  <Text style={styles.welcomeListItem}>• Answering questions about events</Text>
                  <Text style={styles.welcomeListItem}>• Providing platform guidance</Text>
                </View>
                <Text style={styles.welcomeFooter}>Start a conversation by typing a message below!</Text>
              </View>
            ) : (
              messages.map((message) => (
          <View
                  key={message.id}
            style={[
                    styles.messageRow,
                    message.sender === 'user' ? styles.messageRowUser : styles.messageRowAi
                  ]}
                >
                  {message.sender === 'ai' && (
                    <View style={styles.messageAvatar}>
                      <BotIcon size={20} color="#ffffff" />
                    </View>
                  )}
                  <View style={[
                    styles.messageBubble,
                    message.sender === 'user' ? styles.userMessageBubble : styles.aiMessageBubble
                  ]}>
                    {message.sender === 'ai' ? (
                      <Markdown
                        style={{
                          body: {
                            color: styles.aiMessageText.color,
                            fontSize: styles.messageText.fontSize,
                          },
                          text: {
                            color: styles.aiMessageText.color,
                            fontSize: styles.messageText.fontSize,
                          },
                          code_inline: {
                            backgroundColor: '#f0f0f0',
                            color: '#c7254e',
                            paddingHorizontal: 6,
                            paddingVertical: 2,
                            borderRadius: 4,
                            fontFamily: 'Courier New',
                            fontSize: 12,
                          },
                          code_block: {
                            backgroundColor: '#1e293b',
                            color: '#e2e8f0',
                            padding: 12,
                            borderRadius: 6,
                            marginVertical: 8,
                            fontFamily: 'Courier New',
                            fontSize: 11,
                          },
                          heading1: {
                            fontSize: 24,
                            fontWeight: 'bold',
                            marginVertical: 8,
                            color: styles.aiMessageText.color,
                          },
                          heading2: {
                            fontSize: 20,
                            fontWeight: 'bold',
                            marginVertical: 6,
                            color: styles.aiMessageText.color,
                          },
                          heading3: {
                            fontSize: 18,
                            fontWeight: 'bold',
                            marginVertical: 6,
                            color: styles.aiMessageText.color,
                          },
                          bullet_list: {
                            marginLeft: 20,
                            marginVertical: 6,
                          },
                          list_item: {
                            marginVertical: 4,
                          },
                          blockquote: {
                            borderLeftColor: '#94a3b8',
                            borderLeftWidth: 4,
                            paddingLeft: 12,
                            marginVertical: 8,
                            fontStyle: 'italic',
                            color: '#64748b',
                          },
                          link: {
                            color: '#2563eb',
                            textDecorationLine: 'underline',
                          },
                          hr: {
                            backgroundColor: '#d1d5db',
                            height: 1,
                            marginVertical: 12,
                          },
                          strong: {
                            fontWeight: 'bold',
                          },
                          em: {
                            fontStyle: 'italic',
                          },
                          table: {
                            borderWidth: 1,
                            borderColor: '#d1d5db',
                            marginVertical: 8,
                          },
                          thead: {
                            backgroundColor: '#f3f4f6',
                          },
                          th: {
                            flex: 1,
                            padding: 8,
                            borderColor: '#d1d5db',
                            borderWidth: 1,
                            fontWeight: 'bold',
                          },
                          td: {
                            flex: 1,
                            padding: 8,
                            borderColor: '#d1d5db',
                            borderWidth: 1,
                          },
                        }}
                      >
                        {message.text}
                      </Markdown>
                    ) : (
                      <Text style={[
                        styles.messageText,
                        styles.userMessageText
                      ]}>
                        {message.text}
                      </Text>
                    )}
                    <Text style={[
                      styles.messageTime,
                      message.sender === 'user' ? styles.userMessageTime : styles.aiMessageTime
                    ]}>
                      {formatTime(message.timestamp)}
                    </Text>
                  </View>
                  {message.sender === 'user' && (
                    <View style={styles.messageAvatarUser}>
                      <UserIcon size={20} color="#6b7280" />
                    </View>
                  )}
                </View>
              ))
            )}
            {loading && (
              <View style={styles.messageRow}>
                <View style={styles.messageAvatar}>
                  <BotIcon size={20} color="#ffffff" />
                </View>
                <View style={styles.loadingBubble}>
                  <View style={styles.loadingDots}>
                    <View style={[styles.loadingDot, { animationDelay: '0s' }]} />
                    <View style={[styles.loadingDot, { animationDelay: '0.2s' }]} />
                    <View style={[styles.loadingDot, { animationDelay: '0.4s' }]} />
                  </View>
                </View>
              </View>
            )}
      </ScrollView>

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
              placeholder={aiConfigured ? "Type your message here..." : "AI chat is not available"}
          placeholderTextColor="#9ca3af"
              value={inputMessage}
              onChangeText={setInputMessage}
          multiline
              editable={!loading && aiConfigured}
              onSubmitEditing={handleSendMessage}
            />
            <TouchableOpacity
              style={[styles.sendButton, (!inputMessage.trim() || loading || !aiConfigured) && styles.sendButtonDisabled]}
              onPress={handleSendMessage}
              disabled={!inputMessage.trim() || loading || !aiConfigured}
            >
              <SendIcon size={20} color="#ffffff" />
        </TouchableOpacity>
          </View>
          {!aiConfigured && (
            <Text style={styles.aiStatusError}>
              ⚠️ {aiStatusMessage || 'AI chat is not configured'}
            </Text>
          )}
          {aiConfigured && (
            <Text style={styles.aiStatusText}>
              AI Assistant powered by OpenAI
            </Text>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  headerCard: {
    borderRadius: 16,
    padding: 20,
    margin: 16,
    marginBottom: 16,
    backgroundColor: '#1e3a8a',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 6,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#ffffff',
    opacity: 0.9,
  },
  mainContent: {
    flex: 1,
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 16,
    gap: 12,
  },
  sidebar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: width * 0.8,
    maxWidth: 320,
    backgroundColor: '#ffffff',
    zIndex: 999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  sidebarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  sidebarHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  closeSidebarButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeSidebarText: {
    fontSize: 18,
    color: '#6b7280',
    fontWeight: '600',
  },
  sidebarHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sidebarTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
  },
  newConversationButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#2563eb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  historyList: {
    flex: 1,
  },
  emptyHistory: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyHistoryText: {
    fontSize: 16,
    color: '#6b7280',
    marginBottom: 8,
  },
  emptyHistorySubtext: {
    fontSize: 14,
    color: '#9ca3af',
  },
  conversationItem: {
    flexDirection: 'row',
    padding: 12,
    marginHorizontal: 8,
    marginVertical: 4,
    borderRadius: 8,
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  conversationItemActive: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  conversationContent: {
    flex: 1,
  },
  conversationTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  conversationTitleActive: {
    color: '#ffffff',
  },
  conversationPreview: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
  },
  conversationPreviewActive: {
    color: 'rgba(255, 255, 255, 0.8)',
  },
  conversationTime: {
    fontSize: 11,
    color: '#9ca3af',
  },
  conversationTimeActive: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  deleteButton: {
    padding: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sidebarFooter: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  clearAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#dc2626',
    backgroundColor: 'transparent',
  },
  clearAllButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#dc2626',
  },
  chatArea: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    backgroundColor: '#f9fafb',
  },
  chatHeaderIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2563eb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  chatHeaderTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
  },
  chatHeaderSubtitle: {
    fontSize: 12,
    color: '#6b7280',
  },
  messagesContainer: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  messagesContent: {
    padding: 16,
  },
  welcomeContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  welcomeIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#2563eb',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 12,
  },
  welcomeText: {
    fontSize: 16,
    color: '#6b7280',
    marginBottom: 16,
  },
  welcomeList: {
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  welcomeListItem: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 8,
  },
  welcomeFooter: {
    fontSize: 14,
    color: '#9ca3af',
  },
  messageRow: {
    flexDirection: 'row',
    marginBottom: 16,
    alignItems: 'flex-end',
  },
  messageRowUser: {
    justifyContent: 'flex-end',
  },
  messageRowAi: {
    justifyContent: 'flex-start',
  },
  messageAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#2563eb',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  messageAvatarUser: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#e5e7eb',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  messageBubble: {
    maxWidth: '75%',
    padding: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  userMessageBubble: {
    backgroundColor: '#2563eb',
  },
  aiMessageBubble: {
    backgroundColor: '#ffffff',
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  userMessageText: {
    color: '#ffffff',
  },
  aiMessageText: {
    color: '#1f2937',
  },
  messageTime: {
    fontSize: 11,
    marginTop: 4,
  },
  userMessageTime: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  aiMessageTime: {
    color: '#9ca3af',
  },
  loadingBubble: {
    backgroundColor: '#ffffff',
    padding: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  loadingDots: {
    flexDirection: 'row',
    gap: 4,
  },
  loadingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#2563eb',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    backgroundColor: '#ffffff',
    gap: 8,
  },
  input: {
    flex: 1,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: '#1f2937',
    maxHeight: 100,
  },
  sendButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#2563eb',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  aiStatusError: {
    fontSize: 12,
    color: '#dc2626',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  aiStatusText: {
    fontSize: 12,
    color: '#6b7280',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
});

export default ChatScreen;
