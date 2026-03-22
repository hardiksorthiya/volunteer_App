const express = require('express');
const router = express.Router();
const { chatCompletion, isConfigured } = require('../config/openai');
const { authenticate } = require('../middleware/auth');

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

    const { message, conversationHistory = [], model, temperature, max_tokens } = req.body;

    // Validation
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid message'
      });
    }

    // Build messages array for OpenAI
    const messages = [];

    // Add system message (optional, can be customized)
    const systemMessage = process.env.OPENAI_SYSTEM_MESSAGE || 
      'You are a helpful assistant for Volunteer Connect, a platform that connects volunteers with organizations. Be friendly, professional, and helpful.';

    messages.push({
      role: 'system',
      content: systemMessage
    });

    // Add conversation history if provided
    if (Array.isArray(conversationHistory) && conversationHistory.length > 0) {
      // Validate and add history (limit to last 10 messages to avoid token limits)
      const recentHistory = conversationHistory.slice(-10);
      recentHistory.forEach(msg => {
        if (msg.role && msg.content) {
          messages.push({
            role: msg.role, // 'user' or 'assistant'
            content: msg.content
          });
        }
      });
    }

    // Add current user message
    messages.push({
      role: 'user',
      content: message.trim()
    });

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

