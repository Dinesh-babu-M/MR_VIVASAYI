export interface HeroBannerTemplate {
  headline: string;
  subheadline: string;
  cta_text: string;
  cta_link: string;
  bg_image_url: string;
  bg_image_animation: 'none' | 'float' | 'pulse' | 'zoom' | 'bounce';
  is_published: boolean;
  guarantee_badges: string[];
  floating_pill_text: string;
}

export interface AnnouncementItemTemplate {
  id: string;
  text: string;
  link: string;
  is_active: boolean;
}

export interface AnnouncementBarTemplate {
  items: AnnouncementItemTemplate[];
  text: string;
  link: string;
  bg_color: string;
  text_color: string;
  position_align: 'center' | 'left' | 'right';
  animation_type: 'none' | 'scroll_right_to_left' | 'scroll_left_to_right';
  is_active: boolean;
  scheduled_at?: string;
  approved?: boolean;
}

export interface FeatureBadgeTemplate {
  id: string;
  text: string;
}

export interface HeaderFooterSettingsTemplate {
  top_bar_enabled: boolean;
  announcement_text: string;
  announcement_link: string;
  announcement_bg_color: string;
  nav_custom_link_text: string;
  nav_custom_link_url: string;
  footer_brand_tagline: string;
  footer_phone: string;
  footer_email: string;
  footer_address: string;
  footer_hours: string;
  show_farmer_badge: boolean;
  show_zero_chemical_badge: boolean;
  copyright_text: string;
}

export interface StatBoxTemplate {
  id: string;
  label: string;
  value: string;
}

export interface CoreValueTemplate {
  id: string;
  title: string;
  description: string;
}

export interface AboutSectionTemplate {
  brand_story: string;
  stats: StatBoxTemplate[];
  core_values: CoreValueTemplate[];
}

export interface PageSEOTemplate {
  page: string;
  title: string;
  description: string;
  keywords: string;
  og_image: string;
}

export interface ContactDetailsTemplate {
  store_name: string;
  address: string;
  phone_primary: string;
  phone_secondary: string;
  email_primary: string;
  email_secondary: string;
  operating_hours_weekdays: string;
  operating_hours_sunday: string;
  whatsapp_number: string;
}

export interface PopNotificationTemplate {
  mobile_enabled: boolean;
  desktop_enabled: boolean;
  title: string;
  message: string;
  image_url: string;
  cta_text: string;
  cta_link: string;
  secondary_cta_text?: string;
  features?: string[];
  animation_style: 'bounce' | 'slide-up' | 'fade-in' | 'center-modal' | 'bottom-toast' | 'pulse-glow';
  target_audience: 'all' | 'new_visitors' | 'cart_abandoners' | 'vip_customers';
  delay_seconds: number;
  auto_close_seconds: number;
  is_published: boolean;
  stats?: {
    impressions: number;
    clicks: number;
    dismissals: number;
    active_triggers: number;
  };
}

export interface LoginPageTemplate {
  portal_title: string;
  portal_subtitle: string;
  welcome_message: string;
  allow_demo_toggle: boolean;
  show_demo_users_default: boolean;
  demo_users_title: string;
  elevation_depth: 'subtle' | 'medium' | 'high' | 'ultra_3d';
  ambient_theme: 'emerald_aurora' | 'golden_harvest' | 'midnight_dark' | 'cosmic_teal';
  floating_badge_text: string;
  security_notice: string;
  help_desk_contact: string;
  contact_admin_message?: string;
  enable_3d_tilt: boolean;
  show_floating_badges: boolean;
  bg_gradient_start?: string;
  bg_gradient_end?: string;
}

export interface CMSSettingsTemplate {
  hero: HeroBannerTemplate;
  announcement: AnnouncementBarTemplate;
  badges: FeatureBadgeTemplate[];
  headerFooter: HeaderFooterSettingsTemplate;
  about: AboutSectionTemplate;
  seo: Record<string, PageSEOTemplate>;
  contact: ContactDetailsTemplate;
  pop_notification?: PopNotificationTemplate;
  login_page?: LoginPageTemplate;
}

