import React, { useState, useMemo } from 'react';
import {
  Sparkles,
  Search,
  BookOpen,
  Copy,
  Check,
  Globe,
  ExternalLink,
  Code2,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ArrowRight,
  TrendingUp,
  Tag,
  Share2,
  FileText,
  Smartphone,
  Eye,
  Layers,
  ShieldCheck,
  ChevronRight,
  Terminal,
  Zap,
  Layout,
  Sliders,
  DollarSign,
  MessageCircle,
  Clock,
  Filter,
  CheckSquare,
  Square,
  RefreshCw,
  Award
} from 'lucide-react';
import toast from 'react-hot-toast';

export interface SEOTopic {
  id: string;
  topicNumber: number;
  title: string;
  category: 'storefront' | 'technical' | 'traffic' | 'performance';
  categoryLabel: string;
  pageTarget: string;
  pageUrl: string;
  badge: string;
  priority: 'Critical' | 'High' | 'Medium';
  impactCTR: string;
  readTime: string;
  summary: string;
  headerImprovements: {
    titleFormula: string;
    descriptionTemplate: string;
    headTagsCode: string;
    canonicalRule: string;
    openGraphTags: string;
    tamilKeywords: string[];
  };
  structuredDataSchema: {
    schemaName: string;
    description: string;
    jsonLdCode: string;
  };
  headerChecklist: Array<{ id: string; text: string; details: string }>;
  trafficGrowthGuide: {
    channel: string;
    blueprintTitle: string;
    strategy: string;
    adCopySnippet?: string;
    quickTips: string[];
  };
  coreWebVitalsAdvice: string;
}

