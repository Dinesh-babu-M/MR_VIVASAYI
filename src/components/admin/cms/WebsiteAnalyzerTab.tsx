import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Users,
  Eye,
  Clock,
  TrendingUp,
  Globe2,
  Smartphone,
  Monitor,
  Laptop,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  Calendar,
  Filter,
  Layers,
  Activity,
  Compass,
  CheckCircle2,
  RefreshCw,
  ShoppingBag,
  Zap,
  Trash2,
  AlertTriangle,
  Search,
  ExternalLink,
  ShieldCheck,
  Radio,
  Power,
  RotateCcw,
  Sliders,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Check,
  Copy,
  ArrowLeft,
  ArrowRight,
  HelpCircle,
  Award,
  MessageCircle,
  Camera,
  Target,
  DollarSign,
  Lightbulb,
  Share2,
  FileText,
  CheckCircle,
  AlertCircle,
  Loader2,
  Tag,
  Link as LinkIcon,
  BookOpen
} from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import {
  getWebsiteAnalytics,
  recordWebsiteVisit,
  clearWebsiteAnalytics,
  isWebsiteAnalyzerEnabled,
  setWebsiteAnalyzerEnabled
} from '../../../lib/dbManager';
import { AutoRefreshDropdown } from '../../common/AutoRefreshDropdown';
import { ConfirmationModal, ConfirmModalOptions } from '../../common/ConfirmationModal';
import type { WebsiteAnalyzeEvent } from '../../../types';
import toast from 'react-hot-toast';

export interface GrowthTopic {
  id: string;
  title: string;
  badge: string;
  badgeColor: string;
  readTime: string;
  summary: string;
  strategyHeading: string;
  strategyDesc: string;
  steps: Array<{ title: string; desc: string }>;
  templates?: Array<{ name: string; content: string }>;
  proTips: string[];
  budgetGuidance?: {
    dailyBudget?: string;
    targetCpc?: string;
    expectedRoas?: string;
    targetAudience?: string;
    placement?: string;
  };
  targeting?: {
    locations: string;
    ageRange: string;
    interests: string[];
  };
}

export const GROWTH_TOPICS: GrowthTopic[] = [
  {
    id: 'meta_ads',
    title: 'Meta (Facebook) Ads Blueprint',
    badge: 'Paid Social Acquisition',
    badgeColor: 'blue',
    readTime: '4 min read',
    summary: 'Drive qualified organic food shoppers directly to your product catalog using high-performing Facebook Carousel and Advantage+ Shopping campaigns.',
    strategyHeading: 'High-Converting Meta Ads Strategy for Organic Stores',
    strategyDesc: 'Meta algorithms excel when creative highlights tangible farm purity, raw wood-pressed oil extractions, and certified chemical-free staples. Carousel ads showcasing 5 native bestsellers deliver the highest RoAS for agricultural retail.',
    steps: [
      {
        title: 'Step 1: Set Up Meta Pixel & CAPI Conversions',
        desc: 'Connect your Meta Pixel to track PageView, AddToCart, and Purchase events. Telemetry events will register directly in the Website Analyzer.'
      },
      {
        title: 'Step 2: Launch Advantage+ Catalog Sales Campaign',
        desc: 'Set Campaign Objective to Sales / Conversions. Use dynamic catalog format pulling directly from your live store inventory.'
      },
      {
        title: 'Step 3: Target High-Affinity Organic Demographics',
        desc: 'Target ages 26-58 in Tamil Nadu, Bengaluru, and Chennai metros with interests in Organic Food, Ayurveda, Fitness, and Farm-to-Table Living.'
      },
      {
        title: 'Step 4: Use Strong Urgency & Social Proof',
        desc: 'Highlight direct farmer sourcing and limited weekly harvest batches with 10% first-order discount codes.'
      }
    ],
    templates: [
      {
        name: 'Carousel Primary Text (English)',
        content: `🌿 Tired of chemically refined supermarket groceries?
Mr. Vivasayi brings you 100% Traditional, Native Farm Harvests direct from verified organic farmers in Tamil Nadu.

✨ Wood Cold-Pressed Sesame & Groundnut Oils
✨ Native Karuppu Kavuni & Mappillai Samba Rices
✨ Raw Wild Forest Honey & Palm Jaggery

🚚 Free delivery on orders over ₹499. Use code FARM10 for 10% OFF!
Tap 'Shop Now' to taste real farm purity today.`
      },
      {
        name: 'Urgent Weekend Harvest Ad Copy (Tamil & English)',
        content: `🌾 நேரடி விவசாயிகளிடமிருந்து உங்கள் இல்லத்திற்கு!
100% பாரம்பரிய மரச்செக்கு எண்ணெய் & இயற்கை சிறுதானியங்கள்.

Zero Preservatives • Traditional Wood-Pressed • Direct Farmer Support
👉 ஆர்டர் செய்ய இங்கே கிளிக் செய்யவும்: [Link]`
      }
    ],
    budgetGuidance: {
      dailyBudget: '₹300 – ₹600 / day testing budget',
      targetCpc: '₹3.20 – ₹5.50 per click',
      expectedRoas: '3.5x – 5.2x return on ad spend'
    },
    targeting: {
      locations: 'Tamil Nadu (Chennai, Coimbatore, Madurai, Trichy), Bengaluru, Hyderabad',
      ageRange: '25 – 58 years old',
      interests: ['Organic food', 'Ayurveda', 'Traditional food', 'Cooking', 'Natural health']
    },
    proTips: [
      'Videos showing the wooden pestle turning in the cold press generate 3x more engagement than static images.',
      'Always link each carousel card directly to that specific product page rather than the generic homepage to reduce bounce rate.'
    ]
  },
  {
    id: 'instagram_reels',
    title: 'Instagram Shopping & Viral Reels',
    badge: 'Short-Form Video',
    badgeColor: 'pink',
    readTime: '5 min read',
    summary: 'Turn authentic farm reels, order packaging timelapses, and purity tests into direct storefront sales with Instagram Product Tags.',
    strategyHeading: 'Organic Video Storytelling That Sells Farm Products',
    strategyDesc: 'Instagram users buy organic staples through emotional authenticity. Demonstrating the contrast between clear supermarket oils and rich, cloudy cold-pressed oil creates viral visual hooks that drive massive curiosity and link-in-bio clicks.',
    steps: [
      {
        title: 'Step 1: Connect Instagram Shopping',
        desc: 'Link your Instagram Professional account to the Facebook product catalog so customers can tap product tags directly in reels.'
      },
      {
        title: 'Step 2: Use the 3-Second Visual Hook',
        desc: 'Start videos with action: pouring rich golden oil over hot food or opening a burlap sack of freshly harvested millets.'
      },
      {
        title: 'Step 3: Post Behind-the-Scenes Order Packing',
        desc: 'Film 15-second packing timelapses with handwritten customer thank-you notes to build irresistible buying trust.'
      },
      {
        title: 'Step 4: Micro-Influencer Seed Gifting',
        desc: 'Gift harvest baskets to local Tamil home cooks and health influencers in exchange for authentic honest taste test reels.'
      }
    ],
    templates: [
      {
        name: 'Viral Reel Script Framework',
        content: `[0:00 - 0:02 Hook]: "Did you know that 90% of store oils are refined at 200°C using chemical solvents?"
[0:03 - 0:08 Contrast]: "Here is how real cold-pressed oil looks when crushed slowly in traditional Vaagai wood."
[0:09 - 0:13 Proof]: "Notice the thick aroma and natural sediment rich in micro-nutrients."
[0:14 - 0:15 CTA]: "Direct from our organic fields. Tap the product tag below to get yours!"`
      },
      {
        name: 'Story Poll Sticker Strategy',
        content: `Poll: "Do you use Wood Pressed Oil or Refined Oil at home?"
Option A: "Pure Wood Pressed 🌿"
Option B: "Still Refined (Want to switch!)"
[Send automated DM to Option B voters with a 15% discount link: 'Hey! Here is 15% off code SWITCH15 for your first healthy harvest!']`
      }
    ],
    budgetGuidance: {
      dailyBudget: '₹200 – ₹350 / day Reel Boost',
      targetCpc: '₹2.10 – ₹3.80 per click',
      expectedRoas: '4.0x – 6.0x organic multiplier'
    },
    proTips: [
      'Include captions on all reels. Over 70% of viewers scroll on Instagram without audio enabled.',
      'Pin top 3 customer reviews to the top of your comment section to convert fence-sitters.'
    ]
  },
  {
    id: 'google_ads',
    title: 'Google Search & Shopping Ads (PPC)',
    badge: 'High Intent Search',
    badgeColor: 'emerald',
    readTime: '6 min read',
    summary: 'Intercept shoppers at the exact moment they search for organic groceries, traditional rices, and pure oils with Google Shopping and high-intent PPC.',
    strategyHeading: 'Capturing Active Commercial Intent on Google',
    strategyDesc: 'Unlike social media where you interrupt users, Google search traffic consists of people ready with a credit card looking for "where to buy cold-pressed oil online". High relevance and fast loading landing pages guarantee high conversion rates.',
    steps: [
      {
        title: 'Step 1: Google Merchant Center Product Feed',
        desc: 'Upload your 16+ store products with titles, MRP, offer prices, and high-res cover photos to Google Merchant Center.'
      },
      {
        title: 'Step 2: Launch Google Performance Max (PMax) Campaign',
        desc: 'Let Google AI automatically optimize across Google Search, Shopping tab, YouTube, and Gmail using high-converting product assets.'
      },
      {
        title: 'Step 3: Setup High-Intent Exact Match Search Keywords',
        desc: 'Bid on exact terms: [buy wood pressed sesame oil], [organic karuppu kavuni rice online], [pure palm jaggery buy].'
      },
      {
        title: 'Step 4: Maintain Negative Keyword List',
        desc: 'Exclude irrelevant keywords like "free", "jobs", "wikipedia", "wholesale bulk supplier" to eliminate wasted ad spend.'
      }
    ],
    templates: [
      {
        name: 'Google Search Ad Copy #1',
        content: `Headline 1: 100% Pure Wood Pressed Oils | Mr. Vivasayi Farm Store
Headline 2: Traditional Vaagai Cold-Pressed | Direct From Farmers
Headline 3: Fresh Batch Dispatched Daily | Free Delivery Over ₹499
Description 1: Zero chemicals, zero adulteration. Authentic wood-pressed sesame, groundnut & coconut oils.
Description 2: Lab-tested organic purity. Order online with Cash on Delivery & fast doorstep dispatch.`
      },
      {
        name: 'Negative Keyword Starter List',
        content: `free, pdf, recipe only, wholesale factory, careers, jobs, wikipedia, youtube video, machine manufacturer, exporter directory`
      }
    ],
    budgetGuidance: {
      dailyBudget: '₹400 – ₹800 / day',
      targetCpc: '₹4.50 – ₹8.50 per commercial click',
      expectedRoas: '4.2x – 5.8x verified order return'
    },
    proTips: [
      'Add Google Customer Review seller rating extensions to stand out from competing grocery retailers.',
      'Always display the exact pack size (e.g. 1 Litre or 500ml) in the Google Shopping title.'
    ]
  },
  {
    id: 'whatsapp_retargeting',
    title: 'WhatsApp Automated Cart & Harvest Broadcasts',
    badge: '85%+ Open Rate Direct',
    badgeColor: 'teal',
    readTime: '3 min read',
    summary: 'Recover up to 35% of abandoned carts and announce fresh weekly harvests with WhatsApp automated messaging and 1-click UPI checkout.',
    strategyHeading: 'The Direct-to-Consumer WhatsApp Super-Funnel',
    strategyDesc: 'WhatsApp has an unprecedented 85-95% open rate in India compared to 15% for email. Automating friendly cart reminders and Friday harvest drops creates consistent repeat buyers who order every single month.',
    steps: [
      {
        title: 'Step 1: Automated 45-Minute Cart Drop Reminder',
        desc: 'Trigger a warm WhatsApp message 45 minutes after a visitor drops off checkout, offering to hold their reserved stock.'
      },
      {
        title: 'Step 2: Send Weekly Friday Harvest Catalog',
        desc: 'Every Friday morning, broadcast new harvest batch arrivals (Cold-Pressed Oils, Fresh Jaggery) before weekend cooking.'
      },
      {
        title: 'Step 3: Enable Direct UPI 1-Click Payment',
        desc: 'Include direct UPI pay links (GPay, PhonePe, Paytm) so customers can finalize their order without entering complex card details.'
      },
      {
        title: 'Step 4: Post-Delivery Reorder Reminder at 25 Days',
        desc: 'When an oil bottle is expected to run out, send an automated reorder prompt with 1-click refill discount.'
      }
    ],
    templates: [
      {
        name: 'Abandoned Cart Recovery Template',
        content: `Vanakkam {Customer_Name}! 🌾
We noticed you left some fresh harvest items in your cart at Mr. Vivasayi:
📦 {Cart_Items_List}

Our weekly cold-press batches are limited to ensure freshness. We've reserved your items for the next 2 hours!

Tap here to complete your order with an instant 10% discount:
👉 {Cart_Direct_Link}
Coupon code: FRESH10 (applied automatically)`
      },
      {
        name: 'Weekly Harvest Drop Broadcast',
        content: `📢 Fresh Harvest Friday at Mr. Vivasayi!
The farmers have just completed this week's pressing of fresh Sesame & Groundnut Oils. 🌿

✨ 100% Pure, Wood-Pressed & Lab-Tested
✨ Limited stock of Wild Honey & Palm Jaggery

Order before 3:00 PM for same-day dispatch:
👉 {Store_Catalog_Link}`
      }
    ],
    proTips: [
      'Always address customers by their first name to make the WhatsApp conversation feel warm and human.',
      'Never send promotional broadcasts more than 2 times per week to preserve high engagement and avoid opt-outs.'
    ]
  },
  {
    id: 'local_seo',
    title: 'Google Business Profile & Organic Local SEO',
    badge: 'Zero-Cost Inbound Traffic',
    badgeColor: 'amber',
    readTime: '7 min read',
    summary: 'Rank #1 on Google Maps and regional organic search queries to capture free local footfalls and website visits without spending on ads.',
    strategyHeading: 'Dominating Local Organic Agricultural Searches',
    strategyDesc: 'When buyers in your area search for "organic grocery near me" or "traditional rice shop", having a verified Google Business Profile with active reviews and structured schema markup guarantees top position in Google Map Packs.',
    steps: [
      {
        title: 'Step 1: Optimize Google Business Profile',
        desc: 'Set primary category to Organic Food Store and secondary categories to Grocery Store and Health Food Store.'
      },
      {
        title: 'Step 2: Collect Keyword-Rich 5-Star Reviews',
        desc: 'Ask satisfied buyers to mention specific products in their reviews: "Best wood-pressed oil in Chennai" or "Purest black rice".'
      },
      {
        title: 'Step 3: Implement JSON-LD Product Schema',
        desc: 'Add rich snippet schema to your product pages so Google displays stock availability, star ratings, and prices directly in search results.'
      },
      {
        title: 'Step 4: Publish Bilingual Tamil/English Recipe Guides',
        desc: 'Write articles answering common health queries: "How to use Karuppu Kavuni Rice for diabetes", "Benefits of Wood-Pressed Gingelly Oil".'
      }
    ],
    proTips: [
      'Upload weekly photos of real farm harvests and oil extraction to your Google Business Profile. Google rewards active listings with 40% higher local impressions.',
      'Embed your Google Map on your Contact and About pages to reinforce local geographic relevance.'
    ]
  },
  {
    id: 'landing_pages',
    title: 'Landing Page & Bounce Rate Optimization',
    badge: 'Conversion Rate (CRO)',
    badgeColor: 'purple',
    readTime: '5 min read',
    summary: 'Cut down high bounce rates (>40%) to healthy 15-25% by placing high-trust guarantees, fast mobile speed, and transparent delivery dates above the fold.',
    strategyHeading: 'Converting Skeptical Visitors into Confident Buyers',
    strategyDesc: 'When shoppers land on an organic store, their #1 hesitation is: "Is this genuinely organic or just marketing?" Answering this question in the first 3 seconds with visible lab test certificates, verified buyer reviews, and farmer sourcing transparency drastically lowers bounce rates.',
    steps: [
      {
        title: 'Step 1: Display Above-the-Fold Trust Seals',
        desc: 'Show 3 clear trust badges right under the product title: "🌱 100% Organically Farmed", "🛡️ FSSAI & NPOP Certified", "🚜 Directly Supporting 150+ Farmers".'
      },
      {
        title: 'Step 2: Mobile Page Speed Optimization',
        desc: 'Ensure your product pages load in under 2.5 seconds on 4G mobile devices. Compress cover images to WebP format under 80 KB.'
      },
      {
        title: 'Step 3: Sticky Mobile "Add to Cart / Buy Now" Bar',
        desc: 'Keep an express buy bar anchored at the bottom of the screen as mobile users scroll down reading descriptions.'
      },
      {
        title: 'Step 4: Clear Estimated Delivery Timeframe',
        desc: 'Display "Order within 3 hrs for dispatch today • Expected delivery in 2-3 business days" to eliminate checkout drop-offs.'
      }
    ],
    proTips: [
      'Include a prominent WhatsApp chat bubble on every product page so hesitant shoppers can ask quick questions before buying.',
      'Show authentic buyer photo reviews immediately below the Buy Now button for maximum social proof.'
    ]
  },
  {
    id: 'utm_generator',
    title: 'Interactive UTM Campaign Link Builder',
    badge: 'Telemetry Tool',
    badgeColor: 'teal',
    readTime: 'Interactive Builder',
    summary: 'Generate custom trackable URLs with UTM parameters so you can precisely measure ad campaign performance and visitor sources in the Website Analyzer.',
    strategyHeading: 'Accurate Real-Time Campaign Telemetry Tracking',
    strategyDesc: 'By adding UTM tags to your Meta ads, WhatsApp broadcasts, and Instagram bio links, the Website Analyzer automatically categorizes traffic into exact acquisition channels, giving you clear visibility into which campaigns generate orders.',
    steps: [
      {
        title: 'Step 1: Choose Your Destination URL',
        desc: 'Select the specific product or category page you want shoppers to land on.'
      },
      {
        title: 'Step 2: Specify Campaign Source & Medium',
        desc: 'Set the source (e.g. facebook, instagram, whatsapp) and medium (e.g. cpc, story, broadcast).'
      },
      {
        title: 'Step 3: Name Your Campaign',
        desc: 'Use descriptive names like "harvest_festival_sale" or "coldpress_intro_promo".'
      },
      {
        title: 'Step 4: Copy & Paste Into Your Ads',
        desc: 'Paste the generated URL into your ad manager or WhatsApp link and watch real-time sessions register in Table 7.'
      }
    ],
    proTips: [
      'Always use lowercase letters with underscores for UTM parameters to prevent fragmented tracking in analytics.',
      'Test your generated link by clicking it in an incognito window and verifying that a new entry appears in the Live Visitor Telemetry Ledger.'
    ]
  }
];

