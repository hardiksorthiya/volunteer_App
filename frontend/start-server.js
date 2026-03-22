#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

// Set environment variables
process.env.PORT = process.env.PORT || '3001';
process.env.BROWSER = 'none';
process.env.NODE_ENV = process.env.NODE_ENV || 'development';

// Start react-scripts
const reactScripts = spawn('npx', ['react-scripts', 'start'], {
  cwd: __dirname,
  stdio: 'inherit',
  shell: true
});

reactScripts.on('close', (code) => {
  console.log(`React scripts process exited with code ${code}`);
  process.exit(code);
});

reactScripts.on('error', (err) => {
  console.error('Failed to start react-scripts:', err);
  process.exit(1);
});

// Handle termination
process.on('SIGTERM', () => {
  reactScripts.kill('SIGTERM');
});

process.on('SIGINT', () => {
  reactScripts.kill('SIGINT');
});

