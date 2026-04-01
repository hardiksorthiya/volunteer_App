const express = require('express');
const router = express.Router();
const { chatCompletion, isConfigured } = require('../config/openai');
const { authenticate } = require('../middleware/auth');
const MAX_GUEST_MESSAGES = 3;
const guestUsage = new Map();

const getLocationInstruction = (locationContext) => {
  if (!locationContext || typeof locationContext !== 'object') return null;

  const lat = Number(locationContext.latitude);
  const lng = Number(locationContext.longitude);
  const accuracy = Number(locationContext.accuracy);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  const roundedLat = lat.toFixed(4);
  const roundedLng = lng.toFixed(4);
  const accuracyText = Number.isFinite(accuracy) ? ` (accuracy about ${Math.round(accuracy)} meters)` : '';

  return `The user's approximate location is latitude ${roundedLat}, longitude ${roundedLng}${accuracyText}. Use this location context when answering with nearby suggestions, local guidance, weather-sensitive recommendations, or region-specific details. If location is not relevant to the question, answer normally.`;
};

const buildMessagesPayload = (message, conversationHistory = [], locationContext = null) => {
  const messages = [];
  const systemMessage = process.env.OPENAI_SYSTEM_MESSAGE ||
    'You are a helpful assistant for Volunteer Connect, a platform that connects volunteers with organizations. Be friendly, professional, and helpful.';

  messages.push({
    role: 'system',
    content: systemMessage
  });

  const locationInstruction = getLocationInstruction(locationContext);
  if (locationInstruction) {
    messages.push({
      role: 'system',
      content: locationInstruction
    });
  }

  if (Array.isArray(conversationHistory) && conversationHistory.length > 0) {
    const recentHistory = conversationHistory.slice(-10);
    recentHistory.forEach(msg => {
      if (msg.role && msg.content) {
        messages.push({
          role: msg.role,
          content: msg.content
        });
      }
    });
  }

  messages.push({
    role: 'user',
    content: message.trim()
  });

  return messages;
};

// @route   POST /api/chat
// @desc    Chat with AI using OpenAI - Send a message and get AI reply
// @access  Private (requires authentication)
router.post('/', authenticate, async (req, res) => {
  try {
    // Check if OpenAI is configured
    if (!isConfigured()) {
      return res.status(503).json({
        success: false,
        message: 'AI chat service is not configured. Please set OPENAI_API_KEY in environment variables.'
      });
    }

    const { message, conversationHistory = [], model, temperature, max_tokens, locationContext = null } = req.body;

    // Validation
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid message'
      });
    }

    const messages = buildMessagesPayload(message, conversationHistory, locationContext);

    // Prepare options
    const options = {};
    if (model) options.model = model;
    if (temperature !== undefined) options.temperature = parseFloat(temperature);
    if (max_tokens !== undefined) options.max_tokens = parseInt(max_tokens);

    // Call OpenAI API
    const response = await chatCompletion(messages, options);

    // Extract the assistant's reply
    const assistantMessage = response.choices[0]?.message?.content || 'Sorry, I could not generate a response.';

    // Return response
    res.json({
      success: true,
      message: assistantMessage,
      usage: {
        prompt_tokens: response.usage?.prompt_tokens || 0,
        completion_tokens: response.usage?.completion_tokens || 0,
        total_tokens: response.usage?.total_tokens || 0
      },
      model: response.model || 'unknown'
    });

  } catch (error) {
    console.error('Chat API error:', error);
    console.error('Error details:', {
      message: error.message,
      status: error.status,
      statusCode: error.statusCode,
      code: error.code,
      type: error.type,
      response: error.response
    });
    
    // Handle OpenAI API errors - check multiple possible error properties
    const statusCode = error.status || error.statusCode || (error.response && error.response.status);
    const errorCode = error.code || (error.response && error.response.data && error.response.data.error && error.response.data.error.code);
    const errorMessage = error.message || (error.response && error.response.data && error.response.data.error && error.response.data.error.message);
    
    // Check for authentication errors (401)
    if (statusCode === 401 || errorCode === 'invalid_api_key' || errorMessage?.includes('Incorrect API key')) {
      return res.status(401).json({
        success: false,
        message: 'Invalid OpenAI API key. Please check your OPENAI_API_KEY in the .env file. Make sure it starts with "sk-" and is valid.',
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
      });
    }
    
    // Check for rate limit errors (429)
    if (statusCode === 429 || errorCode === 'rate_limit_exceeded') {
      return res.status(429).json({
        success: false,
        message: 'Rate limit exceeded. Please try again later or check your OpenAI account limits.'
      });
    }

    // Check for insufficient quota errors
    if (errorCode === 'insufficient_quota' || errorMessage?.includes('quota')) {
      return res.status(402).json({
        success: false,
        message: 'OpenAI account has insufficient quota. Please add credits to your OpenAI account.'
      });
    }

    // Check for invalid request errors (400)
    if (statusCode === 400 || errorCode === 'invalid_request_error') {
      return res.status(400).json({
        success: false,
        message: errorMessage || 'Invalid request to OpenAI API. Please check your message and parameters.'
      });
    }

    // Check for server errors (500, 502, 503)
    if (statusCode === 500 || statusCode === 502 || statusCode === 503) {
      return res.status(503).json({
        success: false,
        message: 'OpenAI service is temporarily unavailable. Please try again later.'
      });
    }

    // Generic error response
    res.status(500).json({
      success: false,
      message: errorMessage || 'An error occurred while processing your chat request',
      details: process.env.NODE_ENV === 'development' ? {
        error: error.message,
        code: errorCode,
        status: statusCode
      } : undefined
    });
  }
});