export const SEO_20_TOPICS: SEOTopic[] = [
  {
    id: 'page_1_global_header',
    topicNumber: 1,
    title: 'Storefront Global Header & Navigation UX',
    category: 'storefront',
    categoryLabel: 'Storefront Architecture',
    pageTarget: 'Global Sitewide (<header>)',
    pageUrl: '/',
    badge: 'Sitewide UX & Head',
    priority: 'Critical',
    impactCTR: '+35% Browse Depth',
    readTime: '4 min',
    summary: 'The global header anchors every visitor interaction. Maximize crawlability, brand clarity, sticky accessibility, and micro-conversions across mobile and desktop.',
    headerImprovements: {
      titleFormula: 'MR. VIVASAYI – 100% Traditional Organic Farm Foods & Cold Pressed Oils',
      descriptionTemplate: 'Shop authentic wood-pressed oils, traditional heritage rices, raw palm jaggery & millets direct from Tamil Nadu farmers. Fast doorstep delivery across India.',
      headTagsCode: `<!-- Global Storefront Head Essentials -->
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0" />
<meta name="theme-color" content="#064e3b" />
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link rel="dns-prefetch" href="https://images.unsplash.com" />
<link rel="canonical" href="https://mrvivasayi.com/" />
<meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />`,
      canonicalRule: 'Strictly self-referential to root domain: https://mrvivasayi.com/ with trailing slash normalized.',
      openGraphTags: `<meta property="og:site_name" content="MR. VIVASAYI" />
<meta property="og:type" content="website" />
<meta property="og:title" content="MR. VIVASAYI – Organic & Natural Farm Produce" />
<meta property="og:description" content="Direct from Tamil Nadu farmers to your kitchen. Wood cold-pressed oils, native rices & millets." />
<meta property="og:image" content="https://mrvivasayi.com/og-storefront-banner.jpg" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta property="og:locale" content="en_IN" />
<meta property="og:locale:alternate" content="ta_IN" />`,
      tamilKeywords: ['மரச்செக்கு எண்ணெய்', 'இயற்கை விவசாயம்', 'பாரம்பரிய அரிசி', 'பனை வெல்லம்', 'நாட்டு சர்க்கரை']
    },
    structuredDataSchema: {
      schemaName: 'WebSite & SiteNavigationElement',
      description: 'Enables Google Sitelinks Search Box and prominent sitelink extensions under the main search result.',
      jsonLdCode: `{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": "https://mrvivasayi.com/#website",
      "url": "https://mrvivasayi.com/",
      "name": "MR. VIVASAYI",
      "description": "Authentic organic foods and cold-pressed oils direct from farmers",
      "potentialAction": [
        {
          "@type": "SearchAction",
          "target": {
            "@type": "EntryPoint",
            "urlTemplate": "https://mrvivasayi.com/products?search={search_term_string}"
          },
          "query-input": "required name=search_term_string"
        }
      ],
      "inLanguage": ["en-IN", "ta-IN"]
    },
    {
      "@type": "Organization",
      "@id": "https://mrvivasayi.com/#organization",
      "name": "MR. VIVASAYI Organic Store",
      "url": "https://mrvivasayi.com/",
      "logo": "https://mrvivasayi.com/logo.png",
      "sameAs": [
        "https://www.facebook.com/mrvivasayi",
        "https://www.instagram.com/mrvivasayi"
      ]
    }
  ]
}`
    },
    headerChecklist: [
      { id: 'h1_sticky', text: 'Sticky Header with backdrop-blur', details: 'Ensure nav stays accessible while scrolling long product lists.' },
      { id: 'h1_cart_badge', text: 'Real-time cart badge counter', details: 'Show instant item count without re-triggering full page re-renders.' },
      { id: 'h1_search', text: 'Predictive search input with keyboard shortcut', details: 'Allow rapid SKU and category search directly from the top bar.' },
      { id: 'h1_top_banner', text: 'Announcement bar with urgent delivery countdown', details: 'Highlight Free Shipping on orders over ₹499 or weekend harvest drops.' }
    ],
    trafficGrowthGuide: {
      channel: 'Organic Brand Navigation',
      blueprintTitle: 'Direct Navigational Brand Queries',
      strategy: 'Add structured breadcrumbs and clear top-level category links (Cold Pressed Oils, Heritage Rice, Millets, Natural Sweeteners) to secure Google 6-pack sitelinks.',
      quickTips: [
        'Keep navigation hierarchy under 2 levels deep for frictionless mobile thumb tapping.',
        'Always include direct click-to-WhatsApp support icon inside mobile header drawer.'
      ]
    },
    coreWebVitalsAdvice: 'Inline critical header SVG icons and preload primary brand font to avoid layout shifts (CLS < 0.02).'
  },
  {
    id: 'page_2_home_hero',
    topicNumber: 2,
    title: 'Homepage Hero & Brand Story Header',
    category: 'storefront',
    categoryLabel: 'Storefront Architecture',
    pageTarget: 'Homepage Hero (H1 / LCP Element)',
    pageUrl: '/',
    badge: 'LCP & Primary H1',
    priority: 'Critical',
    impactCTR: '+45% Immediate Engagement',
    readTime: '5 min',
    summary: 'The homepage hero is the largest contentful paint (LCP) element and establishes immediate organic trustworthiness and farmer-direct authenticity.',
    headerImprovements: {
      titleFormula: 'MR. VIVASAYI – Pure Cold-Pressed Oils & Traditional Organic Groceries',
      descriptionTemplate: 'Experience pure farm nutrition. Cold-pressed sesame, groundnut, and coconut oils crushed in Vaagai wood pestles. Order fresh harvest online with COD.',
      headTagsCode: `<!-- Homepage Hero Preload Directives -->
<link rel="preload" as="image" href="/hero-banner-mobile.webp" media="(max-width: 640px)" type="image/webp" fetchpriority="high" />
<link rel="preload" as="image" href="/hero-banner-desktop.webp" media="(min-width: 641px)" type="image/webp" fetchpriority="high" />
<meta name="keywords" content="organic store chennai, wood pressed oil, traditional rice online, mr vivasayi, karuppu kavuni, cold pressed sesame oil" />`,
      canonicalRule: 'Self-referential canonical pointing to root domain.',
      openGraphTags: `<meta property="og:title" content="Pure Farm Food from Tamil Nadu | MR. VIVASAYI" />
<meta property="og:description" content="Crushed slowly in Vaagai wood presses. 100% chemical-free natural harvest delivered to your door." />
<meta property="og:image" content="https://mrvivasayi.com/hero-preview-1200x630.jpg" />`,
      tamilKeywords: ['மரச்செக்கு நல்லெண்ணெய்', 'கருப்பு கவுனி அரிசி', 'மாப்பிள்ளை சம்பா', 'பாரம்பரிய இயற்கை அங்காடி']
    },
    structuredDataSchema: {
      schemaName: 'Store & OfferCatalog',
      description: 'Declares store identity, geographical coordinates, delivery services, and payment acceptance types.',
      jsonLdCode: `{
  "@context": "https://schema.org",
  "@type": "Store",
  "name": "MR. VIVASAYI Organic Store",
  "image": "https://mrvivasayi.com/storefront.jpg",
  "@id": "https://mrvivasayi.com/#store",
  "url": "https://mrvivasayi.com/",
  "telephone": "+91-9876543210",
  "priceRange": "₹₹",
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "Organic Farmer Hub, Main Road",
    "addressLocality": "Chennai",
    "addressRegion": "Tamil Nadu",
    "postalCode": "600001",
    "addressCountry": "IN"
  },
  "geo": {
    "@type": "GeoCoordinates",
    "latitude": 13.0827,
    "longitude": 80.2707
  },
  "paymentAccepted": "Cash, UPI, Credit Card, Net Banking",
  "currenciesAccepted": "INR"
}`
    },
    headerChecklist: [
      { id: 'h2_single_h1', text: 'Single semantic <h1> tag containing primary brand & core product keyword', details: 'Ensure no secondary elements accidentally use h1.' },
      { id: 'h2_lcp_fetchpriority', text: 'Hero image uses fetchpriority="high" and decoding="async"', details: 'Directly cuts LCP time by 400-800ms on 4G cellular connections.' },
      { id: 'h2_badge_row', text: 'Farm Purity Badges row right beneath CTA', details: 'Showcase "100% Wood-Pressed", "Zero Refined Chemicals", "Direct Farmer Support".' }
    ],
    trafficGrowthGuide: {
      channel: 'Meta Advantage+ Catalog Ads',
      blueprintTitle: 'Directing Facebook & Instagram Traffic to Hero',
      strategy: 'Use video reel ads showing traditional oil extraction pestles turning slowly in Vaagai wood, leading directly into the hero offer.',
      adCopySnippet: `🌿 Stop consuming chemically bleached supermarket oils!
Mr. Vivasayi brings you cold-pressed oils crushed in traditional wood pestles.
Zero chemicals. Zero artificial heating.
🚚 Free Delivery on First Order with code FARM10.`,
      quickTips: [
        'A/B test the primary CTA button text between "Explore Farm Harvest" and "Shop Fresh Oils".',
        'Add a live floating customer purchase notification pill to amplify urgency.'
      ]
    },
    coreWebVitalsAdvice: 'Reserve explicit aspect-ratio (16/9 desktop, 4/3 mobile) on the hero container to completely eliminate cumulative layout shift (CLS).'
  },
  {
    id: 'page_3_products_catalog',
    topicNumber: 3,
    title: 'Product Listing Page (PLP) & Instant Filter SEO',
    category: 'storefront',
    categoryLabel: 'Storefront Architecture',
    pageTarget: 'Product Catalog (/products)',
    pageUrl: '/products',
    badge: 'Category Silos & Filters',
    priority: 'Critical',
    impactCTR: '+40% Organic Impressions',
    readTime: '6 min',
    summary: 'The catalog page gathers broad commercial keywords like "buy organic rice online". Smart canonicalization prevents duplicate content penalties from filters.',
    headerImprovements: {
      titleFormula: 'Organic Grocery Catalog – Buy Wood Pressed Oils & Millets Online | MR. VIVASAYI',
      descriptionTemplate: 'Explore our catalog of 100% natural, farm-sourced groceries. Certified pure sesame oil, coconut oil, traditional rices, palm jaggery & millets with lab-tested purity.',
      headTagsCode: `<!-- Products Catalog SEO Head -->
<title>Organic Grocery Catalog – Buy Wood Pressed Oils & Millets | MR. VIVASAYI</title>
<link rel="canonical" href="https://mrvivasayi.com/products" />
<meta name="robots" content="index, follow" />`,
      canonicalRule: 'When filters (sort, price, pack size) are selected, canonical must always point to clean base category URL or /products.',
      openGraphTags: `<meta property="og:title" content="All Farm Harvests & Organic Products | MR. VIVASAYI" />
<meta property="og:description" content="Shop fresh farm batches: Cold Pressed Oils, Traditional Rices, Millets & Honey." />
<meta property="og:url" content="https://mrvivasayi.com/products" />`,
      tamilKeywords: ['பாரம்பரிய சிறுதானியங்கள்', 'இயற்கை பொருட்கள் ஆன்லைன்', 'மரச்செக்கு எண்ணெய் விலை']
    },
    structuredDataSchema: {
      schemaName: 'ItemList / CollectionPage',
      description: 'Instructs search engines on catalog sequence and individual product card anchors.',
      jsonLdCode: `{
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  "name": "MR. VIVASAYI Organic Catalog",
  "url": "https://mrvivasayi.com/products",
  "mainEntity": {
    "@type": "ItemList",
    "numberOfItems": 16,
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "name": "Wood Cold-Pressed Sesame Oil (1L)",
        "url": "https://mrvivasayi.com/products/wood-pressed-sesame-oil-1l"
      },
      {
        "@type": "ListItem",
        "position": 2,
        "name": "Native Karuppu Kavuni Black Rice (1kg)",
        "url": "https://mrvivasayi.com/products/karuppu-kavuni-black-rice-1kg"
      }
    ]
  }
}`
    },
    headerChecklist: [
      { id: 'h3_clean_urls', text: 'Clean URL paths for category filters (/products?category=oils)', details: 'Avoid long session parameters that confuse web crawlers.' },
      { id: 'h3_sort_canonical', text: 'Sort dropdowns do NOT generate indexable duplicate URLs', details: 'Apply rel="canonical" pointing to the default unsorted catalog.' },
      { id: 'h3_quick_badges', text: 'Display instant stock & savings badges on product cards', details: 'Clear "15% OFF" and "Farm Fresh" badges increase click-through by 28%.' }
    ],
    trafficGrowthGuide: {
      channel: 'Google Performance Max (PMax)',
      blueprintTitle: 'Google Shopping Catalog Feed Integration',
      strategy: 'Sync live store catalog with Google Merchant Center with high-resolution photos, exact pack sizes, and promotional sale badges.',
      quickTips: [
        'Place top 3 bestselling staples at the very top row on mobile screens.',
        'Include instant "Quick Add to Cart" buttons to reduce clicks to conversion.'
      ]
    },
    coreWebVitalsAdvice: 'Use CSS content-visibility: auto on product card grids below the fold to boost initial page rendering speeds by 50%.'
  },
  {
    id: 'page_4_product_detail',
    topicNumber: 4,
    title: 'Product Detail Page (PDP) & Rich Snippets',
    category: 'storefront',
    categoryLabel: 'Storefront Architecture',
    pageTarget: 'Product Details (/products/:id)',
    pageUrl: '/products/wood-pressed-sesame-oil-1l',
    badge: 'Rich Snippets & Schema',
    priority: 'Critical',
    impactCTR: '+60% Google Rich Results CTR',
    readTime: '6 min',
    summary: 'The PDP is where purchase decisions happen. Rich snippets with star ratings, pricing, in-stock badges, and Tamil health benefits capture high-intent buyers.',
    headerImprovements: {
      titleFormula: '{Product_Name} ({Pack_Size}) – 100% Pure & Lab Tested | MR. VIVASAYI',
      descriptionTemplate: 'Buy fresh wood cold-pressed {Product_Name} ({Tamil_Name}) online. Lab-certified chemical free, rich aroma & authentic farm freshness. Cash on Delivery available.',
      headTagsCode: `<!-- Individual PDP Header Directives -->
<title>Wood Cold-Pressed Sesame Oil (1L) – 100% Pure | MR. VIVASAYI</title>
<meta name="description" content="Buy authentic Vaagai wood-pressed sesame oil online. Rich aroma, cold-processed without heat. Free delivery over ₹499." />
<link rel="canonical" href="https://mrvivasayi.com/products/wood-pressed-sesame-oil-1l" />`,
      canonicalRule: 'Strict canonical matching the canonical product slug, regardless of whether visitor arrived via category, search, or promo campaign.',
      openGraphTags: `<meta property="og:type" content="product" />
<meta property="og:title" content="Wood Cold-Pressed Sesame Oil (1 Litre)" />
<meta property="og:description" content="100% pure, unrefined sesame oil crushed in traditional wood pestles. ₹420 only." />
<meta property="og:image" content="https://mrvivasayi.com/images/products/sesame-oil-1l.webp" />
<meta property="product:price:amount" content="420" />
<meta property="product:price:currency" content="INR" />
<meta property="product:availability" content="in stock" />`,
      tamilKeywords: ['செக்கு நல்லெண்ணெய் 1 லிட்டர்', 'மருத்துவ நன்மைகள்', 'பாரம்பரிய உணவு']
    },
    structuredDataSchema: {
      schemaName: 'Product & AggregateRating',
      description: 'Generates golden star ratings, price, and green in-stock label directly inside Google search listings.',
      jsonLdCode: `{
  "@context": "https://schema.org/",
  "@type": "Product",
  "name": "Wood Cold-Pressed Sesame Oil (1L)",
  "image": [
    "https://mrvivasayi.com/images/products/sesame-oil-front.webp",
    "https://mrvivasayi.com/images/products/sesame-oil-label.webp"
  ],
  "description": "Authentic cold-pressed sesame oil crushed slowly in traditional Vaagai wood pestles without artificial heat or chemicals.",
  "sku": "LIF-3091",
  "brand": {
    "@type": "Brand",
    "name": "MR. VIVASAYI"
  },
  "offers": {
    "@type": "Offer",
    "url": "https://mrvivasayi.com/products/wood-pressed-sesame-oil-1l",
    "priceCurrency": "INR",
    "price": "420.00",
    "priceValidUntil": "2026-12-31",
    "availability": "https://schema.org/InStock",
    "itemCondition": "https://schema.org/NewCondition"
  },
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": "4.9",
    "reviewCount": "128"
  }
}`
    },
    headerChecklist: [
      { id: 'h4_h1_name', text: 'Prominent <h1> with English name and Tamil subtitle', details: 'Helps dual-language shoppers immediately confirm authenticity.' },
      { id: 'h4_price_mrp', text: 'Clear strikethrough MRP and savings badge (e.g. Save ₹60)', details: 'Immediate psychological value anchor drives conversions.' },
      { id: 'h4_stock_pill', text: 'Live stock level indicator ("Only 8 left in fresh harvest batch")', details: 'Ethical scarcity encourages immediate checkout.' },
      { id: 'h4_trust_tabs', text: 'Tabs for "Farm Origin", "Health Benefits", "Lab Purity Report"', details: 'Provides deep informational content that keeps dwell time high.' }
    ],
    trafficGrowthGuide: {
      channel: 'Google Search Ads (Exact Match)',
      blueprintTitle: 'High-Intent Commercial Keyword Harvesting',
      strategy: 'Bid on exact terms like [buy wood pressed sesame oil online] or [karuppu kavuni rice chennai]. Link directly to this PDP.',
      adCopySnippet: `100% Pure Wood Pressed Sesame Oil | Fresh Batch
Traditional Vaagai Wood Cold-Pressed. Zero Adulteration.
Dispatched within 24 Hours. Cash on Delivery Available!`,
      quickTips: [
        'Include customer review rating (4.9★) in your Google ad headline extensions.',
        'Add WhatsApp Share button on PDP with prefilled product link and name.'
      ]
    },
    coreWebVitalsAdvice: 'Lazy load secondary gallery thumbnail images. Preload only the main cover image.'
  },
  {
    id: 'page_5_cart_checkout',
    topicNumber: 5,
    title: 'Shopping Cart Page & Micro-Conversion UX',
    category: 'storefront',
    categoryLabel: 'Storefront Architecture',
    pageTarget: 'Shopping Cart (/cart)',
    pageUrl: '/cart',
    badge: 'Conversion Rate Optimization',
    priority: 'High',
    impactCTR: '+25% Cart-to-Checkout',
    readTime: '4 min',
    summary: 'Prevent cart abandonment by establishing security, clarifying shipping fees, displaying free delivery thresholds, and setting noindex to protect crawl budget.',
    headerImprovements: {
      titleFormula: 'Your Shopping Cart – Fresh Organic Harvest | MR. VIVASAYI',
      descriptionTemplate: 'Review your selected cold-pressed oils, traditional rices and millets. Free shipping on orders over ₹499.',
      headTagsCode: `<!-- Cart Page NoIndex Directive -->
<title>Your Shopping Cart – MR. VIVASAYI</title>
<meta name="robots" content="noindex, nofollow" />
<link rel="canonical" href="https://mrvivasayi.com/cart" />`,
      canonicalRule: 'Cart contents vary per session. Must be noindexed to prevent search engines from crawling thin or dynamic cart pages.',
      openGraphTags: `<meta property="og:title" content="Your Cart | MR. VIVASAYI" />
<meta property="og:robots" content="noindex, nofollow" />`,
      tamilKeywords: ['கூடை', 'கொள்முதல் விவரம்']
    },
    structuredDataSchema: {
      schemaName: 'OrderAction / WebPage',
      description: 'Standard webpage markup without commercial indexing to conserve Google crawl budget.',
      jsonLdCode: `{
  "@context": "https://schema.org",
  "@type": "WebPage",
  "name": "Shopping Cart",
  "description": "Customer order review and preparation"
}`
    },
    headerChecklist: [
      { id: 'h5_free_ship_bar', text: 'Free shipping progress bar ("Add ₹80 more for Free Delivery")', details: 'Increases Average Order Value (AOV) by 18-24%.' },
      { id: 'h5_trust_strip', text: 'Security and payment trust badges (UPI, Cards, COD, SSL 256-bit)', details: 'Reassures first-time organic grocery buyers.' },
      { id: 'h5_cart_persist', text: 'Cart persistence in localStorage & Supabase sessions', details: 'Prevents customer frustration if they switch between mobile and desktop.' }
    ],
    trafficGrowthGuide: {
      channel: 'Automated WhatsApp Cart Recovery',
      blueprintTitle: 'Recovering Abandoned Farm Baskets',
      strategy: 'If customer enters phone number and abandons cart, trigger warm WhatsApp reminder 45 minutes later offering a 5% discount code.',
      quickTips: [
        'Offer 1-click WhatsApp assistance: "Have a question about your order? Tap here to chat with our harvest manager."',
        'Show estimated delivery date based on Tamil Nadu pincodes.'
      ]
    },
    coreWebVitalsAdvice: 'Keep cart interactions entirely client-side for zero latency item increments and instant price updates.'
  },
  {
    id: 'page_6_express_checkout',
    topicNumber: 6,
    title: 'Express Checkout & Frictionless Ordering',
    category: 'storefront',
    categoryLabel: 'Storefront Architecture',
    pageTarget: 'Checkout (/checkout)',
    pageUrl: '/checkout',
    badge: '1-Click Checkout UX',
    priority: 'Critical',
    impactCTR: '+30% Completed Orders',
    readTime: '4 min',
    summary: 'The checkout header must eliminate all visual distractions, maximize payment security cues, and streamline UPI mobile payments for Indian shoppers.',
    headerImprovements: {
      titleFormula: 'Secure Checkout – Fast Doorstep Delivery | MR. VIVASAYI',
      descriptionTemplate: 'Complete your order with instant UPI, Cards, NetBanking or Cash on Delivery. 100% secure 256-bit encrypted checkout.',
      headTagsCode: `<!-- Checkout Page Head Optimization -->
<title>Secure Checkout – MR. VIVASAYI</title>
<meta name="robots" content="noindex, nofollow" />
<meta http-equiv="Cache-Control" content="no-store, no-cache, must-revalidate" />`,
      canonicalRule: 'Checkout URLs must never be indexed in public SERPs.',
      openGraphTags: `<meta property="og:title" content="Secure Checkout | MR. VIVASAYI" />`,
      tamilKeywords: ['பாதுகாப்பான கட்டணம்', 'பணம் செலுத்துதல்']
    },
    structuredDataSchema: {
      schemaName: 'CheckoutPage',
      description: 'Signals transactional checkout flow to browser autofill systems.',
      jsonLdCode: `{
  "@context": "https://schema.org",
  "@type": "CheckoutPage",
  "name": "Secure Order Checkout",
  "isPartOf": {
    "@type": "WebSite",
    "name": "MR. VIVASAYI"
  }
}`
    },
    headerChecklist: [
      { id: 'h6_distraction_free', text: 'Distraction-free minimal header (logo + SSL lock badge only)', details: 'Remove unnecessary site navigation menus to keep buyer focused on completing payment.' },
      { id: 'h6_upi_default', text: 'Google Pay / PhonePe / Paytm listed as top default option', details: 'Over 82% of Indian direct-to-consumer e-commerce orders are settled via UPI apps.' },
      { id: 'h6_order_summary_sticky', text: 'Sticky collapsible order summary with item thumbnails', details: 'Keeps total transparent so customers never feel surprise price increases.' }
    ],
    trafficGrowthGuide: {
      channel: 'Retargeting Pixel Sync',
      blueprintTitle: 'Checkout Step Telemetry',
      strategy: 'Ensure InitiateCheckout telemetry fires precisely so Meta and Google ad algorithms learn high-converting customer profiles.',
      quickTips: [
        'Allow guest checkout without forcing tedious account creation passwords.',
        'Use native mobile keyboard types (e.g. type="tel" for pincode and mobile number).'
      ]
    },
    coreWebVitalsAdvice: 'Eliminate external heavy tracking scripts that delay payment gateway initializations.'
  },
  {
    id: 'page_7_tamil_regional',
    topicNumber: 7,
    title: 'Tamil Regional & Multilingual Storefront SEO',
    category: 'storefront',
    categoryLabel: 'Storefront Architecture',
    pageTarget: 'Tamil Regional Storefront & Language Subdomains',
    pageUrl: '/ta or /?lang=ta',
    badge: 'Regional SEO Domination',
    priority: 'High',
    impactCTR: '+50% Tamil Search Volume',
    readTime: '5 min',
    summary: 'Millions of regional buyers search in Tamil script or Tanglish (e.g., "marachekku nallennai vilai"). Dominate regional SERPs with hreflang tags and dual-language headings.',
    headerImprovements: {
      titleFormula: 'மிஸ்டர் விவசாயி – 100% இயற்கை மரச்செக்கு எண்ணெய் & பாரம்பரிய அரிசி வகைகள்',
      descriptionTemplate: 'நேரடி விவசாயிகளிடமிருந்து உங்கள் இல்லத்திற்கு! மரச்செக்கு நல்லெண்ணெய், கடலை எண்ணெய், கருப்பு கவுனி அரிசி மற்றும் நாட்டு சர்க்கரை சிறந்த விலையில் ஆன்லைனில் வாங்கவும்.',
      headTagsCode: `<!-- Multilingual & Regional Alternate Links -->
<link rel="alternate" hreflang="en-IN" href="https://mrvivasayi.com/" />
<link rel="alternate" hreflang="ta-IN" href="https://mrvivasayi.com/?lang=ta" />
<link rel="alternate" hreflang="x-default" href="https://mrvivasayi.com/" />
<meta name="language" content="Tamil, English" />`,
      canonicalRule: 'When viewing localized versions, self-canonicalize or point to proper hreflang target based on language toggle.',
      openGraphTags: `<meta property="og:locale" content="ta_IN" />
<meta property="og:locale:alternate" content="en_IN" />
<meta property="og:title" content="மிஸ்டர் விவசாயி – பாரம்பரிய இயற்கை உணவு அங்காடி" />
<meta property="og:description" content="பாரம்பரிய மரச்செக்கு எண்ணெய் மற்றும் இயற்கை சிறுதானியங்கள்." />`,
      tamilKeywords: ['செக்கு எண்ணெய்', 'நாட்டு சர்க்கரை விலை', 'மரச்செக்கு கடலை எண்ணெய்', 'மாப்பிள்ளை சம்பா அரிசி', 'இயற்கை உரம் உணவு']
    },
    structuredDataSchema: {
      schemaName: 'Language-Specific Organization',
      description: 'Expresses Tamil identity and bilingual service capability to search engines.',
      jsonLdCode: `{
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "மிஸ்டர் விவசாயி (MR. VIVASAYI)",
  "alternateName": "Mr Vivasayi Organic",
  "url": "https://mrvivasayi.com/",
  "knowsLanguage": ["ta", "en"],
  "areaServed": {
    "@type": "AdministrativeArea",
    "name": "Tamil Nadu, India"
  }
}`
    },
    headerChecklist: [
      { id: 'h7_lang_toggle', text: 'One-click English / தமிழ் header toggle pill', details: 'Allows customer to switch script immediately while preserving current page location.' },
      { id: 'h7_unicode_fonts', text: 'Optimized Tamil system fonts stack (Mukta Malar, Noto Sans Tamil)', details: 'Avoid font FOIT/FOUT flickering on regional mobile devices.' },
      { id: 'h7_tanglish_synonyms', text: 'Tanglish keyword meta tags in product descriptions', details: 'Captures phonetic Latin script queries like "chekku yennai".' }
    ],
    trafficGrowthGuide: {
      channel: 'Regional Tamil Facebook Groups & WhatsApp Shares',
      blueprintTitle: 'Tamil Cultural & Festive Harvest Campaigns',
      strategy: 'Create campaigns tied to Tamil harvest celebrations (Pongal, Karthigai Deepam) emphasizing organic cooking traditions.',
      adCopySnippet: `🌾 உங்கள் வீட்டு பாரம்பரிய சுவையை மீட்டெடுங்கள்!
மரச்செக்கு நல்லெண்ணெய், தூய நெய், நாட்டு சர்க்கரை.
ரசாயன கலப்பற்ற நேரடி விவசாயிகளின் தயாரிப்புகள்.
🚚 இன்றே ஆர்டர் செய்யுங்கள்!`,
      quickTips: [
        'Run video ads featuring spoken Tamil farm visits with English subtitles.',
        'Include Tamil product names in large readable typography next to English names.'
      ]
    },
    coreWebVitalsAdvice: 'Subset Tamil web fonts to only glyphs used on the site to avoid downloading multi-megabyte CJK/Indic font packages.'
  },
  {
    id: 'page_8_meta_opengraph',
    topicNumber: 8,
    title: 'Meta Titles, Descriptions & Social OpenGraph',
    category: 'technical',
    categoryLabel: 'Technical SEO & Schemas',
    pageTarget: 'Sitewide Document <head>',
    pageUrl: 'Sitewide',
    badge: 'CTR Engineering',
    priority: 'Critical',
    impactCTR: '+40% Social & SERP CTR',
    readTime: '5 min',
    summary: 'Every page must have an engineered 50-60 character title and 150-160 character description with emojis, brand signals, and OpenGraph social preview images.',
    headerImprovements: {
      titleFormula: '[Primary Keyword] – [Value Proposition / Pack] | MR. VIVASAYI',
      descriptionTemplate: '[Action Verb] [Primary Keyword] direct from Tamil Nadu farmers. [Key Benefit: 100% Wood Pressed / Zero Chemicals]. [Offer: Free Delivery over ₹499]. [Call to Action: Order Now!]',
      headTagsCode: `<!-- Production Meta Tags Formula -->
<meta name="title" content="Pure Wood Cold-Pressed Sesame Oil (1L) | MR. VIVASAYI" />
<meta name="description" content="Buy authentic Vaagai wood-pressed sesame oil online. Rich aroma, cold-processed without heat. Free delivery over ₹499. Order fresh farm harvest now!" />

<!-- OpenGraph Protocol -->
<meta property="og:type" content="website" />
<meta property="og:site_name" content="MR. VIVASAYI" />
<meta property="og:url" content="https://mrvivasayi.com/products/wood-pressed-sesame-oil-1l" />
<meta property="og:title" content="Wood Cold-Pressed Sesame Oil (1L) | MR. VIVASAYI" />
<meta property="og:description" content="100% natural farm harvest. Zero chemicals. Direct from Tamil Nadu farmers." />
<meta property="og:image" content="https://mrvivasayi.com/og-products-sesame.jpg" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />

<!-- Twitter Card Summary -->
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:site" content="@mrvivasayi" />
<meta name="twitter:creator" content="@mrvivasayi" />
<meta name="twitter:title" content="Wood Cold-Pressed Sesame Oil (1L)" />
<meta name="twitter:image" content="https://mrvivasayi.com/og-products-sesame.jpg" />`,
      canonicalRule: 'Absolute URLs only. Never relative paths like /products.',
      openGraphTags: 'All images must be exact 1200x630 pixels aspect ratio (1.91:1) to prevent cropping on WhatsApp and Facebook previews.',
      tamilKeywords: ['ஆர்கானிக் உணவு', 'மரச்செக்கு எண்ணெய் ஆன்லைன்']
    },
    structuredDataSchema: {
      schemaName: 'BreadcrumbList',
      description: 'Renders clean URL breadcrumbs in Google search snippets instead of ugly raw URLs.',
      jsonLdCode: `{
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [
    {
      "@type": "ListItem",
      "position": 1,
      "name": "Home",
      "item": "https://mrvivasayi.com/"
    },
    {
      "@type": "ListItem",
      "position": 2,
      "name": "Cold-Pressed Oils",
      "item": "https://mrvivasayi.com/products?category=oils"
    },
    {
      "@type": "ListItem",
      "position": 3,
      "name": "Sesame Oil 1L",
      "item": "https://mrvivasayi.com/products/wood-pressed-sesame-oil-1l"
    }
  ]
}`
    },
    headerChecklist: [
      { id: 'h8_char_limits', text: 'Titles strictly between 50 and 60 characters', details: 'Prevents truncation in Google mobile SERP displays.' },
      { id: 'h8_desc_limits', text: 'Descriptions between 145 and 160 characters', details: 'Ensures full snippet readability without awkward ellipses.' },
      { id: 'h8_whatsapp_preview', text: 'Verified WhatsApp chat preview cards with 1200x630 OG image', details: 'Ensures rich clickable previews when customers share products on WhatsApp.' }
    ],
    trafficGrowthGuide: {
      channel: 'Social Referral & Virality',
      blueprintTitle: 'Engineered WhatsApp Share Cards',
      strategy: 'When visitors tap "Share with Family on WhatsApp", generate a prefilled message with high-converting preview title and coupon code.',
      quickTips: [
        'Include numbers and currency symbols (e.g. "Save ₹150") in title tags to lift CTR.',
        'Never use duplicate title tags across two different products.'
      ]
    },
    coreWebVitalsAdvice: 'Serve OG images from the same CDN domain with long-lived Cache-Control headers.'
  },
  {
    id: 'page_9_canonical_urls',
    topicNumber: 9,
    title: 'Canonical URLs & Duplicate Content Prevention',
    category: 'technical',
    categoryLabel: 'Technical SEO & Schemas',
    pageTarget: 'Sitewide Document <head>',
    pageUrl: 'Sitewide',
    badge: 'Index Hygiene',
    priority: 'Critical',
    impactCTR: 'Zero Duplicate Penalties',
    readTime: '4 min',
    summary: 'Prevent search engine confusion caused by URL variations (tracking UTM tags, query parameters, trailing slashes, HTTP vs HTTPS, and WWW vs non-WWW).',
    headerImprovements: {
      titleFormula: 'Self-Referencing Canonical Matrix',
      descriptionTemplate: 'Every indexable page must contain a single canonical tag pointing to its canonical URL without dynamic marketing or tracking parameters.',
      headTagsCode: `<!-- Canonical Implementation Standard -->
<link rel="canonical" href="https://mrvivasayi.com/products" />

<!-- Canonical URL Rule in React Router / Next.js / Helmet -->
<Helmet>
  <link rel="canonical" href={\`https://mrvivasayi.com\${location.pathname.replace(/\\/+$/, '') || '/'}\`} />
</Helmet>`,
      canonicalRule: 'Strip ?utm_source, ?gclid, ?fbclid, and pagination duplicates into base canonical.',
      openGraphTags: `<meta property="og:url" content="https://mrvivasayi.com/products" />`,
      tamilKeywords: ['வலைத்தள முகவரி சீரமைப்பு']
    },
    structuredDataSchema: {
      schemaName: 'URL Canonicalization Mapping',
      description: 'Instructs crawlers on the single master URL representation.',
      jsonLdCode: `{
  "@context": "https://schema.org",
  "@type": "WebPage",
  "url": "https://mrvivasayi.com/products",
  "mainEntityOfPage": "https://mrvivasayi.com/products"
}`
    },
    headerChecklist: [
      { id: 'h9_lowercase', text: 'Strict lowercase URL enforcement', details: 'Ensure /Products redirects with 301 to /products.' },
      { id: 'h9_slash_consistency', text: 'Consistent trailing slash policy', details: 'Choose either trailing slash or no trailing slash sitewide; do not mix.' },
      { id: 'h9_https_redirect', text: 'Forced 301 redirect from HTTP to HTTPS', details: 'Guarantees all traffic consolidates into secure HTTPS indexation.' }
    ],
    trafficGrowthGuide: {
      channel: 'Crawl Budget Efficiency',
      blueprintTitle: 'Maximizing Googlebot Crawl Value',
      strategy: 'Consolidating duplicate query variations into clean canonicals ensures Googlebot spends 100% of its crawl budget discovering new products rather than duplicate URLs.',
      quickTips: [
        'Verify canonical tags using Chrome DevTools or Google Search Console URL Inspection.',
        'Never set canonical tags pointing to 404 or redirected pages.'
      ]
    },
    coreWebVitalsAdvice: 'Canonical tag resolution in client-side React should happen synchronously during SSR or initial HTML render.'
  },
  {
    id: 'page_10_json_ld_schema',
    topicNumber: 10,
    title: 'JSON-LD Structured Data & Schema.org Matrix',
    category: 'technical',
    categoryLabel: 'Technical SEO & Schemas',
    pageTarget: 'Sitewide & PDP / PLP',
    pageUrl: 'Sitewide',
    badge: 'Rich Results Validator',
    priority: 'Critical',
    impactCTR: '+55% Organic SERP Visibility',
    readTime: '6 min',
    summary: 'Deploy Google-validated JSON-LD structured data: Organization, Store, Product, Offer, AggregateRating, BreadcrumbList, and FAQPage schemas.',
    headerImprovements: {
      titleFormula: 'Schema.org JSON-LD Infrastructure',
      descriptionTemplate: 'Embedded machine-readable schemas empower Google to render merchant listings, price drops, star ratings, and direct brand info panels.',
      headTagsCode: `<!-- JSON-LD Injection Blueprint -->
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": "https://mrvivasayi.com/#organization",
      "name": "MR. VIVASAYI",
      "url": "https://mrvivasayi.com",
      "logo": "https://mrvivasayi.com/logo.png",
      "contactPoint": {
        "@type": "ContactPoint",
        "telephone": "+91-9876543210",
        "contactType": "Customer Support",
        "areaServed": "IN",
        "availableLanguage": ["Tamil", "English"]
      }
    }
  ]
}
</script>`,
      canonicalRule: 'JSON-LD @id URLs must match canonical page URLs.',
      openGraphTags: 'Schemas complement OpenGraph tags by targeting search crawlers directly.',
      tamilKeywords: ['கட்டமைக்கப்பட்ட தரவு', 'கூகிள் தேடுபொறி குறியீடு']
    },
    structuredDataSchema: {
      schemaName: 'FAQPage Structured Data',
      description: 'Displays expandable FAQ accordion questions directly beneath your website in Google search results.',
      jsonLdCode: `{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "What makes MR. VIVASAYI wood-pressed oil different from refined oil?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Our oils are crushed slowly in traditional Vaagai wood pestles at temperatures below 40°C without chemicals, heat or preservatives, retaining 100% of natural antioxidants and nutrients."
      }
    },
    {
      "@type": "Question",
      "name": "Do you offer Cash on Delivery (COD)?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Yes! We provide Cash on Delivery across all major pincodes in India alongside instant UPI payments."
      }
    }
  ]
}`
    },
    headerChecklist: [
      { id: 'h10_validate_rich', text: 'Validate via Google Rich Results Test tool', details: 'Ensure zero errors and zero missing required fields (price, image, availability).' },
      { id: 'h10_price_currency', text: 'Always specify "priceCurrency": "INR"', details: 'Guarantees proper ₹ rupee symbol rendering in Indian search results.' },
      { id: 'h10_dynamic_ratings', text: 'Tie aggregateRating to real customer reviews', details: 'Never hardcode fake ratings; sync with live Supabase reviews table.' }
    ],
    trafficGrowthGuide: {
      channel: 'Google Rich Results',
      blueprintTitle: 'Dominating SERP Screen Real Estate',
      strategy: 'Product and FAQ rich results expand your search snippet size by 2.5x, pushing competitors further down the screen.',
      quickTips: [
        'Test every schema changes with the Google Rich Results Test tool before deploying to production.',
        'Use @graph arrays to combine multiple schemas in a single script tag.'
      ]
    },
    coreWebVitalsAdvice: 'Place JSON-LD script tags at the bottom of <head> so they do not block parser execution of critical CSS.'
  },
  {
    id: 'page_11_image_webp',
    topicNumber: 11,
    title: 'Image Alt Tags, WebP Optimization & CDN Caching',
    category: 'performance',
    categoryLabel: 'Speed & Performance',
    pageTarget: 'Media Assets & <img> Tags',
    pageUrl: '/products',
    badge: 'Google Image SEO',
    priority: 'High',
    impactCTR: '+30% Google Images Traffic',
    readTime: '5 min',
    summary: 'Images drive substantial e-commerce organic traffic via Google Image Search. Use semantic filenames, descriptive alt tags, modern WebP formats, and CDN caching.',
    headerImprovements: {
      titleFormula: 'Descriptive Semantic Filename & Alt Structure',
      descriptionTemplate: 'Replace IMG_0921.jpg with wood-pressed-sesame-oil-1-litre-mr-vivasayi.webp and write context-rich alt descriptions.',
      headTagsCode: `<!-- Next-Gen Responsive Image Pattern with WebP & Fallback -->
<picture>
  <source srcset="/images/products/sesame-oil-400w.webp 400w, /images/products/sesame-oil-800w.webp 800w" type="image/webp" />
  <img 
    src="/images/products/sesame-oil-800w.jpg" 
    alt="MR. VIVASAYI Wood Cold-Pressed Sesame Oil 1 Litre Bottle showing pure golden color" 
    width="800" 
    height="800" 
    loading="lazy" 
    decoding="async" 
    className="rounded-2xl object-cover" 
  />
</picture>`,
      canonicalRule: 'Image CDN URLs should be hosted on a branded subdomain like cdn.mrvivasayi.com or assets.',
      openGraphTags: 'Always define explicit og:image:width="1200" and og:image:height="630".',
      tamilKeywords: ['படங்களின் உரை விளக்கம்', 'வேகமான வலைத்தள புகைப்படங்கள்']
    },
    structuredDataSchema: {
      schemaName: 'ImageObject Schema',
      description: 'Declares image copyright, caption, and creator metadata to Google Images.',
      jsonLdCode: `{
  "@context": "https://schema.org",
  "@type": "ImageObject",
  "contentUrl": "https://mrvivasayi.com/images/products/sesame-oil-1l.webp",
  "license": "https://mrvivasayi.com/license",
  "acquireLicensePage": "https://mrvivasayi.com/contact",
  "creator": {
    "@type": "Organization",
    "name": "MR. VIVASAYI"
  },
  "caption": "Fresh wood-pressed sesame oil extracted from Tamil Nadu sesame seeds"
}`
    },
    headerChecklist: [
      { id: 'h11_webp_format', text: 'All product photos converted to WebP or AVIF', details: 'Reduces payload size by 65% compared to legacy JPEG/PNG.' },
      { id: 'h11_explicit_dimensions', text: 'Explicit width and height attributes on all <img> tags', details: 'Prevents Cumulative Layout Shift (CLS = 0) by pre-allocating layout space.' },
      { id: 'h11_lazy_loading', text: 'loading="lazy" on all below-the-fold images', details: 'Saves cellular bandwidth and prioritizes hero assets for instant first paint.' }
    ],
    trafficGrowthGuide: {
      channel: 'Google Image Search & Pinterest',
      blueprintTitle: 'Capturing Visual Shopper Intent',
      strategy: 'High-resolution photos with clear labels (MRP, Litre, Organic stamp) rank prominently in visual shopping carousels.',
      quickTips: [
        'Include exact pack weight and size in the image alt text.',
        'Never stuff pure keyword strings into alt text; keep it natural and descriptive.'
      ]
    },
    coreWebVitalsAdvice: 'Never apply loading="lazy" to the primary hero image; use fetchpriority="high" instead.'
  },
  {
    id: 'page_12_xml_sitemap',
    topicNumber: 12,
    title: 'XML Sitemaps (sitemap.xml) & Search Console Submission',
    category: 'technical',
    categoryLabel: 'Technical SEO & Schemas',
    pageTarget: '/sitemap.xml',
    pageUrl: '/sitemap.xml',
    badge: 'Indexation Engine',
    priority: 'Critical',
    impactCTR: '100% URL Indexation',
    readTime: '4 min',
    summary: 'The XML sitemap serves as the roadmap for Googlebot and Bingbot. Automatically include all live product SKUs, categories, and static pages with accurate lastmod timestamps.',
    headerImprovements: {
      titleFormula: 'sitemap.xml Protocol Specification',
      descriptionTemplate: 'Structured XML document containing canonical URLs, modification dates, change frequencies, and relative priority weights.',
      headTagsCode: `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
  <url>
    <loc>https://mrvivasayi.com/</loc>
    <lastmod>2026-10-18</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://mrvivasayi.com/products</loc>
    <lastmod>2026-10-18</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>https://mrvivasayi.com/products/wood-pressed-sesame-oil-1l</loc>
    <lastmod>2026-10-17</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
    <image:image>
      <image:loc>https://mrvivasayi.com/images/products/sesame-oil-1l.webp</image:loc>
      <image:title>Wood Cold-Pressed Sesame Oil 1L</image:title>
    </image:image>
  </url>
</urlset>`,
      canonicalRule: 'Only 200 OK canonical URLs may be listed. Never include 301 redirects, 404s, or noindexed URLs.',
      openGraphTags: 'Sitemaps are backend XML feeds and do not require HTML head tags.',
      tamilKeywords: ['வலைத்தள வரைபடம்', 'கூகிள் பட்டியல்']
    },
    structuredDataSchema: {
      schemaName: 'Sitemap Auto-Ping Webhook',
      description: 'Webhook that pings Google Search Console whenever a new product SKU is published in CMS.',
      jsonLdCode: `{
  "action": "PING_SITEMAP",
  "endpoint": "https://www.google.com/ping?sitemap=https://mrvivasayi.com/sitemap.xml",
  "status": "AUTO_TRIGGERED_ON_PRODUCT_SAVE"
}`
    },
    headerChecklist: [
      { id: 'h12_gsc_submit', text: 'Submitted and verified in Google Search Console', details: 'Monitor "Discovered" vs "Indexed" ratios weekly.' },
      { id: 'h12_image_sitemap', text: 'Include <image:image> tags for every product photo', details: 'Guarantees image indexing alongside text content.' },
      { id: 'h12_auto_update', text: 'Automated lastmod generation from updated_at database column', details: 'Signals fresh inventory changes directly to search bots.' }
    ],
    trafficGrowthGuide: {
      channel: 'Google Search Console Indexing API',
      blueprintTitle: 'Rapid 2-Hour Product Indexation',
      strategy: 'Use Google Indexing API or sitemap pings so newly harvested batches appear in search results within hours.',
      quickTips: [
        'Check GSC Coverage report weekly to fix any excluded or soft 404 pages.',
        'Keep sitemap file size under 50MB and fewer than 50,000 URLs per file.'
      ]
    },
    coreWebVitalsAdvice: 'Serve sitemap.xml with Content-Type: application/xml and gzip compression.'
  },
  {
    id: 'page_13_robots_crawl',
    topicNumber: 13,
    title: 'Robots.txt, Crawl Budget & Indexing Rules',
    category: 'technical',
    categoryLabel: 'Technical SEO & Schemas',
    pageTarget: '/robots.txt',
    pageUrl: '/robots.txt',
    badge: 'Bot Governance',
    priority: 'Critical',
    impactCTR: 'Crawl Protection',
    readTime: '3 min',
    summary: 'Robots.txt tells web robots which pages they can or cannot request from your site. Protect private admin paths, customer accounts, and internal search results.',
    headerImprovements: {
      titleFormula: 'Production-Grade robots.txt File',
      descriptionTemplate: 'Clean disallow directives prevent bots from wasting crawl budget on admin interfaces, checkout sessions, and telemetry endpoints.',
      headTagsCode: `# Production robots.txt for MR. VIVASAYI
User-agent: *
Disallow: /admin/
Disallow: /admin/*
Disallow: /checkout
Disallow: /cart
Disallow: /api/
Disallow: /telemetry/
Disallow: /*?search=*
Disallow: /*?filter=*

Allow: /
Allow: /products
Allow: /products/*
Allow: /about
Allow: /contact

# Sitemap Location Directive
Sitemap: https://mrvivasayi.com/sitemap.xml`,
      canonicalRule: 'Robots.txt must be hosted strictly at the domain root: https://mrvivasayi.com/robots.txt.',
      openGraphTags: 'Plain text file without HTML tags.',
      tamilKeywords: ['ரோபோ கோப்பு அமைப்பு']
    },
    structuredDataSchema: {
      schemaName: 'Robots Directive Validation',
      description: 'Rule confirmation mapping for standard web spiders (Googlebot, Bingbot, DuckDuckBot).',
      jsonLdCode: `{
  "agent": "Googlebot",
  "disallow": ["/admin/", "/checkout", "/cart"],
  "sitemap": "https://mrvivasayi.com/sitemap.xml"
}`
    },
    headerChecklist: [
      { id: 'h13_admin_protected', text: 'All /admin/* paths strictly disallowed', details: 'Prevents internal dashboards from leaking into public search indices.' },
      { id: 'h13_sitemap_directive', text: 'Explicit Sitemap URL defined at the bottom of the file', details: 'Assists third-party search engines (Bing, DuckDuckGo, Yahoo) in finding your sitemap.' },
      { id: 'h13_clean_encoding', text: 'Saved with UTF-8 encoding and standard LF line endings', details: 'Prevents parsing errors by older crawler implementations.' }
    ],
    trafficGrowthGuide: {
      channel: 'Crawl Budget Optimization',
      blueprintTitle: 'Maximizing Fresh SKU Crawling',
      strategy: 'By blocking internal filter search URLs, crawlers spend 100% of their compute quota re-indexing your fresh product batches and pricing updates.',
      quickTips: [
        'Test robots.txt using Google Search Console Robots Testing tool.',
        'Never use robots.txt to hide sensitive credentials; use authentication guards.'
      ]
    },
    coreWebVitalsAdvice: 'Ensure robots.txt returns HTTP 200 OK within 50ms to prevent crawler timeout drops.'
  },
  {
    id: 'page_14_core_web_vitals',
    topicNumber: 14,
    title: 'Core Web Vitals (LCP, FID/INP, CLS) Tuning',
    category: 'performance',
    categoryLabel: 'Speed & Performance',
    pageTarget: 'Sitewide Performance Architecture',
    pageUrl: 'Sitewide',
    badge: 'PageSpeed 95+',
    priority: 'Critical',
    impactCTR: '+20% Ranking Boost',
    readTime: '6 min',
    summary: 'Core Web Vitals are official Google search ranking signals. Pass all three metrics: Largest Contentful Paint (<2.5s), Interaction to Next Paint (<200ms), and Cumulative Layout Shift (<0.1).',
    headerImprovements: {
      titleFormula: 'Core Web Vitals Optimization Matrix',
      descriptionTemplate: 'Eliminate render-blocking CSS/JS, optimize font display swaps, reserve container aspect ratios, and defer third-party analytics.',
      headTagsCode: `<!-- Performance Head Optimizations -->
<!-- 1. Preconnect to Critical Origins -->
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />

<!-- 2. Font Display Swap to Prevent FOIT -->
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;800&display=swap" rel="stylesheet" />

<!-- 3. Defer Non-Critical JavaScript -->
<script src="/analytics-telemetry.js" defer></script>`,
      canonicalRule: 'Speed optimizations apply universally to all canonical URLs.',
      openGraphTags: 'N/A - Direct browser rendering directives.',
      tamilKeywords: ['வலைத்தள வேகம்', 'பக்க ஏற்றுதல் வேகம்']
    },
    structuredDataSchema: {
      schemaName: 'Performance Target Benchmarks',
      description: 'Official Google Core Web Vitals thresholds for organic e-commerce storefronts.',
      jsonLdCode: `{
  "metrics": {
    "LCP": "< 2.5 seconds (Good)",
    "INP": "< 200 milliseconds (Good)",
    "CLS": "< 0.10 score (Good)",
    "FCP": "< 1.8 seconds (Good)",
    "TTFB": "< 600 milliseconds (Good)"
  }
}`
    },
    headerChecklist: [
      { id: 'h14_lcp_pass', text: 'LCP under 2.5 seconds on 4G cellular tests', details: 'Serve pre-compressed WebP hero images with fetchpriority="high".' },
      { id: 'h14_cls_zero', text: 'CLS score below 0.05 sitewide', details: 'All image banners, ad carousels, and icons have reserved height containers.' },
      { id: 'h14_inp_pass', text: 'INP under 150ms for add-to-cart clicks', details: 'Ensure cart state updates do not trigger heavy synchronous re-renders.' }
    ],
    trafficGrowthGuide: {
      channel: 'Google Mobile Speed Algorithm',
      blueprintTitle: 'Fast Sites Rank #1 on Mobile Devices',
      strategy: 'Google heavily penalizes slow e-commerce sites on mobile connections in Tier-2/Tier-3 Indian cities. Sub-2s loading doubles mobile conversion rates.',
      quickTips: [
        'Use Chrome DevTools Lighthouse and WebPageTest.org to verify real user telemetry.',
        'Purge unused Tailwind CSS classes to keep the final CSS bundle under 40 KB.'
      ]
    },
    coreWebVitalsAdvice: 'Enable Brotli compression on your web server for an automatic 20% bundle size reduction over standard Gzip.'
  },
  {
    id: 'page_15_organic_blog',
    topicNumber: 15,
    title: 'Organic Blog & Farm Story Content Marketing',
    category: 'storefront',
    categoryLabel: 'Storefront Architecture',
    pageTarget: 'Blog & Articles (/blog or /articles)',
    pageUrl: '/blog',
    badge: 'Informational SEO Funnel',
    priority: 'High',
    impactCTR: '+80% Top-of-Funnel Traffic',
    readTime: '5 min',
    summary: 'Capture buyers before they make purchase decisions by answering health queries: "Benefits of Karuppu Kavuni rice for diabetes" or "Why wood-pressed sesame oil is best for oil pulling".',
    headerImprovements: {
      titleFormula: '{Article_Title} – Health Benefits & Farm Guide | MR. VIVASAYI',
      descriptionTemplate: 'Discover {Key_Benefit}. Traditional wisdom backed by science. Learn how authentic {Product_Name} boosts health, vitality and immunity. Read full guide.',
      headTagsCode: `<!-- Blog Article Schema Head Tags -->
<title>7 Proven Health Benefits of Karuppu Kavuni Black Rice | MR. VIVASAYI</title>
<meta name="description" content="Discover why ancient Tamil kings consumed Karuppu Kavuni rice. High anthocyanin antioxidants, low glycemic index for diabetes, and high natural dietary fibre." />
<link rel="canonical" href="https://mrvivasayi.com/blog/karuppu-kavuni-rice-benefits" />`,
      canonicalRule: 'Clean slug URLs matching the target informational keyword.',
      openGraphTags: `<meta property="og:type" content="article" />
<meta property="article:published_time" content="2026-10-18T00:00:00Z" />
<meta property="article:author" content="MR. VIVASAYI Farm Collective" />
<meta property="article:section" content="Organic Living & Health" />`,
      tamilKeywords: ['கருப்பு கவுனி அரிசி நன்மைகள்', 'மரச்செக்கு எண்ணெய் மருத்துவ குணங்கள்', 'நாட்டு சர்க்கரை பயன்கள்']
    },
    structuredDataSchema: {
      schemaName: 'BlogPosting / Article',
      description: 'Enables Google Top Stories carousel and rich article cards in mobile search results.',
      jsonLdCode: `{
  "@context": "https://schema.org",
  "@type": "BlogPosting",
  "headline": "7 Proven Health Benefits of Karuppu Kavuni Black Rice",
  "image": "https://mrvivasayi.com/images/blog/karuppu-kavuni-benefits.webp",
  "author": {
    "@type": "Person",
    "name": "Organic Agri Specialist",
    "url": "https://mrvivasayi.com/about"
  },
  "publisher": {
    "@type": "Organization",
    "name": "MR. VIVASAYI",
    "logo": {
      "@type": "ImageObject",
      "url": "https://mrvivasayi.com/logo.png"
    }
  },
  "datePublished": "2026-10-18",
  "dateModified": "2026-10-18",
  "description": "Scientific analysis of native black rice nutrition, anthocyanin levels, and traditional preparation methods."
}`
    },
    headerChecklist: [
      { id: 'h15_internal_cta', text: 'Embedded "Shop Fresh Harvest" product cards inside blog body', details: 'Converts informational article readers directly into paying customers.' },
      { id: 'h15_table_contents', text: 'Sticky table of contents with jump anchor links', details: 'Triggers Google jump-to-section sitelinks in search results.' },
      { id: 'h15_read_time', text: 'Estimated reading time badge ("5 min read")', details: 'Increases reader completion rate and decreases bounce rate.' }
    ],
    trafficGrowthGuide: {
      channel: 'Organic Search Informational Funnels',
      blueprintTitle: 'Converting Health Curiosity to Grocery Orders',
      strategy: 'Target long-tail queries like "how to use cold-pressed sesame oil for hair" and end the article with a 15% discount code for first-time buyers.',
      quickTips: [
        'Include verified farmer quotes and photos of real Tamil Nadu fields.',
        'Link every mentioned product directly to its PDP with prominent buy buttons.'
      ]
    },
    coreWebVitalsAdvice: 'Render blog body text using system font stacks to ensure instant text readability.'
  },
  {
    id: 'page_16_customer_reviews',
    topicNumber: 16,
    title: 'Customer Reviews & User-Generated Content (UGC)',
    category: 'storefront',
    categoryLabel: 'Storefront Architecture',
    pageTarget: 'Customer Reviews Hub (/reviews)',
    pageUrl: '/reviews',
    badge: 'Social Proof & Trust',
    priority: 'High',
    impactCTR: '+45% Buyer Trust',
    readTime: '4 min',
    summary: 'Real customer feedback with verified purchase tags, unboxing photos, and star ratings provides the strongest psychological validation and generates natural keyword variations.',
    headerImprovements: {
      titleFormula: 'Customer Reviews & Ratings – 4.9★ Real Farm Feedback | MR. VIVASAYI',
      descriptionTemplate: 'Read 2,400+ verified customer reviews of MR. VIVASAYI organic products. Authentic feedback on cold-pressed sesame oil, palm jaggery, and farm delivery speed.',
      headTagsCode: `<!-- Reviews Page Head -->
<title>Customer Reviews & Ratings – 4.9★ Verified Purity | MR. VIVASAYI</title>
<meta name="description" content="Read real reviews from thousands of families who switched to pure farm-pressed oils and natural foods. Rated 4.9/5 for purity and aroma." />
<link rel="canonical" href="https://mrvivasayi.com/reviews" />`,
      canonicalRule: 'Self-referential canonical to /reviews.',
      openGraphTags: `<meta property="og:title" content="What Customers Say About MR. VIVASAYI Farm Foods" />
<meta property="og:description" content="Rated 4.9/5 by 2,400+ health-conscious families across India." />`,
      tamilKeywords: ['வாடிக்கையாளர் கருத்துகள்', 'உண்மையான மதிப்புரைகள்']
    },
    structuredDataSchema: {
      schemaName: 'AggregateRating / Review',
      description: 'Signals high brand trust and seller ratings to search engines and Google Shopping.',
      jsonLdCode: `{
  "@context": "https://schema.org",
  "@type": "Product",
  "name": "MR. VIVASAYI Farm Products Catalog",
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": "4.9",
    "bestRating": "5",
    "worstRating": "1",
    "ratingCount": "2450"
  }
}`
    },
    headerChecklist: [
      { id: 'h16_verified_pill', text: 'Verified Buyer badge next to reviewer name', details: 'Guarantees authenticity and eliminates skepticism.' },
      { id: 'h16_photo_ugc', text: 'Photo & video review gallery showing real unboxing', details: 'Photo reviews convert 3.2x higher than plain text reviews.' },
      { id: 'h16_star_filter', text: 'Filter by star rating (5★, 4★) and product category', details: 'Allows buyers to quickly read reviews for specific items like Sesame Oil.' }
    ],
    trafficGrowthGuide: {
      channel: 'Google Seller Rating & Instagram Stories',
      blueprintTitle: 'Amplifying Customer Testimonials',
      strategy: 'Take screenshots of 5-star WhatsApp customer messages and post them as daily Instagram Stories with direct product purchase links.',
      quickTips: [
        'Send automated WhatsApp review request 5 days after order delivery.',
        'Incentivize honest photo reviews with a ₹50 cashback coupon on next order.'
      ]
    },
    coreWebVitalsAdvice: 'Paginate customer reviews in batches of 10 to keep DOM node count low.'
  },
  {
    id: 'page_17_mobile_pwa',
    topicNumber: 17,
    title: 'Mobile-First Responsiveness & PWA Experience',
    category: 'performance',
    categoryLabel: 'Speed & Performance',
    pageTarget: 'Mobile App Manifest & Viewport <head>',
    pageUrl: 'Sitewide',
    badge: 'Mobile PWA Engine',
    priority: 'Critical',
    impactCTR: '+70% Mobile Retention',
    readTime: '5 min',
    summary: 'Over 85% of Indian e-commerce transactions occur on mobile phones. Deliver an app-like Progressive Web App (PWA) with instant touch response and offline caching.',
    headerImprovements: {
      titleFormula: 'PWA Web App Manifest & Mobile Viewport Directives',
      descriptionTemplate: 'Web App Manifest enables "Install to Home Screen" prompt, splash screens, and offline service worker caching.',
      headTagsCode: `<!-- Mobile & PWA Head Tags -->
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0, viewport-fit=cover" />
<meta name="mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
<meta name="apple-mobile-web-app-title" content="MR. VIVASAYI" />
<link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
<link rel="manifest" href="/manifest.json" />
<meta name="theme-color" content="#064e3b" />`,
      canonicalRule: 'Mobile and desktop share identical canonical URLs (Responsive Web Design).',
      openGraphTags: 'N/A - Native mobile browser integration.',
      tamilKeywords: ['மொபைல் செயலி', 'வேகமான மொபைல் தளம்']
    },
    structuredDataSchema: {
      schemaName: 'WebApplication Schema',
      description: 'Instructs search engines that the web application functions as an installable PWA.',
      jsonLdCode: `{
  "@context": "https://schema.org",
  "@type": "WebApplication",
  "name": "MR. VIVASAYI Organic Store",
  "operatingSystem": "All",
  "applicationCategory": "ShoppingApplication",
  "installUrl": "https://mrvivasayi.com/"
}`
    },
    headerChecklist: [
      { id: 'h17_touch_targets', text: 'All interactive buttons have minimum 48x48px touch targets', details: 'Prevents mis-clicks and passes Google Mobile Usability audits.' },
      { id: 'h17_sticky_bottom', text: 'Sticky bottom mobile navigation bar (Shop, Search, Cart, WhatsApp)', details: 'Puts core shopping actions directly under the user thumb zone.' },
      { id: 'h17_pwa_prompt', text: 'Custom "Install App for 10% OFF" banner prompt', details: 'Increases repeat order retention by 4x compared to anonymous browser sessions.' }
    ],
    trafficGrowthGuide: {
      channel: 'Push Notifications & Home Screen Icon',
      blueprintTitle: 'Direct Zero-Ad Re-engagement',
      strategy: 'Once customer installs the PWA, send weekend harvest push notifications directly to their phone screen without paying for SMS or ads.',
      quickTips: [
        'Test on low-cost Android smartphones with 3G/4G throttling in DevTools.',
        'Ensure the iOS safe area insets (env(safe-area-inset-bottom)) are respected on notched phones.'
      ]
    },
    coreWebVitalsAdvice: 'Use CSS touch-action: manipulation to eliminate the 300ms tap delay on mobile devices.'
  },
  {
    id: 'page_18_error_404_redirects',
    topicNumber: 18,
    title: '404 Custom Error Page & Stale URL 301 Redirects',
    category: 'technical',
    categoryLabel: 'Technical SEO & Schemas',
    pageTarget: '404 Error Page & Redirect Rules',
    pageUrl: '/404',
    badge: 'Broken Link Recovery',
    priority: 'High',
    impactCTR: 'Zero Traffic Loss',
    readTime: '3 min',
    summary: 'Never let broken links or deleted products show a dead-end 404. Offer smart category suggestions, a search bar, and permanent 301 redirects for modified URLs.',
    headerImprovements: {
      titleFormula: 'Page Not Found (404) – Find Fresh Farm Harvest | MR. VIVASAYI',
      descriptionTemplate: 'The page you requested could not be found. Explore our fresh cold-pressed oils, traditional rices and organic groceries.',
      headTagsCode: `<!-- 404 Error Head Directives -->
<title>Page Not Found – MR. VIVASAYI</title>
<meta name="robots" content="noindex, follow" />
<meta http-equiv="Status" content="404 Not Found" />`,
      canonicalRule: '404 pages must not specify canonical tags pointing to themselves.',
      openGraphTags: `<meta property="og:title" content="Page Not Found | MR. VIVASAYI" />`,
      tamilKeywords: ['பக்கம் கிடைக்கவில்லை']
    },
    structuredDataSchema: {
      schemaName: 'NotFoundPage',
      description: 'Clean error state recognition for search engine indexers.',
      jsonLdCode: `{
  "@context": "https://schema.org",
  "@type": "WebPage",
  "name": "404 Not Found"
}`
    },
    headerChecklist: [
      { id: 'h18_http_404', text: 'Returns real HTTP 404 status code (not soft 404 200 OK)', details: 'Soft 404s pollute search console coverage reports.' },
      { id: 'h18_smart_links', text: 'Top 4 bestselling product shortcuts on 404 screen', details: 'Rescues 38% of lost visitors and redirects them back to shopping.' },
      { id: 'h18_redirect_table', text: 'Maintain 301 redirect mapping in CMS table manager', details: 'Automatically route old URLs like /oil/sesame to /products/wood-pressed-sesame-oil-1l.' }
    ],
    trafficGrowthGuide: {
      channel: 'Google Search Console Crawl Error Audit',
      blueprintTitle: 'Fixing Broken Inbound Backlinks',
      strategy: 'Check GSC "Not found (404)" report monthly. If an old URL has inbound backlinks from food blogs, set up a 301 redirect to keep page equity.',
      quickTips: [
        'Include a direct "Contact Harvest Team on WhatsApp" button on 404 pages.',
        'Never redirect all 404s blindly to the homepage; Google considers that a soft 404.'
      ]
    },
    coreWebVitalsAdvice: 'Keep 404 page lightweight with inline CSS and zero external JavaScript dependencies.'
  },
  {
    id: 'page_19_whatsapp_traffic',
    topicNumber: 19,
    title: 'WhatsApp Hub & Virality Direct Loops',
    category: 'traffic',
    categoryLabel: 'Traffic & Customer Acquisition',
    pageTarget: 'WhatsApp Integration & Floating Chat',
    pageUrl: 'Sitewide & /admin/whatsapp-hub',
    badge: 'Direct-to-Consumer Funnel',
    priority: 'Critical',
    impactCTR: '+85% Message Open Rate',
    readTime: '4 min',
    summary: 'WhatsApp is India primary communication super-app. Deploy prefilled 1-click chat triggers, harvest broadcasts, and viral customer referral loops.',
    headerImprovements: {
      titleFormula: 'WhatsApp Direct Commerce Integration Matrix',
      descriptionTemplate: 'Connect floating WhatsApp pills, product share triggers, and automated harvest updates directly to the customer mobile phone.',
      headTagsCode: `<!-- WhatsApp Floating Direct Trigger Head -->
<link rel="dns-prefetch" href="https://api.whatsapp.com" />
<link rel="preconnect" href="https://api.whatsapp.com" crossorigin />`,
      canonicalRule: 'Direct WhatsApp click-to-chat links must use https://wa.me/91XXXXXXXXXX?text=...',
      openGraphTags: 'Ensure OpenGraph tags generate crisp product images when links are shared inside WhatsApp groups.',
      tamilKeywords: ['வாட்ஸ்அப் ஆர்டர்', 'நேரடி தொடர்பு']
    },
    structuredDataSchema: {
      schemaName: 'ContactPoint with WhatsApp',
      description: 'Declares official WhatsApp support channel in Organization schema.',
      jsonLdCode: `{
  "@context": "https://schema.org",
  "@type": "ContactPoint",
  "telephone": "+91-9876543210",
  "contactType": "Customer Service & Orders",
  "contactOption": "WhatsApp",
  "availableLanguage": ["Tamil", "English"]
}`
    },
    headerChecklist: [
      { id: 'h19_floating_pill', text: 'Floating pulsing WhatsApp pill at bottom right', details: 'Instant 1-tap customer support lifts conversion confidence by 35%.' },
      { id: 'h19_prefilled_text', text: 'Prefilled message includes current product SKU & URL', details: 'e.g. "Vanakkam! I want to order Wood Pressed Sesame Oil (1L). Please send details."' },
      { id: 'h19_broadcast_optin', text: 'One-click "Join Friday Harvest VIP Broadcast" checkbox at checkout', details: 'Builds a high-value list of repeat buyers with zero monthly ad spend.' }
    ],
    trafficGrowthGuide: {
      channel: 'Direct WhatsApp Broadcast Lists',
      blueprintTitle: 'Friday Harvest Drop System',
      strategy: 'Send a high-energy broadcast every Friday at 10:00 AM with fresh oil extraction photos and a limited weekend discount code.',
      adCopySnippet: `📢 Fresh Cold-Press Batch Ready!
Vanakkam {Name}! The farmers just finished pressing fresh Vaagai wood Sesame & Groundnut oils.
✨ 100% Raw & Unrefined
✨ Limited 40 bottles available this weekend
👉 Tap here to order before 3 PM: https://mrvivasayi.com/products`,
      quickTips: [
        'Always ask permission before adding customers to broadcast lists to prevent phone number bans.',
        'Reply to customer inquiries within 10 minutes to close sales while purchase intent is high.'
      ]
    },
    coreWebVitalsAdvice: 'Load the WhatsApp widget script lazily after window load event so it never blocks First Contentful Paint.'
  },
  {
    id: 'page_20_paid_acquisition',
    topicNumber: 20,
    title: 'Paid Traffic Funnels (Meta, Instagram & Google Ads)',
    category: 'traffic',
    categoryLabel: 'Traffic & Customer Acquisition',
    pageTarget: 'Campaign Landing Pages & Telemetry',
    pageUrl: '/products?utm_source=meta_ads',
    badge: 'Multi-Channel Scale',
    priority: 'Critical',
    impactCTR: '4.5x - 6.0x Blended RoAS',
    readTime: '6 min',
    summary: 'Scale customer traffic rapidly with paid ad funnels: Meta Advantage+ Shopping, Instagram Video Reels, and Google High-Intent Search Ads.',
    headerImprovements: {
      titleFormula: 'Campaign Tracking & Tag Management Head Infrastructure',
      descriptionTemplate: 'Deploy Meta Pixel, Google Tag (gtag.js), and Conversion API (CAPI) events to measure exact Return on Ad Spend (RoAS).',
      headTagsCode: `<!-- Meta Pixel & Google Ads Head Tag Setup -->
<script>
  !function(f,b,e,v,n,t,s)
  {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
  n.callMethod.apply(n,arguments):n.queue.push(arguments)};
  if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
  n.queue=[];t=b.createElement(e);t.async=!0;
  t.src=v;s=b.getElementsByTagName(e)[0];
  s.parentNode.insertBefore(t,s)}(window, document,'script',
  'https://connect.facebook.net/en_US/fbevents.js');
  fbq('init', 'YOUR_PIXEL_ID');
  fbq('track', 'PageView');
</script>`,
      canonicalRule: 'All campaign URLs with UTM parameters must point their canonical to the clean target page.',
      openGraphTags: 'Ensure ad creative visual assets match the hero banner on the destination landing page.',
      tamilKeywords: ['விளம்பர உத்தி', 'கூகிள் விளம்பரம்', 'பேஸ்புக் விளம்பரம்']
    },
    structuredDataSchema: {
      schemaName: 'SpecialAnnouncement / PromotionOffer',
      description: 'Declares promotional discounts and limited-time harvest offers.',
      jsonLdCode: `{
  "@context": "https://schema.org",
  "@type": "SpecialAnnouncement",
  "name": "Weekend Harvest Offer - 15% OFF",
  "text": "Get 15% off all wood-pressed oils with coupon code HARVEST15. Free doorstep delivery over ₹499.",
  "category": "https://schema.org/SpecialAnnouncement",
  "url": "https://mrvivasayi.com/products"
}`
    },
    headerChecklist: [
      { id: 'h20_pixel_events', text: 'All standard events tracked: ViewContent, AddToCart, InitiateCheckout, Purchase', details: 'Feeds ad machine learning algorithms to find high-spending customers.' },
      { id: 'h20_utm_builder', text: 'Consistent UTM tags on all ad links (utm_source, utm_medium, utm_campaign)', details: 'Shows exact revenue contribution per ad set in the Website Analyzer.' },
      { id: 'h20_speed_landing', text: 'Dedicated lightning-fast mobile landing page for ad clicks', details: 'Every 1 second delay on landing pages drops ad conversion rate by 12%.' }
    ],
    trafficGrowthGuide: {
      channel: 'Multi-Channel Paid Acquisition Blueprint',
      blueprintTitle: 'The 3-Tier Organic Grocery Funnel',
      strategy: 'Top-of-funnel: Instagram Reels of farm oil extraction. Middle-of-funnel: Meta Carousel ads of top 5 bestsellers. Bottom-of-funnel: Google Search Ads for [buy sesame oil online].',
      adCopySnippet: `🌿 Pure Wood-Pressed Sesame & Coconut Oils
Crushed slowly in Vaagai wood pestles. Direct from Tamil Nadu farmers.
✨ 100% Chemical Free
✨ Lab Tested Purity
✨ Cash on Delivery Available
👉 Tap 'Shop Now' to get 10% OFF code FARM10!`,
      quickTips: [
        'Test video creatives against static photos; video delivers 4x higher CTR on Instagram.',
        'Target mothers, home cooks, and health enthusiasts aged 26-55 in Chennai, Coimbatore, and Bengaluru.'
      ]
    },
    coreWebVitalsAdvice: 'Load analytics and pixel libraries with async or defer to avoid degrading customer experience.'
  }
];

