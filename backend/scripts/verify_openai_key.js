// Clear any cached modules and reload dotenv with override
delete require.cache[require.resolve('dotenv')];
require('dotenv').config({ override: true });
const OpenAI = require('openai');

console.log('🔍 Verifying OpenAI API Key Configuration...\n');

// Check if API key exists
const apiKey = process.env.OPENAI_API_KEY;

if (!apiKey) {
  console.error('❌ OPENAI_API_KEY is not set in .env file');
  console.log('\n📝 To fix this:');
  console.log('1. Open backend/.env file');
  console.log('2. Add the following line:');
  console.log('   OPENAI_API_KEY=sk-your-api-key-here');
  console.log('3. Get your API key from: https://platform.openai.com/api-keys');
  console.log('4. Restart your server\n');
  process.exit(1);
}

// Check if API key format is correct (supports both sk- and sk-proj- formats)
if (!apiKey.startsWith('sk-')) {
  console.warn('⚠️  Warning: API key should start with "sk-" or "sk-proj-"');
  console.log('   Current key starts with:', apiKey.substring(0, 10) + '...');
  console.log('   Please verify your API key is correct\n');
} else {
  const keyFormat = apiKey.startsWith('sk-proj-') ? 'sk-proj- (new format)' : 'sk- (legacy format)';
  console.log('✅ API Key format:', keyFormat);
}

// Check if it's the placeholder value
if (apiKey === 'your-openai-api-key-here' || apiKey.includes('your-api-key')) {
  console.error('❌ OPENAI_API_KEY appears to be a placeholder value');
  console.log('\n📝 To fix this:');
  console.log('1. Get your API key from: https://platform.openai.com/api-keys');
  console.log('2. Replace the placeholder in backend/.env file');
  console.log('3. Restart your server\n');
  process.exit(1);
}

console.log('✅ API Key found in .env file');
const keyPrefix = apiKey.substring(0, apiKey.indexOf('-', 3) + 1) || apiKey.substring(0, 7);
console.log('   Key preview:', keyPrefix + '...' + apiKey.substring(apiKey.length - 4));
console.log('   Key length:', apiKey.length, 'characters');
console.log('   Key format:', apiKey.startsWith('sk-proj-') ? 'sk-proj- (new format)' : apiKey.startsWith('sk-') ? 'sk- (legacy format)' : 'Unknown format');

// Check for common issues
if (apiKey.length < 20) {
  console.warn('   ⚠️  Warning: API key seems too short. OpenAI keys are usually 50+ characters.');
}
if (apiKey.includes(' ') || apiKey.includes('\n') || apiKey.includes('\r')) {
  console.warn('   ⚠️  Warning: API key may contain spaces or newlines. Make sure it\'s on a single line.');
}
if (apiKey.startsWith('"') || apiKey.endsWith('"') || apiKey.startsWith("'") || apiKey.endsWith("'")) {
  console.warn('   ⚠️  Warning: API key appears to be wrapped in quotes. Remove quotes from .env file.');
}

// Try to initialize OpenAI client
console.log('\n🔄 Testing API key with OpenAI...');

try {
  const openai = new OpenAI({
    apiKey: apiKey,
  });

  // Get model from env or use default
  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
  console.log('   Testing with model:', model);
  
  // Make a simple test request
  openai.chat.completions.create({
    model: model,
    messages: [{ role: 'user', content: 'Say "Hello" if you can read this.' }],
    max_tokens: 10,
  }).then(response => {
    console.log('✅ API Key is valid and working!');
    console.log('   Test response:', response.choices[0].message.content);
    console.log('\n🎉 Your OpenAI configuration is ready to use!');
    process.exit(0);
  }).catch(error => {
    console.error('\n❌ API Key validation failed:');
    
    // Extract detailed error information
    const statusCode = error.status || error.statusCode || (error.response && error.response.status);
    const errorCode = error.code || (error.response && error.response.data && error.response.data.error && error.response.data.error.code);
    const errorMessage = error.message || (error.response && error.response.data && error.response.data.error && error.response.data.error.message);
    const errorType = error.type || (error.response && error.response.data && error.response.data.error && error.response.data.error.type);
    
    // Show detailed error info
    console.error('   Status Code:', statusCode || 'Unknown');
    console.error('   Error Code:', errorCode || 'Unknown');
    console.error('   Error Type:', errorType || 'Unknown');
    console.error('   Error Message:', errorMessage || 'No detailed message available');
    
    // Show full error object in development mode
    if (process.env.NODE_ENV === 'development' || !process.env.NODE_ENV) {
      console.error('\n   Full error details:');
      console.error(JSON.stringify({
        status: statusCode,
        code: errorCode,
        type: errorType,
        message: errorMessage,
        response: error.response ? {
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data
        } : undefined
      }, null, 2));
    }
    
    // Provide specific solutions based on error type
    if (statusCode === 401 || errorCode === 'invalid_api_key' || errorMessage?.toLowerCase().includes('invalid') || errorMessage?.toLowerCase().includes('incorrect api key')) {
      console.error('\n   🔍 Diagnosis: The API key is invalid or incorrect');
      console.log('\n📝 To fix this:');
      console.log('1. Verify your API key in .env file:');
      console.log('   - Make sure there are no extra spaces or quotes');
      console.log('   - Check that the entire key is copied (very long string)');
      console.log('   - Key should start with "sk-proj-" or "sk-"');
      console.log('2. Go to https://platform.openai.com/api-keys');
      console.log('3. Verify the key is active (not revoked)');
      console.log('4. If needed, create a new API key');
      console.log('5. Copy the FULL key and paste it in backend/.env');
      console.log('6. Make sure .env file is saved');
      console.log('7. Restart your server\n');
    } else if (statusCode === 429 || errorCode === 'rate_limit_exceeded') {
      console.error('\n   🔍 Diagnosis: Rate limit exceeded (temporary)');
      console.log('   Your API key is valid, but you\'ve hit a rate limit.');
      console.log('   Wait a few minutes and try again.\n');
    } else if (errorCode === 'insufficient_quota' || errorMessage?.toLowerCase().includes('quota')) {
      console.error('\n   🔍 Diagnosis: Insufficient quota');
      console.log('   Your API key is valid, but your account has no credits.');
      console.log('   Add credits at: https://platform.openai.com/account/billing\n');
    } else if (errorCode === 'model_not_found' || errorMessage?.toLowerCase().includes('model')) {
      console.error('\n   🔍 Diagnosis: Model not found or not available');
      console.log('   The model "' + model + '" may not be available for your API key.');
      console.log('   Try changing OPENAI_MODEL in .env to: gpt-3.5-turbo or gpt-4o-mini\n');
    } else if (errorMessage?.toLowerCase().includes('organization') || errorCode === 'invalid_organization') {
      console.error('\n   🔍 Diagnosis: Organization issue');
      console.log('   The API key may be associated with a different organization.');
      console.log('   Check your OpenAI organization settings.\n');
    } else {
      console.error('\n   🔍 Diagnosis: Unknown error');
      console.log('   Please check the error details above.');
      console.log('   Common issues:');
      console.log('   - Network connectivity problems');
      console.log('   - OpenAI API service issues (check https://status.openai.com/)');
      console.log('   - Invalid API key format\n');
    }
    
    process.exit(1);
  });
} catch (error) {
  console.error('❌ Failed to initialize OpenAI client:', error.message);
  process.exit(1);
}

