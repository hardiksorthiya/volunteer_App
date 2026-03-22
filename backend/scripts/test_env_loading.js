// Clear any cached modules
delete require.cache[require.resolve('dotenv')];

// Load dotenv fresh
require('dotenv').config({ override: true });

console.log('Testing dotenv loading...\n');
console.log('OPENAI_API_KEY value:', process.env.OPENAI_API_KEY);
console.log('OPENAI_API_KEY length:', process.env.OPENAI_API_KEY?.length);
console.log('OPENAI_API_KEY starts with:', process.env.OPENAI_API_KEY?.substring(0, 10));
console.log('OPENAI_API_KEY ends with:', process.env.OPENAI_API_KEY?.substring(process.env.OPENAI_API_KEY?.length - 10));

// Also check if there are any system env vars
console.log('\nSystem environment variable:', process.env.OPENAI_API_KEY ? 'Set' : 'Not set');

