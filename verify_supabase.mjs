import https from 'https';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://tzomdxdrzanzsobstfrg.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SECRET_KEY || process.env.VITE_SUPABASE_SECRET_KEY || process.env.SUPABASE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

const TABLES = [
  'users',
  'categories',
  'suppliers',
  'products',
  'customers',
  'orders',
  'order_items',
  'stock_movements',
  'reviews',
  'expenses',
  'coupons',
  'message_templates',
  'purchase_orders',
  'audit_logs',
  'default_data',
  'roles',
  'sample_billing_orders',
  'website_analyze',
  'pop_notification_events',
  'pop_notification_subscribers',
  'price_history'
];

async function verifyTable(tableName) {
  return new Promise((resolve) => {
    const url = new URL(`${SUPABASE_URL}/rest/v1/${tableName}?limit=1`);
    const options = {
      method: 'GET',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`
      }
    };

    const req = https.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve({
              table: tableName,
              status: 'READY / CREATED',
              httpStatus: res.statusCode,
              records: Array.isArray(parsed) ? parsed.length : 0,
              ok: true
            });
          } else {
            resolve({
              table: tableName,
              status: 'MISSING (404/PGRST205)',
              httpStatus: res.statusCode,
              details: parsed.message || data,
              ok: false
            });
          }
        } catch (e) {
          resolve({
            table: tableName,
            status: 'ERROR',
            httpStatus: res.statusCode,
            details: data.slice(0, 100),
            ok: false
          });
        }
      });
    });

    req.on('error', (err) => {
      resolve({
        table: tableName,
        status: 'NETWORK ERROR',
        details: err.message,
        ok: false
      });
    });

    req.end();
  });
}

async function runVerification() {
  console.log('='.repeat(70));
  console.log(' SUPABASE LIVE TABLE VERIFICATION REPORT');
  console.log(` Target URL : ${SUPABASE_URL}`);
  console.log(` Timestamp  : ${new Date().toISOString()}`);
  console.log('='.repeat(70));

  const results = await Promise.all(TABLES.map(verifyTable));

  let createdCount = 0;
  console.log(
    '#'.padEnd(4) +
    'TABLE NAME'.padEnd(22) +
    'STATUS'.padEnd(24) +
    'HTTP CODE'
  );
  console.log('-'.repeat(70));

  results.forEach((r, idx) => {
    if (r.ok) createdCount++;
    const icon = r.ok ? '✓' : '✗';
    console.log(
      `${(idx + 1).toString().padEnd(3)} ` +
      `${r.table.padEnd(20)} ` +
      `${icon} ${r.status.padEnd(20)} ` +
      `[${r.httpStatus}]`
    );
  });

  console.log('='.repeat(70));
  console.log(`Summary: ${createdCount} of ${TABLES.length} tables verified live in Supabase.`);
  if (createdCount === TABLES.length) {
    console.log('Status: ALL TABLES CREATED AND LIVE IN SUPABASE! ✓');
  } else {
    console.log(`Status: ${TABLES.length - createdCount} tables pending execution.`);
  }
  console.log('='.repeat(70));
}

runVerification();
