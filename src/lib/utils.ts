import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, formatDistanceToNow, parseISO } from 'date-fns';
import type { CartItem } from '../types';

// ---- Tailwind class merger ----
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

// ---- Price formatting ----
export function formatPrice(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatNumber(num: number): string {
  return new Intl.NumberFormat('en-IN').format(num);
}

// ---- Date formatting ----
export function formatDate(date: string | Date): string {
  try {
    const d = typeof date === 'string' ? parseISO(date) : date;
    return format(d, 'd MMM yyyy');
  } catch {
    return String(date);
  }
}

export function formatDateTime(date: string | Date): string {
  try {
    const d = typeof date === 'string' ? parseISO(date) : date;
    return format(d, 'd MMM yyyy, hh:mm a');
  } catch {
    return String(date);
  }
}

export function formatTimeAgo(date: string | Date): string {
  try {
    const d = typeof date === 'string' ? parseISO(date) : date;
    return formatDistanceToNow(d, { addSuffix: true });
  } catch {
    return String(date);
  }
}

export function formatDateShort(date: string | Date): string {
  try {
    const d = typeof date === 'string' ? parseISO(date) : date;
    return format(d, 'dd/MM/yy');
  } catch {
    return String(date);
  }
}

// ---- String utils ----
export function truncate(str: string, n: number): string {
  if (str.length <= n) return str;
  return str.slice(0, n - 1) + '…';
}

export function slugify(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

export function titleCase(str: string): string {
  return str.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.slice(1).toLowerCase());
}

// ---- Status color helpers ----
export function getStockStatusColor(status: string): string {
  switch (status) {
    case 'IN_STOCK': return 'badge-green';
    case 'LOW_STOCK': return 'badge-yellow';
    case 'OUT_OF_STOCK': return 'badge-red';
    case 'DISABLED': return 'badge-gray';
    default: return 'badge-gray';
  }
}

export function getOrderStatusColor(status: string): string {
  switch (status) {
    case 'NEW': return 'badge-blue';
    case 'CONFIRMED': return 'badge-primary';
    case 'PACKING': return 'badge-orange';
    case 'READY': return 'badge-yellow';
    case 'OUT_FOR_DELIVERY': return 'badge-orange';
    case 'DELIVERED': return 'badge-green';
    case 'CANCELLED': return 'badge-red';
    case 'RETURNED': return 'badge-gray';
    default: return 'badge-gray';
  }
}

export function getDeliveryStatusColor(status: string): string {
  switch (status) {
    case 'PENDING': return 'badge-yellow';
    case 'ASSIGNED': return 'badge-blue';
    case 'OUT_FOR_DELIVERY': return 'badge-orange';
    case 'DELIVERED': return 'badge-green';
    case 'FAILED': return 'badge-red';
    case 'CANCELLED': return 'badge-gray';
    default: return 'badge-gray';
  }
}

export function getMessageStatusColor(status: string): string {
  switch (status) {
    case 'PENDING': return 'badge-yellow';
    case 'PROCESSING': return 'badge-blue';
    case 'SENT': return 'badge-primary';
    case 'DELIVERED': return 'badge-green';
    case 'READ': return 'badge-green';
    case 'FAILED': return 'badge-red';
    case 'RETRY': return 'badge-orange';
    case 'CANCELLED': return 'badge-gray';
    default: return 'badge-gray';
  }
}

export function getPaymentStatusColor(status: string): string {
  switch (status) {
    case 'PAID': return 'badge-green';
    case 'PENDING': return 'badge-yellow';
    case 'PARTIAL': return 'badge-orange';
    case 'REFUNDED': return 'badge-blue';
    case 'FAILED': return 'badge-red';
    default: return 'badge-gray';
  }
}

export function getCMSStatusColor(status: string): string {
  switch (status) {
    case 'PUBLISHED': return 'badge-green';
    case 'DRAFT': return 'badge-gray';
    case 'PREVIEW': return 'badge-blue';
    case 'SCHEDULED': return 'badge-orange';
    case 'ARCHIVED': return 'badge-yellow';
    default: return 'badge-gray';
  }
}

// ---- WhatsApp message generator ----
export function generateWhatsAppMessage(
  items: CartItem[],
  whatsappNumber: string,
  discountAmount: number = 0,
  couponCode?: string
): string {
  if (items.length === 0) return '';

  const productLines = items
    .map((item, i) => {
      const price = item.product.offer_price ?? item.product.selling_price;
      return `${i + 1}. ${item.product.name}${item.product.pack_size ? ` (${item.product.pack_size})` : ''} × ${item.quantity} — ${formatPrice(price * item.quantity)}`;
    })
    .join('\n');

  const total = items.reduce((sum, item) => {
    const price = item.product.offer_price ?? item.product.selling_price;
    return sum + price * item.quantity;
  }, 0);

  const finalTotal = Math.max(0, total - discountAmount);
  
  const discountText = discountAmount > 0 
    ? `\nDiscount Applied (${couponCode || 'Promo'}): -${formatPrice(discountAmount)}`
    : '';

  const message = encodeURIComponent(
    `Hello MR. VIVASAYI 🌿,\n\nI would like to order:\n\n${productLines}\n\nSubtotal: ${formatPrice(total)}${discountText}\n*Estimated Final Total: ${formatPrice(finalTotal)}*\n\nPlease confirm availability, final amount, and delivery details.\n\nThank you.`
  );

  return `https://wa.me/${whatsappNumber}?text=${message}`;
}

export function generateSingleProductWhatsApp(
  product: { name: string; pack_size?: string; selling_price: number; offer_price?: number },
  quantity: number,
  whatsappNumber: string
): string {
  const price = product.offer_price ?? product.selling_price;
  const message = encodeURIComponent(
    `Hello MR. VIVASAYI 🌿,\n\nI would like to order:\n\n${product.name}${product.pack_size ? ` (${product.pack_size})` : ''} × ${quantity}\nPrice: ${formatPrice(price)} each\n\nPlease confirm availability and delivery details.\n\nThank you.`
  );
  return `https://wa.me/${whatsappNumber}?text=${message}`;
}

// ---- Order/Invoice number generators ----
export function generateOrderNumber(source: string, count: number): string {
  const prefix = source === 'POS' ? 'POS' : 'LIF';
  return `${prefix}-${String(count).padStart(6, '0')}`;
}

export function generateInvoiceNumber(count: number): string {
  return `INV-${String(count).padStart(6, '0')}`;
}

export function generatePONumber(count: number): string {
  return `PO-${String(count).padStart(4, '0')}`;
}

// ---- Debounce ----
export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  ms: number
): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}

