const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { chatCompletion, isConfigured, moderateUserMessage } = require('../config/openai');
const { authenticate } = require('../middleware/auth');
const {
  CHAT_RESPONSE_FORMAT,
  prepareChatContext,
  buildContextMessages,
} = require('../utils/chatContext');

const MAX_GUEST_MESSAGES = 3;
const MAX_CHAT_MESSAGE_LENGTH = 8000;
const DEFAULT_MAX_TOKENS = 1400;
const guestUsage = new Map();

const POLICY_REFUSAL_MESSAGE =
  "I'm sorry — I can't help with that. This assistant only answers questions about volunteering, nonprofit and community work, Volunteer Connect, and related volunteer activities. What would you like to know about volunteering?";

const CHAT_SCOPE_SYSTEM = `You are the Volunteer Connect AI assistant. Help users find and understand volunteer opportunities.

SCOPE: volunteering, nonprofits, community service, using Volunteer Connect, volunteer skills and safety — only.

OFF TOPIC: Politely refuse non-volunteering requests in one sentence.

${CHAT_RESPONSE_FORMAT}`;

const refusePolicyResponse = (res, extra = {}) =>
  res.json({
    success: true,
    message: POLICY_REFUSAL_MESSAGE,
    policyBlocked: true,
    ...extra,
  });

const validateChatMessage = (message) => {
  const trimmed = typeof message === 'string' ? message.trim() : '';
  if (!trimmed) return { ok: false, error: 'Please provide a valid message' };
  if (trimmed.length > MAX_CHAT_MESSAGE_LENGTH) {
    return { ok: false, error: `Message is too long (maximum ${MAX_CHAT_MESSAGE_LENGTH} characters)` };
  }
  return { ok: true, trimmed };
};

const buildMessages = (userMessage, conversationHistory, chatContext) => {
  const messages = [
    { role: 'system', content: CHAT_SCOPE_SYSTEM },
    {
      role: 'system',
      content:
        process.env.OPENAI_SYSTEM_MESSAGE ||
        'Be warm, clear, and practical. Prefer structured lists with organization names over long paragraphs. Never add a closing login or marketing footer.',
    },
    ...buildContextMessages(userMessage, chatContext.location, chatContext.search, chatContext.activities),
  ];

  (conversationHistory || []).slice(-10).forEach((msg) => {
    if (msg.role && msg.content) {
      messages.push({ role: msg.role, content: msg.content });
    }
  });

  messages.push({ role: 'user', content: userMessage.trim() });
  return messages;
};

const runChat = async (req, res, { guest = false, guestId = null } = {}) => {
  if (!isConfigured()) {
    return res.status(503).json({
      success: false,
      message: 'AI chat service is not configured. Please set OPENAI_API_KEY in environment variables.',
    });
  }

  const {
    message,
    conversationHistory = [],
    model,
    temperature,
    max_tokens,
    locationContext = null,
  } = req.body;

  const validation = validateChatMessage(message);
  if (!validation.ok) {
    return res.status(400).json({ success: false, message: validation.error });
  }

  if (guest) {
    if (!guestId || typeof guestId !== 'string' || !guestId.trim()) {
      return res.status(400).json({ success: false, message: 'Guest identifier is required' });
    }
    const id = guestId.trim().slice(0, 128);
    const count = guestUsage.get(id) || 0;
    if (count >= MAX_GUEST_MESSAGES) {
      return res.status(403).json({
        success: false,
        message: 'Free AI limit reached. Please login to continue chatting.',
        requiresLogin: true,
        remaining: 0,
      });
    }
  }

  const moderation = await moderateUserMessage(validation.trimmed);
  if (!moderation.allowed) {
    return refusePolicyResponse(res, guest ? { remaining: Math.max(0, MAX_GUEST_MESSAGES - (guestUsage.get(guestId.trim().slice(0, 128)) || 0)) } : {});
  }

  const chatContext = await prepareChatContext(db, validation.trimmed, locationContext, guest ? null : req.user?.id);

  const history = guest ? conversationHistory.slice(-6) : conversationHistory;
  const messages = buildMessages(validation.trimmed, history, chatContext);

  const options = { max_tokens: max_tokens !== undefined ? parseInt(max_tokens, 10) : DEFAULT_MAX_TOKENS };
  if (model) options.model = model;
  if (temperature !== undefined) options.temperature = parseFloat(temperature);

  const response = await chatCompletion(messages, options);
  const assistantMessage = response.choices[0]?.message?.content || 'Sorry, I could not generate a response.';

  const payload = {
    success: true,
    message: assistantMessage,
    usage: {
      prompt_tokens: response.usage?.prompt_tokens || 0,
      completion_tokens: response.usage?.completion_tokens || 0,
      total_tokens: response.usage?.total_tokens || 0,
    },
    model: response.model || 'unknown',
  };

  if (guest) {
    const id = guestId.trim().slice(0, 128);
    const newCount = (guestUsage.get(id) || 0) + 1;
    guestUsage.set(id, newCount);
    payload.remaining = Math.max(0, MAX_GUEST_MESSAGES - newCount);
    payload.requiresLogin = false;
  }

  return res.json(payload);
};

const handleChatError = (res, error) => {
  console.error('Chat API error:', error);

  const statusCode = error.status || error.statusCode || error.response?.status;
  const errorCode = error.code || error.response?.data?.error?.code;
  const errorMessage = error.message || error.response?.data?.error?.message;

  if (statusCode === 401 || errorCode === 'invalid_api_key') {
    return res.status(401).json({ success: false, message: 'Invalid OpenAI API key.' });
  }
  if (statusCode === 429) {
    return res.status(429).json({ success: false, message: 'Rate limit exceeded. Please try again later.' });
  }
  if (errorCode === 'insufficient_quota') {
    return res.status(402).json({ success: false, message: 'OpenAI account has insufficient quota.' });
  }
  if (statusCode >= 500) {
    return res.status(503).json({ success: false, message: 'OpenAI service is temporarily unavailable.' });
  }

  return res.status(500).json({
    success: false,
    message: errorMessage || 'An error occurred while processing your chat request',
  });
};

router.post('/', authenticate, async (req, res) => {
  try {
    await runChat(req, res, { guest: false });
  } catch (error) {
    handleChatError(res, error);
  }
});

router.post('/guest', async (req, res) => {
  try {
    await runChat(req, res, { guest: true, guestId: req.body.guestId });
  } catch (error) {
    handleChatError(res, error);
  }
});

router.get('/status', authenticate, async (req, res) => {
  try {
    res.json({
      success: true,
      configured: isConfigured(),
      message: isConfigured()
        ? 'AI chat is configured and ready'
        : 'AI chat is not configured. Please set OPENAI_API_KEY in environment variables.',
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
