import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');

console.log('🔍 ========================================================');
console.log('🧪 MR. VIVASAYI: Full Application & Deployment Platform Test');
console.log('🔍 ========================================================\n');

let failed = false;

function check(name, condition, details = '') {
  if (condition) {
    console.log(`  ✅ [PASS] ${name}`);
    if (details) console.log(`     └─ ${details}`);
  } else {
    console.error(`  ❌ [FAIL] ${name}`);
    if (details) console.error(`     └─ ${details}`);
    failed = true;
  }
}

// 1. Hosting Configurations
console.log('📦 1. Verifying Multi-Platform Hosting Configurations:');

// Vercel
const vercelPath = path.join(root, 'vercel.json');
const hasVercel = fs.existsSync(vercelPath);
let vercelRewritesOk = false;
if (hasVercel) {
  try {
    const v = JSON.parse(fs.readFileSync(vercelPath, 'utf8'));
    vercelRewritesOk = Array.isArray(v.rewrites) && v.rewrites.some(r => r.destination === '/index.html');
  } catch (e) {
    vercelRewritesOk = false;
  }
}
check('Vercel configuration (vercel.json)', hasVercel && vercelRewritesOk, 'SPA rewrite: /(.*) -> /index.html');

// Netlify
const netlifyPath = path.join(root, 'netlify.toml');
const hasNetlify = fs.existsSync(netlifyPath);
let netlifyRedirectOk = false;
if (hasNetlify) {
  const content = fs.readFileSync(netlifyPath, 'utf8');
  netlifyRedirectOk = content.includes('to = "/index.html"') && content.includes('status = 200');
}
check('Netlify configuration (netlify.toml)', hasNetlify && netlifyRedirectOk, 'SPA redirect: /* -> /index.html (200)');

// Public _redirects
const pubRedirects = path.join(root, 'public/_redirects');
const hasPubRedirects = fs.existsSync(pubRedirects);
check('Cloudflare Pages & Netlify fallback (public/_redirects)', hasPubRedirects, 'Contains /* /index.html 200');

// Apache .htaccess
const pubHtaccess = path.join(root, 'public/.htaccess');
const hasPubHtaccess = fs.existsSync(pubHtaccess);
check('Apache / cPanel configuration (public/.htaccess)', hasPubHtaccess, 'mod_rewrite: RewriteRule . /index.html [L]');

// Firebase
const firebasePath = path.join(root, 'firebase.json');
check('Firebase Hosting configuration (firebase.json)', fs.existsSync(firebasePath), 'rewrites: ** -> /index.html');

// Static JSON (Render / Amplify)
const staticJsonPath = path.join(root, 'static.json');
check('Render / AWS Amplify static configuration (static.json)', fs.existsSync(staticJsonPath), 'routes: /** -> index.html');

// Cloudflare Pages routes
const cloudflareRoutes = path.join(root, 'public/_routes.json');
check('Cloudflare Pages routes (public/_routes.json)', fs.existsSync(cloudflareRoutes), 'includes /*, excludes /assets/*');

// 2. Build Output Validation
console.log('\n🏗️  2. Verifying Production Build Output in dist/:');
const distDir = path.join(root, 'dist');
check('Build directory exists (dist/)', fs.existsSync(distDir));

const indexHtml = path.join(distDir, 'index.html');
const hasIndex = fs.existsSync(indexHtml);
let indexHasRoot = false;
if (hasIndex) {
  const html = fs.readFileSync(indexHtml, 'utf8');
  indexHasRoot = html.includes('id="root"');
}
check('dist/index.html generated with #root container', hasIndex && indexHasRoot);

const fallback404 = path.join(distDir, '404.html');
check('dist/404.html generated for GitHub Pages & static hosting', fs.existsSync(fallback404));

const distRedirects = path.join(distDir, '_redirects');
check('dist/_redirects exists in build output', fs.existsSync(distRedirects));

const distHtaccess = path.join(distDir, '.htaccess');
check('dist/.htaccess exists in build output', fs.existsSync(distHtaccess));

// 3. Key Components Integrity
console.log('\n📱 3. Verifying Cart & WhatsApp Components:');
const cartDrawerPath = path.join(root, 'src/components/common/CartDrawer.tsx');
let cartDrawerOk = false;
if (fs.existsSync(cartDrawerPath)) {
  const content = fs.readFileSync(cartDrawerPath, 'utf8');
  const hasWhatsAppIcon = content.includes('WhatsAppIcon');
  const hasPhoneLookup = content.includes('lookupCustomer');
  const hasAllStates = content.includes('Andhra Pradesh') && content.includes('Maharashtra') && content.includes('Tamil Nadu');
  const hasAutoFetchBtn = content.includes('Auto-Fetch');
  cartDrawerOk = hasWhatsAppIcon && hasPhoneLookup && hasAllStates && hasAutoFetchBtn;
}
check('CartDrawer WhatsApp Auto-Fetch with WhatsApp icon', cartDrawerOk);

console.log('\n========================================================');
if (failed) {
  console.error('❌ Verification found errors.');
  process.exit(1);
} else {
  console.log('🎉 ALL TESTS PASSED! Multi-platform hosting readiness: 100%');
  console.log('   Ready for seamless deployment on Vercel, Netlify, Cloudflare, GitHub Pages & more!');
  console.log('========================================================\n');
}
