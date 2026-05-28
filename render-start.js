#!/usr/bin/env node
// Render start script: loads env vars and runs prisma migrate + starts server
const { execSync, spawn } = require('child_process');

// Log env check
console.log('DATABASE_URL set:', !!process.env.DATABASE_URL);
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('PORT:', process.env.PORT);

if (!process.env.DATABASE_URL) {
  console.error('FATAL: DATABASE_URL is not set. Check Render environment variables.');
  process.exit(1);
}

// Run prisma migrate deploy
console.log('Running prisma migrate deploy...');
try {
  execSync('npx prisma migrate deploy', {
    stdio: 'inherit',
    env: process.env,
    cwd: '/opt/render/project/src',
  });
  console.log('Migrations complete.');
} catch (e) {
  console.error('Migration failed:', e.message);
  process.exit(1);
}

// Start NestJS
console.log('Starting NestJS...');
const main = require('/opt/render/project/src/dist/main.js');
