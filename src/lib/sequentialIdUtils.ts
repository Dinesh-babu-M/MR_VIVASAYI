// =========================================================================
// MR. VIVASAYI - Sequential Unique ID Generator Utility
// =========================================================================
// Guarantees clean, auto-incrementing, zero-padded 4-digit unique identifiers:
// - Sample Billing Orders: id-0001, id-0002, id-0003...
// - Original / Live Orders: order-0001, order-0002, order-0003...
// - Customers: cust-0001, cust-0002, cust-0003... (code: 0001, 0002...)
// - Coupons: coup-0001, coup-0002, coup-0003... (code: 0001, 0002...)
// =========================================================================

/**
 * Extracts numeric sequence from string ID based on regex or trailing digits
 */
function extractNumericSequence(idStr: string, pattern?: RegExp): number | null {
  if (!idStr || typeof idStr !== 'string') return null;
  if (pattern) {
    const match = idStr.match(pattern);
    if (match && match[1]) {
      const num = parseInt(match[1], 10);
      return !isNaN(num) && num < 10000000 ? num : null;
    }
  }
  // Fallback: look for any sequence of 1 to 6 digits
  const fallback = idStr.match(/(\d{1,6})/);
  if (fallback && fallback[1]) {
    const num = parseInt(fallback[1], 10);
    return !isNaN(num) && num < 10000000 ? num : null;
  }
  return null;
}

/**
 * Generates next sequential Sample Billing Order ID: id-0001, id-0002, id-0003...
 */
export function generateSampleOrderId(
  existingOrders: Array<{ id?: string; order_number?: string; sample_code?: string }>
): string {
  const numbers: number[] = [];

  for (const o of existingOrders || []) {
    const candidates = [o.sample_code, o.id, o.order_number].filter(Boolean) as string[];
    for (const c of candidates) {
      const n = extractNumericSequence(c, /id-(\d+)/i) || extractNumericSequence(c, /sample-(\d+)/i);
      if (n !== null) {
        numbers.push(n);
        break;
      }
    }
  }

  const maxNum = numbers.length > 0 ? Math.max(...numbers) : 0;
  const nextNum = maxNum + 1;
  return `id-${String(nextNum).padStart(4, '0')}`;
}

/**
 * Generates next sequential Original / Live Order ID: order-0001, order-0002, order-0003...
 */
export function generateOriginalOrderId(
  existingOrders: Array<{ id?: string; order_number?: string }>
): { id: string; order_number: string } {
  const numbers: number[] = [];

  for (const o of existingOrders || []) {
    const candidates = [o.order_number, o.id].filter(Boolean) as string[];
    for (const c of candidates) {
      const n = extractNumericSequence(c, /order-(\d+)/i) || 
                extractNumericSequence(c, /ord-(\d+)/i) ||
                extractNumericSequence(c, /LIF-(\d+)/i) ||
                extractNumericSequence(c, /POS-(\d+)/i);
      if (n !== null && n < 1000000) {
        numbers.push(n);
        break;
      }
    }
  }

  const maxNum = numbers.length > 0 ? Math.max(...numbers) : 0;
  const nextNum = maxNum + 1;
  const formattedSuffix = String(nextNum).padStart(4, '0');

  return {
    id: `order-${formattedSuffix}`,
    order_number: `order-${formattedSuffix}`
  };
}

/**
 * Generates next sequential Customer ID: cust-0001, cust-0002... and numeric code: 0001
 */
export function generateCustomerId(
  existingCustomers: Array<{ id?: string; customer_id?: string }>
): { id: string; customer_id: string; formatted_code: string } {
  const numbers: number[] = [];

  for (const c of existingCustomers || []) {
    const candidates = [c.customer_id, c.id].filter(Boolean) as string[];
    for (const cand of candidates) {
      const n = extractNumericSequence(cand, /cust-(\d+)/i) || 
                extractNumericSequence(cand, /cus-(\d+)/i) ||
                extractNumericSequence(cand, /^(\d+)$/);
      if (n !== null && n < 1000000) {
        numbers.push(n);
        break;
      }
    }
  }

  const maxNum = numbers.length > 0 ? Math.max(...numbers) : 0;
  const nextNum = maxNum + 1;
  const formattedSuffix = String(nextNum).padStart(4, '0');

  return {
    id: `cust-${formattedSuffix}`,
    customer_id: formattedSuffix,
    formatted_code: formattedSuffix
  };
}

/**
 * Generates next sequential Coupon ID: coup-0001, coup-0002... and code 0001
 */
export function generateCouponId(
  existingCoupons: Array<{ id?: string; code?: string }>
): { id: string; coupon_number: string } {
  const numbers: number[] = [];

  for (const c of existingCoupons || []) {
    const candidates = [c.id, c.code].filter(Boolean) as string[];
    for (const cand of candidates) {
      const n = extractNumericSequence(cand, /coup-(\d+)/i) || 
                extractNumericSequence(cand, /coupon-(\d+)/i) ||
                extractNumericSequence(cand, /(\d+)/);
      if (n !== null && n < 1000000) {
        numbers.push(n);
        break;
      }
    }
  }

  const maxNum = numbers.length > 0 ? Math.max(...numbers) : 0;
  const nextNum = maxNum + 1;
  const formattedSuffix = String(nextNum).padStart(4, '0');

  return {
    id: `coup-${formattedSuffix}`,
    coupon_number: formattedSuffix
  };
}

/**
 * Formats any entity ID string into clean 4-digit representation
 */
export function formatSequentialId(val: string | number | undefined, defaultPrefix = ''): string {
  if (!val) return `${defaultPrefix}0001`;
  const str = String(val);
  const match = str.match(/(\d+)/);
  if (match && match[1]) {
    const num = parseInt(match[1], 10);
    if (!isNaN(num)) {
      return `${defaultPrefix}${String(num).padStart(4, '0')}`;
    }
  }
  return str;
}