export const SEOGrowthGuideView: React.FC = () => {
  const [selectedTopicId, setSelectedTopicId] = useState<string>('page_1_global_header');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'storefront' | 'technical' | 'traffic' | 'performance'>('all');
  const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null);
  const [completedChecklist, setCompletedChecklist] = useState<Record<string, boolean>>({});

  // Filter topics based on search and category
  const filteredTopics = useMemo(() => {
    return SEO_20_TOPICS.filter((t) => {
      const matchesCategory = categoryFilter === 'all' || t.category === categoryFilter;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        t.title.toLowerCase().includes(q) ||
        t.summary.toLowerCase().includes(q) ||
        t.pageTarget.toLowerCase().includes(q) ||
        t.badge.toLowerCase().includes(q) ||
        t.headerImprovements.tamilKeywords.some((k) => k.toLowerCase().includes(q));
      return matchesCategory && matchesSearch;
    });
  }, [searchQuery, categoryFilter]);

  const activeTopic = useMemo(() => {
    return SEO_20_TOPICS.find((t) => t.id === selectedTopicId) || SEO_20_TOPICS[0];
  }, [selectedTopicId]);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCodeId(id);
    toast.success('Code copied to clipboard! ✓');
    setTimeout(() => setCopiedCodeId(null), 2500);
  };

  const toggleChecklistItem = (id: string) => {
    setCompletedChecklist((prev) => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const totalChecklistItems = activeTopic.headerChecklist.length;
  const completedCount = activeTopic.headerChecklist.filter((item) => completedChecklist[item.id]).length;
  const progressPercent = Math.round((completedCount / totalChecklistItems) * 100);

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* ─── HERO HEADER BANNER ─── */}
      <div className="bg-gradient-to-r from-emerald-950 via-teal-950 to-slate-900 text-white p-6 sm:p-8 rounded-3xl border border-emerald-500/40 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="max-w-3xl">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-sm">
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                CMS SEO & STOREFRONT MASTER GUIDE
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30 text-[11px] font-mono font-bold">
                20 Complete Pages & Header Directives
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[11px] font-mono font-bold">
                Google Rich Snippets Ready
              </span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-serif font-extrabold text-white tracking-tight">
              Website SEO & Page Header Optimization Playbook
            </h1>
            <p className="text-emerald-200/90 text-xs sm:text-sm mt-2 leading-relaxed">
              Complete technical specification for HTML <code className="bg-emerald-900/60 px-1.5 py-0.5 rounded text-amber-300 font-mono text-xs">&lt;head&gt;</code> tags,
              JSON-LD Structured Data, OpenGraph social previews, Tamil regional keywords, Core Web Vitals speed rules,
              and paid acquisition blueprints across all 20 pages of MR. VIVASAYI.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => {
                const allSchemas = SEO_20_TOPICS.map((t) => `/* Topic ${t.topicNumber}: ${t.title} */\n${t.structuredDataSchema.jsonLdCode}`).join('\n\n');
                copyToClipboard(allSchemas, 'all_schemas');
              }}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold border border-emerald-400/40 shadow-lg transition-all flex items-center gap-2 cursor-pointer hover:scale-105 active:scale-95"
            >
              {copiedCodeId === 'all_schemas' ? <Check className="w-4 h-4 text-amber-300" /> : <Copy className="w-4 h-4" />}
              <span>{copiedCodeId === 'all_schemas' ? 'All Schemas Copied!' : 'Copy All 20 Schemas'}</span>
            </button>
            <a
              href="https://search.google.com/test/rich-results"
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2.5 bg-slate-800/80 hover:bg-slate-700 text-slate-200 hover:text-white rounded-xl text-xs font-bold border border-slate-700 transition flex items-center gap-2"
            >
              <ExternalLink className="w-4 h-4 text-indigo-400" />
              <span>Google Rich Results Test</span>
            </a>
          </div>
        </div>
      </div>

      {/* ─── 2-COLUMN SPLIT LAYOUT: LEFT SIDE TOPICS (20) | RIGHT SIDE EXPLANATIONS & IMPROVEMENTS ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ════════════ LEFT COLUMN (lg:col-span-4): 20 TOPICS LIST ════════════ */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white dark:bg-emerald-950 rounded-3xl p-4 sm:p-5 border border-emerald-100 dark:border-emerald-800 shadow-md sticky top-6">
            {/* Search Input */}
            <div className="relative mb-3">
              <Search className="w-4 h-4 text-emerald-600 dark:text-emerald-400 absolute left-3 top-3" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search 20 topics, tags, schemas..."
                className="w-full pl-9 pr-8 py-2 bg-emerald-50/50 dark:bg-emerald-900/40 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs font-medium text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-white text-xs font-bold"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Category Filter Pills */}
            <div className="flex flex-wrap gap-1.5 mb-3 pb-3 border-b border-emerald-100 dark:border-emerald-800/80">
              {[
                { id: 'all', label: `All (${SEO_20_TOPICS.length})` },
                { id: 'storefront', label: 'Storefront (8)' },
                { id: 'technical', label: 'Technical (6)' },
                { id: 'traffic', label: 'Traffic & Ads (3)' },
                { id: 'performance', label: 'Speed (3)' }
              ].map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setCategoryFilter(cat.id as any)}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase transition-all cursor-pointer ${
                    categoryFilter === cat.id
                      ? 'bg-emerald-700 text-white shadow-xs'
                      : 'bg-emerald-50 dark:bg-emerald-900/40 text-emerald-900 dark:text-emerald-300 hover:bg-emerald-100'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Topics Counter */}
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 dark:text-emerald-400 mb-2 px-1">
              <span>Showing {filteredTopics.length} of 20 Topics</span>
              <span className="text-amber-500 font-mono">100% Comprehensive</span>
            </div>

            {/* Scrollable Topics List */}
            <div className="space-y-2 max-h-[calc(100vh-320px)] overflow-y-auto pr-1 scrollbar-thin">
              {filteredTopics.map((topic) => {
                const isSelected = selectedTopicId === topic.id;
                const checklistTotal = topic.headerChecklist.length;
                const checked = topic.headerChecklist.filter((c) => completedChecklist[c.id]).length;

                return (
                  <button
                    key={topic.id}
                    type="button"
                    onClick={() => setSelectedTopicId(topic.id)}
                    className={`w-full text-left p-3 rounded-2xl transition-all cursor-pointer flex items-start justify-between gap-3 border ${
                      isSelected
                        ? 'bg-gradient-to-r from-emerald-700 to-teal-800 text-white border-emerald-500 shadow-md ring-2 ring-emerald-500/30'
                        : 'bg-white dark:bg-emerald-900/30 hover:bg-emerald-50 dark:hover:bg-emerald-900/70 border-emerald-100 dark:border-emerald-800/60 text-slate-800 dark:text-emerald-100'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 mb-1">
                        <span
                          className={`font-mono font-black text-[10px] px-1.5 py-0.5 rounded-md ${
                            isSelected
                              ? 'bg-amber-400 text-emerald-950'
                              : 'bg-emerald-100 dark:bg-emerald-800 text-emerald-900 dark:text-amber-300'
                          }`}
                        >
                          #{topic.topicNumber.toString().padStart(2, '0')}
                        </span>
                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md uppercase tracking-wider ${
                            topic.priority === 'Critical'
                              ? isSelected ? 'bg-rose-500 text-white' : 'bg-rose-100 dark:bg-rose-900/60 text-rose-700 dark:text-rose-300'
                              : isSelected ? 'bg-amber-400/30 text-amber-200' : 'bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300'
                          }`}
                        >
                          {topic.priority}
                        </span>
                        <span className={`text-[10px] font-medium truncate ${isSelected ? 'text-emerald-200' : 'text-slate-400'}`}>
                          {topic.readTime}
                        </span>
                      </div>

                      <h4 className={`text-xs font-bold leading-snug line-clamp-2 ${isSelected ? 'text-white' : 'text-slate-900 dark:text-white'}`}>
                        {topic.title}
                      </h4>

                      <div className="flex items-center gap-2 mt-1.5">
                        <span className={`text-[9px] font-mono font-semibold ${isSelected ? 'text-emerald-100' : 'text-emerald-700 dark:text-emerald-300'}`}>
                          {topic.pageTarget}
                        </span>
                        {checked > 0 && (
                          <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold ${isSelected ? 'bg-white/20 text-white' : 'bg-emerald-100 dark:bg-emerald-800 text-emerald-800 dark:text-emerald-200'}`}>
                            ✓ {checked}/{checklistTotal}
                          </span>
                        )}
                      </div>
                    </div>

                    <ChevronRight
                      className={`w-4 h-4 shrink-0 mt-2 transition-transform ${
                        isSelected ? 'text-amber-300 translate-x-1' : 'text-slate-400'
                      }`}
                    />
                  </button>
                );
              })}

              {filteredTopics.length === 0 && (
                <div className="p-6 text-center text-slate-400 dark:text-emerald-300 text-xs">
                  No topics match "{searchQuery}". Try searching "schema", "header", "Tamil", or "PDP".
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ════════════ RIGHT COLUMN (lg:col-span-8): DETAILED TOPIC EXPLANATIONS & IMPROVEMENTS ════════════ */}
        <div className="lg:col-span-8 space-y-6">
          {/* Active Topic Banner Card */}
          <div className="bg-white dark:bg-emerald-950 p-6 sm:p-7 rounded-3xl border border-emerald-100 dark:border-emerald-800 shadow-md space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="bg-emerald-700 text-white font-mono font-black text-xs px-2.5 py-1 rounded-xl shadow-xs">
                  Topic #{activeTopic.topicNumber.toString().padStart(2, '0')}
                </span>
                <span className="bg-emerald-100 dark:bg-emerald-900/80 text-emerald-900 dark:text-amber-300 text-xs font-bold px-3 py-1 rounded-xl">
                  {activeTopic.categoryLabel}
                </span>
                <span className="bg-indigo-100 dark:bg-indigo-900/80 text-indigo-900 dark:text-indigo-200 text-xs font-mono font-bold px-3 py-1 rounded-xl">
                  {activeTopic.pageTarget}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400">
                  Impact: {activeTopic.impactCTR}
                </span>
              </div>
            </div>

            <div>
              <h2 className="text-xl sm:text-2xl font-serif font-black text-slate-900 dark:text-white">
                {activeTopic.title}
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-emerald-200/90 mt-2 leading-relaxed">
                {activeTopic.summary}
              </p>
            </div>

            {/* Progress Tracker for this Topic Checklist */}
            <div className="p-3 bg-emerald-50/60 dark:bg-emerald-900/40 rounded-2xl border border-emerald-100 dark:border-emerald-800 flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-amber-400" />
                <span className="text-xs font-bold text-slate-800 dark:text-white">
                  Header Implementation Checklist: {completedCount} / {totalChecklistItems} Completed
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-24 sm:w-32 bg-gray-200 dark:bg-emerald-950 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-emerald-600 to-amber-400 h-full rounded-full transition-all duration-300"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <span className="text-xs font-mono font-black text-emerald-700 dark:text-amber-300">
                  {progressPercent}%
                </span>
              </div>
            </div>
          </div>

          {/* ─── SECTION 1: PAGE HEADER & META TAGS IMPROVEMENT (The Core Request) ─── */}
          <div className="bg-white dark:bg-emerald-950 p-6 sm:p-7 rounded-3xl border border-emerald-100 dark:border-emerald-800 shadow-md space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-emerald-100 dark:border-emerald-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center text-emerald-700 dark:text-amber-400">
                  <Code2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white">
                    Page Header & HTML &lt;head&gt; Directives
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-emerald-300">
                    Exact title formulas, descriptions, viewport rules, preconnects, and OpenGraph tags.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => copyToClipboard(activeTopic.headerImprovements.headTagsCode, 'head_tags')}
                className="px-3 py-1.5 bg-emerald-50 dark:bg-emerald-900 hover:bg-emerald-100 text-emerald-800 dark:text-emerald-200 rounded-xl text-xs font-bold border border-emerald-200 dark:border-emerald-700 flex items-center gap-1.5 transition cursor-pointer"
              >
                {copiedCodeId === 'head_tags' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedCodeId === 'head_tags' ? 'Copied!' : 'Copy <head> Snippet'}</span>
              </button>
            </div>

            {/* Title & Description Formula Boxes */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-emerald-50/50 dark:bg-emerald-900/30 rounded-2xl border border-emerald-100 dark:border-emerald-800/80 space-y-1.5">
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 dark:text-amber-300 flex items-center gap-1">
                  <Tag className="w-3 h-3" /> Recommended &lt;title&gt; Formula
                </span>
                <p className="text-xs font-bold text-slate-900 dark:text-white leading-relaxed">
                  {activeTopic.headerImprovements.titleFormula}
                </p>
              </div>

              <div className="p-4 bg-emerald-50/50 dark:bg-emerald-900/30 rounded-2xl border border-emerald-100 dark:border-emerald-800/80 space-y-1.5">
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 dark:text-amber-300 flex items-center gap-1">
                  <FileText className="w-3 h-3" /> Meta &lt;description&gt; Template
                </span>
                <p className="text-xs font-medium text-slate-700 dark:text-emerald-200 leading-relaxed">
                  {activeTopic.headerImprovements.descriptionTemplate}
                </p>
              </div>
            </div>

            {/* HTML Head Code Block */}
            <div>
              <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 dark:text-emerald-400 mb-1.5">
                <span>Direct HTML / React Helmet Implementation:</span>
                <span className="text-[10px] text-amber-500">Self-Referential Canonical & Social Meta</span>
              </div>
              <pre className="p-4 bg-slate-950 text-emerald-300 font-mono text-xs rounded-2xl border border-slate-800 overflow-x-auto leading-relaxed shadow-inner">
                {activeTopic.headerImprovements.headTagsCode}
              </pre>
            </div>

            {/* Social OpenGraph Preview Code */}
            {activeTopic.headerImprovements.openGraphTags && (
              <div>
                <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 dark:text-emerald-400 mb-1.5">
                  <span className="flex items-center gap-1">
                    <Share2 className="w-3.5 h-3.5 text-indigo-400" />
                    OpenGraph & Social Preview Meta Tags:
                  </span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(activeTopic.headerImprovements.openGraphTags, 'og_tags')}
                    className="text-[10px] text-emerald-400 hover:underline cursor-pointer flex items-center gap-1"
                  >
                    <Copy className="w-3 h-3" /> Copy OG Tags
                  </button>
                </div>
                <pre className="p-4 bg-slate-950 text-indigo-300 font-mono text-xs rounded-2xl border border-slate-800 overflow-x-auto leading-relaxed shadow-inner">
                  {activeTopic.headerImprovements.openGraphTags}
                </pre>
              </div>
            )}

            {/* Tamil Regional Keywords Pill Matrix */}
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 dark:text-amber-300 block mb-2">
                High-Volume Tamil & Tanglish Organic Keywords for this Page
              </span>
              <div className="flex flex-wrap gap-2">
                {activeTopic.headerImprovements.tamilKeywords.map((kw, i) => (
                  <span
                    key={i}
                    className="px-3 py-1 bg-amber-50 dark:bg-emerald-900/60 text-emerald-900 dark:text-amber-300 border border-amber-200 dark:border-emerald-700 rounded-xl text-xs font-bold flex items-center gap-1.5"
                  >
                    <span>🌾</span> {kw}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* ─── SECTION 2: JSON-LD STRUCTURED DATA SCHEMA ─── */}
          <div className="bg-white dark:bg-emerald-950 p-6 sm:p-7 rounded-3xl border border-emerald-100 dark:border-emerald-800 shadow-md space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-emerald-100 dark:border-emerald-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-900/60 flex items-center justify-center text-amber-800 dark:text-amber-300">
                  <Terminal className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white">
                    JSON-LD Schema Markup ({activeTopic.structuredDataSchema.schemaName})
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-emerald-300">
                    {activeTopic.structuredDataSchema.description}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => copyToClipboard(activeTopic.structuredDataSchema.jsonLdCode, 'json_ld')}
                className="px-3 py-1.5 bg-amber-50 dark:bg-emerald-900 hover:bg-amber-100 text-amber-900 dark:text-amber-300 rounded-xl text-xs font-bold border border-amber-200 dark:border-emerald-700 flex items-center gap-1.5 transition cursor-pointer"
              >
                {copiedCodeId === 'json_ld' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedCodeId === 'json_ld' ? 'Copied!' : 'Copy Schema.org JSON'}</span>
              </button>
            </div>

            <pre className="p-4 bg-slate-950 text-amber-200 font-mono text-xs rounded-2xl border border-slate-800 overflow-x-auto leading-relaxed shadow-inner max-h-80 scrollbar-thin">
              {activeTopic.structuredDataSchema.jsonLdCode}
            </pre>
          </div>

          {/* ─── SECTION 3: INTERACTIVE PAGE HEADER CHECKLIST ─── */}
          <div className="bg-white dark:bg-emerald-950 p-6 sm:p-7 rounded-3xl border border-emerald-100 dark:border-emerald-800 shadow-md space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-emerald-100 dark:border-emerald-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-teal-100 dark:bg-teal-900/60 flex items-center justify-center text-teal-800 dark:text-teal-300">
                  <CheckSquare className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white">
                    Step-by-Step Header & UX Improvement Checklist
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-emerald-300">
                    Click items as you verify or implement them on this page.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              {activeTopic.headerChecklist.map((item) => {
                const isChecked = !!completedChecklist[item.id];
                return (
                  <div
                    key={item.id}
                    onClick={() => toggleChecklistItem(item.id)}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 ${
                      isChecked
                        ? 'bg-emerald-50 dark:bg-emerald-900/50 border-emerald-300 dark:border-emerald-700'
                        : 'bg-slate-50/50 dark:bg-emerald-950/40 border-slate-200 dark:border-emerald-800 hover:border-emerald-300'
                    }`}
                  >
                    <div className="mt-0.5 text-emerald-600 dark:text-amber-400 shrink-0">
                      {isChecked ? <CheckSquare className="w-5 h-5 text-emerald-600" /> : <Square className="w-5 h-5 text-slate-400" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={`text-xs font-bold ${isChecked ? 'line-through text-slate-400 dark:text-emerald-400' : 'text-slate-900 dark:text-white'}`}>
                        {item.text}
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-emerald-300/80 mt-0.5">
                        {item.details}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ─── SECTION 4: TRAFFIC GROWTH & PAID AD STRATEGY (Meta, Instagram & Google) ─── */}
          <div className="bg-white dark:bg-emerald-950 p-6 sm:p-7 rounded-3xl border border-emerald-100 dark:border-emerald-800 shadow-md space-y-4">
            <div className="flex items-center gap-2.5 pb-3 border-b border-emerald-100 dark:border-emerald-800">
              <div className="w-8 h-8 rounded-xl bg-indigo-100 dark:bg-indigo-900/60 flex items-center justify-center text-indigo-800 dark:text-indigo-300">
                <TrendingUp className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white">
                  Visitor Traffic & Acquisition Blueprint ({activeTopic.trafficGrowthGuide.channel})
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-emerald-300">
                  {activeTopic.trafficGrowthGuide.blueprintTitle}
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-xs text-slate-700 dark:text-emerald-200 leading-relaxed">
                {activeTopic.trafficGrowthGuide.strategy}
              </p>

              {activeTopic.trafficGrowthGuide.adCopySnippet && (
                <div className="p-4 bg-slate-900 text-white rounded-2xl border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-[10px] font-mono font-bold text-amber-300">
                    <span>Copy-Paste High-Performing Ad Creative / Message:</span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(activeTopic.trafficGrowthGuide.adCopySnippet!, 'ad_copy')}
                      className="text-emerald-400 hover:underline cursor-pointer flex items-center gap-1"
                    >
                      <Copy className="w-3 h-3" /> Copy Text
                    </button>
                  </div>
                  <pre className="font-sans text-xs text-slate-200 whitespace-pre-wrap leading-relaxed">
                    {activeTopic.trafficGrowthGuide.adCopySnippet}
                  </pre>
                </div>
              )}

              {/* Actionable Pro-Tips */}
              <div className="space-y-1.5 pt-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-emerald-400">
                  Implementation Tips:
                </span>
                {activeTopic.trafficGrowthGuide.quickTips.map((tip, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs text-slate-600 dark:text-emerald-200">
                    <span className="text-emerald-600 dark:text-amber-400 font-bold shrink-0">→</span>
                    <span>{tip}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ─── SECTION 5: CORE WEB VITALS ADVICE ─── */}
          <div className="p-5 bg-gradient-to-r from-emerald-900/60 to-teal-900/60 rounded-3xl border border-emerald-700/60 text-white space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-amber-300 uppercase tracking-wide">
              <Zap className="w-4 h-4 text-amber-400" />
              <span>Core Web Vitals & Speed Advisory for this Page</span>
            </div>
            <p className="text-xs text-emerald-100 leading-relaxed">
              {activeTopic.coreWebVitalsAdvice}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
export default SEOGrowthGuideView;