// ---- Array utils ----
export function groupBy<T>(arr: T[], key: keyof T): Record<string, T[]> {
  return arr.reduce((groups, item) => {
    const val = String(item[key]);
    return { ...groups, [val]: [...(groups[val] || []), item] };
  }, {} as Record<string, T[]>);
}

export function sum(arr: number[]): number {
  return arr.reduce((a, b) => a + b, 0);
}

// ---- CSV Export ----
export function exportToCSV(data: Record<string, unknown>[], filename: string): void {
  if (!data.length) return;
  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(','),
    ...data.map((row) =>
      headers.map((h) => {
        const val = row[h];
        const str = val === null || val === undefined ? '' : String(val);
        return str.includes(',') || str.includes('"') || str.includes('\n')
          ? `"${str.replace(/"/g, '""')}"`
          : str;
      }).join(',')
    ),
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}-${format(new Date(), 'yyyy-MM-dd')}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

// ---- Percentage ----
export function calcPercentage(value: number, total: number): number {
  if (!total) return 0;
  return Math.round((value / total) * 100);
}

export function calcMargin(sellingPrice: number, landedCost: number): number {
  if (!sellingPrice) return 0;
  return Math.round(((sellingPrice - landedCost) / sellingPrice) * 100);
}

// ---- Print ----
export function printElement(elementId: string): void {
  const el = document.getElementById(elementId);
  if (!el) return;
  const original = document.body.innerHTML;
  document.body.innerHTML = el.innerHTML;
  window.print();
  document.body.innerHTML = original;
  window.location.reload();
}

// ---- Local storage helpers ----
export function getLocalStorage<T>(key: string, defaultValue: T): T {
  try {
    const item = localStorage.getItem(key);
    return item ? (JSON.parse(item) as T) : defaultValue;
  } catch {
    return defaultValue;
  }
}

export function setLocalStorage<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore storage errors
  }
}

// ---- Client-side Image Compression (Strictly <= 100 KB) ----
export async function compressImageToMax100KB(file: File): Promise<{ dataUrl: string; sizeKB: number }> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('Please select an image file (PNG, JPG, WEBP).'));
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image file.'));
    reader.onload = (e) => {
      const src = e.target?.result as string;
      const img = new Image();
      img.onerror = () => reject(new Error('Invalid or corrupted image format.'));
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;

        // Downscale large images proportionally to max 1000px dimension
        const MAX_DIM = 1000;
        if (width > MAX_DIM || height > MAX_DIM) {
          if (width > height) {
            height = Math.round((height * MAX_DIM) / width);
            width = MAX_DIM;
          } else {
            width = Math.round((width * MAX_DIM) / height);
            height = MAX_DIM;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas 2D context unavailable'));
          return;
        }

        // Draw background white for transparent PNGs converted to JPEG
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        const MAX_BYTES = 100 * 1024; // 100 KB limit
        let quality = 0.85;
        let dataUrl = canvas.toDataURL('image/jpeg', quality);

        // Calculate approximate binary size from base64
        const calcSize = (d: string) => {
          const base64Data = d.split(',')[1] || '';
          return Math.round(base64Data.length * 0.75);
        };

        // Iteratively lower quality until <= 100 KB
        while (calcSize(dataUrl) > MAX_BYTES && quality > 0.15) {
          quality -= 0.1;
          dataUrl = canvas.toDataURL('image/jpeg', quality);
        }

        // If still > 100 KB, reduce canvas dimensions further
        if (calcSize(dataUrl) > MAX_BYTES) {
          let scale = 0.8;
          while (calcSize(dataUrl) > MAX_BYTES && scale > 0.25) {
            const stepCanvas = document.createElement('canvas');
            stepCanvas.width = Math.max(200, Math.round(width * scale));
            stepCanvas.height = Math.max(200, Math.round(height * scale));
            const stepCtx = stepCanvas.getContext('2d');
            if (stepCtx) {
              stepCtx.fillStyle = '#FFFFFF';
              stepCtx.fillRect(0, 0, stepCanvas.width, stepCanvas.height);
              stepCtx.drawImage(img, 0, 0, stepCanvas.width, stepCanvas.height);
              dataUrl = stepCanvas.toDataURL('image/jpeg', 0.65);
            }
            scale -= 0.15;
          }
        }

        const finalBytes = calcSize(dataUrl);
        const sizeKB = Math.round((finalBytes / 1024) * 10) / 10;
        resolve({ dataUrl, sizeKB });
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
  });
}

