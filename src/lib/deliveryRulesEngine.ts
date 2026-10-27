import { getJSONStore } from './dbManager';

export interface CourierPartnerInfo {
  id: string;
  name: string;
  badge: string;
  phone?: string;
  trackingBaseUrl: string;
  generateTrackingUrl: (trackingNumber: string) => string;
}

export const COURIER_PARTNERS: CourierPartnerInfo[] = [
  {
    id: 'st_courier',
    name: 'ST Courier',
    badge: 'Popular TN / South',
    phone: '+91 44 4000 4000',
    trackingBaseUrl: 'https://stcourier.com',
    generateTrackingUrl: (trk) => `https://stcourier.com/track/search?tracking_number=${encodeURIComponent(trk.trim())}`
  },
  {
    id: 'professional_courier',
    name: 'The Professional Couriers (TPC)',
    badge: 'Pan-India Network',
    phone: '+91 22 2781 3333',
    trackingBaseUrl: 'https://www.tpcindia.com',
    generateTrackingUrl: (trk) => `https://www.tpcindia.com/Default.aspx?con_no=${encodeURIComponent(trk.trim())}`
  },
  {
    id: 'india_post',
    name: 'India Post (Speed Post / Parcel)',
    badge: 'Government Postal Service',
    phone: '1800 266 6868',
    trackingBaseUrl: 'https://www.indiapost.gov.in',
    generateTrackingUrl: (trk) => `https://www.indiapost.gov.in/_layouts/15/dop.portal.tracking/trackconsignment.aspx`
  },
  {
    id: 'dtdc',
    name: 'DTDC Express',
    badge: 'Fast Express Air / Surface',
    phone: '080 2536 5032',
    trackingBaseUrl: 'https://www.dtdc.in',
    generateTrackingUrl: (trk) => `https://www.dtdc.in/tracking.asp`
  },
  {
    id: 'delhivery',
    name: 'Delhivery',
    badge: 'All India E-Commerce',
    phone: '0124 671 9500',
    trackingBaseUrl: 'https://www.delhivery.com',
    generateTrackingUrl: (trk) => `https://www.delhivery.com/tracking?tracking_id=${encodeURIComponent(trk.trim())}`
  },
  {
    id: 'franch_express',
    name: 'Franch Express Courier',
    badge: 'South India Express',
    phone: '+91 44 2855 1111',
    trackingBaseUrl: 'https://www.franchexpress.com',
    generateTrackingUrl: (trk) => `https://www.franchexpress.com/`
  },
  {
    id: 'trackon',
    name: 'Trackon Couriers',
    badge: 'National Cargo',
    phone: '011 4559 3500',
    trackingBaseUrl: 'https://trackon.in',
    generateTrackingUrl: (trk) => `https://trackon.in/`
  },
  {
    id: 'local_runner',
    name: 'MR. VIVASAYI Store Express / Local Runner',
    badge: 'Same-Day Local Delivery',
    phone: '+91 97893 25262',
    trackingBaseUrl: '',
    generateTrackingUrl: () => `https://wa.me/919789325262?text=Hi%20MR.%20VIVASAYI,%20checking%20my%20local%20delivery%20status`
  }
];

export function getCourierPartner(nameOrId?: string): CourierPartnerInfo {
  if (!nameOrId) return COURIER_PARTNERS[0];
  const query = nameOrId.toLowerCase();
  const found = COURIER_PARTNERS.find(c => 
    c.id.toLowerCase() === query || 
    c.name.toLowerCase().includes(query) ||
    query.includes(c.id.toLowerCase())
  );
  return found || {
    id: 'other',
    name: nameOrId,
    badge: 'Courier Partner',
    trackingBaseUrl: '',
    generateTrackingUrl: () => ''
  };
}

/**
 * Calculates total weight in grams from an array of cart/order items
 */
export function calculateTotalWeightGrams(items: Array<{ pack_size?: string; unit?: string; quantity: number }>): number {
  return items.reduce((sum, item) => {
    let weightPerUnitGrams = 500; // default 500g
    const packStr = (item.pack_size || item.unit || '').toLowerCase().trim();

    if (packStr.includes('kg')) {
      const num = parseFloat(packStr.replace('kg', '').trim()) || 1;
      weightPerUnitGrams = num * 1000;
    } else if (packStr.includes('g') || packStr.includes('gram')) {
      const num = parseFloat(packStr.replace(/g|gram|grams/, '').trim()) || 500;
      weightPerUnitGrams = num;
    } else if (packStr.includes('l') || packStr.includes('litre') || packStr.includes('liter')) {
      const num = parseFloat(packStr.replace(/l|litre|liter|litres/, '').trim()) || 1;
      weightPerUnitGrams = num * 1000; // ~1kg per liter for cold pressed oils
    } else if (packStr.includes('ml')) {
      const num = parseFloat(packStr.replace('ml', '').trim()) || 500;
      weightPerUnitGrams = num;
    }

    return sum + (weightPerUnitGrams * (item.quantity || 1));
  }, 0);
}

