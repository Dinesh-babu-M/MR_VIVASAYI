// ============================================================
// MR. VIVASAYI Mart - eCommerce Standard Print Templates
// Designed to match Amazon & Flipkart Shipping Labels and Tax Invoices
// ============================================================

import type { Order } from '../types';
import { formatPrice } from './utils';

export const STORE_NAME = 'MR. VIVASAYI Mart';
export const STORE_ADDRESS_LINE = '#Cumbum Valley';
export const STORE_CITY = 'Theni';
export const STORE_STATE = 'Tamil Nadu';
export const STORE_PINCODE = '625516';
export const STORE_FULL_ADDRESS = '#Cumbum Valley, Theni, Tamil Nadu - 625516';
export const STORE_PHONE = '+91 9789325262';
export const STORE_GSTIN = '33AABCM1234F1Z8';
export const STORE_FSSAI = '12423008000451';
export const STORE_EMAIL = 'orders@mrvivasayi.in';

// Number to Words for Indian Currency (e.g. ₹1,250 -> One Thousand Two Hundred Fifty Rupees Only)
export function numberToIndianWords(num: number): string {
  const a = [
    '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
    'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'
  ];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  const n = Math.floor(Math.abs(num));
  if (n === 0) return 'Zero Rupees Only';

  const inWords = (n: number): string => {
    let str = '';
    if (n > 9999999) {
      str += inWords(Math.floor(n / 10000000)) + ' Crore ';
      n %= 10000000;
    }
    if (n > 99999) {
      str += inWords(Math.floor(n / 100000)) + ' Lakh ';
      n %= 100000;
    }
    if (n > 999) {
      str += inWords(Math.floor(n / 1000)) + ' Thousand ';
      n %= 1000;
    }
    if (n > 99) {
      str += inWords(Math.floor(n / 100)) + ' Hundred ';
      n %= 100;
    }
    if (n > 0) {
      if (str !== '') str += 'and ';
      if (n < 20) str += a[n] + ' ';
      else {
        str += b[Math.floor(n / 10)] + (n % 10 ? ' ' + a[n % 10] : '') + ' ';
      }
    }
    return str.trim();
  };

  return `${inWords(n)} Rupees Only`;
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. AMAZON & FLIPKART STYLE COURIER SHIPPING PARCEL LABEL (4x6" STICKER FORMAT)
// ─────────────────────────────────────────────────────────────────────────────

export function generateAmazonFlipkartCourierLabelHtml(order: Order, courierPartnerName?: string): string {
  const partner = (courierPartnerName || order.courier_partner || 'ST Courier').toUpperCase();
  const awbNumber = order.tracking_number || `AWB-${order.order_number.replace(/\D/g, '').slice(-8) || '62551601'}`;
  const totalWeight = order.weight_grams
    ? order.weight_grams >= 1000
      ? `${(order.weight_grams / 1000).toFixed(2)} KG`
      : `${order.weight_grams} G`
    : '1.0 KG';

  const isCOD = order.payment_status !== 'PAID' && (order.payment_method === 'CASH' || !order.payment_method);
  const pincodeMatch = (order.delivery_address || '').match(/\b\d{6}\b/);
  const destinationPin = pincodeMatch ? pincodeMatch[0] : '625516';
  const formattedPinSpaced = destinationPin.split('').join(' ');

  const dateStr = new Date(order.created_at || Date.now()).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });

  const itemCount = (order.items || []).reduce((acc, i) => acc + (i.quantity || 1), 0);
  const itemsSnippet = (order.items || [])
    .slice(0, 3)
    .map(i => `${i.product_name_snapshot} (${i.quantity}x)`)
    .join(', ') + ((order.items || []).length > 3 ? '...' : '');

  return `
    <div class="amazon-label-box" style="width: 100%; max-width: 520px; margin: 0 auto; border: 3px solid #000; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background: #fff; color: #000; box-sizing: border-box; page-break-inside: avoid;">
      
      <!-- TOP HEADER: STORE NAME + LOGISTICS PARTNER -->
      <div style="border-bottom: 2px solid #000; padding: 8px 12px; display: flex; justify-content: space-between; align-items: center; background: #fdfdfd;">
        <div>
          <div style="font-size: 19px; font-weight: 900; letter-spacing: -0.5px; text-transform: uppercase; color: #000; line-height: 1.1;">
            🌿 ${STORE_NAME}
          </div>
          <div style="font-size: 9px; font-weight: 700; color: #444; letter-spacing: 0.8px; text-transform: uppercase; margin-top: 2px;">
            eCommerce Parcel Shipping Standard
          </div>
        </div>
        <div style="text-align: right;">
          <div style="border: 2px solid #000; padding: 4px 10px; font-size: 13px; font-weight: 900; background: #000; color: #fff; text-transform: uppercase; letter-spacing: 0.5px; border-radius: 4px;">
            ${partner}
          </div>
          <div style="font-size: 8px; font-weight: 800; color: #333; margin-top: 2px; text-transform: uppercase;">
            SURFACE EXPEDITED
          </div>
        </div>
      </div>

      <!-- BARCODE / ROUTING ROW -->
      <div style="border-bottom: 2px solid #000; padding: 8px 12px; text-align: center; background: #fff;">
        <div style="font-size: 8px; font-weight: 800; text-transform: uppercase; color: #555; letter-spacing: 1px;">
          COURIER TRACKING DOCKET / AWB
        </div>
        <!-- High-Contrast SVG Barcode Simulation -->
        <div style="margin: 4px auto 2px; height: 38px; display: flex; justify-content: center; align-items: flex-end; gap: 2px;">
          ${Array.from({ length: 44 })
            .map((_, i) => {
              const h = (i % 3 === 0 ? 36 : i % 2 === 0 ? 30 : 25);
              const w = (i % 5 === 0 ? 3 : i % 2 === 0 ? 2 : 1.5);
              return `<div style="width: ${w}px; height: ${h}px; background: #000;"></div>`;
            })
            .join('')}
        </div>
        <div style="font-family: 'Courier New', Courier, monospace; font-size: 14px; font-weight: 900; letter-spacing: 3px; color: #000;">
          *${awbNumber}*
        </div>
      </div>

      <!-- ROUTING & WEIGHT STRIP (AMAZON / FLIPKART STYLE) -->
      <div style="border-bottom: 2px solid #000; display: grid; grid-template-columns: 1fr 1fr 1fr; background: #f4f4f4; text-align: center; font-size: 10px;">
        <div style="padding: 6px; border-right: 1.5px solid #000;">
          <div style="font-size: 8px; font-weight: 700; color: #555; text-transform: uppercase;">ORDER ID</div>
          <div style="font-size: 11px; font-weight: 900; font-family: monospace;">#${order.order_number}</div>
        </div>
        <div style="padding: 6px; border-right: 1.5px solid #000;">
          <div style="font-size: 8px; font-weight: 700; color: #555; text-transform: uppercase;">TOTAL WEIGHT</div>
          <div style="font-size: 11px; font-weight: 900; font-family: monospace;">${totalWeight}</div>
        </div>
        <div style="padding: 6px;">
          <div style="font-size: 8px; font-weight: 700; color: #555; text-transform: uppercase;">SHIP DATE</div>
          <div style="font-size: 11px; font-weight: 900; font-family: monospace;">${dateStr}</div>
        </div>
      </div>

      <!-- PAYMENT STATUS BANNER (AMAZON / FLIPKART STANDARD) -->
      <div style="border-bottom: 2px solid #000; padding: 8px 12px; ${isCOD ? 'background: #000; color: #fff;' : 'background: #e6f4ea; color: #0f5132;'} display: flex; justify-content: space-between; align-items: center;">
        <div>
          <div style="font-size: 15px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.5px; ${isCOD ? 'color: #fff;' : 'color: #0f5132;'}">
            ${isCOD ? `⚠️ COD: COLLECT CASH ₹${order.total}` : `✓ PREPAID — DO NOT COLLECT CASH`}
          </div>
          <div style="font-size: 9px; font-weight: 700; opacity: 0.85;">
            ${isCOD ? `Hand over package ONLY after receiving ₹${order.total} cash` : `Zero collection required by courier delivery agent`}
          </div>
        </div>
        <div style="font-size: 18px; font-weight: 900; font-family: monospace;">
          ₹${order.total}
        </div>
      </div>

      <!-- SHIP TO (DELIVERY DESTINATION) - LARGE BOLD AMAZON/FLIPKART FORMAT -->
      <div style="border-bottom: 2px solid #000; padding: 12px; background: #fff;">
        <div style="font-size: 9px; font-weight: 900; letter-spacing: 1.5px; text-transform: uppercase; color: #444; margin-bottom: 4px;">
          SHIP TO / DELIVER TO:
        </div>
        <div style="font-size: 19px; font-weight: 900; color: #000; text-transform: uppercase; margin-bottom: 6px; letter-spacing: 0.2px;">
          ${order.customer_name_snapshot || 'VALUED CUSTOMER'}
        </div>
        
        <div style="font-size: 13px; font-weight: 600; color: #111; line-height: 1.45; margin-bottom: 10px;">
          ${order.delivery_address || 'Customer Delivery Address'}
        </div>

        <div style="display: flex; justify-content: space-between; align-items: flex-end; border-top: 1.5px dashed #000; padding-top: 10px; margin-top: 6px;">
          <div>
            <div style="font-size: 9px; font-weight: 800; text-transform: uppercase; color: #444;">CONTACT NUMBER:</div>
            <div style="font-size: 16px; font-weight: 900; font-family: monospace; color: #000;">
              📞 ${order.customer_phone_snapshot || 'N/A'}
            </div>
          </div>
          
          <!-- HUGE PROMINENT DESTINATION PINCODE BOX -->
          <div style="text-align: right;">
            <div style="font-size: 9px; font-weight: 900; text-transform: uppercase; letter-spacing: 1px; color: #000; margin-bottom: 2px;">
              DESTINATION PINCODE:
            </div>
            <div style="border: 3px solid #000; background: #fff; padding: 4px 12px; font-size: 24px; font-weight: 900; font-family: 'Courier New', Courier, monospace; letter-spacing: 3px; color: #000; display: inline-block;">
              [ ${formattedPinSpaced} ]
            </div>
          </div>
        </div>
      </div>

      <!-- RETURN ADDRESS / SOLD BY (SHIPPED FROM) -->
      <div style="border-bottom: 2px solid #000; padding: 10px 12px; background: #fafafa; display: flex; justify-content: space-between; gap: 12px; font-size: 10px;">
        <div style="flex: 1;">
          <div style="font-size: 8px; font-weight: 900; text-transform: uppercase; letter-spacing: 1px; color: #555; margin-bottom: 3px;">
            RETURN TO / SHIPPED BY (IF UNDELIVERED):
          </div>
          <div style="font-size: 12px; font-weight: 900; color: #000; text-transform: uppercase;">
            ${STORE_NAME}
          </div>
          <div style="color: #222; font-weight: 600; line-height: 1.35; margin-top: 2px;">
            ${STORE_FULL_ADDRESS}
          </div>
          <div style="color: #000; font-weight: 800; margin-top: 3px;">
            Phone: ${STORE_PHONE} | Help: ${STORE_EMAIL}
          </div>
        </div>
        <div style="border-left: 1.5px solid #000; padding-left: 10px; width: 130px; text-align: right; font-size: 9px; color: #333;">
          <div><strong>GSTIN:</strong> ${STORE_GSTIN}</div>
          <div style="margin-top: 2px;"><strong>FSSAI:</strong> ${STORE_FSSAI}</div>
          <div style="margin-top: 4px; font-weight: bold; font-size: 10px; color: #000;">Items: ${itemCount} Unit(s)</div>
        </div>
      </div>

      <!-- PACKAGE MANIFEST & FOOTER -->
      <div style="padding: 6px 12px; display: flex; justify-content: space-between; align-items: center; font-size: 9px; background: #fff;">
        <div style="color: #555; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 340px;">
          <strong>SKU Manifest:</strong> ${itemsSnippet}
        </div>
        <div style="font-weight: 900; color: #000; text-transform: uppercase;">
          FARM-DIRECT FRESH
        </div>
      </div>
    </div>
  `;
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. AMAZON & FLIPKART STYLE TAX INVOICE (E-COMMERCE A4 RETAIL TAX INVOICE)
// ─────────────────────────────────────────────────────────────────────────────

export function generateAmazonFlipkartInvoiceHtml(order: Order): string {
  const invoiceNumber = `INV-${order.order_number}`;
  const orderDate = new Date(order.created_at || Date.now()).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
  const orderTime = new Date(order.created_at || Date.now()).toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit'
  });

  const subtotal = Number(order.subtotal || 0);
  const deliveryFee = Number(order.delivery_fee || 0);
  const discount = Number(order.discount || 0);
  const total = Number(order.total || (subtotal + deliveryFee - discount));
  const amountInWords = numberToIndianWords(total);

  const pincodeMatch = (order.delivery_address || '').match(/\b\d{6}\b/);
  const destinationPin = pincodeMatch ? pincodeMatch[0] : STORE_PINCODE;

  const itemsRows = (order.items || []).map((it, idx) => {
    const qty = it.quantity || 1;
    const unitPrice = it.unit_price_snapshot || (it.total ? it.total / qty : 0);
    const lineTotal = it.total || (unitPrice * qty);
    const hsn = (it as any).hsn_code || '0910';

    return `
      <tr style="border-bottom: 1px solid #e5e7eb;">
        <td style="padding: 8px 10px; text-align: center; font-size: 11px; font-weight: bold; color: #374151;">${idx + 1}</td>
        <td style="padding: 8px 10px;">
          <div style="font-weight: 800; font-size: 12px; color: #111827;">${it.product_name_snapshot}</div>
          ${it.tamil_name_snapshot ? `<div style="font-size: 10px; color: #059669; font-weight: 600;">${it.tamil_name_snapshot}</div>` : ''}
          ${it.pack_size_snapshot ? `<div style="font-size: 10px; color: #6b7280;">Pack Size: ${it.pack_size_snapshot}</div>` : ''}
        </td>
        <td style="padding: 8px 10px; text-align: center; font-size: 11px; font-mono: monospace; color: #4b5563;">${hsn}</td>
        <td style="padding: 8px 10px; text-align: center; font-size: 12px; font-weight: 800; color: #111827;">${qty}</td>
        <td style="padding: 8px 10px; text-align: right; font-size: 12px; color: #374151;">₹${unitPrice.toFixed(2)}</td>
        <td style="padding: 8px 10px; text-align: right; font-size: 11px; color: #059669; font-weight: 600;">₹${(it.discount || 0).toFixed(2)}</td>
        <td style="padding: 8px 10px; text-align: right; font-size: 12px; font-weight: 900; color: #111827;">₹${lineTotal.toFixed(2)}</td>
      </tr>
    `;
  }).join('');

  return `
    <div class="amazon-invoice-container" style="max-width: 800px; margin: 0 auto; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background: #fff; color: #111; padding: 24px; box-sizing: border-box;">
      
      <!-- INVOICE HEADER BAR -->
      <div style="border-bottom: 3px solid #064e3b; padding-bottom: 16px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: flex-start;">
        <div>
          <div style="font-size: 26px; font-weight: 900; color: #064e3b; letter-spacing: -0.5px; text-transform: uppercase;">
            🌿 ${STORE_NAME}
          </div>
          <div style="font-size: 12px; font-weight: 700; color: #047857; margin-top: 2px;">
            Pure, Traditional & Farm-Direct Agro Foods Mart
          </div>
          <div style="font-size: 11px; color: #374151; margin-top: 4px; line-height: 1.4;">
            ${STORE_FULL_ADDRESS}
          </div>
          <div style="font-size: 11px; font-weight: 700; color: #111827; margin-top: 2px;">
            Phone: ${STORE_PHONE} | Email: ${STORE_EMAIL}
          </div>
          <div style="font-size: 10px; color: #4b5563; margin-top: 3px;">
            <strong>GSTIN:</strong> ${STORE_GSTIN} &nbsp;|&nbsp; <strong>FSSAI Lic:</strong> ${STORE_FSSAI}
          </div>
        </div>

        <div style="text-align: right; min-width: 240px;">
          <div style="background: #064e3b; color: #fde68a; font-size: 14px; font-weight: 900; padding: 6px 14px; border-radius: 6px; display: inline-block; text-transform: uppercase; letter-spacing: 1px;">
            TAX INVOICE / BILL
          </div>
          <div style="margin-top: 8px; font-size: 11px; line-height: 1.5; color: #111;">
            <div><strong>Invoice No:</strong> <span style="font-family: monospace; font-weight: 800;">${invoiceNumber}</span></div>
            <div><strong>Invoice Date:</strong> ${orderDate}</div>
            <div><strong>Order ID:</strong> <span style="font-family: monospace; font-weight: 800;">#${order.order_number}</span></div>
            <div><strong>Order Time:</strong> ${orderTime}</div>
            <div><strong>Order Channel:</strong> <span style="font-weight: 800; text-transform: uppercase;">${order.source || 'ONLINE STORE'}</span></div>
          </div>
        </div>
      </div>

      <!-- ADDRESS DETAILS TWO-COLUMN (SOLD BY vs BILLING/SHIPPING) -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px;">
        
        <!-- SOLD BY / DISPATCH FROM -->
        <div style="border: 1px solid #d1d5db; border-radius: 8px; padding: 12px 14px; background: #f9fafb;">
          <div style="font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: 1px; color: #064e3b; margin-bottom: 6px; border-bottom: 1px solid #e5e7eb; padding-bottom: 4px;">
            SOLD BY / SHIPPER:
          </div>
          <div style="font-size: 13px; font-weight: 800; color: #111827;">${STORE_NAME}</div>
          <div style="font-size: 11px; color: #374151; line-height: 1.45; margin-top: 2px;">
            ${STORE_FULL_ADDRESS}
          </div>
          <div style="font-size: 11px; color: #374151; margin-top: 4px;">
            <strong>State:</strong> Tamil Nadu &nbsp;|&nbsp; <strong>State Code:</strong> 33
          </div>
          <div style="font-size: 11px; color: #374151; margin-top: 2px;">
            <strong>Contact Support:</strong> ${STORE_PHONE}
          </div>
        </div>

        <!-- BILLING & DELIVERY ADDRESS (BUYER) -->
        <div style="border: 1px solid #d1d5db; border-radius: 8px; padding: 12px 14px; background: #f9fafb;">
          <div style="font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: 1px; color: #064e3b; margin-bottom: 6px; border-bottom: 1px solid #e5e7eb; padding-bottom: 4px;">
            BILLING & SHIPPING ADDRESS (BUYER):
          </div>
          <div style="font-size: 14px; font-weight: 900; color: #111827; text-transform: uppercase;">
            ${order.customer_name_snapshot || 'Valued Customer'}
          </div>
          <div style="font-size: 11px; color: #374151; line-height: 1.45; margin-top: 2px;">
            ${order.delivery_address || 'Over the counter / Store Pickup'}
          </div>
          <div style="font-size: 11px; font-weight: bold; color: #064e3b; margin-top: 4px;">
            📞 Phone: ${order.customer_phone_snapshot || 'N/A'}
          </div>
          <div style="font-size: 11px; color: #374151; margin-top: 2px;">
            <strong>Place of Supply:</strong> ${order.delivery_area || 'Tamil Nadu'} (PIN: ${destinationPin})
          </div>
        </div>
      </div>

      <!-- COURIER & LOGISTICS DISPATCH INFO BAR -->
      <div style="background: #ecfdf5; border: 1.5px solid #a7f3d0; border-radius: 8px; padding: 8px 14px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; font-size: 11px;">
        <div>
          <span style="font-weight: 800; color: #064e3b;">Courier Logistics Partner:</span>
          <span style="font-weight: 900; color: #047857; text-transform: uppercase; margin-left: 4px;">${order.courier_partner || 'Direct Express Parcel'}</span>
        </div>
        <div>
          <span style="font-weight: 800; color: #064e3b;">AWB / Tracking Number:</span>
          <span style="font-family: monospace; font-weight: 900; color: #111; margin-left: 4px;">${order.tracking_number || 'PENDING DISPATCH'}</span>
        </div>
        <div>
          <span style="font-weight: 800; color: #064e3b;">Payment Status:</span>
          <span style="font-weight: 900; text-transform: uppercase; color: ${order.payment_status === 'PAID' ? '#047857' : '#b45309'}; margin-left: 4px;">
            ${order.payment_method} (${order.payment_status})
          </span>
        </div>
      </div>

      <!-- LINE ITEMS TABLE -->
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
        <thead>
          <tr style="background: #064e3b; color: #fff;">
            <th style="padding: 10px; font-size: 11px; font-weight: 900; text-align: center; width: 36px; text-transform: uppercase;">#</th>
            <th style="padding: 10px; font-size: 11px; font-weight: 900; text-align: left; text-transform: uppercase;">Item Description</th>
            <th style="padding: 10px; font-size: 11px; font-weight: 900; text-align: center; width: 60px; text-transform: uppercase;">HSN</th>
            <th style="padding: 10px; font-size: 11px; font-weight: 900; text-align: center; width: 50px; text-transform: uppercase;">Qty</th>
            <th style="padding: 10px; font-size: 11px; font-weight: 900; text-align: right; width: 85px; text-transform: uppercase;">Rate (₹)</th>
            <th style="padding: 10px; font-size: 11px; font-weight: 900; text-align: right; width: 80px; text-transform: uppercase;">Discount</th>
            <th style="padding: 10px; font-size: 11px; font-weight: 900; text-align: right; width: 95px; text-transform: uppercase;">Amount (₹)</th>
          </tr>
        </thead>
        <tbody>
          ${itemsRows}
        </tbody>
      </table>

      <!-- INVOICE TOTALS & SUMMARY SECTION -->
      <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 24px; margin-bottom: 24px;">
        
        <!-- AMOUNT IN WORDS & BANKING/TERMS -->
        <div style="flex: 1; border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px 14px; background: #fafafa; font-size: 11px;">
          <div style="font-weight: 800; color: #374151; text-transform: uppercase; font-size: 10px; letter-spacing: 0.5px;">
            Invoice Amount in Words:
          </div>
          <div style="font-size: 12px; font-weight: 900; color: #064e3b; margin: 4px 0 10px;">
            ${amountInWords}
          </div>
          
          <div style="border-top: 1px dashed #d1d5db; padding-top: 8px; font-size: 10px; color: #4b5563; line-height: 1.45;">
            <div>• All prices are inclusive of applicable GST / Farm taxes.</div>
            <div>• 100% Guaranteed Pure & Natural harvest directly sourced from farmers.</div>
            <div>• Goods once sold are backed by MR. VIVASAYI freshness guarantee.</div>
          </div>
        </div>

        <!-- TOTALS BREAKDOWN BOX -->
        <div style="width: 310px; border: 1.5px solid #064e3b; border-radius: 8px; overflow: hidden; background: #fff;">
          <div style="padding: 10px 14px; border-bottom: 1px solid #f3f4f6; display: flex; justify-content: space-between; font-size: 12px;">
            <span style="color: #4b5563;">Items Subtotal:</span>
            <span style="font-weight: 700; color: #111;">₹${subtotal.toFixed(2)}</span>
          </div>

          <div style="padding: 10px 14px; border-bottom: 1px solid #f3f4f6; display: flex; justify-content: space-between; font-size: 12px;">
            <span style="color: #4b5563;">Courier Delivery Charges:</span>
            <span style="font-weight: 700; color: ${deliveryFee > 0 ? '#111' : '#059669'};">
              ${deliveryFee > 0 ? `+₹${deliveryFee.toFixed(2)}` : 'FREE'}
            </span>
          </div>

          ${discount > 0 ? `
          <div style="padding: 10px 14px; border-bottom: 1px solid #f3f4f6; display: flex; justify-content: space-between; font-size: 12px;">
            <span style="color: #059669; font-weight: 700;">Promotional Discount:</span>
            <span style="font-weight: 800; color: #059669;">-₹${discount.toFixed(2)}</span>
          </div>
          ` : ''}

          <div style="padding: 12px 14px; background: #064e3b; color: #fff; display: flex; justify-content: space-between; align-items: center;">
            <span style="font-size: 13px; font-weight: 900; text-transform: uppercase;">Grand Total:</span>
            <span style="font-size: 19px; font-weight: 900; color: #fde68a; font-family: monospace;">₹${total.toFixed(2)}</span>
          </div>
        </div>
      </div>

      <!-- INVOICE FOOTER WITH SIGNATORY BOX -->
      <div style="border-top: 1.5px solid #064e3b; padding-top: 16px; display: flex; justify-content: space-between; align-items: flex-end; font-size: 10px; color: #4b5563;">
        <div>
          <div style="font-weight: 800; color: #111827;">Thank you for ordering with ${STORE_NAME}!</div>
          <div style="margin-top: 2px;">For queries, feedback, or reorders: Call/WhatsApp <strong>${STORE_PHONE}</strong></div>
          <div style="margin-top: 2px; color: #6b7280;">This is a computer-generated tax invoice. No signature required.</div>
        </div>

        <div style="text-align: center; border-top: 1px solid #000; padding-top: 4px; min-width: 170px;">
          <div style="font-weight: 800; color: #111827; text-transform: uppercase;">For ${STORE_NAME}</div>
          <div style="font-size: 9px; color: #6b7280; margin-top: 1px;">Authorized Signatory</div>
        </div>
      </div>
    </div>
  `;
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. WINDOW PRINT WRAPPERS
// ─────────────────────────────────────────────────────────────────────────────