export const DEFAULT_CMS_TEMPLATES: CMSSettingsTemplate = {
  pop_notification: {
    mobile_enabled: true,
    desktop_enabled: true,
    title: 'Enable Live Harvest Notifications?',
    message: 'Get instant alerts for Fresh Wood-Pressed Oils, Harvest Batch Arrivals & WhatsApp Exclusive Coupons directly on your mobile phone or laptop browser.',
    image_url: '',
    cta_text: 'Allow Live Harvest Notifications',
    cta_link: '/products',
    secondary_cta_text: 'Maybe Later',
    features: [
      'Works on Mobile, Tablet & Laptop Browsers',
      'Zero Spam — Only Fresh Farm Harvest Updates',
      'Opt-out anytime with 1-click browser settings'
    ],
    animation_style: 'center-modal',
    target_audience: 'all',
    delay_seconds: 2.5,
    auto_close_seconds: 0,
    is_published: true,
    stats: {
      impressions: 0,
      clicks: 0,
      dismissals: 0,
      active_triggers: 0
    }
  },
  hero: {
    headline: 'Pure. Traditional. Straight from the Farm.',
    subheadline: 'Experience authentic South Indian flavours — cold-pressed oils, heritage rice, artisan spices and more. Grown with love, delivered to your door.',
    cta_text: 'Shop Now',
    cta_link: '/products',
    bg_image_url: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=800&q=80',
    bg_image_animation: 'float',
    is_published: true,
    guarantee_badges: [
      '100% Unprocessed',
      'Farmer Sourced',
      'Zero Preservatives'
    ],
    floating_pill_text: 'Lab Tested & Certified Pure'
  },
  announcement: {
    items: [
      { id: 'ann_1', text: '🌿 Free delivery on orders above ₹499 — Limited time offer!', link: '/products', is_active: true },
      { id: 'ann_2', text: '🌾 Fresh Harvest Alert: Mapillai Samba & Seeraga Samba Rice In Stock!', link: '/products', is_active: true },
      { id: 'ann_3', text: '🚜 100% Wood Cold-Pressed Chekku Oils — Direct From Local Farmers', link: '/about', is_active: true }
    ],
    text: '🌿 Free delivery on orders above ₹499 — Limited time offer!',
    link: '/products',
    bg_color: '#065f46',
    text_color: '#ffffff',
    position_align: 'center',
    animation_type: 'scroll_right_to_left',
    is_active: true,
    approved: true
  },
  badges: [
    { id: 'b_1', text: '100% Certified Organic' },
    { id: 'b_2', text: 'Direct from Smallholders' },
    { id: 'b_3', text: 'Traditional Wood Pressed' },
    { id: 'b_4', text: 'Zero Chemical Processing' }
  ],
  headerFooter: {
    top_bar_enabled: true,
    announcement_text: '🌿 Free Delivery on orders above ₹499 | Farm Fresh Organic Direct To You',
    announcement_link: '/products',
    announcement_bg_color: '#065f46',
    nav_custom_link_text: '',
    nav_custom_link_url: '',
    footer_brand_tagline: 'Preserving traditional South Indian agriculture, heirloom grains, and pure unrefined cold-pressed oils.',
    footer_phone: '+91 98765 43210',
    footer_email: 'hello@vivasayi.com',
    footer_address: '#Cumbum Valley, Theni, Tamil Nadu - 625516',
    footer_hours: 'Mon – Sat: 8:00 AM – 8:00 PM',
    show_farmer_badge: true,
    show_zero_chemical_badge: true,
    copyright_text: '© 2026 MR. VIVASAYI.All Rights Reserved | Design by MR. VIVASAYI |'
  },
  about: {
    brand_story: 'Founded with a deep reverence for ancestral farming wisdom, we work directly with verified agrarian communities across Tamil Nadu. We bypass industrial intermediaries to ensure fair prices for farmers and untouched, pure, chemical-free food for your home.',
    stats: [
      { id: 'stat_1', label: 'Farmer Families Supported', value: '150+' },
      { id: 'stat_2', label: 'Native Crop Varieties', value: '45+' },
      { id: 'stat_3', label: 'Acres Cultivated Chem-Free', value: '1,200+' },
      { id: 'stat_4', label: 'Happy Conscious Homes', value: '18,000+' }
    ],
    core_values: [
      { id: 'val_1', title: 'Farmer Dignity & Direct Fair Trade', description: 'Every rupee goes straight to the hands that till the soil, creating sustainable regional farming ecosystems.' },
      { id: 'val_2', title: 'Zero Additives or Chemical Adulteration', description: 'Completely unbleached, unrefined, and cold-extracted using traditional granite and wood presses.' },
      { id: 'val_3', title: 'Preserving Native Heirloom Seeds', description: 'Reviving nutrition-dense indigenous grains like Mapillai Samba, Karuppu Kavuni, and Poongar.' }
    ]
  },
  seo: {
    Home: {
      page: 'Home',
      title: 'MR. VIVASAYI – Pure Cold-Pressed Oils & Traditional Heirloom Grains',
      description: 'Authentic South Indian natural farm products: wood cold-pressed oils, organic millets, traditional rice varieties delivered directly from local farmers.',
      keywords: 'cold pressed oil, traditional rice, organic farm store, vivasayi, wooden chekku, millets',
      og_image: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=1200&q=80'
    },
    Products: {
      page: 'Products',
      title: 'Shop Natural Grains, Cold-Pressed Oils & Spices | MR. VIVASAYI',
      description: 'Explore farm-fresh organic food: cold pressed sesame oil, groundnut oil, coconut oil, traditional rice, and herbal health mixes.',
      keywords: 'buy organic oil, wood pressed oil online, raw spices, authentic grocery',
      og_image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1200&q=80'
    },
    About: {
      page: 'About',
      title: 'Our Story & Farm Heritage | MR. VIVASAYI',
      description: 'Learn how we partner with smallholder organic farmers across South India to bring chemical-free heirloom foods to your family kitchen.',
      keywords: 'about vivasayi, organic farmers, natural farming story, farm to table',
      og_image: 'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&w=1200&q=80'
    },
    Contact: {
      page: 'Contact',
      title: 'Contact MR. VIVASAYI – WhatsApp Order & Store Location',
      description: 'Get in touch with us for bulk orders, farmer inquiries, store visits, and fast WhatsApp customer support.',
      keywords: 'vivasayi store contact, farm order phone, whatsapp customer support',
      og_image: 'https://images.unsplash.com/photo-1596524430615-b46475ddff6e?auto=format&fit=crop&w=1200&q=80'
    }
  },
  contact: {
    store_name: 'MR. VIVASAYI Mart',
    address: '#Cumbum Valley, Theni, Tamil Nadu - 625516',
    phone_primary: '+91 97893 25262',
    phone_secondary: '+91 98765 43210',
    email_primary: 'orders@mrvivasayi.in',
    email_secondary: 'support@mrvivasayi.in',
    operating_hours_weekdays: '8:00 AM – 8:00 PM (Mon – Sat)',
    operating_hours_sunday: '9:00 AM – 2:00 PM (Sunday)',
    whatsapp_number: '919789325262'
  },
  login_page: {
    portal_title: 'MR. VIVASAYI Business Operations & Admin Portal',
    portal_subtitle: 'Enterprise Organic Supply Chain & Retail ERP',
    welcome_message: 'Welcome back! Authenticate with your authorized credentials to manage harvest catalog, billing counter & orders.',
    allow_demo_toggle: false,
    show_demo_users_default: false,
    demo_users_title: '⚡ Quick Staff Roles & One-Click Demo Access',
    elevation_depth: 'ultra_3d',
    ambient_theme: 'emerald_aurora',
    floating_badge_text: 'Login Page',
    security_notice: 'Protected by role-based access controls, automatic session timeout, and rate-limited token validation.',
    help_desk_contact: 'Internal IT Admin / Operations Desk',
    contact_admin_message: 'Please contact our system administrator or operations management desk to request access authorization or password reset.',
    enable_3d_tilt: true,
    show_floating_badges: true,
    bg_gradient_start: '#022c22',
    bg_gradient_end: '#064e3b'
  }
};