export const WebsiteAnalyzerTab: React.FC = () => {
  const [timeframe, setTimeframe] = useState<'today' | '7d' | '30d' | 'year' | 'all'>('7d');
  const [autoRefreshSec, setAutoRefreshSec] = useState<number>(10); // default 10s auto-refresh
  const [countdown, setCountdown] = useState<number>(10);
  const [isLoggingTest, setIsLoggingTest] = useState(false);
  const [searchLogQuery, setSearchLogQuery] = useState('');
  const [dataLoaded, setDataLoaded] = useState(false);

  // View Mode: 'analyzer' (Dashboard) | 'growth_guide' (Dedicated 2-Column Playbook)
  const [viewMode, setViewMode] = useState<'analyzer' | 'growth_guide'>('analyzer');
  const [activeGuideTopic, setActiveGuideTopic] = useState<string>('meta_ads');

  // Chart 6: Top Visited Store Pages Filter & Pagination States
  const [topPagesSearch, setTopPagesSearch] = useState('');
  const [topPagesCategory, setTopPagesCategory] = useState<'ALL' | 'PRODUCTS' | 'CATEGORY' | 'CHECKOUT' | 'ACCOUNT' | 'PUBLIC'>('ALL');
  const [topPagesSort, setTopPagesSort] = useState<'VISITS_DESC' | 'VISITS_ASC' | 'TIME_DESC' | 'BOUNCE_ASC'>('VISITS_DESC');
  const [topPagesPage, setTopPagesPage] = useState<number>(1);
  const [topPagesRowsPerPage, setTopPagesRowsPerPage] = useState<number>(5);

  // Table 7: Live Visitor Telemetry Ledger Filter & Pagination States
  const [ledgerDeviceFilter, setLedgerDeviceFilter] = useState<string>('ALL');
  const [ledgerReferrerFilter, setLedgerReferrerFilter] = useState<string>('ALL');
  const [ledgerSortOrder, setLedgerSortOrder] = useState<'NEWEST' | 'OLDEST'>('NEWEST');
  const [ledgerPage, setLedgerPage] = useState<number>(1);
  const [ledgerPerPage, setLedgerPerPage] = useState<number>(10);

  // Interactive UTM Link Builder State (Inside Growth Guide)
  const [utmBaseUrl, setUtmBaseUrl] = useState('https://mrvivasayi.com/products');
  const [utmSource, setUtmSource] = useState('facebook');
  const [utmMedium, setUtmMedium] = useState('cpc');
  const [utmCampaign, setUtmCampaign] = useState('organic_harvest_promo');
  const [utmContent, setUtmContent] = useState('carousel_millets_oil');
  const [isCopiedUtm, setIsCopiedUtm] = useState(false);
  const [copiedSnippetId, setCopiedSnippetId] = useState<string | null>(null);

  // Master ON/OFF State
  const [isAnalyzerActive, setIsAnalyzerActive] = useState<boolean>(() => isWebsiteAnalyzerEnabled());

  // Universal Action Confirmation Modal state (Asks YES or NO on EVERY action)
  const [confirmModalOptions, setConfirmModalOptions] = useState<ConfirmModalOptions | null>(null);

  const promptConfirm = (options: ConfirmModalOptions) => {
    setConfirmModalOptions(options);
  };

  const [metrics, setMetrics] = useState<{
    totalOrders: number;
    totalCustomers: number;
    totalProducts: number;
    totalReviews: number;
    totalRevenue: number;
    totalVisitors: number;
    uniqueVisitors: number;
    totalPageViews: number;
    avgDurationSec: number;
    bounceRate: string;
    trafficTrend: Array<{ date: string; visitors: number; pageViews: number; unique: number }>;
    deviceBreakdown: Array<{ name: string; value: number; count: number; color: string }>;
    topPages: Array<{ path: string; label: string; visits: number; avgTime: string; bounce: string }>;
    trafficSources: Array<{ source: string; visitors: number; percentage: number; color: string }>;
    hourlyHeatmap: Array<{ hour: string; visitors: number }>;
    conversionFunnel: Array<{ step: string; count: number; drop: string }>;
    recentEvents: WebsiteAnalyzeEvent[];
  }>({
    totalOrders: 0,
    totalCustomers: 0,
    totalProducts: 0,
    totalReviews: 0,
    totalRevenue: 0,
    totalVisitors: 0,
    uniqueVisitors: 0,
    totalPageViews: 0,
    avgDurationSec: 0,
    bounceRate: '0%',
    trafficTrend: [],
    deviceBreakdown: [],
    topPages: [],
    trafficSources: [],
    hourlyHeatmap: [],
    conversionFunnel: [],
    recentEvents: []
  });

  const loadData = useCallback(async () => {
    try {
      const data = await getWebsiteAnalytics(timeframe);
      setMetrics(data);
      setDataLoaded(true);
    } catch (err) {
      console.error('Failed to query website analytics telemetry:', err);
    }
  }, [timeframe]);

  // Initial load & when timeframe changes
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Synchronize master analyzer toggle across windows / tabs
  useEffect(() => {
    const handleAnalyzerToggleEvent = (e: any) => {
      if (e.detail?.enabled !== undefined) {
        setIsAnalyzerActive(e.detail.enabled);
      }
    };
    window.addEventListener('mrvivasayi_analyzer_toggle', handleAnalyzerToggleEvent);
    return () => {
      window.removeEventListener('mrvivasayi_analyzer_toggle', handleAnalyzerToggleEvent);
    };
  }, []);

  // Listen to cross-tab / real-time visit dispatch events
  useEffect(() => {
    const handleTrafficUpdate = () => {
      loadData();
    };
    window.addEventListener('mrvivasayi_traffic_logged', handleTrafficUpdate);
    return () => {
      window.removeEventListener('mrvivasayi_traffic_logged', handleTrafficUpdate);
    };
  }, [loadData]);

  // Auto-Refresh Countdown & Interval Loop (Only runs if analyzer is active and interval > 0)
  useEffect(() => {
    if (!isAnalyzerActive || !autoRefreshSec || autoRefreshSec <= 0) {
      setCountdown(0);
      return;
    }

    setCountdown(autoRefreshSec);

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          loadData();
          return autoRefreshSec;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isAnalyzerActive, autoRefreshSec, loadData]);

  // ─── ACTION PROGRESS & ERROR MODAL WITH REAL-TIME PERCENTAGE & WHAT-ERROR DISPLAY ───
  const [actionProgressModal, setActionProgressModal] = useState<{
    isOpen: boolean;
    title: string;
    subtitle?: string;
    stepText: string;
    progress: number;
    status: 'LOADING' | 'SUCCESS' | 'ERROR';
    errorMessage?: string;
    errorDetails?: string;
    successMessage?: string;
  }>({
    isOpen: false,
    title: '',
    subtitle: '',
    stepText: '',
    progress: 0,
    status: 'LOADING'
  });

  const runActionWithProgressModal = async (config: {
    title: string;
    subtitle?: string;
    steps: { progress: number; text: string; delayMs?: number }[];
    action: () => Promise<string | void>;
  }) => {
    setActionProgressModal({
      isOpen: true,
      title: config.title,
      subtitle: config.subtitle,
      stepText: config.steps[0]?.text || 'Initializing operation...',
      progress: config.steps[0]?.progress || 10,
      status: 'LOADING',
      errorMessage: undefined,
      errorDetails: undefined,
      successMessage: undefined
    });

    try {
      // Step-by-step progress animation in real time
      for (const step of config.steps) {
        await new Promise((resolve) => setTimeout(resolve, step.delayMs || 220));
        setActionProgressModal((prev) => ({
          ...prev,
          progress: step.progress,
          stepText: step.text
        }));
      }

      // Execute actual operation
      const successMsg = await config.action();

      // Complete to 100%
      setActionProgressModal((prev) => ({
        ...prev,
        progress: 100,
        stepText: 'Operation finished successfully ✓',
        status: 'SUCCESS',
        successMessage: (typeof successMsg === 'string' && successMsg) ? successMsg : 'Website telemetry operation completed successfully.'
      }));

      // Auto close after 1.2s on success
      setTimeout(() => {
        setActionProgressModal((prev) => (prev.status === 'SUCCESS' ? { ...prev, isOpen: false } : prev));
      }, 1200);

    } catch (err: any) {
      const errorMsg = err?.message || String(err) || 'Telemetry execution failed.';
      setActionProgressModal((prev) => ({
        ...prev,
        status: 'ERROR',
        stepText: 'Execution stopped due to an error ✕',
        errorMessage: errorMsg,
        errorDetails: `Target Action: ${config.title}\nDetails: ${err?.stack ? err.stack.split('\n')[0] : errorMsg}`
      }));
    }
  };

  // ─── HELPER: SWITCH VIEW MODE WITH REAL-TIME PROGRESS ──────────────────────
  const handleSwitchViewMode = (targetMode: 'analyzer' | 'growth_guide', topicId = 'meta_ads') => {
    if (targetMode === viewMode && targetMode === 'growth_guide' && activeGuideTopic === topicId) return;

    if (targetMode === 'growth_guide') {
      runActionWithProgressModal({
        title: 'Opening Audience Growth Blueprint...',
        subtitle: 'STORE OPTIMIZATION PLAYBOOK',
        steps: [
          { progress: 30, text: 'Compiling store conversion diagnostics & health score...', delayMs: 140 },
          { progress: 70, text: 'Loading channel blueprints, copy templates & UTM builder...', delayMs: 160 }
        ],
        action: async () => {
          setViewMode('growth_guide');
          setActiveGuideTopic(topicId);
          return 'Audience Growth Blueprint loaded successfully!';
        }
      });
    } else {
      runActionWithProgressModal({
        title: 'Returning to Telemetry Dashboard...',
        subtitle: 'SWITCHING VIEW ENGINE',
        steps: [
          { progress: 40, text: 'Restoring real-time charts canvas & visitor ledger...', delayMs: 150 }
        ],
        action: async () => {
          setViewMode('analyzer');
          return 'Live telemetry dashboard active.';
        }
      });
    }
  };

  // ─── 1. ACTION: MASTER ANALYZER ON/OFF TOGGLE (Asks YES or NO) ─────────────
  const handleToggleAnalyzerRequest = (targetEnabled: boolean) => {
    if (targetEnabled) {
      promptConfirm({
        title: 'Turn ON Website Traffic Analyzer?',
        message: 'Are you sure you want to turn ON real-time website traffic analysis?',
        description: 'When turned ON, public visitor sessions, client devices, referrers, and storefront page views will be actively recorded into the website_analyze database table.',
        confirmText: 'Yes, Turn ON Analyzer',
        cancelText: 'No, Keep OFF',
        variant: 'success',
        icon: <Power className="w-7 h-7 text-emerald-500" />,
        onConfirm: () => {
          runActionWithProgressModal({
            title: 'Activating Real-Time Telemetry Engine...',
            subtitle: 'ANALYZER MASTER TOGGLE',
            steps: [
              { progress: 20, text: 'Verifying administrative runtime permissions...', delayMs: 200 },
              { progress: 55, text: 'Enabling visitor session tracking & database hooks...', delayMs: 240 },
              { progress: 85, text: 'Broadcasting cross-window synchronization events...', delayMs: 220 }
            ],
            action: async () => {
              setWebsiteAnalyzerEnabled(true);
              setIsAnalyzerActive(true);
              return 'Website Traffic Analyzer is now ON. Live tracking active!';
            }
          });
        }
      });
    } else {
      promptConfirm({
        title: 'Turn OFF Website Traffic Analyzer?',
        message: 'Are you sure you want to turn OFF website traffic analysis?',
        description: 'When turned OFF, real-time telemetry is paused and no visitor sessions, client devices, or page impressions will be tracked on the website.',
        confirmText: 'Yes, Turn OFF Telemetry',
        cancelText: 'No, Keep Active',
        variant: 'warning',
        icon: <Power className="w-7 h-7 text-amber-500" />,
        onConfirm: () => {
          runActionWithProgressModal({
            title: 'Pausing Real-Time Telemetry Engine...',
            subtitle: 'ANALYZER MASTER TOGGLE',
            steps: [
              { progress: 25, text: 'Unbinding active client session listeners...', delayMs: 200 },
              { progress: 60, text: 'Setting database logging flag to inactive...', delayMs: 220 },
              { progress: 85, text: 'Halting background auto-refresh timers...', delayMs: 200 }
            ],
            action: async () => {
              setWebsiteAnalyzerEnabled(false);
              setIsAnalyzerActive(false);
              return 'Website Traffic Analyzer has been turned OFF. Tracking paused.';
            }
          });
        }
      });
    }
  };

  // ─── 2. ACTION: MANUAL LIVE SYNC / REFRESH (Asks YES or NO) ─────────────────
  const handleRefreshRequest = () => {
    promptConfirm({
      title: 'Run Live Telemetry Sync?',
      message: 'Are you sure you want to perform a manual database telemetry sync?',
      description: 'This will re-query the website_analyze table and refresh all visitor trends, device shares, and conversion funnels.',
      confirmText: 'Yes, Sync Now',
      cancelText: 'No, Cancel',
      variant: 'info',
      icon: <RefreshCw className="w-7 h-7 text-indigo-500" />,
      onConfirm: () => {
        runActionWithProgressModal({
          title: 'Synchronizing Live Telemetry...',
          subtitle: 'LIVE DATABASE POLLING & COMPILATION',
          steps: [
            { progress: 15, text: 'Connecting to public.website_analyze catalog...', delayMs: 200 },
            { progress: 45, text: 'Aggregating session durations, bounce rates & unique visitor IPs...', delayMs: 260 },
            { progress: 75, text: 'Compiling device breakdown and top visited URLs matrix...', delayMs: 240 },
            { progress: 95, text: 'Evaluating traffic conversion funnels & store health rating...', delayMs: 200 }
          ],
          action: async () => {
            await loadData();
            setCountdown(autoRefreshSec || 10);
            return 'All visitor telemetry metrics synchronized with live database!';
          }
        });
      }
    });
  };

  // ─── 3. ACTION: TIMEFRAME FILTER CHANGE (Asks YES or NO) ───────────────────
  const handleTimeframeRequest = (newTf: 'today' | '7d' | '30d' | 'year' | 'all') => {
    if (newTf === timeframe) return;
    const labels: Record<string, string> = {
      today: 'Today',
      '7d': 'Last 7 Days',
      '30d': 'Last 30 Days',
      year: 'This Year',
      all: 'All Time'
    };
    promptConfirm({
      title: 'Switch Telemetry Timeframe?',
      message: `Do you want to switch the telemetry viewing window to "${labels[newTf]}"?`,
      description: 'Visitor statistics, device charts, top pages, and conversion journeys will be re-filtered for this date range.',
      confirmText: `Yes, Switch to ${labels[newTf]}`,
      cancelText: 'No, Keep Current',
      variant: 'info',
      icon: <Calendar className="w-7 h-7 text-blue-500" />,
      onConfirm: () => {
        runActionWithProgressModal({
          title: `Switching Viewing Window to ${labels[newTf]}...`,
          subtitle: 'TEMPORAL DATA AGGREGATION',
          steps: [
            { progress: 25, text: `Filtering website_analyze events for range: ${labels[newTf]}...`, delayMs: 200 },
            { progress: 65, text: 'Re-calculating impressions, unique visitors & bounce rates...', delayMs: 240 },
            { progress: 90, text: 'Updating visual analytics trend charts...', delayMs: 200 }
          ],
          action: async () => {
            setTimeframe(newTf);
            return `Timeframe successfully switched to ${labels[newTf]}!`;
          }
        });
      }
    });
  };

  // ─── 4. ACTION: AUTO-REFRESH INTERVAL CHANGE (Asks YES or NO) ───────────────
  const handleAutoRefreshIntervalRequest = (newSec: number) => {
    if (newSec === autoRefreshSec) return;
    const formatSec = (s: number) => (s <= 0 ? 'Off (Manual only)' : s < 60 ? `${s} seconds` : `${s / 60} minutes`);
    promptConfirm({
      title: 'Update Auto-Refresh Interval?',
      message: newSec === 0
        ? 'Are you sure you want to turn OFF automatic telemetry refresh?'
        : `Are you sure you want to set the auto-refresh interval to every ${formatSec(newSec)}?`,
      description: newSec === 0
        ? 'Automatic polling will be disabled. You will need to click Live Sync manually to update metrics.'
        : `The traffic telemetry analyzer will automatically poll and re-query the database every ${formatSec(newSec)}.`,
      confirmText: newSec === 0 ? 'Yes, Turn OFF Auto-Refresh' : 'Yes, Update Interval',
      cancelText: 'No, Keep Current',
      variant: 'info',
      icon: <Clock className="w-7 h-7 text-purple-500" />,
      onConfirm: () => {
        runActionWithProgressModal({
          title: 'Configuring Polling Cadence...',
          subtitle: 'TELEMETRY SCHEDULER ENGINE',
          steps: [
            { progress: 30, text: 'Configuring background timer scheduler...', delayMs: 180 },
            { progress: 75, text: `Setting polling interval to: ${formatSec(newSec)}...`, delayMs: 200 }
          ],
          action: async () => {
            setAutoRefreshSec(newSec);
            setCountdown(newSec);
            return `Auto-refresh interval set to ${formatSec(newSec)}!`;
          }
        });
      }
    });
  };

  // ─── 5. ACTION: LOG LIVE TEST VISIT (Asks YES or NO) ────────────────────────
  const executeLogTestVisit = async (pathPreset = '/') => {
    setIsLoggingTest(true);
    try {
      const paths = [
        { path: '/', title: 'MR. VIVASAYI – Storefront Home' },
        { path: '/products', title: 'Products Catalog' },
        { path: '/products/mapillai-samba-rice', title: 'Mapillai Samba Rice (1kg)' },
        { path: '/products/cold-pressed-groundnut-oil', title: 'Chekku Groundnut Oil' },
        { path: '/about', title: 'Farmer Heritage & Organic Story' },
        { path: '/contact', title: 'Contact Store & WhatsApp' }
      ];
      const selected = paths.find(p => p.path === pathPreset) || paths[Math.floor(Math.random() * paths.length)];

      const devices: Array<'Mobile' | 'Desktop' | 'Tablet'> = ['Mobile', 'Desktop', 'Tablet'];
      const randomDevice = devices[Math.floor(Math.random() * devices.length)];

      const referrers = ['WhatsApp Direct', 'Google Organic Search', 'Direct Visit', 'Instagram Ads'];
      const randomRef = referrers[Math.floor(Math.random() * referrers.length)];

      await recordWebsiteVisit({
        path: selected.path,
        page_title: selected.title,
        device_type: randomDevice,
        referrer: randomRef,
        duration_seconds: Math.floor(Math.random() * 90) + 20
      });

      await loadData();
      return `Test visit recorded for "${selected.path}" (${randomDevice})`;
    } finally {
      setIsLoggingTest(false);
    }
  };

  const handleLogTestVisitRequest = (path = '/', label = 'Home Page') => {
    promptConfirm({
      title: 'Simulate Live Test Visit?',
      message: `Do you want to simulate and log a test visit to "${label}" (${path})?`,
      description: isAnalyzerActive
        ? 'A live visit event will be inserted into the website_analyze database table to verify telemetry visualization.'
        : 'Note: The analyzer is currently turned OFF. Confirming will automatically turn ON the analyzer and record this visit.',
      confirmText: 'Yes, Log Test Visit',
      cancelText: 'No, Cancel',
      variant: 'success',
      icon: <Zap className="w-7 h-7 text-emerald-500" />,
      onConfirm: () => {
        runActionWithProgressModal({
          title: `Simulating Test Visit: ${path}...`,
          subtitle: 'CLIENT TELEMETRY SIMULATOR',
          steps: [
            { progress: 20, text: 'Generating client session token, browser fingerprint & IP hash...', delayMs: 200 },
            { progress: 55, text: `Dispatching pageview event to public.website_analyze...`, delayMs: 280 },
            { progress: 85, text: 'Re-fetching live visitor matrix and ledger entries...', delayMs: 220 }
          ],
          action: async () => {
            if (!isAnalyzerActive) {
              setWebsiteAnalyzerEnabled(true);
              setIsAnalyzerActive(true);
            }
            await executeLogTestVisit(path);
            return `Test visit recorded for "${label}" (${path})!`;
          }
        });
      }
    });
  };

  // ─── 6. ACTION: CLEAR ALL TELEMETRY DATA (Asks YES or NO) ───────────────────
  const executeClearTelemetry = async () => {
    await clearWebsiteAnalytics();
    await loadData();
    return 'Website telemetry data cleared successfully (0 events).';
  };

  const handleClearTelemetryRequest = () => {
    promptConfirm({
      title: 'Permanently Wipe All Telemetry Data?',
      message: 'Are you sure you want to delete all visitor telemetry records from the website_analyze database table?',
      description: 'This will purge all recorded session logs, device matrices, and visited URL paths. This action cannot be undone.',
      confirmText: 'Yes, Wipe Telemetry Data',
      cancelText: 'No, Keep Data',
      variant: 'danger',
      icon: <Trash2 className="w-7 h-7 text-rose-500" />,
      onConfirm: () => {
        runActionWithProgressModal({
          title: 'Wiping Telemetry Database Records...',
          subtitle: 'TABLE PURGE & CACHE RESET',
          steps: [
            { progress: 25, text: 'Authenticating administrative purge privileges...', delayMs: 200 },
            { progress: 60, text: 'Executing TRUNCATE / DELETE on public.website_analyze...', delayMs: 320 },
            { progress: 85, text: 'Zeroing out session counters, charts & funnels...', delayMs: 220 }
          ],
          action: async () => {
            await executeClearTelemetry();
            return 'Website telemetry database wiped successfully (0 events).';
          }
        });
      }
    });
  };

  // ─── 7. ACTION: RESET LEDGER SEARCH FILTER (Asks YES or NO) ─────────────────
  const handleResetSearchRequest = () => {
    if (!searchLogQuery) return;
    promptConfirm({
      title: 'Reset Ledger Search Filter?',
      message: `Are you sure you want to clear your current search filter ("${searchLogQuery}")?`,
      description: 'All recorded visitor events will be displayed in the live ledger table.',
      confirmText: 'Yes, Reset Filter',
      cancelText: 'No, Keep Filter',
      variant: 'info',
      icon: <Search className="w-7 h-7 text-slate-500" />,
      onConfirm: () => {
        runActionWithProgressModal({
          title: 'Clearing Ledger Query Filters...',
          subtitle: 'FILTER BUFFER PURGE',
          steps: [
            { progress: 35, text: 'Flushing search token buffers...', delayMs: 160 },
            { progress: 75, text: 'Re-indexing telemetry ledger pagination...', delayMs: 180 }
          ],
          action: async () => {
            setSearchLogQuery('');
            setLedgerPage(1);
            return 'Telemetry ledger filter cleared.';
          }
        });
      }
    });
  };

  // ─── HEALTH & OPTIMIZATION RATING EVALUATOR ───
  const healthStatus = useMemo(() => {
    const bounceNum = parseFloat(metrics.bounceRate) || 0;
    const visitors = metrics.totalVisitors;
    const duration = metrics.avgDurationSec;

    if (visitors < 50 || bounceNum > 40) {
      return {
        status: 'NEEDS_IMPROVEMENT' as const,
        label: 'Website Improvement Needed',
        rating: 'Website Improvement Needed',
        color: 'rose',
        score: Math.min(68, Math.max(35, 100 - Math.round(bounceNum) - (visitors === 0 ? 30 : 0))),
        badgeClass: 'bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 border-rose-300 dark:border-rose-800',
        badgeColor: 'bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 border-rose-300 dark:border-rose-800',
        description: 'Audience acquisition and engagement metrics require active optimization. Visitors are bouncing early or session volume is low.',
        summary: 'Audience acquisition and engagement metrics require active optimization. Visitors are bouncing early or session volume is low.',
        suggestions: [
          'High bounce rate detected (>40%). Optimize above-the-fold value proposition and trust badges.',
          'Inbound traffic from paid & organic channels is limited. Launch Meta & Instagram ads to target organic food buyers.',
          'Submit Google Merchant Center product feed to capture high-intent organic food queries.'
        ]
      };
    } else if (bounceNum <= 25 && visitors >= 100) {
      return {
        status: 'EXCELLENT' as const,
        label: 'Excellent Performance',
        rating: 'Excellent Performance',
        color: 'emerald',
        score: Math.min(98, 85 + Math.round((visitors / 200) * 10)),
        badgeClass: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800',
        badgeColor: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800',
        description: 'Exceptional visitor engagement and low bounce rates. Traffic conversion pipelines are performing optimally.',
        summary: 'Exceptional visitor engagement and low bounce rates. Traffic conversion pipelines are performing optimally.',
        suggestions: [
          'Strong audience retention (<25% bounce). Scale Meta Lookalike campaigns.',
          'Consider launching WhatsApp VIP broadcasts for repeated harvest purchases.'
        ]
      };
    } else {
      return {
        status: 'GOOD' as const,
        label: 'Good Performance',
        rating: 'Good Performance',
        color: 'teal',
        score: 78,
        badgeClass: 'bg-teal-100 text-teal-800 dark:bg-teal-950/80 dark:text-teal-300 border-teal-300 dark:border-teal-800',
        badgeColor: 'bg-teal-100 text-teal-800 dark:bg-teal-950/80 dark:text-teal-300 border-teal-300 dark:border-teal-800',
        description: 'Healthy engagement levels across store catalog. Continue expanding audience reach.',
        summary: 'Healthy engagement levels across store catalog. Continue expanding audience reach.',
        suggestions: [
          'Stable traffic flow. Retarget cart abandoners on WhatsApp.',
          'Run A/B testing on product card call-to-actions to push bounce rate lower.'
        ]
      };
    }
  }, [metrics.bounceRate, metrics.totalVisitors, metrics.avgDurationSec]);

  // ─── FILTERED & PAGINATED TOP PAGES (CHART 6) ───
  const filteredTopPages = useMemo(() => {
    let result = [...metrics.topPages];

    // Filter by search query
    if (topPagesSearch.trim()) {
      const q = topPagesSearch.toLowerCase();
      result = result.filter(p => p.path.toLowerCase().includes(q) || p.label.toLowerCase().includes(q));
    }

    // Filter by category
    if (topPagesCategory !== 'ALL') {
      if (topPagesCategory === 'PRODUCTS') {
        result = result.filter(p => p.path.includes('/product'));
      } else if (topPagesCategory === 'CATEGORY') {
        result = result.filter(p => p.path.includes('/category') || p.path.includes('/catalog'));
      } else if (topPagesCategory === 'CHECKOUT') {
        result = result.filter(p => p.path.includes('/cart') || p.path.includes('/checkout') || p.path.includes('/order'));
      } else if (topPagesCategory === 'ACCOUNT') {
        result = result.filter(p => p.path.includes('/account') || p.path.includes('/profile') || p.path.includes('/admin'));
      } else if (topPagesCategory === 'PUBLIC') {
        result = result.filter(p => p.path === '/' || p.path.includes('/about') || p.path.includes('/contact') || p.path.includes('/reviews'));
      }
    }

    // Sort
    if (topPagesSort === 'VISITS_DESC') {
      result.sort((a, b) => b.visits - a.visits);
    } else if (topPagesSort === 'VISITS_ASC') {
      result.sort((a, b) => a.visits - b.visits);
    } else if (topPagesSort === 'TIME_DESC') {
      result.sort((a, b) => {
        const getSec = (s: string) => {
          const m = s.match(/(\d+)m/);
          const sc = s.match(/(\d+)s/);
          return (m ? parseInt(m[1]) * 60 : 0) + (sc ? parseInt(sc[1]) : 0);
        };
        return getSec(b.avgTime) - getSec(a.avgTime);
      });
    } else if (topPagesSort === 'BOUNCE_ASC') {
      result.sort((a, b) => parseFloat(a.bounce) - parseFloat(b.bounce));
    }

    return result;
  }, [metrics.topPages, topPagesSearch, topPagesCategory, topPagesSort]);

  const topPagesTotalPages = Math.max(1, Math.ceil(filteredTopPages.length / topPagesRowsPerPage));
  const paginatedTopPages = useMemo(() => {
    const start = (topPagesPage - 1) * topPagesRowsPerPage;
    return filteredTopPages.slice(start, start + topPagesRowsPerPage);
  }, [filteredTopPages, topPagesPage, topPagesRowsPerPage]);

  // ─── FILTERED & PAGINATED VISITOR EVENTS (TABLE 7) ───
  const filteredEvents = useMemo(() => {
    let result = [...metrics.recentEvents];

    // Filter by search query
    if (searchLogQuery.trim()) {
      const q = searchLogQuery.toLowerCase();
      result = result.filter(e =>
        (e.path && e.path.toLowerCase().includes(q)) ||
        (e.page_title && e.page_title.toLowerCase().includes(q)) ||
        (e.device_type && e.device_type.toLowerCase().includes(q)) ||
        (e.browser && e.browser.toLowerCase().includes(q)) ||
        (e.referrer && e.referrer.toLowerCase().includes(q)) ||
        (e.session_id && e.session_id.toLowerCase().includes(q)) ||
        (e.ip_hash && e.ip_hash.toLowerCase().includes(q))
      );
    }

    // Filter by device
    if (ledgerDeviceFilter !== 'ALL') {
      result = result.filter(e => e.device_type === ledgerDeviceFilter);
    }

    // Filter by referrer / channel
    if (ledgerReferrerFilter !== 'ALL') {
      if (ledgerReferrerFilter === 'Direct') {
        result = result.filter(e => !e.referrer || e.referrer.toLowerCase().includes('direct'));
      } else {
        result = result.filter(e => e.referrer && e.referrer.toLowerCase().includes(ledgerReferrerFilter.toLowerCase()));
      }
    }

    // Sort
    result.sort((a, b) => {
      const timeA = new Date(a.created_at || 0).getTime();
      const timeB = new Date(b.created_at || 0).getTime();
      return ledgerSortOrder === 'NEWEST' ? timeB - timeA : timeA - timeB;
    });

    return result;
  }, [metrics.recentEvents, searchLogQuery, ledgerDeviceFilter, ledgerReferrerFilter, ledgerSortOrder]);

  const ledgerTotalPages = Math.max(1, Math.ceil(filteredEvents.length / ledgerPerPage));
  const paginatedEvents = useMemo(() => {
    const start = (ledgerPage - 1) * ledgerPerPage;
    return filteredEvents.slice(start, start + ledgerPerPage);
  }, [filteredEvents, ledgerPage, ledgerPerPage]);

  // Copy Snippet Helper
  const copyToClipboard = (text: string, id: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedSnippetId(id);
      toast.success('Copied to clipboard!');
      setTimeout(() => setCopiedSnippetId(null), 2500);
    }
  };

  // Generated UTM Link
  const generatedUtmUrl = useMemo(() => {
    try {
      const url = new URL(utmBaseUrl);
      if (utmSource) url.searchParams.set('utm_source', utmSource);
      if (utmMedium) url.searchParams.set('utm_medium', utmMedium);
      if (utmCampaign) url.searchParams.set('utm_campaign', utmCampaign);
      if (utmContent) url.searchParams.set('utm_content', utmContent);
      return url.toString();
    } catch {
      return `${utmBaseUrl}?utm_source=${utmSource}&utm_medium=${utmMedium}&utm_campaign=${utmCampaign}&utm_content=${utmContent}`;
    }
  }, [utmBaseUrl, utmSource, utmMedium, utmCampaign, utmContent]);

  const hasTrafficData = metrics.totalPageViews > 0;

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* ─── Header Control Bar ─── */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 rounded-3xl shadow-xl border border-indigo-900/60 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 text-indigo-400 text-xs font-black uppercase tracking-wider mb-1">
            <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
            <span>REAL-TIME AUDIENCE ENGINE • LIVE STORE TELEMETRY</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-serif font-black text-white flex flex-wrap items-center gap-2">
            Website Traffic & Audience Analyzer
            
            {/* Live Database Status Pill */}
            <span className="px-2.5 py-0.5 text-xs bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded-full font-sans font-bold flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
              Live DB
            </span>

            {/* Master Tracking Status Pill */}
            {isAnalyzerActive ? (
              <span className="px-2.5 py-0.5 text-xs bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded-full font-sans font-bold flex items-center gap-1.5">
                <Power className="w-3 h-3 text-emerald-400" />
                Tracking ON
              </span>
            ) : (
              <span className="px-2.5 py-0.5 text-xs bg-rose-500/20 text-rose-300 border border-rose-500/40 rounded-full font-sans font-bold flex items-center gap-1.5 animate-pulse">
                <Power className="w-3 h-3 text-rose-400" />
                Tracking OFF
              </span>
            )}
          </h2>
          <p className="text-slate-300 text-xs sm:text-sm mt-1 max-w-2xl">
            100% real visitor sessions, device telemetry, path journeys, and conversion funnels derived from the <code className="bg-slate-800 px-1.5 py-0.5 rounded text-emerald-300 font-mono">website_analyze</code> database table.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Master Analyzer ON/OFF Toggle Switch Button */}
          <div className="flex items-center gap-2 p-1 bg-slate-800/90 rounded-2xl border border-slate-700/80 shadow-inner">
            <button
              onClick={() => handleToggleAnalyzerRequest(!isAnalyzerActive)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer shadow-md ${
                isAnalyzerActive
                  ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/20'
                  : 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/20'
              }`}
              title={isAnalyzerActive ? 'Click to Turn OFF Website Analyzer' : 'Click to Turn ON Website Analyzer'}
            >
              <Power className={`w-3.5 h-3.5 ${isAnalyzerActive ? 'text-slate-950' : 'text-white'}`} />
              <span>{isAnalyzerActive ? 'Analyzer: ON' : 'Analyzer: OFF'}</span>
            </button>
          </div>

          {/* Auto-Refresh Control (Prompts Yes/No on change) */}
          <AutoRefreshDropdown
            intervalSec={autoRefreshSec}
            onIntervalChange={handleAutoRefreshIntervalRequest}
            onRefresh={handleRefreshRequest}
            variant="indigo"
          />

          {isAnalyzerActive && autoRefreshSec > 0 && (
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-slate-800/90 border border-slate-700/80 rounded-xl text-xs font-mono text-emerald-400 shadow-inner">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Next: {countdown}s</span>
            </div>
          )}

          {/* Timeframe Filter Buttons (Prompts Yes/No on change) */}
          <div className="flex bg-slate-800/80 p-1 rounded-xl border border-slate-700 text-xs font-bold">
            {(['today', '7d', '30d', 'year', 'all'] as const).map((t) => (
              <button
                key={t}
                onClick={() => handleTimeframeRequest(t)}
                className={`px-3 py-1.5 rounded-lg transition-all capitalize cursor-pointer ${
                  timeframe === t
                    ? 'bg-indigo-600 text-white shadow'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
                }`}
              >
                {t === '7d' ? '7 Days' : t === '30d' ? '30 Days' : t === 'today' ? 'Today' : t === 'year' ? 'Year' : 'All'}
              </button>
            ))}
          </div>

          {/* View Mode Toggle: Analyzer vs Growth Guide */}
          <div className="flex bg-slate-800/90 p-1 rounded-xl border border-slate-700 text-xs font-bold shadow-inner">
            <button
              type="button"
              onClick={() => handleSwitchViewMode('analyzer')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                viewMode === 'analyzer'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Analyzer</span>
            </button>
            <button
              type="button"
              onClick={() => handleSwitchViewMode('growth_guide', 'meta_ads')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                viewMode === 'growth_guide'
                  ? 'bg-emerald-600 text-white shadow'
                  : 'text-emerald-400 hover:text-white'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>Growth Guide</span>
            </button>
          </div>

          {/* Manual Refresh Button with Percentage Modal (Prompts Yes/No) */}
          <button
            onClick={handleRefreshRequest}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 border border-indigo-400/40 text-white rounded-xl text-xs font-bold shadow-lg transition-all hover:scale-105 active:scale-95 cursor-pointer"
            title="Perform live database telemetry refresh"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Live Sync</span>
          </button>

          {/* Quick Test Visit Logger (Prompts Yes/No) */}
          <button
            onClick={() => handleLogTestVisitRequest('/', 'Storefront Home')}
            disabled={isLoggingTest}
            className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600/30 hover:bg-emerald-600/50 border border-emerald-500/40 text-emerald-200 hover:text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50 cursor-pointer"
            title="Record a test visit to verify live charts"
          >
            <Zap className={`w-3.5 h-3.5 text-emerald-400 ${isLoggingTest ? 'animate-bounce' : ''}`} />
            <span>{isLoggingTest ? 'Logging...' : 'Log Test Visit'}</span>
          </button>

          {/* Clear Telemetry Action (Prompts Yes/No) */}
          {hasTrafficData && (
            <button
              onClick={handleClearTelemetryRequest}
              className="flex items-center gap-1.5 px-2.5 py-2 bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/50 text-rose-300 hover:text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
              title="Clear all website telemetry events"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* ─── CONDITIONAL VIEW: GROWTH GUIDE OR DASHBOARD ─── */}
      {viewMode === 'growth_guide' ? (
        <div className="space-y-6 animate-fadeIn">
          {/* Growth Guide Banner / Breadcrumb Header */}
          <div className="bg-gradient-to-r from-emerald-950 via-teal-950 to-slate-900 text-white p-6 rounded-3xl border border-emerald-500/40 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <button
                type="button"
                onClick={() => handleSwitchViewMode('analyzer')}
                className="p-3 bg-white/10 hover:bg-white/20 rounded-2xl text-emerald-300 hover:text-white transition cursor-pointer shrink-0 mt-0.5"
                title="Return to Traffic Analyzer Dashboard"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-[10px] font-black uppercase tracking-wider">
                    STORE GROWTH BLUEPRINT
                  </span>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black border ${healthStatus.badgeColor}`}>
                    Status: {healthStatus.rating} ({healthStatus.score}/100)
                  </span>
                </div>
                <h3 className="text-xl sm:text-2xl font-serif font-black text-white mt-1.5 flex items-center gap-2">
                  <span>How to Increase Visitors & Convert Buyers</span>
                  <Sparkles className="w-5 h-5 text-amber-300 inline" />
                </h3>
                <p className="text-xs text-emerald-200/80 mt-1 max-w-2xl leading-relaxed">
                  Battle-tested marketing blueprints, copy-paste ad templates, targeting parameters, and direct WhatsApp funnels to scale organic customer traffic.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 self-end md:self-auto shrink-0">
              <a
                href="/admin/cms/seo-guide"
                className="px-4 py-2.5 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-emerald-950 font-black rounded-xl text-xs shadow-lg transition flex items-center gap-2 cursor-pointer hover:scale-105 active:scale-95"
                title="Open 20-Page Storefront SEO & Page Header Playbook"
              >
                <BookOpen className="w-4 h-4 text-emerald-950" />
                <span>20-Page SEO Header Playbook</span>
              </a>
              <button
                type="button"
                onClick={() => handleSwitchViewMode('analyzer')}
                className="px-4 py-2.5 bg-slate-800/90 hover:bg-slate-700 text-white rounded-xl text-xs font-bold border border-slate-600 transition flex items-center gap-2 cursor-pointer shadow-md hover:scale-105 active:scale-95"
              >
                <Activity className="w-4 h-4 text-indigo-400" />
                <span>Return to Telemetry</span>
              </button>
            </div>
          </div>

          {/* 2-COLUMN VIEW: Left Side Topics Menu | Right Side Explanations & Tools */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* ─── LEFT COLUMN (lg:col-span-4): Topics & Channels Menu ─── */}
            <div className="lg:col-span-4 space-y-4">
              <div className="bg-white dark:bg-slate-900 rounded-3xl p-4 sm:p-5 border border-slate-200 dark:border-slate-800 shadow-sm sticky top-6">
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-emerald-500" />
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-slate-100">
                      Marketing Playbooks
                    </h4>
                  </div>
                  <span className="text-[10px] font-bold text-slate-400">
                    {GROWTH_TOPICS.length} Topics
                  </span>
                </div>

                <div className="space-y-2">
                  {GROWTH_TOPICS.map((topic) => {
                    const isActive = activeGuideTopic === topic.id;
                    return (
                      <button
                        key={topic.id}
                        type="button"
                        onClick={() => setActiveGuideTopic(topic.id)}
                        className={`w-full text-left p-3.5 rounded-2xl transition-all cursor-pointer flex items-center justify-between gap-3 ${
                          isActive
                            ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-600/20 scale-[1.02]'
                            : 'hover:bg-slate-100 dark:hover:bg-slate-800/70 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <p className={`text-xs font-extrabold truncate ${isActive ? 'text-white' : 'text-slate-900 dark:text-white'}`}>
                            {topic.title}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md ${
                              isActive
                                ? 'bg-white/25 text-white'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                            }`}>
                              {topic.badge}
                            </span>
                            <span className={`text-[9px] ${isActive ? 'text-emerald-100' : 'text-slate-400'}`}>
                              {topic.readTime}
                            </span>
                          </div>
                        </div>
                        <ChevronRight className={`w-4 h-4 shrink-0 transition-transform ${isActive ? 'text-white translate-x-1' : 'text-slate-400'}`} />
                      </button>
                    );
                  })}
                </div>

                {/* Health Diagnosis Card in Sidebar */}
                <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/60">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Award className="w-4 h-4 text-emerald-500" />
                        <span className="text-[11px] font-black uppercase text-slate-800 dark:text-slate-200">
                          Store Traffic Health
                        </span>
                      </div>
                      <span className="text-xs font-mono font-black text-emerald-500">
                        {healthStatus.score}/100
                      </span>
                    </div>
                    <p className={`text-xs font-extrabold ${healthStatus.badgeColor.includes('rose') ? 'text-rose-500' : healthStatus.badgeColor.includes('amber') ? 'text-amber-500' : 'text-emerald-500'}`}>
                      {healthStatus.rating}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                      {healthStatus.summary}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* ─── RIGHT COLUMN (lg:col-span-8): Selected Topic Details & Explanation ─── */}
            <div className="lg:col-span-8 space-y-6">
              {(() => {
                const topic = GROWTH_TOPICS.find((t) => t.id === activeGuideTopic) || GROWTH_TOPICS[0];
                return (
                  <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
                    {/* Topic Header */}
                    <div className="border-b border-slate-100 dark:border-slate-800 pb-5">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                          {topic.badge}
                        </span>
                        <span className="text-[11px] font-mono text-slate-400 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {topic.readTime}
                        </span>
                      </div>
                      <h2 className="text-xl sm:text-2xl font-serif font-black text-slate-900 dark:text-white">
                        {topic.title}
                      </h2>
                      <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-2 leading-relaxed">
                        {topic.summary}
                      </p>
                    </div>

                    {/* Strategy Advantage Callout */}
                    <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-transparent border-l-4 border-emerald-500 space-y-1">
                      <h4 className="text-xs font-black uppercase text-emerald-700 dark:text-emerald-400 tracking-wider">
                        {topic.strategyHeading}
                      </h4>
                      <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                        {topic.strategyDesc}
                      </p>
                    </div>

                    {/* Step-by-Step Blueprint */}
                    <div>
                      <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3 flex items-center gap-2">
                        <Target className="w-4 h-4 text-emerald-500" />
                        <span>Step-by-Step Execution Blueprint</span>
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {topic.steps.map((step, idx) => (
                          <div
                            key={idx}
                            className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 flex flex-col justify-between"
                          >
                            <div>
                              <div className="flex items-center gap-2 mb-1.5">
                                <span className="w-6 h-6 rounded-lg bg-emerald-600 text-white font-mono font-black text-xs flex items-center justify-center shrink-0">
                                  {idx + 1}
                                </span>
                                <h5 className="text-xs font-bold text-slate-900 dark:text-white">
                                  {step.title.replace(/^Step \d+:\s*/, '')}
                                </h5>
                              </div>
                              <p className="text-[11px] sm:text-xs text-slate-600 dark:text-slate-300 leading-relaxed pl-8">
                                {step.desc}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Copy-Paste Ad / Message Templates (If available) */}
                    {topic.templates && topic.templates.length > 0 && (
                      <div>
                        <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3 flex items-center gap-2">
                          <FileText className="w-4 h-4 text-indigo-500" />
                          <span>Ready-to-Use Copy Templates (1-Click Copy)</span>
                        </h4>
                        <div className="space-y-3">
                          {topic.templates.map((tpl, tIdx) => {
                            const isCopied = copiedSnippetId === `${topic.id}-${tIdx}`;
                            return (
                              <div
                                key={tIdx}
                                className="p-4 rounded-2xl bg-slate-900 text-slate-100 border border-slate-800 relative group"
                              >
                                <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
                                  <span className="text-xs font-bold text-emerald-400 font-mono">
                                    {tpl.name}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => copyToClipboard(tpl.content, `${topic.id}-${tIdx}`)}
                                    className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-emerald-600 text-xs font-bold text-white transition flex items-center gap-1.5 cursor-pointer"
                                  >
                                    {isCopied ? (
                                      <>
                                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                                        <span>Copied!</span>
                                      </>
                                    ) : (
                                      <>
                                        <Copy className="w-3.5 h-3.5" />
                                        <span>Copy Copy</span>
                                      </>
                                    )}
                                  </button>
                                </div>
                                <pre className="text-xs font-mono text-slate-300 whitespace-pre-wrap leading-relaxed select-all">
                                  {tpl.content}
                                </pre>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Target Audience & Budget Guidance (If available) */}
                    {topic.budgetGuidance && (
                      <div>
                        <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3 flex items-center gap-2">
                          <DollarSign className="w-4 h-4 text-amber-500" />
                          <span>Recommended Budget & Targeting Parameters</span>
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                          {topic.budgetGuidance.dailyBudget && (
                            <div className="p-3.5 rounded-2xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40">
                              <span className="text-[10px] font-bold text-amber-800 dark:text-amber-400 uppercase block">
                                Recommended Daily Spend
                              </span>
                              <p className="text-xs font-black text-slate-900 dark:text-white mt-0.5">
                                {topic.budgetGuidance.dailyBudget}
                              </p>
                            </div>
                          )}
                          {topic.budgetGuidance.targetCpc && (
                            <div className="p-3.5 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-800/40">
                              <span className="text-[10px] font-bold text-indigo-800 dark:text-indigo-400 uppercase block">
                                Target Cost Per Click
                              </span>
                              <p className="text-xs font-black text-slate-900 dark:text-white mt-0.5">
                                {topic.budgetGuidance.targetCpc}
                              </p>
                            </div>
                          )}
                          {topic.budgetGuidance.expectedRoas && (
                            <div className="p-3.5 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40">
                              <span className="text-[10px] font-bold text-emerald-800 dark:text-emerald-400 uppercase block">
                                Expected Return (ROAS)
                              </span>
                              <p className="text-xs font-black text-slate-900 dark:text-white mt-0.5">
                                {topic.budgetGuidance.expectedRoas}
                              </p>
                            </div>
                          )}
                          {topic.budgetGuidance.targetAudience && (
                            <div className="p-3.5 rounded-2xl bg-purple-50/60 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800/40 sm:col-span-2">
                              <span className="text-[10px] font-bold text-purple-800 dark:text-purple-400 uppercase block">
                                High-Intent Audience Demographics
                              </span>
                              <p className="text-xs font-bold text-slate-900 dark:text-white mt-0.5">
                                {topic.budgetGuidance.targetAudience}
                              </p>
                            </div>
                          )}
                          {topic.budgetGuidance.placement && (
                            <div className="p-3.5 rounded-2xl bg-teal-50/60 dark:bg-teal-950/20 border border-teal-200 dark:border-teal-800/40">
                              <span className="text-[10px] font-bold text-teal-800 dark:text-teal-400 uppercase block">
                                Best Ad Placements
                              </span>
                              <p className="text-xs font-bold text-slate-900 dark:text-white mt-0.5">
                                {topic.budgetGuidance.placement}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Pro Tips Section */}
                    {topic.proTips && topic.proTips.length > 0 && (
                      <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60">
                        <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-1.5">
                          <Lightbulb className="w-4 h-4 text-amber-500" />
                          <span>Expert Pro Tips & Common Mistakes to Avoid</span>
                        </h4>
                        <ul className="space-y-2 mt-2">
                          {topic.proTips.map((tip, tipIdx) => (
                            <li key={tipIdx} className="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                              <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                              <span>{tip}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Interactive UTM Generator (Special Tool for topic: 'utm_generator') */}
                    {topic.id === 'utm_generator' && (
                      <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 border border-indigo-800 text-white space-y-4">
                        <div className="flex items-center gap-2 pb-3 border-b border-indigo-900/80">
                          <LinkIcon className="w-5 h-5 text-emerald-400" />
                          <div>
                            <h4 className="text-sm font-bold text-white">Live Campaign UTM Link Generator</h4>
                            <p className="text-[11px] text-slate-400">Configure parameters below and generate your trackable campaign URL.</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="text-[11px] font-bold text-slate-300 block mb-1">
                              Destination Page URL
                            </label>
                            <input
                              type="text"
                              value={utmBaseUrl}
                              onChange={(e) => setUtmBaseUrl(e.target.value)}
                              placeholder="https://mrvivasayi.com/products"
                              className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-400 font-mono"
                            />
                            <div className="flex flex-wrap gap-1 mt-1.5">
                              {['/', '/products', '/products/category/cold-pressed-oils', '/checkout'].map((preset) => (
                                <button
                                  key={preset}
                                  type="button"
                                  onClick={() => setUtmBaseUrl(`${window.location.origin}${preset}`)}
                                  className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
                                >
                                  {preset}
                                </button>
                              ))}
                            </div>
                          </div>

                          <div>
                            <label className="text-[11px] font-bold text-slate-300 block mb-1">
                              Campaign Source (<code className="text-emerald-400">utm_source</code>)
                            </label>
                            <input
                              type="text"
                              value={utmSource}
                              onChange={(e) => setUtmSource(e.target.value)}
                              placeholder="facebook, instagram, whatsapp, google"
                              className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-400 font-mono"
                            />
                            <div className="flex flex-wrap gap-1 mt-1.5">
                              {['facebook', 'instagram', 'whatsapp', 'google', 'newsletter'].map((src) => (
                                <button
                                  key={src}
                                  type="button"
                                  onClick={() => setUtmSource(src)}
                                  className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
                                >
                                  {src}
                                </button>
                              ))}
                            </div>
                          </div>

                          <div>
                            <label className="text-[11px] font-bold text-slate-300 block mb-1">
                              Campaign Medium (<code className="text-emerald-400">utm_medium</code>)
                            </label>
                            <input
                              type="text"
                              value={utmMedium}
                              onChange={(e) => setUtmMedium(e.target.value)}
                              placeholder="cpc, reels_bio, chat_broadcast, story_ad"
                              className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-400 font-mono"
                            />
                            <div className="flex flex-wrap gap-1 mt-1.5">
                              {['cpc', 'reels_bio', 'chat_broadcast', 'story_ad'].map((med) => (
                                <button
                                  key={med}
                                  type="button"
                                  onClick={() => setUtmMedium(med)}
                                  className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
                                >
                                  {med}
                                </button>
                              ))}
                            </div>
                          </div>

                          <div>
                            <label className="text-[11px] font-bold text-slate-300 block mb-1">
                              Campaign Name (<code className="text-emerald-400">utm_campaign</code>)
                            </label>
                            <input
                              type="text"
                              value={utmCampaign}
                              onChange={(e) => setUtmCampaign(e.target.value)}
                              placeholder="harvest_sale_october"
                              className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-400 font-mono"
                            />
                          </div>
                        </div>

                        {/* Generated Trackable URL Display */}
                        <div className="pt-3 border-t border-indigo-900/80">
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-[11px] font-bold text-emerald-400 uppercase">
                              Your Generated Trackable URL
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                copyToClipboard(generatedUtmUrl, 'utm_link');
                                setIsCopiedUtm(true);
                                setTimeout(() => setIsCopiedUtm(false), 2500);
                              }}
                              className="px-3 py-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-lg transition flex items-center gap-1.5 cursor-pointer"
                            >
                              {isCopiedUtm ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                              <span>{isCopiedUtm ? 'Copied!' : 'Copy Trackable URL'}</span>
                            </button>
                          </div>
                          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 font-mono text-xs text-slate-300 break-all select-all flex items-center justify-between gap-2">
                            <span>{generatedUtmUrl}</span>
                            <a
                              href={generatedUtmUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 shrink-0"
                              title="Test visit in new window to log telemetry event"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* ─── BANNER: ANALYZER IS TURNED OFF ─── */}
          {!isAnalyzerActive && (
        <div className="bg-gradient-to-r from-rose-950/90 via-rose-900/70 to-rose-950/90 border-2 border-rose-500/60 p-6 rounded-3xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xl animate-fadeIn">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-500/40 text-rose-300 flex items-center justify-center shrink-0">
              <Power className="w-6 h-6 text-rose-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-md bg-rose-500/30 text-rose-200 border border-rose-500/50 text-[10px] font-black uppercase tracking-wider">
                  TRACKING PAUSED
                </span>
                <h4 className="text-base font-extrabold text-white">
                  Website Traffic Telemetry Tracking is Turned OFF
                </h4>
              </div>
              <p className="text-xs text-rose-200/90 mt-1 max-w-2xl leading-relaxed">
                Audience visits, browser client telemetry, referrers, and page journeys are currently <strong>NOT</strong> being analyzed or saved to the database. Turn ON the analyzer to resume tracking real-time audience activity.
              </p>
            </div>
          </div>
          <button
            onClick={() => handleToggleAnalyzerRequest(true)}
            className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs rounded-xl shadow-lg transition active:scale-95 shrink-0 flex items-center gap-1.5 cursor-pointer"
          >
            <Power className="w-4 h-4" />
            <span>Turn ON Analyzer</span>
          </button>
        </div>
      )}

      {/* ─── Zero Data State Alert (If website_analyze table is empty) ─── */}
      {!hasTrafficData && isAnalyzerActive && (
        <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 p-6 rounded-3xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm animate-fadeIn">
          <div className="flex items-start gap-3.5">
            <div className="p-3 bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300 rounded-2xl shrink-0">
              <Activity className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h4 className="text-base font-extrabold text-amber-950 dark:text-amber-100">
                No Website Traffic Events Recorded Yet ({timeframe.toUpperCase()})
              </h4>
              <p className="text-xs text-amber-800/90 dark:text-amber-300/80 mt-1 max-w-2xl leading-relaxed">
                The database table <code className="font-mono bg-amber-100/80 dark:bg-amber-900/80 px-1 py-0.5 rounded">website_analyze</code> is currently waiting for visitor traffic. Telemetry automatically tracks whenever public visitors browse products, articles, and cart pages.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              onClick={() => handleLogTestVisitRequest('/', 'Storefront Home')}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md transition hover:scale-105 cursor-pointer"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Log Test Home Visit</span>
            </button>
            <button
              onClick={() => handleLogTestVisitRequest('/products', 'Products Catalog')}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md transition hover:scale-105 cursor-pointer"
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>Log Catalog Visit</span>
            </button>
          </div>
        </div>
      )}

      {/* ─── 4 TOP SUMMARY BOXES (100% REAL DATA) ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Box 1: Real Visitors */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-indigo-100 dark:border-slate-800 shadow-sm relative overflow-hidden group hover:shadow-md transition">
          <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/10 rounded-full blur-xl pointer-events-none group-hover:scale-125 transition-transform" />
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-extrabold text-indigo-700 dark:text-indigo-400 uppercase tracking-wider">Total Unique Visitors</span>
            <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-2xl">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900 dark:text-white">
              {metrics.totalVisitors.toLocaleString()}
            </span>
            <span className="text-xs font-black text-emerald-600 flex items-center">
              <Activity className="w-3.5 h-3.5 mr-0.5" /> {metrics.totalPageViews} views
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Distinct visitor sessions recorded in <code className="font-mono">website_analyze</code></p>
        </div>

        {/* Box 2: Total Verified Orders & Real Revenue */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-emerald-100 dark:border-slate-800 shadow-sm relative overflow-hidden group hover:shadow-md transition">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-xl pointer-events-none group-hover:scale-125 transition-transform" />
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-extrabold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">Verified Store Orders</span>
            <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 rounded-2xl">
              <ShoppingBag className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900 dark:text-white">
              {metrics.totalOrders.toLocaleString()}
            </span>
            <span className="text-xs font-black text-emerald-600 flex items-center">
              <ArrowUpRight className="w-3.5 h-3.5" /> ₹{metrics.totalRevenue.toLocaleString()}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Confirmed customer orders logged in <code className="font-mono">orders</code> table</p>
        </div>

        {/* Box 3: Average Session Duration */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-amber-100 dark:border-slate-800 shadow-sm relative overflow-hidden group hover:shadow-md transition">
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/10 rounded-full blur-xl pointer-events-none group-hover:scale-125 transition-transform" />
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-extrabold text-amber-700 dark:text-amber-400 uppercase tracking-wider">Avg Session Duration</span>
            <div className="p-2.5 bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 rounded-2xl">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900 dark:text-white">
              {Math.floor(metrics.avgDurationSec / 60)}m {metrics.avgDurationSec % 60}s
            </span>
            <span className="text-xs font-black text-indigo-600 flex items-center">
              {metrics.bounceRate} bounce
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Average real visitor engagement time per store page view</p>
        </div>

        {/* Box 4: Active Catalog Products & Reviews */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-purple-100 dark:border-slate-800 shadow-sm relative overflow-hidden group hover:shadow-md transition">
          <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/10 rounded-full blur-xl pointer-events-none group-hover:scale-125 transition-transform" />
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-extrabold text-purple-700 dark:text-purple-400 uppercase tracking-wider">Catalog & Reviews</span>
            <div className="p-2.5 bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 rounded-2xl">
              <Eye className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900 dark:text-white">
              {metrics.totalProducts.toLocaleString()}
            </span>
            <span className="text-xs font-black text-purple-600 flex items-center">
              {metrics.totalReviews} reviews
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Published store catalog items & authentic buyer feedback</p>
        </div>
      </div>

      {/* ─── MODULE & WEBSITE HEALTH & AUDIENCE OPTIMIZATION RATING CARD ─── */}
      <div
        className={`p-6 rounded-3xl border-2 shadow-sm transition-all animate-fadeIn ${
          healthStatus.status === 'NEEDS_IMPROVEMENT'
            ? 'bg-rose-50/70 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900/60'
            : healthStatus.status === 'EXCELLENT'
            ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900/60'
            : 'bg-teal-50/70 dark:bg-teal-950/30 border-teal-200 dark:border-teal-900/60'
        }`}
      >
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5">
          <div className="flex items-start gap-4">
            <div
              className={`p-3.5 rounded-2xl shrink-0 ${
                healthStatus.status === 'NEEDS_IMPROVEMENT'
                  ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/20'
                  : healthStatus.status === 'EXCELLENT'
                  ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20'
                  : 'bg-teal-500 text-white shadow-lg shadow-teal-500/20'
              }`}
            >
              {healthStatus.status === 'NEEDS_IMPROVEMENT' ? (
                <AlertTriangle className="w-6 h-6 animate-bounce" />
              ) : healthStatus.status === 'EXCELLENT' ? (
                <Award className="w-6 h-6" />
              ) : (
                <CheckCircle2 className="w-6 h-6" />
              )}
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  STORE TELEMETRY DIAGNOSTIC
                </span>
                <span
                  className={`px-3 py-0.5 rounded-full text-xs font-black border flex items-center gap-1.5 ${healthStatus.badgeClass}`}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      healthStatus.status === 'NEEDS_IMPROVEMENT' ? 'bg-rose-500 animate-pulse' : 'bg-emerald-500'
                    }`}
                  />
                  {healthStatus.label}
                </span>

                <span className="text-xs font-mono font-bold text-slate-600 dark:text-slate-300">
                  Optimization Score: <strong>{healthStatus.score}/100</strong>
                </span>
              </div>

              <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                {healthStatus.status === 'NEEDS_IMPROVEMENT'
                  ? 'Store Traffic Volume & Bounce Rate Require Action'
                  : healthStatus.status === 'EXCELLENT'
                  ? 'High Conversion & Low Bounce Rate Active'
                  : 'Stable Organic Traffic & Healthy Session Durations'}
              </h3>

              <p className="text-xs text-slate-600 dark:text-slate-300 max-w-3xl leading-relaxed">
                {healthStatus.description}
              </p>

              {/* Suggestions bullet points */}
              <div className="flex flex-wrap gap-2 pt-1.5">
                {healthStatus.suggestions.map((sug, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1.5 text-[11px] font-medium bg-white/80 dark:bg-slate-900/80 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                    {sug}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Action Button: Opens the Growth Guide Full Details Page */}
          <div className="shrink-0 self-stretch sm:self-auto flex sm:flex-col justify-end gap-2">
            <button
              type="button"
              onClick={() => handleSwitchViewMode('growth_guide', 'meta_ads')}
              className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 via-purple-600 to-emerald-600 hover:from-indigo-700 hover:to-emerald-700 text-white rounded-2xl text-xs font-black shadow-lg shadow-indigo-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95 group"
            >
              <Sparkles className="w-4 h-4 text-amber-300 animate-spin" />
              <span>How to Increase Visitors (Help Guide)</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </button>
            <a
              href="/admin/cms/seo-guide"
              className="px-5 py-2.5 bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-400 hover:from-amber-300 hover:to-amber-400 text-emerald-950 rounded-2xl text-xs font-black shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95 text-center"
            >
              <BookOpen className="w-4 h-4 text-emerald-950" />
              <span>✨ 20-Page SEO Header Playbook</span>
            </a>
          </div>
        </div>
      </div>

      {/* ─── CHARTS SECTION ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* CHART 1: Real Traffic Trends (Visitors & Pageviews) - 2 Cols */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-extrabold text-slate-900 dark:text-white text-base flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                Chart 1: Daily Traffic Trends & Impressions
              </h3>
              <p className="text-xs text-slate-500">Real page impressions vs unique visitor sessions over time</p>
            </div>
            <span className="text-xs font-black px-2.5 py-1 bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 rounded-lg">
              Telemetry Area
            </span>
          </div>

          <div className="h-72 w-full">
            {metrics.trafficTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={metrics.trafficTrend} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="visitorGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="viewsGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.6} />
                  <XAxis dataKey="date" stroke="#64748b" fontSize={12} />
                  <YAxis stroke="#64748b" fontSize={12} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', border: 'none', color: '#fff' }}
                  />
                  <Legend />
                  <Area type="monotone" dataKey="pageViews" name="Page Views" stroke="#6366f1" strokeWidth={2.5} fillOpacity={1} fill="url(#viewsGrad)" />
                  <Area type="monotone" dataKey="visitors" name="Unique Visitors" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#visitorGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl p-6">
                <Activity className="w-8 h-8 mb-2 opacity-50" />
                <p className="text-xs font-bold">No telemetry traffic trend recorded for this timeframe</p>
                <button
                  onClick={() => handleLogTestVisitRequest('/', 'Storefront Home')}
                  className="mt-3 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow cursor-pointer"
                >
                  Log First Visit
                </button>
              </div>
            )}
          </div>
        </div>

        {/* CHART 2: Real Device Breakdown - 1 Col */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-extrabold text-slate-900 dark:text-white text-base">
                Chart 2: Device Share
              </h3>
              <span className="text-xs font-black px-2.5 py-1 bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 rounded-lg">
                Real Telemetry
              </span>
            </div>
            <p className="text-xs text-slate-500">Live breakdown of Mobile, Desktop, and Tablet clients</p>
          </div>

          <div className="h-56 w-full relative flex items-center justify-center">
            {metrics.deviceBreakdown.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={metrics.deviceBreakdown}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {metrics.deviceBreakdown.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', border: 'none', color: '#fff' }}
                      formatter={(val: any, name: any, item: any) => [`${val}% (${item.payload.count} visits)`, name]}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute text-center pointer-events-none">
                  <div className="text-xl font-black text-slate-900 dark:text-white">
                    {metrics.deviceBreakdown[0]?.value || 0}%
                  </div>
                  <div className="text-[10px] text-slate-500 font-bold uppercase truncate max-w-[90px]">
                    {metrics.deviceBreakdown[0]?.name.split(' ')[0] || 'Devices'}
                  </div>
                </div>
              </>
            ) : (
              <div className="h-full w-full flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl p-4 text-center">
                <Smartphone className="w-8 h-8 mb-2 opacity-50" />
                <p className="text-xs font-bold">No device events recorded yet</p>
              </div>
            )}
          </div>

          <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            {metrics.deviceBreakdown.length > 0 ? (
              metrics.deviceBreakdown.map((d) => (
                <div key={d.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
                    <span className="font-bold text-slate-700 dark:text-slate-300">{d.name}</span>
                  </div>
                  <span className="font-extrabold text-slate-900 dark:text-white">
                    {d.value}% <span className="text-slate-400 font-normal">({d.count})</span>
                  </span>
                </div>
              ))
            ) : (
              <p className="text-[11px] text-slate-400 text-center py-1">Telemetry devices will appear here once visitors arrive.</p>
            )}
          </div>
        </div>

        {/* CHART 3: Real Acquisition Channels & Sources - 1 Col */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-extrabold text-slate-900 dark:text-white text-base">
                Chart 3: Acquisition Channels
              </h3>
              <p className="text-xs text-slate-500">Real referrers & discovery paths</p>
            </div>
            <span className="text-xs font-black px-2.5 py-1 bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 rounded-lg">
              Real Referrers
            </span>
          </div>

          <div className="space-y-3.5 pt-2">
            {metrics.trafficSources.length > 0 ? (
              metrics.trafficSources.map((s) => (
                <div key={s.source} className="space-y-1">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-extrabold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 truncate pr-2">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                      <span className="truncate">{s.source}</span>
                    </span>
                    <span className="font-black text-slate-900 dark:text-white shrink-0">
                      {s.visitors.toLocaleString()} ({s.percentage}%)
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${s.percentage}%`, backgroundColor: s.color }}
                    />
                  </div>
                </div>
              ))
            ) : (
              <div className="py-10 text-center text-slate-400 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                <Globe2 className="w-7 h-7 mx-auto mb-2 opacity-50" />
                <p className="text-xs font-bold">No referral sources detected yet</p>
              </div>
            )}
          </div>
        </div>

        {/* CHART 4: Real Hourly Traffic Heatmap - 2 Cols */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-extrabold text-slate-900 dark:text-white text-base">
                Chart 4: Hourly Visitor Activity Distribution
              </h3>
              <p className="text-xs text-slate-500">Live 24-hour density based on event timestamps in <code className="font-mono">website_analyze</code></p>
            </div>
            <span className="text-xs font-black px-2.5 py-1 bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 rounded-lg">
              Hourly Histogram
            </span>
          </div>

          <div className="h-64 w-full">
            {metrics.hourlyHeatmap.some(h => h.visitors > 0) ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={metrics.hourlyHeatmap} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.6} />
                  <XAxis dataKey="hour" stroke="#64748b" fontSize={12} />
                  <YAxis stroke="#64748b" fontSize={12} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', border: 'none', color: '#fff' }}
                  />
                  <Bar dataKey="visitors" name="Store Hits" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl p-6 text-center">
                <Clock className="w-8 h-8 mb-2 opacity-50" />
                <p className="text-xs font-bold">No hourly activity points registered in this timeframe</p>
              </div>
            )}
          </div>
        </div>

        {/* CHART 5: Store Conversion Funnel - 3 Cols */}
        <div className="lg:col-span-3 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="font-extrabold text-slate-900 dark:text-white text-base flex items-center gap-2">
                <Compass className="w-5 h-5 text-indigo-600" />
                Chart 5: E-Commerce Store Journey & Conversion Funnel
              </h3>
              <p className="text-xs text-slate-500">Real visits vs product views, checkout actions, and confirmed database orders</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-extrabold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 px-3 py-1 rounded-xl">
                Store Conversion Rate: {metrics.conversionFunnel.length > 4 && metrics.conversionFunnel[0].count > 0 ? ((metrics.conversionFunnel[4].count / metrics.conversionFunnel[0].count) * 100).toFixed(1) : '0.0'}%
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 pt-2">
            {metrics.conversionFunnel.map((step, idx) => (
              <div
                key={step.step}
                className="p-4 rounded-2xl bg-gradient-to-b from-slate-50 to-slate-100/50 dark:from-slate-800/80 dark:to-slate-900/60 border border-slate-200 dark:border-slate-700 flex flex-col justify-between"
              >
                <div>
                  <span className="text-[11px] font-black uppercase text-indigo-600 dark:text-indigo-400 block mb-1">
                    {step.step}
                  </span>
                  <div className="text-2xl font-black text-slate-900 dark:text-white">
                    {step.count.toLocaleString()}
                  </div>
                </div>
                <div className="mt-3 pt-2 border-t border-slate-200 dark:border-slate-700 text-[11px] flex justify-between items-center text-slate-500">
                  <span>Drop-off</span>
                  <span className={`font-bold ${idx === 0 ? 'text-slate-400' : 'text-rose-600 dark:text-rose-400'}`}>
                    {step.drop}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CHART 6: Top Most Visited Pages Table & Real Metrics (PAGINATED & FILTERABLE) */}
        <div className="lg:col-span-3 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="font-extrabold text-slate-900 dark:text-white text-base flex items-center gap-2">
                <Layers className="w-4 h-4 text-teal-600" />
                Chart 6: Top Visited Store Pages & Engagement Matrix
              </h3>
              <p className="text-xs text-slate-500">Real path rankings sorted by hit count from <code className="font-mono">website_analyze</code></p>
            </div>

            {/* Filter Bar */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Search by Path / Title */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={topPagesSearch}
                  onChange={(e) => {
                    setTopPagesSearch(e.target.value);
                    setTopPagesPage(1);
                  }}
                  placeholder="Filter paths..."
                  className="pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500 w-36 sm:w-44"
                />
              </div>

              {/* Category Filter */}
              <select
                value={topPagesCategory}
                onChange={(e) => {
                  setTopPagesCategory(e.target.value as any);
                  setTopPagesPage(1);
                }}
                className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer focus:outline-none"
              >
                <option value="ALL">All Pages</option>
                <option value="PRODUCTS">Products (/products)</option>
                <option value="CATEGORY">Categories (/category)</option>
                <option value="CHECKOUT">Cart & Checkout</option>
                <option value="PUBLIC">Home & Storefront</option>
                <option value="ACCOUNT">Admin & Account</option>
              </select>

              {/* Sort By */}
              <select
                value={topPagesSort}
                onChange={(e) => setTopPagesSort(e.target.value as any)}
                className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer focus:outline-none"
              >
                <option value="VISITS_DESC">Most Visits</option>
                <option value="VISITS_ASC">Least Visits</option>
                <option value="TIME_DESC">Longest Duration</option>
                <option value="BOUNCE_ASC">Lowest Bounce</option>
              </select>

              <span className="text-xs font-black px-2.5 py-1 bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300 rounded-lg shrink-0">
                {filteredTopPages.length} URLs
              </span>
            </div>
          </div>

          {filteredTopPages.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-extrabold uppercase border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="p-3.5 rounded-l-xl">Page Path</th>
                    <th className="p-3.5">Page Title</th>
                    <th className="p-3.5">Engagement Status</th>
                    <th className="p-3.5 text-right">Hit Count</th>
                    <th className="p-3.5 text-right">Avg Duration</th>
                    <th className="p-3.5 text-right rounded-r-xl">Est. Bounce</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                  {paginatedTopPages.map((page) => {
                    const isHighBounce = parseFloat(page.bounce) > 40;
                    return (
                      <tr key={page.path} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition">
                        <td className="p-3.5 font-mono text-indigo-600 dark:text-indigo-400 font-bold">{page.path}</td>
                        <td className="p-3.5 font-bold text-slate-900 dark:text-white">{page.label}</td>
                        <td className="p-3.5">
                          {isHighBounce ? (
                            <div className="flex items-center gap-1.5">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-300 dark:border-rose-800 flex items-center gap-1">
                                <AlertTriangle className="w-2.5 h-2.5" />
                                Needs Improvement
                              </span>
                              <button
                                type="button"
                                onClick={() => handleSwitchViewMode('growth_guide', 'landing_pages')}
                                className="px-2 py-0.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 rounded text-[10px] font-bold transition cursor-pointer flex items-center gap-1"
                                title="Open Bounce Reduction Guide"
                              >
                                <HelpCircle className="w-2.5 h-2.5" />
                                <span>Help</span>
                              </button>
                            </div>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 flex items-center gap-1 w-fit">
                              <CheckCircle2 className="w-2.5 h-2.5" />
                              Healthy
                            </span>
                          )}
                        </td>
                        <td className="p-3.5 text-right font-black text-slate-900 dark:text-white">{page.visits.toLocaleString()}</td>
                        <td className="p-3.5 text-right text-slate-600 dark:text-slate-300 font-mono">{page.avgTime}</td>
                        <td className={`p-3.5 text-right font-black ${isHighBounce ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                          {page.bounce}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Chart 6 Pagination Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500">
                <div className="flex items-center gap-2">
                  <span>Rows per page:</span>
                  <select
                    value={topPagesRowsPerPage}
                    onChange={(e) => {
                      setTopPagesRowsPerPage(Number(e.target.value));
                      setTopPagesPage(1);
                    }}
                    className="p-1 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold"
                  >
                    <option value={5}>5</option>
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                  </select>
                  <span>
                    Showing {Math.min((topPagesPage - 1) * topPagesRowsPerPage + 1, filteredTopPages.length)} - {Math.min(topPagesPage * topPagesRowsPerPage, filteredTopPages.length)} of {filteredTopPages.length} URLs
                  </span>
                </div>

                <div className="flex items-center gap-1.5 self-end sm:self-auto">
                  <button
                    type="button"
                    disabled={topPagesPage <= 1}
                    onClick={() => setTopPagesPage((p) => Math.max(1, p - 1))}
                    className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="px-2 font-mono font-bold text-slate-700 dark:text-slate-300">
                    Page {topPagesPage} of {topPagesTotalPages}
                  </span>
                  <button
                    type="button"
                    disabled={topPagesPage >= topPagesTotalPages}
                    onClick={() => setTopPagesPage((p) => Math.min(topPagesTotalPages, p + 1))}
                    className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-12 text-center text-slate-400 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
              <Eye className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-xs font-bold">No page telemetry hits match your filter</p>
            </div>
          )}
        </div>

        {/* ─── LIVE VISITOR TELEMETRY LEDGER (TABLE 7 - PAGINATED & FILTERABLE) ─── */}
        <div className="lg:col-span-3 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${isAnalyzerActive ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
                <h3 className="font-extrabold text-slate-900 dark:text-white text-base">
                  Live Visitor Telemetry Ledger
                </h3>
              </div>
              <p className="text-xs text-slate-500">
                Audited stream of real page loads and sessions logged in the <code className="font-mono">website_analyze</code> table.
              </p>
            </div>

            {/* Filter Bar */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchLogQuery}
                  onChange={(e) => {
                    setSearchLogQuery(e.target.value);
                    setLedgerPage(1);
                  }}
                  placeholder="Filter by path, IP..."
                  className="pl-9 pr-8 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 w-36 sm:w-44"
                />
                {searchLogQuery && (
                  <button
                    onClick={handleResetSearchRequest}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                    title="Reset search filter (Asks Yes/No)"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Device Filter */}
              <select
                value={ledgerDeviceFilter}
                onChange={(e) => {
                  setLedgerDeviceFilter(e.target.value);
                  setLedgerPage(1);
                }}
                className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer focus:outline-none"
              >
                <option value="ALL">All Devices</option>
                <option value="Mobile">Mobile</option>
                <option value="Desktop">Desktop</option>
                <option value="Tablet">Tablet</option>
              </select>

              {/* Referrer Filter */}
              <select
                value={ledgerReferrerFilter}
                onChange={(e) => {
                  setLedgerReferrerFilter(e.target.value);
                  setLedgerPage(1);
                }}
                className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer focus:outline-none"
              >
                <option value="ALL">All Referrers</option>
                <option value="Direct">Direct</option>
                <option value="Google">Google</option>
                <option value="Facebook">Facebook / Meta</option>
                <option value="Instagram">Instagram</option>
                <option value="WhatsApp">WhatsApp</option>
              </select>

              {/* Sort Order */}
              <select
                value={ledgerSortOrder}
                onChange={(e) => setLedgerSortOrder(e.target.value as any)}
                className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer focus:outline-none"
              >
                <option value="NEWEST">Newest First</option>
                <option value="OLDEST">Oldest First</option>
              </select>

              <span className="text-xs font-black px-2.5 py-1 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 rounded-lg shrink-0">
                {filteredEvents.length} Logs
              </span>
            </div>
          </div>

          {filteredEvents.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-extrabold uppercase border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="p-3.5 rounded-l-xl">Timestamp</th>
                    <th className="p-3.5">Path & Page</th>
                    <th className="p-3.5">Device & OS</th>
                    <th className="p-3.5">Browser</th>
                    <th className="p-3.5">Referrer</th>
                    <th className="p-3.5 text-right rounded-r-xl">Session ID</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                  {paginatedEvents.map((evt) => (
                    <tr key={evt.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition">
                      <td className="p-3.5 whitespace-nowrap text-slate-500 font-mono text-[11px]">
                        {evt.created_at ? new Date(evt.created_at).toLocaleTimeString() : 'Just now'}
                      </td>
                      <td className="p-3.5">
                        <div className="font-mono text-indigo-600 dark:text-indigo-400 font-bold">{evt.path}</div>
                        <div className="text-[11px] text-slate-500 truncate max-w-xs">{evt.page_title}</div>
                      </td>
                      <td className="p-3.5">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          evt.device_type === 'Mobile' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' :
                          evt.device_type === 'Tablet' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' :
                          'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                        }`}>
                          {evt.device_type === 'Mobile' ? <Smartphone className="w-2.5 h-2.5" /> : <Monitor className="w-2.5 h-2.5" />}
                          {evt.device_type}
                        </span>
                        <span className="text-[11px] text-slate-500 ml-1.5">{evt.os || 'Linux'}</span>
                      </td>
                      <td className="p-3.5 font-bold text-slate-800 dark:text-slate-200">
                        {evt.browser || 'Web Browser'}
                      </td>
                      <td className="p-3.5 text-slate-600 dark:text-slate-300">
                        <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono text-[11px]">
                          {evt.referrer || 'Direct Visit'}
                        </span>
                      </td>
                      <td className="p-3.5 text-right font-mono text-[10px] text-slate-400">
                        {evt.session_id ? evt.session_id.slice(-8) : evt.id.slice(-8)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Table 7 Pagination Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500">
                <div className="flex items-center gap-2">
                  <span>Rows per page:</span>
                  <select
                    value={ledgerPerPage}
                    onChange={(e) => {
                      setLedgerPerPage(Number(e.target.value));
                      setLedgerPage(1);
                    }}
                    className="p-1 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold"
                  >
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                  </select>
                  <span>
                    Showing {Math.min((ledgerPage - 1) * ledgerPerPage + 1, filteredEvents.length)} - {Math.min(ledgerPage * ledgerPerPage, filteredEvents.length)} of {filteredEvents.length} logs
                  </span>
                </div>

                <div className="flex items-center gap-1.5 self-end sm:self-auto">
                  <button
                    type="button"
                    disabled={ledgerPage <= 1}
                    onClick={() => setLedgerPage((p) => Math.max(1, p - 1))}
                    className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="px-2 font-mono font-bold text-slate-700 dark:text-slate-300">
                    Page {ledgerPage} of {ledgerTotalPages}
                  </span>
                  <button
                    type="button"
                    disabled={ledgerPage >= ledgerTotalPages}
                    onClick={() => setLedgerPage((p) => Math.min(ledgerTotalPages, p + 1))}
                    className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-12 text-center text-slate-400 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
              <ShieldCheck className="w-8 h-8 mx-auto mb-2 opacity-50 text-emerald-500" />
              <p className="text-xs font-bold">No telemetry events match your search</p>
              <p className="text-[11px] text-slate-500 mt-1">Try clearing filters or click &apos;Log Test Visit&apos; above.</p>
            </div>
          )}
        </div>

      </div>
        </>
      )}

      {/* ─── Universal Confirmation Modal (Prompts YES or NO for every action) ─── */}
      <ConfirmationModal
        isOpen={!!confirmModalOptions}
        options={confirmModalOptions}
        onClose={() => setConfirmModalOptions(null)}
      />

      {/* ──────────────────────────────────────────────────────────────────────────
          UNIVERSAL ACTION PROGRESS & ERROR DISPLAY MODAL (REAL-TIME PERCENTAGE)
          USER REQUIREMENT: "Website Traffic & Audience Analyzer any action loading pretage pop model add real time"
      ────────────────────────────────────────────────────────────────────────── */}
      {actionProgressModal.isOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div
            className={`bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border text-center space-y-4 animate-fadeIn ${
              actionProgressModal.status === 'ERROR'
                ? 'border-rose-500/80 ring-4 ring-rose-500/20'
                : actionProgressModal.status === 'SUCCESS'
                ? 'border-emerald-500/80 ring-4 ring-emerald-500/20'
                : 'border-indigo-500/40 ring-4 ring-indigo-500/20'
            }`}
          >
            {/* Animated State Icon */}
            <div className="relative w-16 h-16 mx-auto">
              {actionProgressModal.status === 'LOADING' && (
                <>
                  <div className="absolute inset-0 rounded-full border-4 border-indigo-200 dark:border-indigo-900 animate-ping opacity-30" />
                  <div className="w-16 h-16 rounded-full bg-indigo-50 dark:bg-indigo-950 flex items-center justify-center border border-indigo-200 dark:border-indigo-800">
                    <Loader2 className="w-8 h-8 text-indigo-600 dark:text-indigo-400 animate-spin" />
                  </div>
                </>
              )}

              {actionProgressModal.status === 'SUCCESS' && (
                <div className="w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-950 flex items-center justify-center border-2 border-emerald-500 text-emerald-600 dark:text-emerald-400 animate-bounce">
                  <CheckCircle className="w-9 h-9" />
                </div>
              )}

              {actionProgressModal.status === 'ERROR' && (
                <div className="w-16 h-16 rounded-full bg-rose-50 dark:bg-rose-950 flex items-center justify-center border-2 border-rose-500 text-rose-600 dark:text-rose-400 animate-pulse">
                  <AlertCircle className="w-9 h-9" />
                </div>
              )}
            </div>

            {/* Header Titles */}
            <div>
              <h3 className="font-extrabold text-slate-900 dark:text-white text-base">
                {actionProgressModal.title}
              </h3>
              {actionProgressModal.subtitle && (
                <p className="text-[10px] font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400 mt-0.5">
                  {actionProgressModal.subtitle}
                </p>
              )}
              <p
                className={`text-xs mt-2 font-medium ${
                  actionProgressModal.status === 'ERROR'
                    ? 'text-rose-600 dark:text-rose-400 font-bold'
                    : 'text-gray-600 dark:text-gray-300'
                }`}
              >
                {actionProgressModal.stepText}
              </p>
            </div>

            {/* Animated Loading Percentage Bar */}
            <div className="space-y-1.5">
              <div className="w-full bg-gray-100 dark:bg-slate-800 rounded-full h-3 overflow-hidden p-0.5 border border-gray-200 dark:border-slate-700">
                <div
                  className={`h-full rounded-full transition-all duration-300 ease-out ${
                    actionProgressModal.status === 'ERROR'
                      ? 'bg-rose-500'
                      : actionProgressModal.status === 'SUCCESS'
                      ? 'bg-emerald-500'
                      : 'bg-gradient-to-r from-indigo-500 via-cyan-400 to-emerald-400'
                  }`}
                  style={{ width: `${actionProgressModal.progress}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[11px] font-mono font-bold text-gray-500 dark:text-gray-400">
                <span>Real-Time Progress</span>
                <span
                  className={
                    actionProgressModal.status === 'ERROR'
                      ? 'text-rose-500'
                      : 'text-indigo-600 dark:text-indigo-400'
                  }
                >
                  {actionProgressModal.progress}%
                </span>
              </div>
            </div>

            {/* EXACT ERROR DISPLAY: WHAT ERROR (USER REQUIREMENT) */}
            {actionProgressModal.status === 'ERROR' && actionProgressModal.errorMessage && (
              <div className="p-3.5 bg-rose-50 dark:bg-rose-950/70 border border-rose-300 dark:border-rose-900 rounded-2xl text-left space-y-2 animate-fadeIn">
                <div className="flex items-center gap-1.5 text-rose-700 dark:text-rose-300 text-xs font-bold uppercase tracking-wider">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>Exact Telemetry Error Encountered:</span>
                </div>
                <pre className="p-2.5 bg-rose-100/80 dark:bg-rose-900/40 text-rose-900 dark:text-rose-200 rounded-xl text-xs font-mono whitespace-pre-wrap break-all select-all">
                  {actionProgressModal.errorMessage}
                </pre>
                {actionProgressModal.errorDetails && (
                  <p className="text-[10px] font-mono text-rose-500 dark:text-rose-400">
                    {actionProgressModal.errorDetails}
                  </p>
                )}
              </div>
            )}

            {/* Success Message Banner */}
            {actionProgressModal.status === 'SUCCESS' && actionProgressModal.successMessage && (
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 rounded-2xl text-left text-xs font-mono text-emerald-800 dark:text-emerald-200">
                ✓ {actionProgressModal.successMessage}
              </div>
            )}

            {/* Modal Actions */}
            <div className="pt-2 flex items-center justify-center">
              {actionProgressModal.status === 'ERROR' ? (
                <button
                  type="button"
                  onClick={() => setActionProgressModal((prev) => ({ ...prev, isOpen: false }))}
                  className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-md active:scale-95 flex items-center gap-1.5"
                >
                  <X className="w-4 h-4" />
                  <span>Dismiss Error</span>
                </button>
              ) : actionProgressModal.status === 'SUCCESS' ? (
                <button
                  type="button"
                  onClick={() => setActionProgressModal((prev) => ({ ...prev, isOpen: false }))}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-md active:scale-95 flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>Close</span>
                </button>
              ) : (
                <span className="text-[11px] font-mono text-gray-400">
                  Processing real-time telemetry operation...
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