export function printAmazonFlipkartCourierLabels(orders: Order | Order[], courierPartnerName?: string): void {
  const list = Array.isArray(orders) ? orders : [orders];
  if (list.length === 0) return;

  const printWindow = window.open('', '_blank', 'width=750,height=850');
  if (!printWindow) return;

  const contentHtml = list.map((ord, idx) => `
    <div style="${idx < list.length - 1 ? 'page-break-after: always; margin-bottom: 24px;' : ''}">
      ${generateAmazonFlipkartCourierLabelHtml(ord, courierPartnerName)}
    </div>
  `).join('');

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>${STORE_NAME} - Courier Shipping Parcel Labels (${list.length})</title>
        <meta charset="utf-8" />
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 16px; background: #fff; }
          @media print {
            body { padding: 0; margin: 0; }
            @page { margin: 6mm; size: auto; }
            .amazon-label-box { max-width: 100% !important; border-width: 2.5px !important; }
          }
        </style>
      </head>
      <body>
        ${contentHtml}
      </body>
    </html>
  `);

  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => {
    printWindow.print();
  }, 350);
}

export function printAmazonFlipkartInvoices(orders: Order | Order[]): void {
  const list = Array.isArray(orders) ? orders : [orders];
  if (list.length === 0) return;

  const printWindow = window.open('', '_blank', 'width=850,height=950');
  if (!printWindow) return;

  const contentHtml = list.map((ord, idx) => `
    <div style="${idx < list.length - 1 ? 'page-break-after: always; margin-bottom: 30px;' : ''}">
      ${generateAmazonFlipkartInvoiceHtml(ord)}
    </div>
  `).join('');

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>${STORE_NAME} - Tax Invoice (${list.length} Orders)</title>
        <meta charset="utf-8" />
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 20px; background: #fff; }
          @media print {
            body { padding: 0; margin: 0; }
            @page { margin: 10mm; size: A4 portrait; }
            .amazon-invoice-container { max-width: 100% !important; padding: 0 !important; }
          }
        </style>
      </head>
      <body>
        ${contentHtml}
      </body>
    </html>
  `);

  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => {
    printWindow.print();
  }, 350);
}