export interface DeliveryCalculationParams {
  weightGrams: number;
  state: string;
  city?: string;
  pincode?: string;
  totalAmount: number;
  deliveryRulesOverride?: any[];
}

/**
 * Dynamic location & weight-based delivery charge calculation based on admin delivery-rules:
 * - Local (Cumbum / 625516): ₹0 (No delivery fees!)
 * - Tamil Nadu (TN) State:
 *    • Below 500g: ₹60
 *    • 500g - 1kg: ₹70
 *    • 1kg - 3kg: ₹150
 *    • Above 3kg: ₹200
 * - Other States (Pan-India):
 *    • Below 500g: ₹90
 *    • 500g - 1kg: ₹120
 *    • 1kg - 3kg: ₹240
 *    • Above 3kg: ₹350
 * - If totalAmount >= 1500 (Free delivery threshold): ₹0
 */
export function calculateDeliveryFee({
  weightGrams,
  state,
  city = '',
  pincode = '',
  totalAmount,
  deliveryRulesOverride
}: DeliveryCalculationParams): {
  fee: number;
  tierLabel: string;
  isLocal: boolean;
  isTamilNadu: boolean;
  freeDeliveryApplied: boolean;
  weightGrams: number;
} {
  const cleanState = (state || '').trim();
  const cleanCity = (city || '').toLowerCase();
  const cleanPin = (pincode || '').trim();

  // 1. Detect if Local Store Delivery (Cumbum / Theni 625516)
  const isLocal = 
    cleanState === 'Cumbum Store / Local' || 
    cleanPin === '625516' || 
    cleanCity.includes('cumbum');

  if (isLocal) {
    return {
      fee: 0, // "loacal no delievy fees"
      tierLabel: 'Cumbum Store Local Delivery (FREE ✓)',
      isLocal: true,
      isTamilNadu: true,
      freeDeliveryApplied: true,
      weightGrams
    };
  }

  // 2. Check Free Delivery cart threshold (orders >= ₹1,500)
  if (totalAmount >= 1500) {
    return {
      fee: 0,
      tierLabel: 'Orders Over ₹1,500 (FREE DELIVERY ✓)',
      isLocal: false,
      isTamilNadu: cleanState.toLowerCase().includes('tamil') || cleanState === 'Theni District' || cleanState === 'Puducherry',
      freeDeliveryApplied: true,
      weightGrams
    };
  }

  // 3. Detect if Tamil Nadu State / Puducherry
  const isTamilNadu = 
    cleanState === 'Tamil Nadu' || 
    cleanState === 'Theni District' || 
    cleanState === 'Puducherry' || 
    cleanState.toLowerCase().includes('tamil');

  if (isTamilNadu) {
    let fee = 60;
    let label = 'Tamil Nadu (Below 500g)';

    if (weightGrams < 500) {
      fee = 60;
      label = 'Tamil Nadu (Below 500g) - ₹60';
    } else if (weightGrams <= 1000) {
      fee = 70;
      label = 'Tamil Nadu (500g - 1kg) - ₹70';
    } else if (weightGrams <= 3000) {
      fee = 150;
      label = 'Tamil Nadu (1kg - 3kg) - ₹150';
    } else {
      fee = 200;
      label = 'Tamil Nadu (Above 3kg Heavy Batch) - ₹200';
    }

    return {
      fee,
      tierLabel: label,
      isLocal: false,
      isTamilNadu: true,
      freeDeliveryApplied: false,
      weightGrams
    };
  }

  // 4. Other States / Pan-India (Actual Courier Cost)
  let fee = 90;
  let label = 'Pan-India (Below 500g)';

  if (weightGrams < 500) {
    fee = 90;
    label = 'Pan-India Courier (Below 500g) - ₹90';
  } else if (weightGrams <= 1000) {
    fee = 120;
    label = 'Pan-India Courier (500g - 1kg) - ₹120';
  } else if (weightGrams <= 3000) {
    fee = 240;
    label = 'Pan-India Courier (1kg - 3kg) - ₹240';
  } else {
    fee = 350;
    label = 'Pan-India Courier (Above 3kg) - ₹350';
  }

  return {
    fee,
    tierLabel: label,
    isLocal: false,
    isTamilNadu: false,
    freeDeliveryApplied: false,
    weightGrams
  };
}