// @route   POST /api/chat/guest
// @desc    Guest chat with AI (limited free questions before login is required)
// @access  Public
router.post('/guest', async (req, res) => {
  try {
    if (!isConfigured()) {
      return res.status(503).json({
        success: false,
        message: 'AI chat service is not configured. Please set OPENAI_API_KEY in environment variables.'
      });
    }

    const { message, conversationHistory = [], model, temperature, max_tokens, guestId, locationContext = null } = req.body;

    if (!guestId || typeof guestId !== 'string' || guestId.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Guest identifier is required'
      });
    }

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid message'
      });
    }

    const normalizedGuestId = guestId.trim().slice(0, 128);
    const currentCount = guestUsage.get(normalizedGuestId) || 0;

    if (currentCount >= MAX_GUEST_MESSAGES) {
      return res.status(403).json({
        success: false,
        message: 'Free AI limit reached. Please login to continue chatting.',
        requiresLogin: true,
        remaining: 0
      });
    }

    const messages = buildMessagesPayload(message, conversationHistory.slice(-6), locationContext);
    const options = {};
    if (model) options.model = model;
    if (temperature !== undefined) options.temperature = parseFloat(temperature);
    if (max_tokens !== undefined) options.max_tokens = parseInt(max_tokens);

    const response = await chatCompletion(messages, options);
    const assistantMessage = response.choices[0]?.message?.content || 'Sorry, I could not generate a response.';

    const newCount = currentCount + 1;
    guestUsage.set(normalizedGuestId, newCount);

    return res.json({
      success: true,
      message: assistantMessage,
      remaining: Math.max(0, MAX_GUEST_MESSAGES - newCount),
      requiresLogin: false
    });
  } catch (error) {
    console.error('Guest chat API error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'An error occurred while processing your chat request'
    });
  }
});

// @route   GET /api/chat/status
// @desc    Check if AI chat is configured and available
// @access  Private (requires authentication)
router.get('/status', authenticate, async (req, res) => {
  try {
    const configured = isConfigured();
    
    res.json({
      success: true,
      configured: configured,
      message: configured 
        ? 'AI chat is configured and ready' 
        : 'AI chat is not configured. Please set OPENAI_API_KEY in environment variables.'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;

