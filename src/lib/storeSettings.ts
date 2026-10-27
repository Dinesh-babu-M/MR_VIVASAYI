// ============================================================
// MR. VIVASAYI Mart - Centralized Store Contact & Address Manager
// ============================================================

export interface StoreAddress {
  id: string;
  label: string; // e.g. "Main Flagship Store", "Theni Valley Branch", "Central Warehouse"
  address_line: string; // "#Cumbum Valley"
  area: string; // "Cumbum Valley"
  city: string; // "Theni"
  state: string; // "Tamil Nadu"
  pincode: string; // "625516"
  country: string; // "India"
  gstin?: string;
  fssai?: string;
  is_primary: boolean;
  created_at: string;
  updated_at: string;
}

export interface StorePhone {
  id: string;
  label: string; // e.g. "Counter Billing Desk", "WhatsApp Orders Hotline", "Customer Care"
  phone_number: string; // "+91 9789325262"
  raw_number: string; // "9789325262"
  calling_code: string; // "+91"
  type: 'WHATSAPP' | 'BILLING' | 'ORDERS' | 'SUPPORT';
  is_primary: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface StoreContactSettings {
  store_name: string;
  tagline: string;
  addresses: StoreAddress[];
  phones: StorePhone[];
  primary_email: string;
  operating_hours: string;
  updated_at: string;
}

// Default initial store configuration
export const DEFAULT_STORE_CONTACT_SETTINGS: StoreContactSettings = {
  store_name: 'MR. VIVASAYI Mart',
  tagline: 'Pure, Traditional & Organic Natural Foods',
  addresses: [
    {
      id: 'addr-primary',
      label: 'Main Store & Billing Counter',
      address_line: '#Cumbum Valley',
      area: 'Cumbum Valley',
      city: 'Theni',
      state: 'Tamil Nadu',
      pincode: '625516',
      country: 'India',
      gstin: '',
      fssai: '',
      is_primary: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 'addr-warehouse',
      label: 'Central Grain Processing & Chekku Mill',
      address_line: 'Gingelly Mill Road, Cumbum Valley',
      area: 'Cumbum Valley',
      city: 'Theni',
      state: 'Tamil Nadu',
      pincode: '625516',
      country: 'India',
      is_primary: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  ],
  phones: [
    {
      id: 'phone-primary',
      label: 'Billing Counter & Store Hotline',
      phone_number: '+91 9789325262',
      raw_number: '9789325262',
      calling_code: '+91',
      type: 'BILLING',
      is_primary: true,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 'phone-whatsapp',
      label: 'WhatsApp Orders & Inquiries',
      phone_number: '+91 9789325262',
      raw_number: '9789325262',
      calling_code: '+91',
      type: 'WHATSAPP',
      is_primary: false,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 'phone-support',
      label: 'Customer Care & Farmer Direct Desk',
      phone_number: '+91 9876543210',
      raw_number: '9876543210',
      calling_code: '+91',
      type: 'SUPPORT',
      is_primary: false,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  ],
  primary_email: 'orders@mrvivasayi.in',
  operating_hours: '8:00 AM – 9:00 PM (Monday – Sunday)',
  updated_at: new Date().toISOString()
};

const STORAGE_KEY = 'mrv_store_contact_settings';

// Retrieve active store contact settings
export function getStoreContactSettings(): StoreContactSettings {
  if (typeof window === 'undefined') return DEFAULT_STORE_CONTACT_SETTINGS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed: StoreContactSettings = JSON.parse(raw);
      if (parsed && parsed.addresses && parsed.phones) {
        // Strip legacy placeholder dummy GSTIN / FSSAI numbers so they only appear if entered in settings
        parsed.addresses = parsed.addresses.map(a => ({
          ...a,
          gstin: a.gstin === '33AABCM1234F1Z8' ? '' : (a.gstin || ''),
          fssai: a.fssai === '12423008000451' ? '' : (a.fssai || '')
        }));
        return parsed;
      }
    }
  } catch (e) {
    console.error('Failed to read store contact settings from localStorage', e);
  }
  return DEFAULT_STORE_CONTACT_SETTINGS;
}

// Persist store contact settings
export function saveStoreContactSettings(settings: StoreContactSettings): void {
  if (typeof window === 'undefined') return;
  try {
    settings.updated_at = new Date().toISOString();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    window.dispatchEvent(new CustomEvent('store_contact_updated', { detail: settings }));
  } catch (e) {
    console.error('Failed to save store contact settings', e);
  }
}

// Get the primary address object
export function getPrimaryStoreAddress(): StoreAddress {
  const settings = getStoreContactSettings();
  const primary = settings.addresses.find(a => a.is_primary);
  return primary || settings.addresses[0] || DEFAULT_STORE_CONTACT_SETTINGS.addresses[0];
}

// Format primary address into single string: "#Cumbum Valley, Theni, Tamil Nadu - 625516"
export function getFormattedStoreAddress(): string {
  const addr = getPrimaryStoreAddress();
  return `${addr.address_line}, ${addr.city}, ${addr.state} - ${addr.pincode}`;
}

// Get primary phone object
export function getPrimaryStorePhone(): StorePhone {
  const settings = getStoreContactSettings();
  const primary = settings.phones.find(p => p.is_primary && p.is_active);
  return primary || settings.phones[0] || DEFAULT_STORE_CONTACT_SETTINGS.phones[0];
}

// Format primary phone: "+91 9789325262"
export function getFormattedStorePhone(): string {
  const phone = getPrimaryStorePhone();
  return phone.phone_number;
}

// Get primary WhatsApp number for links (without plus or spaces): "919789325262"
export function getStoreWhatsAppCleanNumber(): string {
  const settings = getStoreContactSettings();
  const wa = settings.phones.find(p => p.type === 'WHATSAPP' && p.is_active);
  const target = wa || getPrimaryStorePhone();
  return (target.calling_code.replace(/\D/g, '') || '91') + target.raw_number.replace(/\D/g, '');
}
