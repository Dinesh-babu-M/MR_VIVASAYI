// ============================================================
// MR. VIVASAYI Mart - QR Code Generator & Image Helper
// ============================================================

export type QRCodeType = 'UPI_PAYMENT' | 'STORE_CATALOG' | 'LOCATION_MAP' | 'WHATSAPP_ORDER' | 'CUSTOM';

// Generate a high-resolution, branded SVG QR Code as a Data URL
export function generateSvgQrDataUrl(
  type: QRCodeType,
  title: string = 'Scan to Pay',
  subtitle: string = 'MR. VIVASAYI Mart'
): string {
  // Deterministic pattern matrix for QR visual representation
  const matrix = [
    [1,1,1,1,1,1,1,0,1,0,1,0,1,1,1,1,1,1,1],
    [1,0,0,0,0,0,1,0,0,1,0,1,1,0,0,0,0,0,1],
    [1,0,1,1,1,0,1,0,1,1,1,0,1,0,1,1,1,0,1],
    [1,0,1,1,1,0,1,0,0,1,0,0,1,0,1,1,1,0,1],
    [1,0,1,1,1,0,1,0,1,0,1,1,1,0,1,1,1,0,1],
    [1,0,0,0,0,0,1,0,1,1,0,1,1,0,0,0,0,0,1],
    [1,1,1,1,1,1,1,0,1,0,1,0,1,1,1,1,1,1,1],
    [0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0],
    [1,1,1,0,1,1,0,1,0,0,1,0,1,1,0,1,1,1,0],
    [0,1,0,1,0,1,1,0,1,1,0,1,0,1,0,0,1,0,1],
    [1,0,1,0,1,0,0,1,1,0,1,1,1,0,1,1,0,1,0],
    [0,0,0,0,0,0,0,0,1,0,0,1,0,1,1,0,1,1,1],
    [1,1,1,1,1,1,1,0,0,1,1,0,1,0,1,0,0,1,0],
    [1,0,0,0,0,0,1,0,1,0,1,0,0,1,1,1,0,1,1],
    [1,0,1,1,1,0,1,0,1,1,0,1,1,0,1,0,1,0,0],
    [1,0,1,1,1,0,1,0,0,1,1,1,0,1,0,1,1,1,0],
    [1,0,1,1,1,0,1,0,1,0,0,1,1,1,0,0,0,1,1],
    [1,0,0,0,0,0,1,0,1,1,0,0,1,0,1,1,0,1,0],
    [1,1,1,1,1,1,1,0,0,1,1,0,0,1,0,1,1,0,1]
  ];

  const rects = matrix.flatMap((row, r) =>
    row.map((val, c) =>
      val ? `<rect x="${c * 12 + 36}" y="${r * 12 + 36}" width="11" height="11" rx="2" fill="#064e3b" />` : ''
    )
  ).join('');

  const brandAccent = type === 'UPI_PAYMENT' ? '#f59e0b' : type === 'LOCATION_MAP' ? '#3b82f6' : '#10b981';
  const badgeText = 
    type === 'UPI_PAYMENT' ? 'UPI PAY' :
    type === 'STORE_CATALOG' ? 'CATALOG' :
    type === 'LOCATION_MAP' ? 'THENI MAP' : 'WHATSAPP';

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 360" width="300" height="360">
    <defs>
      <linearGradient id="qrGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#ffffff"/>
        <stop offset="100%" stop-color="#f0fdf4"/>
      </linearGradient>
      <filter id="cardShadow" x="-10%" y="-10%" width="120%" height="120%">
        <feDropShadow dx="0" dy="6" stdDeviation="6" flood-color="#064e3b" flood-opacity="0.15"/>
      </filter>
    </defs>
    <!-- Background Card -->
    <rect x="8" y="8" width="284" height="344" rx="24" fill="url(#qrGrad)" stroke="#bbf7d0" stroke-width="2" filter="url(#cardShadow)"/>
    
    <!-- Top Brand Header -->
    <rect x="8" y="8" width="284" height="28" rx="14" fill="#064e3b"/>
    <text x="150" y="27" font-family="Arial, sans-serif" font-size="11" font-weight="900" fill="#fde68a" text-anchor="middle" letter-spacing="1">MR. VIVASAYI Mart</text>
    
    <!-- QR Code Pattern -->
    <g>
      ${rects}
      <!-- Center Brand Shield -->
      <rect x="122" y="122" width="56" height="56" rx="14" fill="#ffffff" stroke="#064e3b" stroke-width="3"/>
      <rect x="128" y="128" width="44" height="44" rx="10" fill="${brandAccent}"/>
      <text x="150" y="155" font-family="Arial, sans-serif" font-size="18" font-weight="bold" fill="#ffffff" text-anchor="middle">🌾</text>
    </g>

    <!-- Bottom Footer Tag -->
    <rect x="24" y="276" width="252" height="60" rx="14" fill="#064e3b"/>
    <text x="150" y="298" font-family="Arial, sans-serif" font-size="12" font-weight="800" fill="#ffffff" text-anchor="middle">${title}</text>
    <text x="150" y="318" font-family="Arial, sans-serif" font-size="10" font-weight="600" fill="#fde68a" text-anchor="middle">${subtitle} • ${badgeText}</text>
    <text x="150" y="331" font-family="Arial, sans-serif" font-size="8" font-weight="bold" fill="#a7f3d0" text-anchor="middle">Cumbum Valley, Theni - 625516</text>
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

// Default presets for the 4 standard QR types
export const DEFAULT_QR_CODES: Record<QRCodeType, { url: string; title: string; subtitle: string }> = {
  UPI_PAYMENT: {
    url: generateSvgQrDataUrl('UPI_PAYMENT', 'Scan with GPay / PhonePe / Paytm', 'mrvivasayi@upi'),
    title: 'Instant UPI Payment QR',
    subtitle: 'mrvivasayi@upi (MR. VIVASAYI Mart)'
  },
  STORE_CATALOG: {
    url: generateSvgQrDataUrl('STORE_CATALOG', 'Scan to Browse Catalog', 'mrvivasayi.in/products'),
    title: 'Digital Farm Produce Catalog QR',
    subtitle: '100% Traditional Tamil Nadu Harvests'
  },
  LOCATION_MAP: {
    url: generateSvgQrDataUrl('LOCATION_MAP', 'Store Location & Directions', '#Cumbum Valley, Theni'),
    title: 'Store Location Google Maps QR',
    subtitle: '#Cumbum Valley, Theni - 625516'
  },
  WHATSAPP_ORDER: {
    url: generateSvgQrDataUrl('WHATSAPP_ORDER', 'Scan to Order on WhatsApp', '+91 97893 25262'),
    title: 'Direct WhatsApp Ordering QR',
    subtitle: 'Chat & Order: +91 9789325262'
  },
  CUSTOM: {
    url: generateSvgQrDataUrl('UPI_PAYMENT', 'Custom Business QR Code', 'MR. VIVASAYI Mart'),
    title: 'Custom Uploaded QR Code',
    subtitle: 'MR. VIVASAYI Mart'
  }
};
