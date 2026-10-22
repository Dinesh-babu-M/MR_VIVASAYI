import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const distDir = path.join(projectRoot, 'dist');
const indexHtml = path.join(distDir, 'index.html');
const fallback404 = path.join(distDir, '404.html');

console.log('🚀 Running Post-Build SPA Deployment Fallback Generator...');

if (!fs.existsSync(distDir)) {
  console.error('❌ Error: dist/ directory not found. Please build the project first.');
  process.exit(1);
}

if (!fs.existsSync(indexHtml)) {
  console.error('❌ Error: dist/index.html not found.');
  process.exit(1);
}

// 1. Copy index.html to 404.html for GitHub Pages, Surge, S3, etc.
try {
  fs.copyFileSync(indexHtml, fallback404);
  console.log('  ✓ Generated dist/404.html (SPA Fallback for GitHub Pages / S3 / Static CDNs)');
} catch (err) {
  console.error('❌ Error copying 404.html:', err);
}

// 2. Verify _redirects (Netlify, Cloudflare, Render)
const redirectsFile = path.join(distDir, '_redirects');
if (!fs.existsSync(redirectsFile)) {
  fs.writeFileSync(redirectsFile, '/*    /index.html   200\n', 'utf8');
  console.log('  ✓ Created dist/_redirects (Netlify / Cloudflare / Render)');
} else {
  console.log('  ✓ Verified dist/_redirects exists');
}

// 3. Verify .htaccess (Apache / cPanel)
const htaccessFile = path.join(distDir, '.htaccess');
if (!fs.existsSync(htaccessFile)) {
  const htaccessContent = `<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  RewriteRule ^index\\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule . /index.html [L]
</IfModule>\n`;
  fs.writeFileSync(htaccessFile, htaccessContent, 'utf8');
  console.log('  ✓ Created dist/.htaccess (Apache / cPanel)');
} else {
  console.log('  ✓ Verified dist/.htaccess exists');
}

console.log('✨ All hosting platform SPA fallback files generated successfully in dist/!\n');
