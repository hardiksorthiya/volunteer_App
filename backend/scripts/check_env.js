// Clear any cached modules and reload dotenv with override
delete require.cache[require.resolve('dotenv')];
require('dotenv').config({ override: true });
const path = require('path');
const fs = require('fs');

console.log('🔍 Checking .env file configuration...\n');

// Check if .env file exists
const envPath = path.join(__dirname, '..', '.env');
const envExists = fs.existsSync(envPath);

if (!envExists) {
  console.error('❌ .env file not found at:', envPath);
  console.log('\n📝 To fix this:');
  console.log('1. Copy env-template.txt to .env:');
  console.log('   cp env-template.txt .env');
  console.log('2. Edit .env and add your API key\n');
  process.exit(1);
}

console.log('✅ .env file found at:', envPath);

// Read and check .env file content
try {
  const envContent = fs.readFileSync(envPath, 'utf8');
  const lines = envContent.split('\n');
  
  console.log('\n📄 Checking .env file contents:');
  
  let foundOpenAIKey = false;
  let openAILine = null;
  
  lines.forEach((line, index) => {
    const trimmedLine = line.trim();
    if (trimmedLine.startsWith('OPENAI_API_KEY')) {
      foundOpenAIKey = true;
      openAILine = { line: index + 1, content: trimmedLine };
      
      // Extract the key value
      const match = trimmedLine.match(/OPENAI_API_KEY\s*=\s*(.+)/);
      if (match) {
        let keyValue = match[1].trim();
        
        // Remove quotes if present
        if ((keyValue.startsWith('"') && keyValue.endsWith('"')) || 
            (keyValue.startsWith("'") && keyValue.endsWith("'"))) {
          keyValue = keyValue.slice(1, -1);
          console.warn(`   ⚠️  Line ${index + 1}: OPENAI_API_KEY has quotes (remove them)`);
        }
        
        // Check for spaces
        if (keyValue.includes(' ')) {
          console.warn(`   ⚠️  Line ${index + 1}: OPENAI_API_KEY may contain spaces`);
        }
        
        // Check length
        if (keyValue.length < 20) {
          console.warn(`   ⚠️  Line ${index + 1}: OPENAI_API_KEY seems too short (${keyValue.length} chars)`);
        }
        
        // Check format
        if (!keyValue.startsWith('sk-')) {
          console.warn(`   ⚠️  Line ${index + 1}: OPENAI_API_KEY doesn't start with "sk-"`);
        }
        
        console.log(`   ✅ Line ${index + 1}: OPENAI_API_KEY found`);
        console.log(`      Format: ${keyValue.startsWith('sk-proj-') ? 'sk-proj- (new)' : keyValue.startsWith('sk-') ? 'sk- (legacy)' : 'Unknown'}`);
        console.log(`      Length: ${keyValue.length} characters`);
        console.log(`      Preview: ${keyValue.substring(0, 10)}...${keyValue.substring(keyValue.length - 4)}`);
      }
    }
  });
  
  if (!foundOpenAIKey) {
    console.error('   ❌ OPENAI_API_KEY not found in .env file');
    console.log('\n📝 To fix this:');
    console.log('1. Add this line to your .env file:');
    console.log('   OPENAI_API_KEY=sk-proj-your-key-here');
    console.log('2. Replace "sk-proj-your-key-here" with your actual API key\n');
  }
  
  // Check what dotenv actually loaded
  console.log('\n🔍 What dotenv loaded:');
  const loadedKey = process.env.OPENAI_API_KEY;
  
  if (!loadedKey) {
    console.error('   ❌ OPENAI_API_KEY not loaded by dotenv');
    console.log('   This means dotenv could not read the key from .env file');
    console.log('   Check for syntax errors in .env file\n');
  } else {
    console.log('   ✅ OPENAI_API_KEY loaded successfully');
    console.log(`   Format: ${loadedKey.startsWith('sk-proj-') ? 'sk-proj- (new)' : loadedKey.startsWith('sk-') ? 'sk- (legacy)' : 'Unknown'}`);
    console.log(`   Length: ${loadedKey.length} characters`);
    console.log(`   Preview: ${loadedKey.substring(0, 10)}...${loadedKey.substring(loadedKey.length - 4)}`);
    
    // Compare with what's in file
    if (openAILine) {
      const fileMatch = openAILine.content.match(/OPENAI_API_KEY\s*=\s*(.+)/);
      if (fileMatch) {
        let fileKey = fileMatch[1].trim();
        // Remove quotes
        if ((fileKey.startsWith('"') && fileKey.endsWith('"')) || 
            (fileKey.startsWith("'") && fileKey.endsWith("'"))) {
          fileKey = fileKey.slice(1, -1);
        }
        
        if (fileKey !== loadedKey) {
          console.warn('\n   ⚠️  Warning: Key in file differs from loaded key');
          console.warn('   This might indicate encoding or parsing issues');
        }
      }
    }
  }
  
  // Check model
  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
  console.log(`\n   Model: ${model}`);
  
  console.log('\n✅ Environment check complete!\n');
  
} catch (error) {
  console.error('❌ Error reading .env file:', error.message);
  process.exit(1);
}

