import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Sparkles, Save, CheckCircle2, Eye, EyeOff, Tag, Package,
  DollarSign, Layers, Image as ImageIcon, Leaf, RefreshCw, Upload,
  Trash2, Plus, Globe, Star, ShoppingBag, X, FileText, Check, Calendar, Sliders,
  ChevronDown, ChevronUp, ChevronLeft, ChevronRight, AlertTriangle, ShieldCheck,
  Edit3, Smartphone, Monitor, ExternalLink, HelpCircle, MessageSquare, Share2, Copy, Truck, Award, Utensils
} from 'lucide-react';
import toast from 'react-hot-toast';
import { getJSONStore, setJSONStore, recordAuditLog, recordPriceHistory } from '../../lib/dbManager';
import { triggerScheduledLogPruneIfDue } from '../../lib/tableManager';
import { formatPrice, cn } from '../../lib/utils';
import { AdminPageSkeleton } from '../../components/common/Skeleton';
import { useActionModal } from '../../contexts/ActionModalContext';
import type { Product, Category, StockStatus, Supplier } from '../../types';

// Preset lists for convenient one-click authoring
const FESTIVAL_OFFER_PRESETS = [
  '🪔 Diwali Special Offer',
  '🌾 Pongal Harvest Fest Offer',
  '🎉 New Year Special Deal',
  '🌱 Tamil New Year (Puthandu) Deal',
  '✨ Dussehra / Navratri Festive Offer',
  '🪔 Karthigai Deepam Special',
];

const PRESET_LABELS = [
  'Best Seller', 'New Arrival', 'Limited Edition', 'Staff Pick',
  'Farm Fresh', 'Traditional Heritage', 'Diabetic Friendly', 'Weight Loss'
];

const HEALTH_BENEFITS = [
  '🌱 100% Organically Farmed', '🌾 Native Heirloom Variety',
  '💪 High Natural Dietary Fibre', '🩸 Low Glycemic Index',
  '🚫 Zero Pesticides', '🌿 Wood Cold-Pressed (Marachekku)',
  '🧘 Ayurvedic Vitality Booster', '🥗 Rich in Micronutrients'
];

const TEASER_PRESETS = [
  '🌾 100% Traditional Tamil Nadu Heirloom Variety grown in organic soil',
  '🌱 Organically cultivated in the fertile Cauvery Delta with zero pesticides',
  '✨ Unpolished & nutrient-dense native grain for wholesome family health',
  '🌿 Traditional wood cold-pressed oil retaining natural aroma and vital nutrients'
];

const STORAGE_PRESETS = [
  'Store in a cool dry place in airtight container',
  'Refrigerate after opening to preserve aroma and vital nutrients',
  'Keep in a moisture-free pantry away from direct sunlight',
  'Transfer to stainless steel or glass airtight container upon delivery'
];

const CERTIFICATION_PRESETS = [
  'NPOP India Organic Certified (Jaivik Bharat)',
  'PGS-India Green Organic Certified',
  '100% Natural Traditional Farming (Zero Chemicals & Zero Fertilizers)',
  'Tamil Nadu Organic Certification Department (TNOCD)'
];

const PACK_SIZE_PRESETS = [
  { label: '500g', size: '500 g', unit: 'g' },
  { label: '1kg', size: '1 kg', unit: 'kg' },
  { label: '2kg', size: '2 kg', unit: 'kg' },
  { label: '5kg', size: '5 kg', unit: 'kg' },
  { label: '250ml', size: '250 ml', unit: 'ml' },
  { label: '500ml', size: '500 ml', unit: 'ml' },
  { label: '1L', size: '1 L', unit: 'l' },
  { label: 'Combo', size: 'Combo Pack (Pack of 3)', unit: 'pcs' }
];

// Section Customizer Model
export type SectionKey = 
  | 'basic'          // 1. Basic Product Info
  | 'pricing'        // 2. Pricing, Margins & GST Tax
  | 'stock'          // 3. Stock Levels & Inventory Status
  | 'media'          // 4. Media & Multi-Photo Carousel Gallery
  | 'festival'       // 5. Festival Offer Deal Tag
  | 'badges'         // 6. Badges & Merchandising Labels
  | 'story'          // 7. Product Narrative & Health Benefits
  | 'storage_specs'  // 8. Storage Specs & Certifications
  | 'visibility'     // 9. Storefront Visibility & Controls
  | 'preview';       // 10. Live Storefront Simulator Preview

export interface SectionMeta {
  id: SectionKey;
  title: string;
  subtitle: string;
  iconName: string;
  required?: boolean;
}

export const AVAILABLE_SECTIONS: SectionMeta[] = [
  { id: 'basic', title: '1. Basic Product Information', subtitle: 'Core identity, SKU codes, bilingual names, categories and pack sizing', iconName: '📦', required: true },
  { id: 'pricing', title: '2. Pricing, Margins & GST Tax', subtitle: 'Cost of goods, retail pricing, buyer discounts, and live margin intelligence', iconName: '💰', required: true },
  { id: 'stock', title: '3. Stock Levels & Inventory Status', subtitle: 'Current warehouse inventory, automatic reorder threshold and customer availability badges', iconName: '📊', required: true },
  { id: 'media', title: '4. Media & Photo Carousel Gallery', subtitle: 'Cover showcase image, additional thumbnail angles, and gallery management', iconName: '🖼️' },
  { id: 'festival', title: '5. Festival Offer Deal Tag', subtitle: 'Tag produce with festive flags (Diwali, Pongal, etc.) shown across website & POS', iconName: '🪔' },
  { id: 'badges', title: '6. Badges & Merchandising Labels', subtitle: 'Toggle featured/organic attributes and click preset chips to highlight specialties', iconName: '🏷️' },
  { id: 'story', title: '7. Product Narrative & Health Benefits', subtitle: 'Craft compelling organic farm stories and 1-click health benefit highlights', iconName: '📝' },
  { id: 'storage_specs', title: '8. Storage Specs & Certifications', subtitle: 'Shelf life, storage instructions, and organic certification authority', iconName: '🛡️' },
  { id: 'visibility', title: '9. Storefront Visibility & Controls', subtitle: 'Store publishing switches, batch expiry tracking, and customer visibility toggles', iconName: '🌐' },
  { id: 'preview', title: '10. Real-Time Live Simulator Preview', subtitle: 'Simulate public website product card and customer detail page presentation', iconName: '👁️' },
];

export const DEFAULT_ACTIVE_SECTIONS: SectionKey[] = [
  'basic', 'pricing', 'stock', 'media', 'festival', 'badges', 'story', 'storage_specs', 'visibility', 'preview'
];

// Helper UI primitives
const SectionHeader: React.FC<{
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  extra?: React.ReactNode;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  canRemove?: boolean;
  onRemove?: () => void;
}> = ({ icon, title, subtitle, extra, isCollapsed, onToggleCollapse, canRemove, onRemove }) => (
  <div className="flex flex-wrap items-center justify-between gap-3 pb-5 border-b border-emerald-100 dark:border-emerald-800/60">
    <div 
      className={cn("flex items-center gap-3", onToggleCollapse ? "cursor-pointer select-none group" : "")} 
      onClick={onToggleCollapse}
    >
      <div className="w-10 h-10 rounded-2xl bg-emerald-100 dark:bg-emerald-800/60 flex items-center justify-center text-emerald-800 dark:text-emerald-200 font-bold shrink-0">
        {icon}
      </div>
      <div>
        <div className="flex items-center gap-2">
          <h2 className="font-serif text-lg font-bold text-emerald-950 dark:text-emerald-50 group-hover:text-emerald-700 dark:group-hover:text-amber-300 transition-colors">
            {title}
          </h2>
          {onToggleCollapse && (
            <span className="p-1 rounded-md text-slate-400 group-hover:text-emerald-700 dark:group-hover:text-amber-300 hover:bg-emerald-100/50 dark:hover:bg-emerald-800/50 transition">
              {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
            </span>
          )}
        </div>
        <p className="text-xs text-slate-500 dark:text-emerald-300/70">{subtitle}</p>
      </div>
    </div>
    <div className="flex items-center gap-2">
      {extra}
      {canRemove && onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="px-2.5 py-1 text-[11px] font-bold rounded-xl text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 border border-rose-200 dark:border-rose-900 transition flex items-center gap-1 shadow-2xs cursor-pointer"
          title="Remove this section from the editor"
        >
          <X className="w-3.5 h-3.5" />
          <span>Remove Section</span>
        </button>
      )}
    </div>
  </div>
);

const FormField: React.FC<{
  label: string;
  required?: boolean;
  subtext?: string;
  children: React.ReactNode;
}> = ({ label, required, subtext, children }) => (
  <div className="space-y-1.5">
    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-emerald-200">
      {label} {required && <span className="text-rose-500">*</span>}
    </label>
    {children}
    {subtext && <p className="text-[10px] text-slate-400 dark:text-emerald-400">{subtext}</p>}
  </div>
);

const ToggleCard: React.FC<{
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  checked: boolean;
  onToggle: () => void;
  accentColor?: 'emerald' | 'amber' | 'teal';
}> = ({ icon, title, subtitle, checked, onToggle, accentColor = 'emerald' }) => (
  <div
    onClick={onToggle}
    className={cn(
      'p-4 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between h-36 select-none',
      checked
        ? accentColor === 'amber'
          ? 'bg-amber-50/70 dark:bg-amber-950/40 border-amber-300 dark:border-amber-700 shadow-sm'
          : accentColor === 'teal'
          ? 'bg-teal-50/70 dark:bg-teal-900/40 border-teal-300 dark:border-teal-700 shadow-sm'
          : 'bg-emerald-50/70 dark:bg-emerald-900/40 border-emerald-300 dark:border-emerald-700 shadow-sm'
        : 'bg-slate-50 dark:bg-emerald-950/40 border-slate-200 dark:border-emerald-800/60'
    )}
  >
    <div className="flex items-center justify-between">
      <div className={cn('w-8 h-8 rounded-xl flex items-center justify-center', checked ? 'bg-emerald-100 dark:bg-emerald-800 text-emerald-700 dark:text-emerald-200' : 'bg-slate-200 dark:bg-emerald-900/60 text-slate-500 dark:text-emerald-400')}>
        {icon}
      </div>
      <div className={cn('w-9 h-5 rounded-full transition-colors relative flex items-center px-0.5', checked ? 'bg-emerald-600' : 'bg-slate-300 dark:bg-slate-700')}>
        <div className={cn('w-4 h-4 rounded-full bg-white transition-transform shadow', checked ? 'translate-x-4' : 'translate-x-0')} />
      </div>
    </div>
    <div>
      <h4 className="text-xs font-bold text-slate-800 dark:text-emerald-100">{title}</h4>
      <p className="text-[11px] text-slate-500 dark:text-emerald-400 leading-tight">{subtitle}</p>
    </div>
  </div>
);

export const ProductEditorPage: React.FC = () => {
  const { productId } = useParams<{ productId?: string }>();
  const navigate = useNavigate();
  const { showConfirmModal } = useActionModal();
  const isNew = !productId || productId === 'new';

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [categories, setCategories] = useState<Category[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);

  // Section Customizer State (Persisted in localStorage)
  const [activeSections, setActiveSections] = useState<SectionKey[]>(() => {
    try {
      const saved = localStorage.getItem('mr_vivasayi_editor_active_sections');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return DEFAULT_ACTIVE_SECTIONS;
  });

  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});

  const toggleSectionCollapse = (key: SectionKey) => {
    setCollapsedSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const removeSection = (key: SectionKey) => {
    const config = AVAILABLE_SECTIONS.find(s => s.id === key);
    if (config?.required) {
      toast.error('Core section is required and cannot be removed.');
      return;
    }
    const updated = activeSections.filter(k => k !== key);
    setActiveSections(updated);
    try { localStorage.setItem('mr_vivasayi_editor_active_sections', JSON.stringify(updated)); } catch (e) {}
    toast.success(`Removed "${config?.title || key}" section. You can re-add it anytime.`);
  };

  const promptRemoveSection = (key: SectionKey) => {
    const config = AVAILABLE_SECTIONS.find(s => s.id === key);
    if (config?.required) {
      toast.error('Core section is required and cannot be removed.');
      return;
    }
    const title = config?.title || key;
    showConfirmModal({
      title: 'Remove Section from Editor?',
      message: `Are you sure you want to remove the "${title}" section from this editor view?`,
      description: 'You can easily restore this section at any time using the section manager toolbar above or the restore banner below.',
      confirmText: 'Yes, Remove Section',
      variant: 'warning',
      onConfirm: () => {
        removeSection(key);
      }
    });
  };

  const addSection = (key: SectionKey) => {
    if (activeSections.includes(key)) return;
    const updated = [...activeSections, key];
    setActiveSections(updated);
    try { localStorage.setItem('mr_vivasayi_editor_active_sections', JSON.stringify(updated)); } catch (e) {}
    const config = AVAILABLE_SECTIONS.find(s => s.id === key);
    toast.success(`Added "${config?.title || key}" section to form`);
  };

  const resetSectionsToDefault = () => {
    setActiveSections(DEFAULT_ACTIVE_SECTIONS);
    setCollapsedSections({});
    try { localStorage.setItem('mr_vivasayi_editor_active_sections', JSON.stringify(DEFAULT_ACTIVE_SECTIONS)); } catch (e) {}
    toast.success('Reset all sections to default');
  };

  const promptResetSections = () => {
    showConfirmModal({
      title: 'Reset All Sections to Default?',
      message: 'Are you sure you want to restore all form sections to the standard default layout?',
      description: 'All 10 sections will be re-enabled and expanded.',
      confirmText: 'Yes, Reset All Sections',
      variant: 'info',
      onConfirm: () => {
        resetSectionsToDefault();
      }
    });
  };

  const promptCancel = () => {
    showConfirmModal({
      title: 'Leave Product Editor?',
      message: 'Are you sure you want to leave? Any unsaved edits or changes to this product will be lost.',
      confirmText: 'Yes, Discard & Leave',
      cancelText: 'Stay & Keep Editing',
      variant: 'warning',
      onConfirm: () => {
        navigate('/admin/products');
      }
    });
  };

  // Product form state
  const [product, setProduct] = useState<Product>({
    id: `prod-${Date.now()}`,
    sku: `LIF-${Math.floor(1000 + Math.random() * 9000)}`,
    name: '',
    tamil_name: '',
    slug: '',
    category_id: '',
    supplier_id: '',
    purchase_price: 100,
    landed_cost: 110,
    mrp: 180,
    selling_price: 150,
    offer_price: undefined,
    tax_percent: 0,
    reorder_level: 10,
    opening_stock: 50,
    current_stock: 50,
    stock_status: 'IN_STOCK',
    is_featured: false,
    is_visible: true,
    is_organic: true,
    labels: ['Farm Fresh'],
    unit: 'kg',
    pack_size: '1 kg',
    short_description: '',
    description: '',
    organic_certification: 'NPOP India Organic Certified',
    storage_info: 'Store in a cool dry place in airtight container',
    expiry_tracking: false,
    image_url: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&q=80&w=800',
    images: ['https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&q=80&w=800'],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  });

  // Strict SKU Uniqueness Verification
  const isDuplicateSku = useMemo(() => {
    if (!product.sku || !product.sku.trim()) return false;
    const target = product.sku.trim().toLowerCase();
    return allProducts.some(p => p.id !== product.id && p.sku && p.sku.trim().toLowerCase() === target);
  }, [product.sku, product.id, allProducts]);

  const duplicateSkuProduct = useMemo(() => {
    if (!isDuplicateSku) return null;
    const target = product.sku.trim().toLowerCase();
    return allProducts.find(p => p.id !== product.id && p.sku && p.sku.trim().toLowerCase() === target);
  }, [isDuplicateSku, product.sku, product.id, allProducts]);

  // Guaranteed Unique SKU Generator
  const generateUniqueSku = () => {
    const selectedCat = categories.find((c) => c.id === product.category_id);
    let prefix = 'LIF';
    if (selectedCat && selectedCat.name) {
      const cleanCat = selectedCat.name.replace(/[^A-Za-z]/g, '').slice(0, 3).toUpperCase();
      if (cleanCat.length >= 2) prefix = cleanCat;
    }

    let nextSku = '';
    let attempts = 0;
    const existingSkus = new Set(allProducts.filter(p => p.id !== product.id).map(p => p.sku?.trim().toUpperCase()));

    do {
      const rand = Math.floor(1000 + Math.random() * 9000);
      nextSku = `${prefix}-${rand}`;
      attempts++;
    } while (existingSkus.has(nextSku) && attempts < 200);

    setProduct((prev) => ({ ...prev, sku: nextSku }));
    toast.success(`Generated unique SKU: ${nextSku}`);
  };

  // UI state
  const [previewMode, setPreviewMode] = useState<'card' | 'page'>('page'); // Default to full detail page preview
  const [simulatorDevice, setSimulatorDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [simImgIndex, setSimImgIndex] = useState<number>(0);
  const [previewActiveImg, setPreviewActiveImg] = useState<string>('');
  const [customLabel, setCustomLabel] = useState<string>('');
  const [customFestival, setCustomFestival] = useState<string>('');
  const [showFullPageReview, setShowFullPageReview] = useState<boolean>(false);
  const [newGalleryUrl, setNewGalleryUrl] = useState<string>('');
  const [autoSlugSync, setAutoSlugSync] = useState<boolean>(isNew);

  // Jump to section in form with smooth scroll, expand, and highlight
  const jumpToSection = (key: SectionKey) => {
    // 1. If section was removed, add it back
    if (!activeSections.includes(key)) {
      setActiveSections((prev) => [...prev, key]);
    }
    // 2. If section is collapsed, expand it
    setCollapsedSections((prev) => ({ ...prev, [key]: false }));

    // 3. Smoothly scroll into view
    setTimeout(() => {
      const el = document.getElementById(`section-${key}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        el.classList.add('ring-4', 'ring-amber-400', 'shadow-2xl');
        setTimeout(() => {
          el.classList.remove('ring-4', 'ring-amber-400', 'shadow-2xl');
        }, 2200);

        const input = el.querySelector<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(
          'input:not([type=hidden]):not([disabled]), textarea:not([disabled]), select:not([disabled])'
        );
        if (input) {
          input.focus();
        }
      }
    }, 120);
  };

  // Section quick remove attribute helper (for in-preview 1-click removal)
  const removePreviewAttribute = (
    attribute: 'festival' | 'teaser' | 'description' | 'source' | 'storage' | 'notes' | 'offer' | 'organic' | 'featured' | 'certification'
  ) => {
    if (attribute === 'festival') {
      setProduct((p) => ({ ...p, festival_offer: '' }));
      toast.success('Removed Festival Offer banner');
    } else if (attribute === 'teaser') {
      setProduct((p) => ({ ...p, short_description: '' }));
      toast.success('Removed Short Teaser quote');
    } else if (attribute === 'description') {
      setProduct((p) => ({ ...p, description: '' }));
      toast.success('Removed Benefits & Heritage narrative');
    } else if (attribute === 'source') {
      setProduct((p) => ({ ...p, source_description: '' }));
      toast.success('Removed Farm Sourcing note');
    } else if (attribute === 'storage') {
      setProduct((p) => ({ ...p, storage_info: '' }));
      toast.success('Removed Storage Guidelines');
    } else if (attribute === 'notes') {
      setProduct((p) => ({ ...p, notes: '' }));
      toast.success('Removed Culinary Notes');
    } else if (attribute === 'offer') {
      setProduct((p) => ({ ...p, offer_price: undefined }));
      toast.success('Removed Special Offer discount');
    } else if (attribute === 'organic') {
      setProduct((p) => ({ ...p, is_organic: false }));
      toast.success('Turned off Organic badge');
    } else if (attribute === 'featured') {
      setProduct((p) => ({ ...p, is_featured: false }));
      toast.success('Turned off Featured badge');
    } else if (attribute === 'certification') {
      setProduct((p) => ({ ...p, organic_certification: '' }));
      toast.success('Removed Organic Certification');
    }
  };

  // Section quick add attribute helper (for in-preview 1-click adding)
  const addPreviewAttribute = (
    attribute: 'festival' | 'teaser' | 'description' | 'source' | 'storage' | 'notes' | 'offer' | 'organic' | 'featured' | 'label',
    starterVal?: string
  ) => {
    if (attribute === 'festival') {
      setProduct((p) => ({ ...p, festival_offer: starterVal || '🪔 Festive Season Special' }));
      jumpToSection('festival');
      toast.success('Added Festival Offer banner! Edit details in Section 5.');
    } else if (attribute === 'teaser') {
      setProduct((p) => ({ ...p, short_description: starterVal || '🌾 100% Traditional heirloom variety grown in native organic soil.' }));
      jumpToSection('story');
      toast.success('Added Short Teaser! Edit in Section 7.');
    } else if (attribute === 'description') {
      setProduct((p) => ({ ...p, description: starterVal || '🌱 100% Organically Farmed\n🌾 Native Heirloom Variety\n💪 High Natural Dietary Fibre\n🩸 Low Glycemic Index' }));
      jumpToSection('story');
      toast.success('Added Benefits Description! Edit in Section 7.');
    } else if (attribute === 'source') {
      setProduct((p) => ({ ...p, source_description: starterVal || 'Directly sourced from organic farmer collective in Tamil Nadu, preserving rich Cauvery delta soil heritage.' }));
      jumpToSection('story');
      toast.success('Added Farm Sourcing! Edit in Section 7.');
    } else if (attribute === 'storage') {
      setProduct((p) => ({ ...p, storage_info: starterVal || 'Store in a cool dry place in an airtight container away from direct sunlight.' }));
      jumpToSection('storage_specs');
      toast.success('Added Storage Guidelines! Edit in Section 8.');
    } else if (attribute === 'notes') {
      setProduct((p) => ({ ...p, notes: starterVal || 'Soak for 30 minutes before cooking for maximum nutrient absorption and authentic traditional aroma.' }));
      jumpToSection('story');
      toast.success('Added Culinary Notes! Edit in Section 7.');
    } else if (attribute === 'offer') {
      const defaultOffer = product.selling_price > 0 ? Math.round(product.selling_price * 0.9) : 90;
      setProduct((p) => ({ ...p, offer_price: defaultOffer }));
      jumpToSection('pricing');
      toast.success('Added Special Offer Price! Edit in Section 2.');
    } else if (attribute === 'organic') {
      setProduct((p) => ({ ...p, is_organic: true }));
      toast.success('Enabled 100% Organic badge');
    } else if (attribute === 'featured') {
      setProduct((p) => ({ ...p, is_featured: true }));
      toast.success('Enabled Featured Produce badge');
    } else if (attribute === 'label') {
      const lbl = starterVal || 'Farm Fresh';
      if (!product.labels?.includes(lbl)) {
        setProduct((p) => ({ ...p, labels: [...(p.labels || []), lbl] }));
        toast.success(`Added badge label "${lbl}"`);
      }
    }
  };
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveStep, setSaveStep] = useState<'validating' | 'saving' | 'syncing' | 'done'>('validating');
  const [savePercent, setSavePercent] = useState<number>(0);

  // Hidden file input refs
  const coverFileInputRef = useRef<HTMLInputElement | null>(null);
  const galleryFileInputRef = useRef<HTMLInputElement | null>(null);

  // Load initial data
  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      setIsLoading(true);
      try {
        const [cats, supps, allProds] = await Promise.all([
          getJSONStore<Category>('categories'),
          getJSONStore<Supplier>('suppliers'),
          getJSONStore<Product>('products')
        ]);
        if (!isMounted) return;
        setCategories(cats);
        setSuppliers(supps);
        setAllProducts(allProds);

        if (!isNew && productId) {
          const found = allProds.find((p) => p.id === productId || p.sku === productId);
          if (found) {
            const existingImgs = found.images && found.images.length > 0 ? found.images : (found.image_url ? [found.image_url] : []);
            setProduct({
              ...found,
              images: existingImgs,
              image_url: found.image_url || existingImgs[0] || '',
              labels: Array.isArray(found.labels) ? found.labels : []
            });
            setPreviewActiveImg(found.image_url || existingImgs[0] || '');
            setAutoSlugSync(false);
          } else {
            toast.error(`Product not found: ${productId}`);
            navigate('/admin/products');
          }
        } else {
          setProduct((prev) => ({
            ...prev,
            category_id: prev.category_id || (cats[0]?.id || ''),
            supplier_id: prev.supplier_id || (supps[0]?.id || '')
          }));
          setPreviewActiveImg('https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&q=80&w=800');
        }
      } catch (err) {
        console.error('Failed to load product data:', err);
        toast.error('Failed to load catalog options');
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }
    loadData();
    return () => { isMounted = false; };
  }, [productId, isNew, navigate]);

  // Derived financial calculations
  const effectivePrice = useMemo(() => {
    const offer = Number(product.offer_price);
    const selling = Number(product.selling_price) || 0;
    return offer && offer > 0 && offer < selling ? offer : selling;
  }, [product.offer_price, product.selling_price]);

  const grossMarginPercent = useMemo(() => {
    const cost = Number(product.purchase_price) || 0;
    return effectivePrice > 0 ? Math.round(((effectivePrice - cost) / effectivePrice) * 100) : 0;
  }, [effectivePrice, product.purchase_price]);

  const grossProfit = useMemo(() => {
    const cost = Number(product.purchase_price) || 0;
    return Math.max(0, effectivePrice - cost);
  }, [effectivePrice, product.purchase_price]);

  const buyerSavingsPercent = useMemo(() => {
    const mrp = Number(product.mrp) || 0;
    return mrp > effectivePrice ? Math.round(((mrp - effectivePrice) / mrp) * 100) : 0;
  }, [effectivePrice, product.mrp]);

  const gstBreakdown = useMemo(() => {
    const rate = Number(product.tax_percent) || 0;
    if (rate <= 0) return { basePrice: effectivePrice, taxAmount: 0 };
    const basePrice = Math.round((effectivePrice / (1 + rate / 100)) * 100) / 100;
    const taxAmount = Math.round((effectivePrice - basePrice) * 100) / 100;
    return { basePrice, taxAmount };
  }, [effectivePrice, product.tax_percent]);

  const selectedCategory = useMemo(() => {
    return categories.find((c) => c.id === product.category_id);
  }, [categories, product.category_id]);

  const simulatorImages = useMemo(() => {
    if (product.images && product.images.length > 0) {
      const valid = product.images.filter((img) => typeof img === 'string' && img.trim().length > 0);
      if (valid.length > 0) return valid;
    }
    if (product.image_url && product.image_url.trim().length > 0) {
      return [product.image_url];
    }
    return ['https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&q=80&w=800'];
  }, [product.images, product.image_url]);

  // Auto-generate slug from English Name
  const handleNameChange = (val: string) => {
    const slugified = val.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    setProduct((prev) => ({ ...prev, name: val, slug: autoSlugSync ? slugified : prev.slug }));
  };

  // Image Upload Handler (<100KB)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, isGallery = false) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 100 * 1024) {
      toast.error('File size exceeds 100 KB limit. Please choose a smaller image.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      const dataUrl = uploadEvent.target?.result as string;
      if (isGallery) {
        setProduct((prev) => ({ ...prev, images: [...(prev.images || []), dataUrl] }));
        toast.success('Image added to gallery');
      } else {
        setProduct((prev) => {
          const imgs = prev.images || [];
          return { ...prev, image_url: dataUrl, images: imgs.includes(dataUrl) ? imgs : [dataUrl, ...imgs] };
        });
        setPreviewActiveImg(dataUrl);
        toast.success('Cover image updated');
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Labels manipulation
  const toggleLabel = (label: string) => {
    setProduct((prev) => {
      const curLabels = prev.labels || [];
      return { ...prev, labels: curLabels.includes(label) ? curLabels.filter((l) => l !== label) : [...curLabels, label] };
    });
  };

  const handleAddCustomLabel = () => {
    const clean = customLabel.trim();
    if (!clean) return;
    if ((product.labels || []).includes(clean)) { toast.error('Label already exists'); return; }
    setProduct((prev) => ({ ...prev, labels: [...(prev.labels || []), clean] }));
    setCustomLabel('');
    toast.success(`Added badge "${clean}"`);
  };

  const appendBenefit = (benefit: string) => {
    setProduct((prev) => {
      const cur = prev.description ? prev.description.trim() : '';
      if (cur.includes(benefit)) { toast('Benefit already in description', { icon: 'ℹ️' }); return prev; }
      return { ...prev, description: cur ? `${cur}\n• ${benefit}` : `• ${benefit}` };
    });
    toast.success('Appended to description');
  };

  const addGalleryUrl = () => {
    const url = newGalleryUrl.trim();
    if (!url) return;
    setProduct((prev) => {
      const imgs = prev.images || [];
      if (imgs.includes(url)) { toast.error('Image URL already in gallery'); return prev; }
      return { ...prev, images: [...imgs, url] };
    });
    setNewGalleryUrl('');
    toast.success('Image URL added to gallery');
  };

  const removeGalleryImage = (indexToRemove: number) => {
    setProduct((prev) => {
      const imgs = (prev.images || []).filter((_, i) => i !== indexToRemove);
      const newCover = imgs[0] || '';
      return { ...prev, images: imgs, image_url: prev.image_url === prev.images?.[indexToRemove] ? newCover : prev.image_url };
    });
  };

  const adjustStock = (delta: number) => {
    setProduct((prev) => {
      const nextStock = Math.max(0, (Number(prev.current_stock) || 0) + delta);
      const reorder = Math.max(0, Number(prev.reorder_level) || 5);
      let status: StockStatus = prev.stock_status;
      if (status !== 'DISABLED') {
        status = nextStock === 0 ? 'OUT_OF_STOCK' : nextStock <= reorder ? 'LOW_STOCK' : 'IN_STOCK';
      }
      return { ...prev, current_stock: nextStock, stock_status: status };
    });
  };

  const applyCostMarkup = (multiplier: number) => {
    const cost = Number(product.purchase_price) || 0;
    if (cost <= 0) { toast.error('Set a valid purchase price first'); return; }
    const newSelling = Math.round(cost * (1 + multiplier));
    setProduct((prev) => ({ ...prev, selling_price: newSelling }));
    toast.success(`Selling price set to ${formatPrice(newSelling)} (+${Math.round(multiplier * 100)}% markup)`);
  };

  const applyMrpDiscount = (discountFraction: number) => {
    const mrp = Number(product.mrp) || 0;
    if (mrp <= 0) { toast.error('Set a valid MRP first'); return; }
    const newOffer = Math.round(mrp * (1 - discountFraction));
    setProduct((prev) => ({ ...prev, offer_price: newOffer }));
    toast.success(`Offer price set to ${formatPrice(newOffer)} (${Math.round(discountFraction * 100)}% OFF MRP)`);
  };

  // Primary Save Action with Confirmation & Live Percentage Progress
  const handleSave = () => {
    if (!product.name?.trim()) { toast.error('Product English name is required'); return; }
    if (!product.sku?.trim()) { toast.error('SKU is required'); return; }

    // Strict Unique SKU check
    const targetSku = product.sku.trim().toLowerCase();
    const isDup = allProducts.some(p => p.id !== product.id && p.sku && p.sku.trim().toLowerCase() === targetSku);
    if (isDup) {
      toast.error(`Cannot save: SKU "${product.sku}" is already in use by another product. Please enter or auto-generate a unique SKU.`);
      return;
    }

    const currentProd = { ...product };
    const isVisible = Boolean(currentProd.is_visible);

    showConfirmModal({
      title: isNew ? 'Publish New Produce to Catalog?' : 'Save & Publish Product Updates?',
      message: isVisible
        ? `Are you sure you want to save and publish "${currentProd.name}" (${currentProd.sku}) LIVE to the storefront?`
        : `Are you sure you want to save "${currentProd.name}" (${currentProd.sku}) as DRAFT (Unpublished)?`,
      description: `Selling Price: ${formatPrice(currentProd.selling_price || 0)} • MRP: ${formatPrice(currentProd.mrp || 0)} • Stock: ${currentProd.current_stock || 0} ${currentProd.unit || 'kg'} • Mode: ${isVisible ? '🟢 LIVE' : '⚪ DRAFT'}`,
      confirmText: isVisible ? '🟢 Yes, Publish LIVE' : '⚪ Yes, Save as DRAFT',
      variant: isVisible ? 'success' : 'warning',
      onConfirm: async () => {
        setIsSaving(true);
        setSavePercent(20);
        setSaveStep('validating');

        try {
          const stock = Math.max(0, Number(currentProd.current_stock) || 0);
          const reorder = Math.max(0, Number(currentProd.reorder_level) || 5);
          let status: StockStatus = currentProd.stock_status;
          if (status !== 'DISABLED') {
            status = stock === 0 ? 'OUT_OF_STOCK' : stock <= reorder ? 'LOW_STOCK' : 'IN_STOCK';
          }

          const images = currentProd.images?.length ? currentProd.images : (currentProd.image_url ? [currentProd.image_url] : []);
          const cover = currentProd.image_url || images[0] || '';

          const sanitized: Product = {
            ...currentProd,
            image_url: cover,
            images,
            selling_price: Number(currentProd.selling_price) || 0,
            mrp: Number(currentProd.mrp) || 0,
            purchase_price: Number(currentProd.purchase_price) || 0,
            landed_cost: Number(currentProd.landed_cost) || Number(currentProd.purchase_price) || 0,
            offer_price: currentProd.offer_price ? Number(currentProd.offer_price) : undefined,
            current_stock: stock,
            reorder_level: reorder,
            stock_status: status,
            slug: currentProd.slug?.trim() || currentProd.name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-'),
            updated_at: new Date().toISOString()
          };

          setSavePercent(55);
          setSaveStep('saving');
          await new Promise((r) => setTimeout(r, 600));

          const allProds = await getJSONStore<Product>('products');
          let updated: Product[];
          if (isNew) {
            sanitized.created_at = new Date().toISOString();
            updated = [...allProds, sanitized];
          } else {
            updated = allProds.map((p) => (p.id === sanitized.id ? sanitized : p));
          }
          await setJSONStore('products', updated);

          setSavePercent(85);
          setSaveStep('syncing');
          await new Promise((r) => setTimeout(r, 500));

          await recordAuditLog({
            action: isNew ? 'CREATE' : 'UPDATE',
            object_type: 'PRODUCTS',
            object_id: sanitized.sku,
            description: isNew ? `Created new product: ${sanitized.name}` : `Updated product: ${sanitized.name}`,
            new_data: sanitized as any
          });

          // Trigger scheduled audit logs prune if due
          triggerScheduledLogPruneIfDue(
            isNew 
              ? `Product Created: ${sanitized.sku} (${sanitized.name})` 
              : `Product Updated: ${sanitized.sku} (${sanitized.name})`
          ).catch(() => {});

          await recordPriceHistory({
            product_id: sanitized.id,
            sku: sanitized.sku,
            name: sanitized.name,
            old_selling_price: isNew ? undefined : currentProd.selling_price,
            new_selling_price: sanitized.selling_price,
            old_offer_price: isNew ? undefined : currentProd.offer_price,
            new_offer_price: sanitized.offer_price,
            mrp: sanitized.mrp,
            purchase_price: sanitized.purchase_price,
            landed_cost: sanitized.landed_cost,
            changed_by: 'Store Administrator',
            reason: isNew ? 'Initial product catalog creation' : 'Updated from full page editor'
          });

          setSavePercent(100);
          setSaveStep('done');
          toast.success(isNew ? 'Product created!' : 'Product updated!');

          await new Promise((r) => setTimeout(r, 1200));
          navigate('/admin/products');
        } catch (err) {
          console.error('Save failed:', err);
          toast.error('Save failed. Check console for details.');
          setIsSaving(false);
          setSavePercent(0);
        }
      }
    });
  };

  if (isLoading) {
    return <AdminPageSkeleton title={isNew ? 'Initializing New Product Editor...' : 'Loading Product Editor...'} />;
  }

  const inputClass = "w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-emerald-700 bg-white dark:bg-emerald-950/50 text-sm font-medium text-slate-800 dark:text-emerald-100 focus:outline-none focus:ring-2 focus:ring-emerald-500";
  const numInputClass = "w-full pl-7 pr-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-emerald-700 bg-white dark:bg-emerald-950/50 font-mono text-sm font-bold text-slate-800 dark:text-emerald-100 focus:outline-none focus:ring-2 focus:ring-emerald-500";

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-emerald-950/20 text-slate-800 dark:text-emerald-100 flex flex-col pb-28">
      {/* ================= 1. STICKY TOP HEADER ================= */}
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-white/90 dark:bg-emerald-950/90 border-b border-emerald-100 dark:border-emerald-850 shadow-sm transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={promptCancel}
              className="p-2 rounded-2xl bg-emerald-50 dark:bg-emerald-900/40 hover:bg-emerald-100 dark:hover:bg-emerald-800/60 text-emerald-800 dark:text-emerald-200 border border-emerald-200/60 dark:border-emerald-700/60 transition-all flex items-center gap-1.5 text-xs font-semibold cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4 text-emerald-600 dark:text-amber-400" />
              <span className="hidden sm:inline">Back to Products</span>
            </button>
            <div className="h-6 w-px bg-emerald-200 dark:bg-emerald-800 hidden sm:block" />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-serif text-lg sm:text-xl font-bold text-emerald-950 dark:text-emerald-50 tracking-tight">
                  {isNew ? '✨ Add New Product' : `Edit Product: ${product.sku || 'SKU'}`}
                </h1>
                {product.is_organic && (
                  <span className="hidden md:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700">
                    <Leaf className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                    Organic
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-emerald-400/80 font-medium hidden sm:block">
                Catalog &gt; Products &gt; {isNew ? 'Create New SKU' : product.name || 'Edit SKU'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className={cn(
              'flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold border transition-all',
              product.is_visible ? 'bg-emerald-50 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-200 border-emerald-200 dark:border-emerald-700' : 'bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-200 border-amber-200 dark:border-amber-800'
            )}>
              <span className={cn('w-2 h-2 rounded-full', product.is_visible ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500')} />
              <span>{product.is_visible ? '● Live on Storefront' : '● Hidden (Draft)'}</span>
            </div>
            <button
              onClick={() => setProduct((p) => ({ ...p, is_visible: !p.is_visible }))}
              className="p-2 rounded-xl text-xs font-semibold bg-white dark:bg-emerald-900/40 border border-slate-200 dark:border-emerald-800 hover:bg-slate-100 dark:hover:bg-emerald-800/80 transition cursor-pointer"
              title={product.is_visible ? 'Click to set as Draft' : 'Click to publish Live'}
            >
              {product.is_visible ? <Eye className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> : <EyeOff className="w-4 h-4 text-amber-600 dark:text-amber-400" />}
            </button>
          </div>
        </div>
      </header>

      {/* ================= MAIN SCROLLABLE BODY ================= */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 w-full space-y-8 animate-fadeIn">
        {/* ================= SECTION CUSTOMIZER TOOLBAR ================= */}
        <div className="bg-gradient-to-r from-emerald-950 via-emerald-900 to-teal-950 text-white rounded-3xl p-5 shadow-xl border border-emerald-700/60 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-400 text-emerald-950 flex items-center justify-center font-black text-lg shadow-md">
                ⚙️
              </div>
              <div>
                <h3 className="font-bold text-sm text-white flex items-center gap-2">
                  <span>Product Form Section Manager</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-400 text-emerald-950 shadow-xs">
                    {activeSections.length}/{AVAILABLE_SECTIONS.length} Active
                  </span>
                </h3>
                <p className="text-xs text-emerald-200">
                  Customize which sections are visible or hidden while creating or editing products.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={promptResetSections}
                className="text-xs font-bold px-3 py-1.5 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-amber-300 border border-emerald-600 transition flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <RefreshCw className="w-3 h-3 text-amber-300" />
                <span>Reset All Default</span>
              </button>
            </div>
          </div>

          {/* Section Chips */}
          <div className="flex flex-wrap gap-2 pt-2 border-t border-emerald-800/80">
            {AVAILABLE_SECTIONS.map((sec) => {
              const isActive = activeSections.includes(sec.id);
              return (
                <button
                  key={sec.id}
                  type="button"
                  onClick={() => {
                    if (sec.required) {
                      toast('Core section is required and cannot be removed', { icon: 'ℹ️' });
                      return;
                    }
                    if (isActive) promptRemoveSection(sec.id);
                    else addSection(sec.id);
                  }}
                  className={cn(
                    'px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs',
                    sec.required
                      ? 'bg-emerald-800/80 text-emerald-100 border border-emerald-600/50 cursor-default'
                      : isActive
                      ? 'bg-amber-400 text-emerald-950 hover:bg-amber-300 border border-amber-300 font-black'
                      : 'bg-emerald-950/90 text-emerald-300 hover:bg-emerald-850 border border-emerald-700/60 hover:text-white'
                  )}
                  title={sec.required ? 'Core required section' : isActive ? 'Click to remove section' : 'Click to add section'}
                >
                  <span>{sec.iconName}</span>
                  <span>{sec.title}</span>
                  {sec.required ? (
                    <span className="text-[10px] opacity-75 font-normal ml-0.5">(Required)</span>
                  ) : isActive ? (
                    <span className="text-[10px] bg-emerald-950/20 text-emerald-950 px-1.5 py-0.5 rounded-md font-black ml-0.5">Active ✓</span>
                  ) : (
                    <span className="text-[10px] bg-emerald-900 text-amber-300 px-1.5 py-0.5 rounded-md font-bold ml-0.5">+ Add</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* ================= SECTION 1: BASIC PRODUCT INFORMATION ================= */}
        {activeSections.includes('basic') && (
          <section id="section-basic" className="bg-white dark:bg-emerald-900/30 rounded-3xl p-5 sm:p-7 border border-emerald-100 dark:border-emerald-800/70 shadow-sm relative overflow-hidden transition-all scroll-mt-24">
            <SectionHeader
              icon={<Package className="w-5 h-5 text-emerald-700 dark:text-amber-300" />}
              title="1. Basic Product Information"
              subtitle="Core identity, SKU codes, bilingual names, categories and pack sizing"
              isCollapsed={Boolean(collapsedSections['basic'])}
              onToggleCollapse={() => toggleSectionCollapse('basic')}
              canRemove={false}
            />

            {!collapsedSections['basic'] && (
              <div className="mt-6 space-y-6 animate-fadeIn">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  <FormField label="SKU Code" required subtext="Strictly unique store barcode & identification code">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <div className="relative flex-1">
                          <input
                            type="text"
                            value={product.sku}
                            onChange={(e) => setProduct({ ...product, sku: e.target.value.toUpperCase() })}
                            placeholder="e.g. LIF-1001"
                            className={cn(
                              "w-full px-3.5 py-2.5 rounded-xl border font-mono text-sm font-semibold transition focus:outline-none focus:ring-2",
                              isDuplicateSku
                                ? "border-rose-500 bg-rose-50/70 dark:bg-rose-950/50 text-rose-900 dark:text-rose-100 focus:ring-rose-500"
                                : "border-slate-200 dark:border-emerald-700 bg-slate-50 dark:bg-emerald-950/50 text-slate-800 dark:text-emerald-100 focus:ring-emerald-500"
                            )}
                          />
                          {!isDuplicateSku && product.sku?.trim() && (
                            <span className="absolute right-3 top-2.5 text-xs text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                              <CheckCircle2 className="w-4 h-4" />
                            </span>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={generateUniqueSku}
                          className="px-3.5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold flex items-center gap-1.5 shrink-0 transition shadow-sm cursor-pointer"
                          title="Generate guaranteed collision-free unique SKU"
                        >
                          <RefreshCw className="w-3.5 h-3.5 text-amber-300" />
                          <span>Auto Unique SKU</span>
                        </button>
                      </div>

                      {isDuplicateSku ? (
                        <div className="p-2.5 rounded-xl bg-rose-100 dark:bg-rose-950/80 border border-rose-300 dark:border-rose-800 text-xs font-bold text-rose-800 dark:text-rose-200 flex items-center gap-2 animate-pulse">
                          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                          <span>
                            Duplicate SKU! &quot;{product.sku}&quot; is already in use by &quot;{duplicateSkuProduct?.name || 'another product'}&quot;. Click &quot;Auto Unique SKU&quot; to generate a fresh SKU.
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-[11px] text-emerald-700 dark:text-emerald-400 font-medium">
                          <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-amber-400" />
                          <span>Unique SKU verified (no catalog collisions)</span>
                        </div>
                      )}
                    </div>
                  </FormField>

                  <FormField label="English Name" required>
                    <input type="text" value={product.name} onChange={(e) => handleNameChange(e.target.value)} placeholder="e.g. Organic Karuppu Kavuni Rice" className={inputClass} />
                  </FormField>

                  <FormField label="Tamil Name (தமிழ்)">
                    <input type="text" value={product.tamil_name || ''} onChange={(e) => setProduct({ ...product, tamil_name: e.target.value })} placeholder="e.g. இயற்கை கருப்பு கவுனி அரிசி" className={inputClass} />
                  </FormField>

                  <FormField label="Category">
                    <select value={product.category_id || ''} onChange={(e) => setProduct({ ...product, category_id: e.target.value })} className={inputClass}>
                      <option value="">Select Category...</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>{c.icon || '🌾'} {c.name} {c.tamil_name ? `(${c.tamil_name})` : ''}</option>
                      ))}
                    </select>
                  </FormField>

                  <FormField label="Organic Supplier / Farmer">
                    <select value={product.supplier_id || ''} onChange={(e) => setProduct({ ...product, supplier_id: e.target.value })} className={inputClass}>
                      <option value="">Select Supplier / Farmer...</option>
                      {suppliers.map((s) => (
                        <option key={s.id} value={s.id}>{s.name} {s.district ? `(${s.district})` : ''}</option>
                      ))}
                    </select>
                  </FormField>

                  <FormField label="Pack Sizing & Unit">
                    <div className="grid grid-cols-2 gap-2">
                      <input type="text" value={product.pack_size || ''} onChange={(e) => setProduct({ ...product, pack_size: e.target.value })} placeholder="e.g. 1 kg" className={inputClass} />
                      <select value={product.unit || 'kg'} onChange={(e) => setProduct({ ...product, unit: e.target.value })} className={inputClass}>
                        <option value="kg">kg (Kilogram)</option>
                        <option value="g">g (Gram)</option>
                        <option value="l">l (Litre)</option>
                        <option value="ml">ml (Millilitre)</option>
                        <option value="pcs">pcs (Pieces)</option>
                        <option value="bundle">bundle (Kattu)</option>
                        <option value="box">box (Pack)</option>
                      </select>
                    </div>
                  </FormField>
                </div>

                {/* Quick Pack Size Presets */}
                <div className="pt-4 border-t border-slate-100 dark:border-emerald-800/40 flex flex-wrap items-center gap-2">
                  <span className="text-[11px] font-bold uppercase text-slate-500 dark:text-emerald-300/80">Quick Pack Presets:</span>
                  <div className="inline-flex flex-wrap gap-1.5">
                    {PACK_SIZE_PRESETS.map((p) => (
                      <button
                        key={p.label}
                        type="button"
                        onClick={() => setProduct({ ...product, pack_size: p.size, unit: p.unit })}
                        className={cn(
                          'px-2.5 py-1 rounded-lg text-xs font-medium border transition',
                          product.pack_size === p.size ? 'bg-emerald-700 text-white border-emerald-700 shadow-sm' : 'bg-emerald-50/70 dark:bg-emerald-900/30 text-emerald-900 dark:text-emerald-200 border-emerald-200 dark:border-emerald-700 hover:bg-emerald-100'
                        )}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* SEO Slug Preview */}
                <div className="p-3.5 bg-slate-50 dark:bg-emerald-950/40 rounded-2xl border border-slate-200/80 dark:border-emerald-800/60 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2 font-mono text-xs text-slate-600 dark:text-emerald-300 overflow-hidden text-ellipsis">
                    <Globe className="w-4 h-4 text-emerald-600 dark:text-amber-400 shrink-0" />
                    <span className="text-slate-400 dark:text-emerald-500">Store URL Preview:</span>
                    <span className="font-semibold text-emerald-800 dark:text-amber-300">/products/{product.slug || 'product-slug'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={product.slug || ''}
                      onChange={(e) => {
                        setAutoSlugSync(false);
                        setProduct({ ...product, slug: e.target.value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-') });
                      }}
                      placeholder="custom-slug"
                      className="px-2.5 py-1 text-xs font-mono rounded-lg border border-slate-300 dark:border-emerald-700 bg-white dark:bg-emerald-900/60 text-slate-700 dark:text-emerald-200"
                    />
                    <button
                      type="button"
                      onClick={() => { setAutoSlugSync(true); handleNameChange(product.name); }}
                      className="px-2 py-1 text-[11px] rounded-lg bg-emerald-100 dark:bg-emerald-800/70 text-emerald-800 dark:text-emerald-200 hover:bg-emerald-200 font-semibold transition cursor-pointer"
                    >
                      Sync
                    </button>
                  </div>
                </div>
              </div>
            )}
          </section>
        )}

        {/* ================= SECTION 2: PRICING & MARGINS ================= */}
        {activeSections.includes('pricing') && (
          <section id="section-pricing" className="bg-white dark:bg-emerald-900/30 rounded-3xl p-5 sm:p-7 border border-emerald-100 dark:border-emerald-800/70 shadow-sm relative overflow-hidden transition-all scroll-mt-24">
            <SectionHeader
              icon={<DollarSign className="w-5 h-5 text-amber-700 dark:text-amber-300" />}
              title="2. Pricing, Margins & GST Tax"
              subtitle="Cost of goods, retail pricing, buyer discounts, and live margin intelligence"
              isCollapsed={Boolean(collapsedSections['pricing'])}
              onToggleCollapse={() => toggleSectionCollapse('pricing')}
              canRemove={false}
            />

            {!collapsedSections['pricing'] && (
              <div className="mt-6 space-y-6 animate-fadeIn">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                  <FormField label="Purchase Price (₹)" required subtext="Direct cost from farmer/supplier">
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-slate-400 font-mono text-sm">₹</span>
                      <input type="number" min="0" step="0.01" value={product.purchase_price ?? ''} onChange={(e) => setProduct({ ...product, purchase_price: parseFloat(e.target.value) || 0 })} className={numInputClass} />
                    </div>
                  </FormField>

                  <FormField label="MRP (Printed Max ₹)" required subtext="Printed package price">
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-slate-400 font-mono text-sm">₹</span>
                      <input type="number" min="0" step="0.01" value={product.mrp ?? ''} onChange={(e) => setProduct({ ...product, mrp: parseFloat(e.target.value) || 0 })} className={numInputClass} />
                    </div>
                  </FormField>

                  <FormField label="Selling Price (Regular ₹)" required subtext="Default storefront selling price">
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-emerald-600 font-mono text-sm font-bold">₹</span>
                      <input type="number" min="0" step="0.01" value={product.selling_price ?? ''} onChange={(e) => setProduct({ ...product, selling_price: parseFloat(e.target.value) || 0 })} className={cn(numInputClass, 'border-emerald-300 dark:border-emerald-600 bg-emerald-50/30 text-emerald-900 dark:text-emerald-100')} />
                    </div>
                  </FormField>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300">Special Offer Price (₹)</label>
                      {product.offer_price !== undefined && (
                        <button type="button" onClick={() => setProduct({ ...product, offer_price: undefined })} className="text-[10px] font-semibold text-rose-600 hover:underline cursor-pointer">
                          Clear Offer
                        </button>
                      )}
                    </div>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-amber-600 font-mono text-sm font-bold">₹</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={product.offer_price ?? ''}
                        placeholder="Optional offer..."
                        onChange={(e) => {
                          const val = e.target.value;
                          setProduct({ ...product, offer_price: val === '' ? undefined : parseFloat(val) || 0 });
                        }}
                        className={cn(numInputClass, 'border-amber-300 dark:border-amber-700 bg-amber-50/40 text-amber-900 dark:text-amber-200')}
                      />
                    </div>
                    <p className="text-[10px] text-amber-600/90 dark:text-amber-400">Overrides selling price when set</p>
                  </div>
                </div>

                {/* Quick Markups & GST Rate Bar */}
                <div className="pt-4 border-t border-slate-100 dark:border-emerald-800/40 flex flex-wrap items-center justify-between gap-4">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[11px] font-bold uppercase text-slate-500 dark:text-emerald-300/80 mr-1">Quick Markups:</span>
                    <button type="button" onClick={() => applyCostMarkup(0.2)} className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-100 dark:bg-emerald-800/70 hover:bg-emerald-200 text-emerald-900 dark:text-emerald-100 transition cursor-pointer">+20% Cost</button>
                    <button type="button" onClick={() => applyCostMarkup(0.3)} className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-100 dark:bg-emerald-800/70 hover:bg-emerald-200 text-emerald-900 dark:text-emerald-100 transition cursor-pointer">+30% Cost</button>
                    <button type="button" onClick={() => applyCostMarkup(0.5)} className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-100 dark:bg-emerald-800/70 hover:bg-emerald-200 text-emerald-900 dark:text-emerald-100 transition cursor-pointer">+50% Cost</button>
                    <button type="button" onClick={() => applyMrpDiscount(0.1)} className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-100 dark:bg-amber-900/60 hover:bg-amber-200 text-amber-900 dark:text-amber-100 transition cursor-pointer">10% OFF MRP</button>
                    <button type="button" onClick={() => applyMrpDiscount(0.15)} className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-100 dark:bg-amber-900/60 hover:bg-amber-200 text-amber-900 dark:text-amber-100 transition cursor-pointer">15% OFF MRP</button>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold uppercase text-slate-500 dark:text-emerald-300/80">GST Tax Rate:</span>
                    <div className="inline-flex rounded-xl p-0.5 bg-slate-100 dark:bg-emerald-950/60 border border-slate-200 dark:border-emerald-800">
                      {[0, 5, 12, 18].map((rate) => (
                        <button
                          key={rate}
                          type="button"
                          onClick={() => setProduct({ ...product, tax_percent: rate })}
                          className={cn(
                            'px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer',
                            (product.tax_percent ?? 0) === rate ? 'bg-emerald-700 text-white shadow-sm' : 'text-slate-600 dark:text-emerald-300'
                          )}
                        >
                          {rate}%
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Live Financial Metrics Card */}
                <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-50 via-teal-50 to-amber-50 dark:from-emerald-950/60 dark:via-teal-950/40 dark:to-emerald-900/40 border border-emerald-200 dark:border-emerald-800/80 grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-emerald-300">Effective Selling Price</span>
                    <div className="font-mono text-xl font-black text-emerald-900 dark:text-emerald-100">{formatPrice(effectivePrice)}</div>
                    <span className="text-[10px] text-emerald-700 dark:text-amber-300">{product.offer_price ? 'Special Offer Active' : 'Regular Selling Price'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-emerald-300">Gross Margin %</span>
                    <div className={cn('font-mono text-xl font-black', grossMarginPercent >= 25 ? 'text-emerald-700 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400')}>
                      {grossMarginPercent}%
                    </div>
                    <span className="text-[10px] text-slate-500 dark:text-emerald-400">Profit: {formatPrice(grossProfit)}/unit</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-emerald-300">Buyer Savings</span>
                    <div className="font-mono text-xl font-black text-teal-700 dark:text-teal-300">{buyerSavingsPercent}% OFF</div>
                    <span className="text-[10px] text-slate-500 dark:text-emerald-400">Savings: {formatPrice(Math.max(0, (product.mrp || 0) - effectivePrice))}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-emerald-300">GST Breakdown</span>
                    <div className="font-mono text-xl font-black text-slate-800 dark:text-emerald-200">{formatPrice(gstBreakdown.taxAmount)}</div>
                    <span className="text-[10px] text-slate-500 dark:text-emerald-400">{product.tax_percent || 0}% (Base: {formatPrice(gstBreakdown.basePrice)})</span>
                  </div>
                </div>
              </div>
            )}
          </section>
        )}

        {/* ================= SECTION 3: STOCK & INVENTORY ================= */}
        {activeSections.includes('stock') && (
          <section id="section-stock" className="bg-white dark:bg-emerald-900/30 rounded-3xl p-5 sm:p-7 border border-emerald-100 dark:border-emerald-800/70 shadow-sm relative overflow-hidden transition-all scroll-mt-24">
            <SectionHeader
              icon={<Layers className="w-5 h-5 text-teal-700 dark:text-teal-300" />}
              title="3. Stock Levels & Inventory Status"
              subtitle="Current warehouse inventory, automatic reorder threshold and customer availability badges"
              isCollapsed={Boolean(collapsedSections['stock'])}
              onToggleCollapse={() => toggleSectionCollapse('stock')}
              canRemove={false}
            />

            {!collapsedSections['stock'] && (
              <div className="mt-6 space-y-6 animate-fadeIn">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-emerald-200">Current Stock ({product.unit})</label>
                    <input
                      type="number"
                      min="0"
                      value={product.current_stock ?? ''}
                      onChange={(e) => adjustStock((parseInt(e.target.value) || 0) - (product.current_stock || 0))}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-emerald-700 bg-white dark:bg-emerald-950/50 font-mono text-base font-bold text-slate-800 dark:text-emerald-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    <div className="flex items-center gap-1.5 pt-1">
                      <span className="text-[10px] font-bold text-slate-400 dark:text-emerald-400 mr-1">Adjust:</span>
                      {[-10, 5, 10, 25, 50].map((delta) => (
                        <button
                          key={delta}
                          type="button"
                          onClick={() => adjustStock(delta)}
                          className={cn(
                            'px-2 py-1 rounded-lg text-xs font-mono font-bold transition cursor-pointer',
                            delta < 0 ? 'bg-rose-100 hover:bg-rose-200 text-rose-800 dark:bg-rose-950/50 dark:text-rose-200' : 'bg-emerald-100 hover:bg-emerald-200 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200'
                          )}
                        >
                          {delta > 0 ? `+${delta}` : delta}
                        </button>
                      ))}
                    </div>
                  </div>

                  <FormField label="Reorder Threshold Level" subtext={`Triggers Low Stock Alert when stock \u2264 ${product.reorder_level || 10}`}>
                    <input
                      type="number"
                      min="0"
                      value={product.reorder_level ?? 10}
                      onChange={(e) => setProduct({ ...product, reorder_level: Math.max(0, parseInt(e.target.value) || 0) })}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-emerald-700 bg-white dark:bg-emerald-950/50 font-mono text-base font-bold text-slate-800 dark:text-emerald-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </FormField>

                  <FormField label="Stock Status Override" subtext="Auto-updated on save if stock is 0 or below reorder level">
                    <select
                      value={product.stock_status || 'IN_STOCK'}
                      onChange={(e) => setProduct({ ...product, stock_status: e.target.value as StockStatus })}
                      className={inputClass}
                    >
                      <option value="IN_STOCK">🟢 IN STOCK (Available)</option>
                      <option value="LOW_STOCK">🟡 LOW STOCK (Order Soon)</option>
                      <option value="OUT_OF_STOCK">🔴 OUT OF STOCK (Sold Out)</option>
                      <option value="DISABLED">⛔ DISABLED (Temporarily Off)</option>
                    </select>
                  </FormField>
                </div>

                {/* Live Storefront Stock Badge Simulator */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-emerald-950/40 border border-slate-200/80 dark:border-emerald-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <span className="text-xs font-bold text-slate-600 dark:text-emerald-200 block">Storefront Stock Badge Simulator:</span>
                    <span className="text-[11px] text-slate-400 dark:text-emerald-400">Customer view based on current inventory logic</span>
                  </div>
                  <div className="shrink-0">
                    {product.stock_status === 'OUT_OF_STOCK' || product.current_stock === 0 ? (
                      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-200 border border-rose-300 dark:border-rose-800 text-xs font-bold">
                        <span className="w-2 h-2 rounded-full bg-rose-600 animate-pulse" />
                        <span>🔴 Currently Out of Stock - Restocking Soon</span>
                      </div>
                    ) : product.stock_status === 'LOW_STOCK' || product.current_stock <= (product.reorder_level || 5) ? (
                      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-200 border border-amber-300 dark:border-amber-800 text-xs font-bold">
                        <span className="w-2 h-2 rounded-full bg-amber-600 animate-pulse" />
                        <span>⚠️ Only {product.current_stock} {product.unit} left - Order Soon!</span>
                      </div>
                    ) : product.stock_status === 'DISABLED' ? (
                      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 text-xs font-bold">
                        <span>⛔ Temporarily Unavailable</span>
                      </div>
                    ) : (
                      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-800 text-xs font-bold">
                        <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
                        <span>🟢 In Stock ({product.current_stock} {product.unit}) - Ready for Dispatch</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </section>
        )}

        {/* ================= SECTION 4: MEDIA & PHOTO CAROUSEL ================= */}
        {activeSections.includes('media') && (
          <section id="section-media" className="bg-white dark:bg-emerald-900/30 rounded-3xl p-5 sm:p-7 border border-emerald-100 dark:border-emerald-800/70 shadow-sm relative overflow-hidden transition-all scroll-mt-24">
            <SectionHeader
              icon={<ImageIcon className="w-5 h-5 text-teal-700 dark:text-teal-300" />}
              title="4. Media & Multi-Photo Carousel Gallery"
              subtitle="Cover showcase image, additional thumbnail angles, and gallery management"
              isCollapsed={Boolean(collapsedSections['media'])}
              onToggleCollapse={() => toggleSectionCollapse('media')}
              canRemove={true}
              onRemove={() => promptRemoveSection('media')}
              extra={
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-900/70 text-emerald-800 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700">
                  {product.images?.length || (product.image_url ? 1 : 0)} Photos in Gallery
                </span>
              }
            />

            {!collapsedSections['media'] && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6 animate-fadeIn">
                <div className="space-y-3">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-emerald-200">Primary Cover Image</label>
                  <div className="relative group rounded-2xl overflow-hidden aspect-square border-2 border-dashed border-emerald-200 dark:border-emerald-700 bg-slate-50 dark:bg-emerald-950/40 flex items-center justify-center">
                    {product.image_url ? (
                      <img src={product.image_url} alt={product.name} className="w-full h-full object-cover transition-transform group-hover:scale-105 duration-300" />
                    ) : (
                      <div className="text-center p-4">
                        <ImageIcon className="w-10 h-10 text-slate-300 dark:text-emerald-700 mx-auto mb-2" />
                        <span className="text-xs text-slate-400">No cover photo set</span>
                      </div>
                    )}
                    <div className="absolute top-2 left-2">
                      <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-emerald-700 text-white shadow-md">Cover Photo</span>
                    </div>
                  </div>

                  <input type="url" value={product.image_url || ''} onChange={(e) => { setProduct({ ...product, image_url: e.target.value }); setPreviewActiveImg(e.target.value); }} placeholder="https://example.com/photo.jpg" className={inputClass} />
                  <input type="file" ref={coverFileInputRef} onChange={(e) => handleFileUpload(e, false)} accept="image/*" className="hidden" />
                  <button
                    type="button"
                    onClick={() => coverFileInputRef.current?.click()}
                    className="w-full py-2 px-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/40 hover:bg-emerald-100 dark:hover:bg-emerald-800 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-700 text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload Cover Photo (&lt; 100 KB)</span>
                  </button>
                </div>

                <div className="lg:col-span-2 space-y-4">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-emerald-200">Gallery &amp; Carousel Photos</label>
                  <div className="flex flex-col sm:flex-row items-center gap-2">
                    <input type="url" value={newGalleryUrl} onChange={(e) => setNewGalleryUrl(e.target.value)} placeholder="Paste additional image URL..." className="w-full sm:flex-1 px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-emerald-700 bg-white dark:bg-emerald-950/50 text-slate-800 dark:text-emerald-100 focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                    <button type="button" onClick={addGalleryUrl} className="w-full sm:w-auto px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold flex items-center justify-center gap-1 shrink-0 transition cursor-pointer">
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add URL</span>
                    </button>
                    <input type="file" ref={galleryFileInputRef} onChange={(e) => handleFileUpload(e, true)} accept="image/*" className="hidden" />
                    <button
                      type="button"
                      onClick={() => galleryFileInputRef.current?.click()}
                      className="w-full sm:w-auto px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-emerald-900/60 hover:bg-slate-200 text-slate-800 dark:text-emerald-200 text-xs font-bold flex items-center justify-center gap-1 shrink-0 transition cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Upload File</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                    {product.images && product.images.length > 0 ? (
                      product.images.map((img, idx) => {
                        const isCover = img === product.image_url;
                        return (
                          <div
                            key={idx}
                            className={cn(
                              'relative group rounded-2xl overflow-hidden aspect-square border-2 transition-all bg-slate-100 dark:bg-emerald-950',
                              isCover ? 'border-emerald-500 shadow-md ring-2 ring-emerald-500/30' : 'border-slate-200 dark:border-emerald-800 hover:border-emerald-400'
                            )}
                          >
                            <img src={img} alt={`Gallery ${idx + 1}`} className="w-full h-full object-cover" />
                            {isCover && (
                              <div className="absolute top-1.5 left-1.5">
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-600 text-white">Cover</span>
                              </div>
                            )}
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1.5 p-1">
                              {!isCover && (
                                <button
                                  type="button"
                                  onClick={() => { setProduct({ ...product, image_url: img }); setPreviewActiveImg(img); toast.success('Set as cover image'); }}
                                  className="px-2 py-1 rounded-lg text-[10px] font-bold bg-emerald-500 text-white hover:bg-emerald-600 transition cursor-pointer"
                                >
                                  Set Cover
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => removeGalleryImage(idx)}
                                className="p-1 rounded-lg bg-rose-600 text-white hover:bg-rose-700 transition cursor-pointer"
                                title="Remove from gallery"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="col-span-full py-8 text-center text-xs text-slate-400 dark:text-emerald-400 italic">No images in gallery yet.</div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </section>
        )}

        {/* ================= SECTION 5: FESTIVAL OFFER DEAL TAG ================= */}
        {activeSections.includes('festival') && (
          <section id="section-festival" className="bg-white dark:bg-emerald-900/30 rounded-3xl p-5 sm:p-7 border border-amber-200 dark:border-amber-800/70 shadow-sm relative overflow-hidden transition-all scroll-mt-24">
            <SectionHeader
              icon={<Sparkles className="w-5 h-5 text-amber-500 animate-pulse" />}
              title="5. Festival Offer Deal Tag (Diwali, Pongal, New Year)"
              subtitle="Tag produce with festive flags shown across website category filters, product cards, and POS terminal"
              isCollapsed={Boolean(collapsedSections['festival'])}
              onToggleCollapse={() => toggleSectionCollapse('festival')}
              canRemove={true}
              onRemove={() => promptRemoveSection('festival')}
              extra={
                product.festival_offer && (
                  <button
                    type="button"
                    onClick={() => setProduct({ ...product, festival_offer: undefined })}
                    className="text-xs text-rose-500 hover:text-rose-700 dark:hover:text-rose-400 font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" /> Clear Tag
                  </button>
                )
              }
            />

            {!collapsedSections['festival'] && (
              <div className="mt-6 space-y-4 animate-fadeIn">
                <p className="text-xs text-slate-500 dark:text-emerald-300">
                  Tag this produce with seasonal event badges shown prominently on the storefront, checkout cart, product cards, and POS categories.
                </p>

                {/* Currently Active Festival Deal Badge */}
                {product.festival_offer ? (
                  <div className="p-3.5 bg-gradient-to-r from-amber-500/15 via-rose-500/15 to-amber-500/15 dark:from-amber-950/50 dark:via-rose-950/50 dark:to-amber-950/50 rounded-2xl border border-amber-300 dark:border-amber-700 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="px-3 py-1 rounded-full text-xs font-black bg-gradient-to-r from-amber-500 via-rose-500 to-amber-600 text-white shadow-sm flex items-center gap-1.5 uppercase tracking-wider animate-pulse">
                        <Sparkles className="w-3.5 h-3.5 text-amber-200" />
                        <span>{product.festival_offer}</span>
                      </span>
                      <span className="text-xs font-bold text-amber-800 dark:text-amber-200">Active Festive Deal Tag</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setProduct({ ...product, festival_offer: undefined })}
                      className="p-1 hover:bg-rose-100 dark:hover:bg-rose-900/40 rounded-lg text-rose-600 dark:text-rose-400 transition cursor-pointer"
                      title="Remove festival offer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="p-3 bg-slate-50 dark:bg-emerald-950/40 rounded-xl border border-slate-200 dark:border-emerald-800 text-xs text-slate-400 dark:text-emerald-400 italic">
                    No festival offer tag attached currently. Click a preset chip below or type a custom festive offer.
                  </div>
                )}

                {/* Festival Preset Chips */}
                <div className="space-y-1.5">
                  <span className="text-[11px] font-bold uppercase text-slate-500 dark:text-emerald-300">Popular Festive Deals:</span>
                  <div className="flex flex-wrap gap-2">
                    {FESTIVAL_OFFER_PRESETS.map((fest) => {
                      const isSelected = product.festival_offer === fest;
                      return (
                        <button
                          key={fest}
                          type="button"
                          onClick={() => setProduct({ ...product, festival_offer: isSelected ? undefined : fest })}
                          className={cn(
                            'px-3.5 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 cursor-pointer',
                            isSelected
                              ? 'bg-gradient-to-r from-amber-500 via-rose-500 to-amber-600 text-white border-amber-400 shadow-md scale-105'
                              : 'bg-white dark:bg-emerald-950/60 text-slate-700 dark:text-emerald-200 border-slate-200 dark:border-emerald-700 hover:border-amber-400 hover:bg-amber-50/50 dark:hover:bg-amber-950/30'
                          )}
                        >
                          {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                          <span>{fest}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Custom Festival Input */}
                <div className="pt-2 flex items-center gap-2 max-w-md">
                  <input
                    type="text"
                    placeholder="Or custom festival title (e.g. 🌾 Delta Harvest Festival)..."
                    value={customFestival}
                    onChange={(e) => setCustomFestival(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (customFestival.trim()) {
                          setProduct({ ...product, festival_offer: customFestival.trim() });
                          setCustomFestival('');
                        }
                      }
                    }}
                    className="px-3.5 py-2 text-xs font-medium rounded-xl border border-slate-200 dark:border-emerald-700 bg-white dark:bg-emerald-950/50 text-slate-800 dark:text-emerald-100 focus:outline-none focus:ring-2 focus:ring-amber-500 flex-1"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (customFestival.trim()) {
                        setProduct({ ...product, festival_offer: customFestival.trim() });
                        setCustomFestival('');
                      }
                    }}
                    className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-emerald-950 text-xs font-extrabold flex items-center gap-1 shrink-0 transition cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Set Tag</span>
                  </button>
                </div>
              </div>
            )}
          </section>
        )}

        {/* ================= SECTION 6: PRODUCT LABELS & BADGES ================= */}
        {activeSections.includes('badges') && (
          <section id="section-badges" className="bg-white dark:bg-emerald-900/30 rounded-3xl p-5 sm:p-7 border border-emerald-100 dark:border-emerald-800/70 shadow-sm relative overflow-hidden transition-all scroll-mt-24">
            <SectionHeader
              icon={<Tag className="w-5 h-5 text-emerald-700 dark:text-amber-300" />}
              title="6. Product Badges & Merchandising Labels"
              subtitle="Toggle featured/organic attributes and click preset chips to highlight specialties"
              isCollapsed={Boolean(collapsedSections['badges'])}
              onToggleCollapse={() => toggleSectionCollapse('badges')}
              canRemove={true}
              onRemove={() => promptRemoveSection('badges')}
            />

            {!collapsedSections['badges'] && (
              <div className="mt-6 space-y-6 animate-fadeIn">
                {/* Organic & Featured Toggles */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <ToggleCard
                    icon={<Leaf className="w-5 h-5" />}
                    title="100% Certified Organic"
                    subtitle="Displays official Green Organic Seal on storefront product cards"
                    checked={product.is_organic}
                    onToggle={() => setProduct({ ...product, is_organic: !product.is_organic })}
                    accentColor="emerald"
                  />
                  <ToggleCard
                    icon={<Star className="w-5 h-5" />}
                    title="Featured on Homepage"
                    subtitle="Pinned to Top Picks & Carousel hero showcase sections"
                    checked={product.is_featured}
                    onToggle={() => setProduct({ ...product, is_featured: !product.is_featured })}
                    accentColor="amber"
                  />
                </div>

                {/* Active Selected Labels */}
                <div>
                  <span className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-emerald-200 mb-2">
                    Active Storefront Badges ({product.labels?.length || 0}):
                  </span>
                  <div className="flex flex-wrap gap-2 min-h-[36px] p-3 rounded-2xl bg-slate-50 dark:bg-emerald-950/40 border border-slate-200 dark:border-emerald-800">
                    {product.labels && product.labels.length > 0 ? (
                      product.labels.map((lbl) => (
                        <span key={lbl} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-600 text-white shadow-sm">
                          <span>{lbl}</span>
                          <button type="button" onClick={() => toggleLabel(lbl)} className="hover:text-amber-200 transition cursor-pointer" title={`Remove ${lbl}`}>
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-slate-400 dark:text-emerald-400 italic">No badges selected yet. Click preset chips below to add.</span>
                    )}
                  </div>
                </div>

                {/* Preset Label Chips */}
                <div>
                  <span className="text-xs font-bold text-slate-600 dark:text-emerald-300 block mb-2">Preset Label Chips (Click to toggle):</span>
                  <div className="flex flex-wrap gap-2">
                    {PRESET_LABELS.map((preset) => {
                      const isSelected = (product.labels || []).includes(preset);
                      return (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => toggleLabel(preset)}
                          className={cn(
                            'px-3 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 cursor-pointer',
                            isSelected ? 'bg-emerald-700 text-white border-emerald-700 shadow-sm' : 'bg-white dark:bg-emerald-950/60 text-slate-700 dark:text-emerald-200 border-slate-300 dark:border-emerald-700 hover:border-emerald-400'
                          )}
                        >
                          {isSelected && <Check className="w-3.5 h-3.5" />}
                          <span>{preset}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Custom Label Input */}
                <div className="flex items-center gap-2 max-w-md">
                  <input
                    type="text"
                    value={customLabel}
                    onChange={(e) => setCustomLabel(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddCustomLabel(); } }}
                    placeholder="Custom badge (e.g. Iron Rich)..."
                    className="px-3.5 py-2 text-xs font-medium rounded-xl border border-slate-200 dark:border-emerald-700 bg-white dark:bg-emerald-950/50 text-slate-800 dark:text-emerald-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 flex-1"
                  />
                  <button
                    type="button"
                    onClick={handleAddCustomLabel}
                    className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold flex items-center gap-1 shrink-0 transition cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add</span>
                  </button>
                </div>
              </div>
            )}
          </section>
        )}

        {/* ================= SECTION 7: DESCRIPTION & STORY ================= */}
        {activeSections.includes('story') && (
          <section id="section-story" className="bg-white dark:bg-emerald-900/30 rounded-3xl p-5 sm:p-7 border border-emerald-100 dark:border-emerald-800/70 shadow-sm relative overflow-hidden transition-all scroll-mt-24">
            <SectionHeader
              icon={<FileText className="w-5 h-5 text-amber-700 dark:text-amber-300" />}
              title="7. Product Narrative, Teaser & Health Benefits"
              subtitle="Craft compelling organic farm stories and 1-click health benefit highlights"
              isCollapsed={Boolean(collapsedSections['story'])}
              onToggleCollapse={() => toggleSectionCollapse('story')}
              canRemove={true}
              onRemove={() => promptRemoveSection('story')}
            />

            {!collapsedSections['story'] && (
              <div className="space-y-6 mt-6 animate-fadeIn">
                <div className="space-y-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-emerald-200">Short Teaser / Summary</label>
                  <input
                    type="text"
                    value={product.short_description || ''}
                    onChange={(e) => setProduct({ ...product, short_description: e.target.value })}
                    placeholder="Brief 1-line headline shown in cards and search results..."
                    className={inputClass}
                  />
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    <span className="text-[10px] font-bold text-slate-400 dark:text-emerald-400 mr-1">Presets:</span>
                    {TEASER_PRESETS.map((t, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setProduct({ ...product, short_description: t })}
                        className="px-2 py-0.5 rounded-lg text-[11px] font-medium bg-emerald-50 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-700 hover:bg-emerald-100 transition truncate max-w-xs cursor-pointer"
                        title={t}
                      >
                        {t.slice(0, 36)}...
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-emerald-200">Full Nutritional Description</label>
                    <span className="text-[11px] text-emerald-700 dark:text-amber-300 font-semibold">⚡ 1-Click Health Benefit Appenders:</span>
                  </div>

                  <div className="flex flex-wrap gap-1.5 p-3 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-800">
                    {HEALTH_BENEFITS.map((benefit) => (
                      <button
                        key={benefit}
                        type="button"
                        onClick={() => appendBenefit(benefit)}
                        className="px-2.5 py-1 rounded-xl text-xs font-semibold bg-white dark:bg-emerald-900/60 text-emerald-900 dark:text-emerald-100 border border-emerald-200 dark:border-emerald-700 hover:bg-emerald-100 transition flex items-center gap-1 shadow-2xs cursor-pointer"
                      >
                        <span>{benefit}</span>
                        <Plus className="w-3.5 h-3.5 text-emerald-600 dark:text-amber-300" />
                      </button>
                    ))}
                  </div>

                  <textarea
                    rows={4}
                    value={product.description || ''}
                    onChange={(e) => setProduct({ ...product, description: e.target.value })}
                    placeholder="Detailed organic product description, heritage farmer background, recipe suggestions..."
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-emerald-700 bg-white dark:bg-emerald-950/50 text-sm font-medium text-slate-800 dark:text-emerald-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-sans"
                  />
                </div>
              </div>
            )}
          </section>
        )}

        {/* ================= SECTION 8: STORAGE & CERTIFICATIONS ================= */}
        {activeSections.includes('storage_specs') && (
          <section id="section-storage_specs" className="bg-white dark:bg-emerald-900/30 rounded-3xl p-5 sm:p-7 border border-emerald-100 dark:border-emerald-800/70 shadow-sm relative overflow-hidden transition-all scroll-mt-24">
            <SectionHeader
              icon={<ShieldCheck className="w-5 h-5 text-teal-700 dark:text-teal-300" />}
              title="8. Storage Specifications & Organic Certifications"
              subtitle="Shelf life, optimal storage instructions, and organic certification department authority"
              isCollapsed={Boolean(collapsedSections['storage_specs'])}
              onToggleCollapse={() => toggleSectionCollapse('storage_specs')}
              canRemove={true}
              onRemove={() => promptRemoveSection('storage_specs')}
            />

            {!collapsedSections['storage_specs'] && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-6 animate-fadeIn">
                <div className="space-y-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-emerald-200">Storage Instructions</label>
                  <input type="text" value={product.storage_info || ''} onChange={(e) => setProduct({ ...product, storage_info: e.target.value })} placeholder="e.g. Store in airtight container..." className={inputClass} />
                  <div className="flex flex-wrap gap-1 pt-1">
                    {STORAGE_PRESETS.map((s, idx) => (
                      <button key={idx} type="button" onClick={() => setProduct({ ...product, storage_info: s })} className="px-2 py-0.5 rounded text-[10px] bg-slate-100 dark:bg-emerald-900/40 text-slate-700 dark:text-emerald-300 hover:bg-slate-200 transition truncate max-w-[200px] cursor-pointer" title={s}>
                        {s.slice(0, 24)}...
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-emerald-200">Organic Certification Authority</label>
                  <input type="text" value={product.organic_certification || ''} onChange={(e) => setProduct({ ...product, organic_certification: e.target.value })} placeholder="e.g. NPOP India Organic Certified..." className={inputClass} />
                  <div className="flex flex-wrap gap-1 pt-1">
                    {CERTIFICATION_PRESETS.map((c, idx) => (
                      <button key={idx} type="button" onClick={() => setProduct({ ...product, organic_certification: c })} className="px-2 py-0.5 rounded text-[10px] bg-emerald-50 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100 transition truncate max-w-[220px] cursor-pointer" title={c}>
                        {c.slice(0, 26)}...
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </section>
        )}

        {/* ================= SECTION 9: VISIBILITY & STORE SETTINGS ================= */}
        {activeSections.includes('visibility') && (
          <section id="section-visibility" className="bg-white dark:bg-emerald-900/30 rounded-3xl p-5 sm:p-7 border border-emerald-100 dark:border-emerald-800/70 shadow-sm relative overflow-hidden transition-all scroll-mt-24">
            <SectionHeader
              icon={<Sliders className="w-5 h-5 text-emerald-700 dark:text-amber-300" />}
              title="9. Storefront Visibility & Operational Policies"
              subtitle="Store publishing switches, batch expiry tracking, and customer visibility toggles"
              isCollapsed={Boolean(collapsedSections['visibility'])}
              onToggleCollapse={() => toggleSectionCollapse('visibility')}
              canRemove={true}
              onRemove={() => promptRemoveSection('visibility')}
            />

            {!collapsedSections['visibility'] && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6 animate-fadeIn">
                <ToggleCard
                  icon={<Globe className="w-4 h-4" />}
                  title="Live on Storefront"
                  subtitle={product.is_visible ? 'Publicly visible and buyable in catalog' : 'Hidden as draft catalog entry'}
                  checked={product.is_visible}
                  onToggle={() => setProduct({ ...product, is_visible: !product.is_visible })}
                  accentColor="emerald"
                />
                <ToggleCard
                  icon={<Leaf className="w-4 h-4" />}
                  title="Organic Certification"
                  subtitle={product.is_organic ? 'Certified organic seal active' : 'Conventional / Uncertified'}
                  checked={product.is_organic}
                  onToggle={() => setProduct({ ...product, is_organic: !product.is_organic })}
                  accentColor="emerald"
                />
                <ToggleCard
                  icon={<Star className="w-4 h-4" />}
                  title="Featured Highlight"
                  subtitle={product.is_featured ? 'Pinned on home recommendations' : 'Standard catalog placement'}
                  checked={product.is_featured}
                  onToggle={() => setProduct({ ...product, is_featured: !product.is_featured })}
                  accentColor="amber"
                />
                <ToggleCard
                  icon={<Calendar className="w-4 h-4" />}
                  title="Batch Expiry Tracking"
                  subtitle={product.expiry_tracking ? 'Enables harvest & batch expiry dates' : 'Standard shelf-stable staple'}
                  checked={Boolean(product.expiry_tracking)}
                  onToggle={() => setProduct({ ...product, expiry_tracking: !product.expiry_tracking })}
                  accentColor="teal"
                />
              </div>
            )}
          </section>
        )}

        {/* ================= SECTION 10: LIVE PREVIEW PANEL ================= */}
        {activeSections.includes('preview') && (
          <section id="section-preview" className="bg-white dark:bg-emerald-900/30 rounded-3xl p-5 sm:p-7 border border-emerald-100 dark:border-emerald-800/70 shadow-sm relative overflow-hidden transition-all scroll-mt-24">
            <SectionHeader
              icon={<Eye className="w-5 h-5 text-amber-700 dark:text-amber-300" />}
              title="10. Real-Time Storefront Live Simulator"
              subtitle="Original website product details page replica. Click any section in the preview below to jump straight into editing it!"
              isCollapsed={Boolean(collapsedSections['preview'])}
              onToggleCollapse={() => toggleSectionCollapse('preview')}
              canRemove={true}
              onRemove={() => promptRemoveSection('preview')}
              extra={
                <div className="flex flex-wrap items-center gap-2">
                  {/* View Mode Toggle */}
                  <div className="inline-flex rounded-xl p-1 bg-slate-100 dark:bg-emerald-950/60 border border-slate-200 dark:border-emerald-800 shadow-2xs">
                    <button
                      type="button"
                      onClick={() => setPreviewMode('page')}
                      className={cn('px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5', previewMode === 'page' ? 'bg-emerald-700 text-white shadow-sm ring-1 ring-emerald-500' : 'text-slate-600 dark:text-emerald-300 hover:text-emerald-900')}
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>Detail Page Preview</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewMode('card')}
                      className={cn('px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5', previewMode === 'card' ? 'bg-emerald-700 text-white shadow-sm ring-1 ring-emerald-500' : 'text-slate-600 dark:text-emerald-300 hover:text-emerald-900')}
                    >
                      <Package className="w-3.5 h-3.5" />
                      <span>Card Preview</span>
                    </button>
                  </div>

                  {/* Device Viewport Toggle (for Detail Page mode) */}
                  {previewMode === 'page' && (
                    <div className="inline-flex rounded-xl p-1 bg-slate-100 dark:bg-emerald-950/60 border border-slate-200 dark:border-emerald-800 shadow-2xs">
                      <button
                        type="button"
                        onClick={() => setSimulatorDevice('desktop')}
                        className={cn('px-2.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1', simulatorDevice === 'desktop' ? 'bg-emerald-800 text-white shadow-xs' : 'text-slate-600 dark:text-emerald-300')}
                        title="Desktop 2-Column Storefront Layout"
                      >
                        <Monitor className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Desktop</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setSimulatorDevice('mobile')}
                        className={cn('px-2.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1', simulatorDevice === 'mobile' ? 'bg-emerald-800 text-white shadow-xs' : 'text-slate-600 dark:text-emerald-300')}
                        title="Mobile Device Storefront Layout"
                      >
                        <Smartphone className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Mobile</span>
                      </button>
                    </div>
                  )}

                  {/* External Storefront Link */}
                  {product.id && (
                    <a
                      href={`/products/${product.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-50 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700 hover:bg-emerald-100 dark:hover:bg-emerald-900 transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
                      title="Open actual storefront page in a new browser tab"
                    >
                      <ExternalLink className="w-3.5 h-3.5 text-emerald-600 dark:text-amber-400" />
                      <span className="hidden md:inline">Open Live Page</span>
                    </a>
                  )}

                  {/* Storefront Visibility Status */}
                  <button
                    type="button"
                    onClick={() => setProduct((p) => ({ ...p, is_visible: !p.is_visible }))}
                    className={cn(
                      'px-3 py-1.5 rounded-xl text-xs font-bold border transition flex items-center gap-1.5 cursor-pointer shadow-2xs',
                      product.is_visible ? 'bg-emerald-100 text-emerald-800 border-emerald-300 hover:bg-emerald-200 dark:bg-emerald-900/60 dark:text-emerald-200' : 'bg-amber-100 text-amber-800 border-amber-300 hover:bg-amber-200 dark:bg-amber-900/60 dark:text-amber-200'
                    )}
                  >
                    {product.is_visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                    <span>{product.is_visible ? 'Storefront: LIVE' : 'Storefront: DRAFT'}</span>
                  </button>
                </div>
              }
            />

            {!collapsedSections['preview'] && (
              <div className="mt-6 space-y-4 animate-fadeIn">
                
                {/* Interactive Storefront Sections Controller */}
                <div className="p-4 bg-gradient-to-r from-emerald-50 via-teal-50 to-amber-50/40 dark:from-emerald-950/80 dark:via-emerald-900/40 dark:to-emerald-950/80 rounded-3xl border border-emerald-200 dark:border-emerald-800 shadow-sm space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-xs text-emerald-900 dark:text-emerald-100 uppercase tracking-wider flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 text-amber-500 animate-spin" />
                        <span>Storefront Sections Controller</span>
                      </span>
                      <span className="text-[11px] text-slate-500 dark:text-emerald-300 font-medium">
                        (Live preview controls: Click to Edit, 1-Click Remove, or 1-Click Add any section)
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pt-0.5">
                    {/* Section 1: Basic */}
                    <div className="inline-flex items-center gap-1.5 bg-white dark:bg-emerald-900/90 px-3 py-1.5 rounded-xl border border-emerald-200 dark:border-emerald-700 shadow-2xs text-xs">
                      <span className="font-bold text-gray-800 dark:text-emerald-100">1. Title &amp; SKU</span>
                      <button
                        type="button"
                        onClick={() => jumpToSection('basic')}
                        className="px-2 py-0.5 rounded-lg text-[10px] font-black bg-amber-400 hover:bg-amber-300 text-slate-950 transition cursor-pointer flex items-center gap-0.5"
                      >
                        <Edit3 className="w-2.5 h-2.5" /> Edit
                      </button>
                    </div>

                    {/* Section 2: Pricing */}
                    <div className="inline-flex items-center gap-1.5 bg-white dark:bg-emerald-900/90 px-3 py-1.5 rounded-xl border border-emerald-200 dark:border-emerald-700 shadow-2xs text-xs">
                      <span className="font-bold text-gray-800 dark:text-emerald-100">2. Pricing</span>
                      <button
                        type="button"
                        onClick={() => jumpToSection('pricing')}
                        className="px-2 py-0.5 rounded-lg text-[10px] font-black bg-amber-400 hover:bg-amber-300 text-slate-950 transition cursor-pointer flex items-center gap-0.5"
                      >
                        <Edit3 className="w-2.5 h-2.5" /> Edit
                      </button>
                    </div>

                    {/* Section 3: Stock */}
                    <div className="inline-flex items-center gap-1.5 bg-white dark:bg-emerald-900/90 px-3 py-1.5 rounded-xl border border-emerald-200 dark:border-emerald-700 shadow-2xs text-xs">
                      <span className="font-bold text-gray-800 dark:text-emerald-100">3. Stock</span>
                      <button
                        type="button"
                        onClick={() => jumpToSection('stock')}
                        className="px-2 py-0.5 rounded-lg text-[10px] font-black bg-amber-400 hover:bg-amber-300 text-slate-950 transition cursor-pointer flex items-center gap-0.5"
                      >
                        <Edit3 className="w-2.5 h-2.5" /> Edit
                      </button>
                    </div>

                    {/* Section 4: Media */}
                    <div className="inline-flex items-center gap-1.5 bg-white dark:bg-emerald-900/90 px-3 py-1.5 rounded-xl border border-emerald-200 dark:border-emerald-700 shadow-2xs text-xs">
                      <span className="font-bold text-gray-800 dark:text-emerald-100">4. Photos ({simulatorImages.length})</span>
                      <button
                        type="button"
                        onClick={() => jumpToSection('media')}
                        className="px-2 py-0.5 rounded-lg text-[10px] font-black bg-amber-400 hover:bg-amber-300 text-slate-950 transition cursor-pointer flex items-center gap-0.5"
                      >
                        <Edit3 className="w-2.5 h-2.5" /> Edit
                      </button>
                    </div>

                    {/* Section 5: Festival Offer */}
                    <div className={cn(
                      'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border shadow-2xs text-xs transition',
                      product.festival_offer 
                        ? 'bg-amber-50 dark:bg-amber-950/70 border-amber-300 dark:border-amber-700 text-amber-950 dark:text-amber-100' 
                        : 'bg-white/70 dark:bg-emerald-950/40 border-dashed border-slate-300 dark:border-emerald-800 text-slate-500'
                    )}>
                      <span className="font-bold">5. Festival Deal:</span>
                      {product.festival_offer ? (
                        <>
                          <span className="font-mono text-[11px] truncate max-w-[100px] text-amber-800 dark:text-amber-200 font-extrabold">{product.festival_offer}</span>
                          <button
                            type="button"
                            onClick={() => jumpToSection('festival')}
                            className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-300 dark:bg-amber-800 text-slate-950 dark:text-amber-100 cursor-pointer"
                            title="Edit festival offer"
                          >
                            ✏️
                          </button>
                          <button
                            type="button"
                            onClick={() => removePreviewAttribute('festival')}
                            className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 hover:bg-rose-200 cursor-pointer"
                            title="Remove festival offer"
                          >
                            ✕
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => addPreviewAttribute('festival')}
                          className="px-2 py-0.5 rounded-lg text-[10px] font-black bg-emerald-700 hover:bg-emerald-800 text-white cursor-pointer transition"
                        >
                          + Add Deal
                        </button>
                      )}
                    </div>

                    {/* Section 6: Badges */}
                    <div className="inline-flex items-center gap-1.5 bg-white dark:bg-emerald-900/90 px-3 py-1.5 rounded-xl border border-emerald-200 dark:border-emerald-700 shadow-2xs text-xs">
                      <span className="font-bold text-gray-800 dark:text-emerald-100">6. Badges:</span>
                      <button
                        type="button"
                        onClick={() => product.is_organic ? removePreviewAttribute('organic') : addPreviewAttribute('organic')}
                        className={cn('px-2 py-0.5 rounded-lg text-[10px] font-black cursor-pointer transition', product.is_organic ? 'bg-emerald-700 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200')}
                        title="Toggle 100% Organic badge"
                      >
                        {product.is_organic ? '🌿 Organic (ON ✕)' : '+ Organic'}
                      </button>
                      <button
                        type="button"
                        onClick={() => product.is_featured ? removePreviewAttribute('featured') : addPreviewAttribute('featured')}
                        className={cn('px-2 py-0.5 rounded-lg text-[10px] font-black cursor-pointer transition', product.is_featured ? 'bg-amber-500 text-slate-950' : 'bg-slate-100 text-slate-500 hover:bg-slate-200')}
                        title="Toggle Featured badge"
                      >
                        {product.is_featured ? '⭐ Featured (ON ✕)' : '+ Featured'}
                      </button>
                      <button
                        type="button"
                        onClick={() => jumpToSection('badges')}
                        className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-400 hover:bg-amber-300 text-slate-950 cursor-pointer"
                        title="Edit labels and badges in Section 6"
                      >
                        ✏️
                      </button>
                    </div>

                    {/* Section 7: Short Teaser */}
                    <div className={cn(
                      'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border shadow-2xs text-xs transition',
                      product.short_description 
                        ? 'bg-amber-50 dark:bg-amber-950/70 border-amber-300 dark:border-amber-700 text-amber-950 dark:text-amber-100' 
                        : 'bg-white/70 dark:bg-emerald-950/40 border-dashed border-slate-300 dark:border-emerald-800 text-slate-500'
                    )}>
                      <span className="font-bold">7. Teaser:</span>
                      {product.short_description ? (
                        <>
                          <span className="text-[11px] font-bold text-emerald-800 dark:text-emerald-200">Active</span>
                          <button
                            type="button"
                            onClick={() => jumpToSection('story')}
                            className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-300 dark:bg-amber-800 text-slate-950 dark:text-amber-100 cursor-pointer"
                          >
                            ✏️
                          </button>
                          <button
                            type="button"
                            onClick={() => removePreviewAttribute('teaser')}
                            className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 hover:bg-rose-200 cursor-pointer"
                            title="Remove Short Teaser"
                          >
                            ✕
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => addPreviewAttribute('teaser')}
                          className="px-2 py-0.5 rounded-lg text-[10px] font-black bg-emerald-700 hover:bg-emerald-800 text-white cursor-pointer transition"
                        >
                          + Add
                        </button>
                      )}
                    </div>

                    {/* Section 7: Heritage Story */}
                    <div className={cn(
                      'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border shadow-2xs text-xs transition',
                      product.description 
                        ? 'bg-emerald-50 dark:bg-emerald-950/70 border-emerald-300 dark:border-emerald-700 text-emerald-950 dark:text-emerald-100' 
                        : 'bg-white/70 dark:bg-emerald-950/40 border-dashed border-slate-300 dark:border-emerald-800 text-slate-500'
                    )}>
                      <span className="font-bold">Heritage Story:</span>
                      {product.description ? (
                        <>
                          <span className="text-[11px] font-bold text-emerald-800 dark:text-emerald-200">Active</span>
                          <button
                            type="button"
                            onClick={() => jumpToSection('story')}
                            className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-300 dark:bg-amber-800 text-slate-950 dark:text-amber-100 cursor-pointer"
                          >
                            ✏️
                          </button>
                          <button
                            type="button"
                            onClick={() => removePreviewAttribute('description')}
                            className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 hover:bg-rose-200 cursor-pointer"
                            title="Remove Heritage Story"
                          >
                            ✕
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => addPreviewAttribute('description')}
                          className="px-2 py-0.5 rounded-lg text-[10px] font-black bg-emerald-700 hover:bg-emerald-800 text-white cursor-pointer transition"
                        >
                          + Add
                        </button>
                      )}
                    </div>

                    {/* Section 7: Farm Origin */}
                    <div className={cn(
                      'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border shadow-2xs text-xs transition',
                      product.source_description 
                        ? 'bg-emerald-50 dark:bg-emerald-950/70 border-emerald-300 dark:border-emerald-700 text-emerald-950 dark:text-emerald-100' 
                        : 'bg-white/70 dark:bg-emerald-950/40 border-dashed border-slate-300 dark:border-emerald-800 text-slate-500'
                    )}>
                      <span className="font-bold">Farm Origin:</span>
                      {product.source_description ? (
                        <>
                          <span className="text-[11px] font-bold text-emerald-800 dark:text-emerald-200">Active</span>
                          <button
                            type="button"
                            onClick={() => jumpToSection('story')}
                            className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-300 dark:bg-amber-800 text-slate-950 dark:text-amber-100 cursor-pointer"
                          >
                            ✏️
                          </button>
                          <button
                            type="button"
                            onClick={() => removePreviewAttribute('source')}
                            className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 hover:bg-rose-200 cursor-pointer"
                            title="Remove Farm Sourcing"
                          >
                            ✕
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => addPreviewAttribute('source')}
                          className="px-2 py-0.5 rounded-lg text-[10px] font-black bg-emerald-700 hover:bg-emerald-800 text-white cursor-pointer transition"
                        >
                          + Add
                        </button>
                      )}
                    </div>

                    {/* Section 8: Storage Guidelines */}
                    <div className={cn(
                      'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border shadow-2xs text-xs transition',
                      product.storage_info 
                        ? 'bg-amber-50 dark:bg-amber-950/70 border-amber-300 dark:border-amber-700 text-amber-950 dark:text-amber-100' 
                        : 'bg-white/70 dark:bg-emerald-950/40 border-dashed border-slate-300 dark:border-emerald-800 text-slate-500'
                    )}>
                      <span className="font-bold">8. Storage:</span>
                      {product.storage_info ? (
                        <>
                          <span className="text-[11px] font-bold text-emerald-800 dark:text-emerald-200">Active</span>
                          <button
                            type="button"
                            onClick={() => jumpToSection('storage_specs')}
                            className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-300 dark:bg-amber-800 text-slate-950 dark:text-amber-100 cursor-pointer"
                          >
                            ✏️
                          </button>
                          <button
                            type="button"
                            onClick={() => removePreviewAttribute('storage')}
                            className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 hover:bg-rose-200 cursor-pointer"
                            title="Remove Storage Info"
                          >
                            ✕
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => addPreviewAttribute('storage')}
                          className="px-2 py-0.5 rounded-lg text-[10px] font-black bg-emerald-700 hover:bg-emerald-800 text-white cursor-pointer transition"
                        >
                          + Add
                        </button>
                      )}
                    </div>

                    {/* Section 7: Culinary Notes */}
                    <div className={cn(
                      'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border shadow-2xs text-xs transition',
                      product.notes 
                        ? 'bg-teal-50 dark:bg-teal-950/70 border-teal-300 dark:border-teal-700 text-teal-950 dark:text-teal-100' 
                        : 'bg-white/70 dark:bg-emerald-950/40 border-dashed border-slate-300 dark:border-emerald-800 text-slate-500'
                    )}>
                      <span className="font-bold">Culinary Notes:</span>
                      {product.notes ? (
                        <>
                          <span className="text-[11px] font-bold text-emerald-800 dark:text-emerald-200">Active</span>
                          <button
                            type="button"
                            onClick={() => jumpToSection('story')}
                            className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-300 dark:bg-amber-800 text-slate-950 dark:text-amber-100 cursor-pointer"
                          >
                            ✏️
                          </button>
                          <button
                            type="button"
                            onClick={() => removePreviewAttribute('notes')}
                            className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 hover:bg-rose-200 cursor-pointer"
                            title="Remove Culinary Notes"
                          >
                            ✕
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => addPreviewAttribute('notes')}
                          className="px-2 py-0.5 rounded-lg text-[10px] font-black bg-emerald-700 hover:bg-emerald-800 text-white cursor-pointer transition"
                        >
                          + Add
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {previewMode === 'card' ? (
                  /* ================= CARD PREVIEW MODE ================= */
                  <div className="flex justify-center p-4 sm:p-6 bg-slate-50 dark:bg-emerald-950/40 rounded-3xl border border-slate-200 dark:border-emerald-800">
                    <div 
                      className="group/card w-full max-w-xs bg-white dark:bg-emerald-950 rounded-3xl border-2 border-emerald-100 dark:border-emerald-800 shadow-xl overflow-hidden relative hover:border-amber-400 hover:ring-4 hover:ring-amber-300 transition-all"
                      title="Simulated Public Storefront Product Card"
                    >
                      <button
                        type="button"
                        onClick={() => jumpToSection('basic')}
                        className="absolute top-2 right-2 z-20 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-[10px] px-2.5 py-1 rounded-lg shadow-lg flex items-center gap-1 border border-amber-300 cursor-pointer"
                      >
                        <Edit3 className="w-3 h-3" /> Edit Product
                      </button>

                      <div className="relative aspect-square overflow-hidden bg-slate-100 dark:bg-emerald-900">
                        <img
                          src={previewActiveImg || product.image_url || simulatorImages[0]}
                          alt={product.name}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                        <div className="absolute top-2.5 left-2.5 flex flex-col gap-1 items-start">
                          {product.festival_offer && (
                            <span 
                              className="px-2 py-0.5 rounded-full text-[9px] font-black bg-gradient-to-r from-amber-500 via-rose-500 to-amber-600 text-white shadow-sm flex items-center gap-1 uppercase tracking-wider animate-pulse hover:scale-105 transition"
                            >
                              <Sparkles className="w-2.5 h-2.5 text-amber-200" />
                              <span>{product.festival_offer}</span>
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); removePreviewAttribute('festival'); }}
                                className="ml-0.5 hover:text-rose-300 cursor-pointer font-bold"
                              >
                                ✕
                              </button>
                            </span>
                          )}
                          {product.is_organic && (
                            <span 
                              className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-600 text-white shadow-sm flex items-center gap-1 hover:scale-105 transition"
                            >
                              <Leaf className="w-3 h-3" />
                              Organic
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); removePreviewAttribute('organic'); }}
                                className="ml-0.5 hover:text-rose-300 cursor-pointer font-bold"
                              >
                                ✕
                              </button>
                            </span>
                          )}
                          {product.is_featured && (
                            <span 
                              className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500 text-white shadow-sm flex items-center gap-1 hover:scale-105 transition"
                            >
                              <Star className="w-3 h-3" />
                              Featured
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); removePreviewAttribute('featured'); }}
                                className="ml-0.5 hover:text-rose-700 cursor-pointer font-bold"
                              >
                                ✕
                              </button>
                            </span>
                          )}
                        </div>
                        {buyerSavingsPercent > 0 && (
                          <div className="absolute bottom-2.5 right-2.5">
                            <span 
                              onClick={() => jumpToSection('pricing')}
                              className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-rose-600 text-white shadow-sm hover:scale-105 transition cursor-pointer"
                            >
                              {buyerSavingsPercent}% OFF
                            </span>
                          </div>
                        )}
                        {!product.is_visible && (
                          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-[2px] flex items-center justify-center p-3 text-center">
                            <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-500 text-slate-950 shadow">
                              Draft - Not Live to Public
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="p-4 space-y-2.5">
                        <div className="flex items-center justify-between text-[11px] text-slate-400 dark:text-emerald-400 font-mono">
                          <span>{product.sku || 'SKU'}</span>
                          <span>{product.pack_size || `1 ${product.unit}`}</span>
                        </div>

                        <div>
                          <h3 className="font-serif font-bold text-base text-slate-900 dark:text-white line-clamp-1">{product.name || 'Product English Name'}</h3>
                          {product.tamil_name && <p className="text-xs text-emerald-800 dark:text-emerald-300 font-medium line-clamp-1">{product.tamil_name}</p>}
                        </div>

                        {product.labels && product.labels.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {product.labels.slice(0, 3).map((lbl) => (
                              <span key={lbl} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-50 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-700">
                                <span>{lbl}</span>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setProduct((p) => ({ ...p, labels: (p.labels || []).filter((l) => l !== lbl) }));
                                    toast.success(`Removed "${lbl}" badge`);
                                  }}
                                  className="hover:text-rose-600 cursor-pointer"
                                >
                                  ×
                                </button>
                              </span>
                            ))}
                          </div>
                        )}

                        <div className="pt-2 flex items-baseline justify-between">
                          <div className="flex items-baseline gap-2">
                            <span className="font-mono text-lg font-black text-emerald-900 dark:text-emerald-100">{formatPrice(effectivePrice)}</span>
                            {product.mrp > effectivePrice && (
                              <span className="font-mono text-xs text-slate-400 line-through">{formatPrice(product.mrp)}</span>
                            )}
                          </div>
                          <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                            {product.stock_status === 'OUT_OF_STOCK' || product.current_stock <= 0 ? 'Out of Stock' : 'In Stock'}
                          </span>
                        </div>

                        <button
                          type="button"
                          disabled={product.stock_status === 'OUT_OF_STOCK' || product.current_stock <= 0}
                          className="w-full py-2 rounded-xl bg-gradient-to-r from-emerald-700 to-emerald-800 text-white text-xs font-bold shadow-md hover:from-emerald-800 hover:to-emerald-900 transition flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
                        >
                          <ShoppingBag className="w-3.5 h-3.5" />
                          <span>{product.stock_status === 'OUT_OF_STOCK' || product.current_stock <= 0 ? 'Out of Stock' : 'Add to WhatsApp Order List'}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* ================= ORIGINAL ACTUAL WEBSITE DETAIL PAGE SIMULATOR ================= */
                  <div className={cn(
                    'transition-all duration-300',
                    simulatorDevice === 'mobile' 
                      ? 'max-w-md mx-auto p-4 sm:p-5 bg-white dark:bg-emerald-950 rounded-[2.5rem] border-8 border-slate-800 shadow-2xl relative overflow-hidden' 
                      : 'w-full bg-white dark:bg-emerald-950 rounded-3xl border border-emerald-100 dark:border-emerald-800 p-6 sm:p-8 shadow-xl relative'
                  )}>
                    
                    {/* Device Header Bar if in mobile simulator frame */}
                    {simulatorDevice === 'mobile' && (
                      <div className="w-32 h-4 bg-slate-800 rounded-full mx-auto mb-4" />
                    )}

                    <div className="space-y-6">

                      {/* Top Navigation & Breadcrumbs (Click to edit Section 1) */}
                      <div 
                        className="group/sim relative p-3 rounded-2xl border-2 border-emerald-100/80 dark:border-emerald-800/60 bg-emerald-50/30 dark:bg-emerald-950/40 hover:border-amber-400 transition-all"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-semibold text-gray-500 dark:text-emerald-300">
                          <div className="flex items-center space-x-1.5 truncate">
                            <span className="hover:text-emerald-600">Home</span>
                            <span>/</span>
                            <span className="hover:text-emerald-600">Shop Catalog</span>
                            {selectedCategory && (
                              <>
                                <span>/</span>
                                <span className="hover:text-emerald-600 truncate">{selectedCategory.name}</span>
                              </>
                            )}
                            <span>/</span>
                            <span className="text-emerald-800 dark:text-amber-400 font-bold truncate max-w-[160px]">{product.name || 'Product Title'}</span>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => jumpToSection('basic')}
                              className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-[10px] px-2.5 py-1 rounded-lg shadow flex items-center gap-1 cursor-pointer transition"
                            >
                              <Edit3 className="w-3 h-3" /> Edit Basic Info
                            </button>
                            <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-300 font-bold bg-emerald-50 dark:bg-emerald-950 px-2 py-0.5 rounded-lg border border-emerald-200 dark:border-emerald-800 text-[11px]">
                              <ArrowLeft className="w-3 h-3" /> Back
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Main Product Showcase Grid (Left: Photo Carousel, Right: Product Details) */}
                      <div className={cn(
                        'grid items-start gap-6 sm:gap-10',
                        simulatorDevice === 'mobile' ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-2'
                      )}>
                        
                        {/* Left Column: Multi-Image Carousel */}
                        <div className="group/sim relative p-2 rounded-3xl border-2 border-emerald-100/80 dark:border-emerald-800/60 hover:border-amber-400 transition-all space-y-3">
                          <div className="relative aspect-square rounded-3xl overflow-hidden shadow-xl border border-emerald-100 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950">
                            <img
                              src={simulatorImages[simImgIndex] || simulatorImages[0]}
                              alt={product.name}
                              className="w-full h-full object-cover transition-all duration-300"
                            />

                            {/* Carousel Prev/Next Controls */}
                            {simulatorImages.length > 1 && (
                              <>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSimImgIndex((prev) => (prev - 1 + simulatorImages.length) % simulatorImages.length);
                                  }}
                                  className="absolute left-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/80 dark:bg-emerald-900/80 backdrop-blur-md text-emerald-900 dark:text-white shadow hover:scale-110 transition cursor-pointer"
                                  title="Previous Angle"
                                >
                                  <ChevronLeft className="w-4 h-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSimImgIndex((prev) => (prev + 1) % simulatorImages.length);
                                  }}
                                  className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/80 dark:bg-emerald-900/80 backdrop-blur-md text-emerald-900 dark:text-white shadow hover:scale-110 transition cursor-pointer"
                                  title="Next Angle"
                                >
                                  <ChevronRight className="w-4 h-4" />
                                </button>
                              </>
                            )}

                            {/* Organic Badge Overlay */}
                            {product.is_organic && (
                              <span 
                                className="absolute top-3 left-3 bg-emerald-700/95 backdrop-blur-sm text-white text-[11px] font-extrabold px-3 py-1 rounded-full flex items-center gap-1.5 shadow-md border border-emerald-500/40"
                              >
                                <Leaf className="w-3.5 h-3.5 text-emerald-300" /> 100% Traditional Organic
                                <button
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); removePreviewAttribute('organic'); }}
                                  className="ml-1 hover:text-rose-300 font-bold cursor-pointer"
                                  title="Remove Organic badge"
                                >
                                  ✕
                                </button>
                              </span>
                            )}

                            {/* Stock Indicator Pill */}
                            <div className="absolute bottom-3 left-3">
                              {product.stock_status === 'OUT_OF_STOCK' || product.current_stock <= 0 ? (
                                <span className="bg-rose-600/95 backdrop-blur-sm text-white text-[11px] font-bold px-3 py-1 rounded-full shadow-md flex items-center gap-1 border border-rose-400">
                                  <AlertTriangle className="w-3.5 h-3.5" /> Out of Stock
                                </span>
                              ) : product.current_stock < (product.reorder_level || 10) ? (
                                <span className="bg-amber-500/95 backdrop-blur-sm text-emerald-950 font-black text-[11px] px-3 py-1 rounded-full shadow-md flex items-center gap-1 border border-amber-300 animate-pulse">
                                  ⚡ Only {product.current_stock} left in stock!
                                </span>
                              ) : (
                                <span className="bg-emerald-600/95 backdrop-blur-sm text-white text-[11px] font-bold px-3 py-1 rounded-full shadow-md flex items-center gap-1 border border-emerald-400">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-200" /> In Stock
                                </span>
                              )}
                            </div>

                            {/* Image Counter */}
                            {simulatorImages.length > 1 && (
                              <div className="absolute bottom-3 right-3 bg-black/60 backdrop-blur-xs text-white text-[10px] font-mono font-bold px-2 py-0.5 rounded">
                                {simImgIndex + 1} / {simulatorImages.length}
                              </div>
                            )}

                            {/* Section Edit Pill Overlay */}
                            <button
                              type="button"
                              onClick={() => jumpToSection('media')}
                              className="absolute top-3 right-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-[10px] px-2.5 py-1 rounded-lg shadow-lg flex items-center gap-1 border border-amber-300 cursor-pointer transition"
                            >
                              <Edit3 className="w-3 h-3" /> Edit Photos ({simulatorImages.length})
                            </button>
                          </div>

                          {/* Thumbnail Strip (if multiple images) */}
                          {simulatorImages.length > 1 && (
                            <div className="flex items-center gap-2 overflow-x-auto pb-1">
                              {simulatorImages.map((imgUrl, i) => (
                                <button
                                  key={i}
                                  type="button"
                                  onClick={() => setSimImgIndex(i)}
                                  className={cn(
                                    'w-14 h-14 rounded-xl overflow-hidden border-2 shrink-0 transition cursor-pointer',
                                    simImgIndex === i ? 'border-emerald-600 dark:border-amber-400 scale-105 shadow-sm ring-2 ring-emerald-400/40' : 'border-slate-200 dark:border-emerald-800 opacity-70 hover:opacity-100'
                                  )}
                                >
                                  <img src={imgUrl} alt={`thumb ${i}`} className="w-full h-full object-cover" />
                                </button>
                              ))}
                            </div>
                          )}

                          {/* Sourcing Guarantee Badges */}
                          <div className="grid grid-cols-3 gap-2 pt-1 text-center">
                            <div className="bg-emerald-50/80 dark:bg-emerald-950/60 p-2.5 rounded-2xl border border-emerald-100 dark:border-emerald-800">
                              <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-amber-400 mx-auto mb-1" />
                              <div className="text-[10px] font-bold text-gray-800 dark:text-emerald-100">Zero Chemical</div>
                              <div className="text-[9px] text-gray-500 dark:text-emerald-300">Unpolished & Pure</div>
                            </div>
                            <div className="bg-emerald-50/80 dark:bg-emerald-950/60 p-2.5 rounded-2xl border border-emerald-100 dark:border-emerald-800">
                              <Award className="w-4 h-4 text-emerald-600 dark:text-amber-400 mx-auto mb-1" />
                              <div className="text-[10px] font-bold text-gray-800 dark:text-emerald-100">Heritage Produce</div>
                              <div className="text-[9px] text-gray-500 dark:text-emerald-300">Native Quality Variety</div>
                            </div>
                            <div className="bg-emerald-50/80 dark:bg-emerald-950/60 p-2.5 rounded-2xl border border-emerald-100 dark:border-emerald-800">
                              <Truck className="w-4 h-4 text-emerald-600 dark:text-amber-400 mx-auto mb-1" />
                              <div className="text-[10px] font-bold text-gray-800 dark:text-emerald-100">Store Direct</div>
                              <div className="text-[9px] text-gray-500 dark:text-emerald-300">Fresh Batch Harvest</div>
                            </div>
                          </div>
                        </div>

                        {/* Right Column: Pricing, Badges, Narratives & Order CTAs */}
                        <div className="space-y-5">
                          
                          {/* Header Identity */}
                          <div 
                            className="group/sim relative p-3 rounded-2xl border-2 border-emerald-100/80 dark:border-emerald-800/60 bg-emerald-50/30 dark:bg-emerald-950/40 hover:border-amber-400 transition-all"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-bold text-emerald-700 dark:text-amber-400 uppercase tracking-wider mb-1.5">
                              <div className="flex items-center gap-2">
                                {selectedCategory && (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-100 dark:bg-emerald-900 text-emerald-950 dark:text-emerald-100 font-extrabold normal-case border border-emerald-200 dark:border-emerald-800">
                                    <span>{selectedCategory.icon || '🌾'}</span>
                                    <span>{selectedCategory.name}</span>
                                  </span>
                                )}
                                <span className="font-mono bg-gray-100 dark:bg-emerald-950 px-2 py-0.5 rounded text-gray-600 dark:text-emerald-300">
                                  SKU: {product.sku || 'LIF-XXXX'}
                                </span>
                              </div>
                              {product.tamil_name && (
                                <span className="text-sm sm:text-base font-bold text-emerald-800 dark:text-emerald-300 normal-case">
                                  {product.tamil_name}
                                </span>
                              )}
                            </div>

                            <div className="flex items-start justify-between gap-3">
                              <h1 className="text-2xl sm:text-3xl font-serif font-bold text-gray-900 dark:text-emerald-100 leading-tight">
                                {product.name || 'Product English Name'}
                              </h1>
                              <button
                                type="button"
                                onClick={() => jumpToSection('basic')}
                                className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-[10px] px-2.5 py-1 rounded-lg shadow flex items-center gap-1 cursor-pointer transition shrink-0"
                              >
                                <Edit3 className="w-3 h-3" /> Edit
                              </button>
                            </div>
                          </div>

                          {/* Short Description Teaser */}
                          {product.short_description ? (
                            <div 
                              className="group/sim relative p-3.5 rounded-2xl border-2 border-emerald-100/80 dark:border-emerald-800/60 bg-white dark:bg-emerald-950/60 hover:border-amber-400 transition-all"
                            >
                              <div className="flex items-center justify-between mb-1.5">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-amber-400 flex items-center gap-1">
                                  <span>💬 Short Teaser Quote</span>
                                </span>
                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => jumpToSection('story')}
                                    className="px-2 py-0.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-[10px] shadow flex items-center gap-0.5 cursor-pointer"
                                  >
                                    <Edit3 className="w-2.5 h-2.5" /> Edit
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => removePreviewAttribute('teaser')}
                                    className="px-2 py-0.5 rounded-lg bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 hover:bg-rose-200 font-bold text-[10px] cursor-pointer"
                                    title="Remove short teaser"
                                  >
                                    <X className="w-2.5 h-2.5" /> Remove
                                  </button>
                                </div>
                              </div>
                              <p className="text-xs sm:text-sm text-gray-600 dark:text-emerald-200/90 italic leading-relaxed">
                                "{product.short_description}"
                              </p>
                            </div>
                          ) : (
                            <div className="p-3 border-2 border-dashed border-amber-300 dark:border-amber-700/60 rounded-2xl bg-amber-50/40 dark:bg-amber-950/30 flex items-center justify-between gap-3">
                              <div className="text-xs text-amber-900 dark:text-amber-200 font-medium">
                                <strong className="block font-bold">💬 Short Description Teaser</strong>
                                <span>Not displayed on storefront</span>
                              </div>
                              <button
                                type="button"
                                onClick={() => addPreviewAttribute('teaser')}
                                className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow transition cursor-pointer flex items-center gap-1 shrink-0"
                              >
                                <Plus className="w-3.5 h-3.5" /> Add Teaser
                              </button>
                            </div>
                          )}

                          {/* Grouped Product Badges & Deal Tags */}
                          <div 
                            className="p-3 rounded-2xl border-2 border-emerald-100/80 dark:border-emerald-800/60 bg-white dark:bg-emerald-950/60 space-y-2 hover:border-amber-400 transition-all"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-amber-400">
                                Badges &amp; Promotional Tags:
                              </span>
                              <button
                                type="button"
                                onClick={() => jumpToSection('badges')}
                                className="px-2 py-0.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-[10px] shadow flex items-center gap-0.5 cursor-pointer"
                              >
                                <Edit3 className="w-2.5 h-2.5" /> Edit Badges
                              </button>
                            </div>

                            <div className="flex flex-wrap items-center gap-2">
                              {/* Festival Offer Tag */}
                              {product.festival_offer ? (
                                <span 
                                  className="bg-gradient-to-r from-amber-500 via-rose-500 to-amber-600 text-white text-xs font-black px-3 py-1 rounded-full flex items-center gap-1.5 shadow-md border border-amber-300 uppercase tracking-wider animate-pulse hover:animate-none"
                                >
                                  <Sparkles className="w-3 h-3 text-amber-200" />
                                  <span>{product.festival_offer}</span>
                                  <button
                                    type="button"
                                    onClick={() => jumpToSection('festival')}
                                    className="ml-1 px-1 py-0.2 rounded bg-white/20 hover:bg-white/40 text-[9px] font-bold cursor-pointer"
                                    title="Edit festival offer"
                                  >
                                    ✏️
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => removePreviewAttribute('festival')}
                                    className="px-1 py-0.2 rounded bg-black/20 hover:bg-rose-600 text-[9px] font-bold cursor-pointer"
                                    title="Remove festival offer"
                                  >
                                    ✕
                                  </button>
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => addPreviewAttribute('festival')}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-200 border border-dashed border-amber-400 hover:bg-amber-100 transition cursor-pointer"
                                >
                                  <Sparkles className="w-3 h-3 text-amber-500" />
                                  <span>+ Add Festival Deal</span>
                                </button>
                              )}

                              {/* Organic Badge */}
                              {product.is_organic ? (
                                <span className="bg-emerald-700 text-white text-xs font-black px-3 py-1 rounded-full flex items-center gap-1.5 shadow-xs">
                                  <Leaf className="w-3 h-3 text-emerald-300" />
                                  <span>100% Certified Organic</span>
                                  <button
                                    type="button"
                                    onClick={() => removePreviewAttribute('organic')}
                                    className="ml-1 hover:text-rose-300 font-bold cursor-pointer"
                                    title="Remove Organic badge"
                                  >
                                    ✕
                                  </button>
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => addPreviewAttribute('organic')}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-200 border border-dashed border-emerald-400 hover:bg-emerald-100 transition cursor-pointer"
                                >
                                  <Leaf className="w-3 h-3 text-emerald-600" />
                                  <span>+ Add Organic</span>
                                </button>
                              )}

                              {/* Featured Badge */}
                              {product.is_featured ? (
                                <span className="bg-amber-400 text-emerald-950 text-xs font-black px-3 py-1 rounded-full flex items-center gap-1.5 shadow-xs">
                                  <Star className="w-3 h-3 text-emerald-950" />
                                  <span>Featured Produce</span>
                                  <button
                                    type="button"
                                    onClick={() => removePreviewAttribute('featured')}
                                    className="ml-1 hover:text-rose-700 font-bold cursor-pointer"
                                    title="Remove Featured badge"
                                  >
                                    ✕
                                  </button>
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => addPreviewAttribute('featured')}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-200 border border-dashed border-amber-400 hover:bg-amber-100 transition cursor-pointer"
                                >
                                  <Star className="w-3 h-3 text-amber-500" />
                                  <span>+ Add Featured</span>
                                </button>
                              )}

                              {/* Custom Labels with Individual Remove */}
                              {product.labels && product.labels.map((lbl, idx) => (
                                <span
                                  key={idx}
                                  className="bg-teal-100 dark:bg-teal-900/60 text-teal-900 dark:text-teal-200 border border-teal-300 dark:border-teal-700 text-xs font-black px-3 py-1 rounded-full flex items-center gap-1.5 shadow-2xs"
                                >
                                  <Tag className="w-3 h-3 text-teal-600 dark:text-teal-300" />
                                  <span>{lbl}</span>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setProduct((p) => ({ ...p, labels: (p.labels || []).filter((l) => l !== lbl) }));
                                      toast.success(`Removed "${lbl}" badge`);
                                    }}
                                    className="hover:text-rose-600 font-bold cursor-pointer text-xs"
                                    title={`Remove "${lbl}" badge`}
                                  >
                                    ✕
                                  </button>
                                </span>
                              ))}

                              {/* Add Label Button */}
                              <button
                                type="button"
                                onClick={() => addPreviewAttribute('label')}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 dark:bg-emerald-900 text-slate-700 dark:text-emerald-200 border border-dashed border-slate-300 dark:border-emerald-700 hover:bg-slate-200 transition cursor-pointer"
                              >
                                <Plus className="w-3 h-3" />
                                <span>Add Label</span>
                              </button>
                            </div>
                          </div>

                          {/* High-Contrast Large Pricing Display */}
                          <div 
                            className="group/sim relative p-4 bg-emerald-50/70 dark:bg-emerald-950/60 rounded-3xl border-2 border-emerald-200/80 dark:border-emerald-800 space-y-3 hover:border-amber-400 hover:ring-2 hover:ring-amber-300 transition-all"
                          >
                            <div className="flex items-center justify-between">
                              <div className="inline-flex items-center gap-2 font-bold text-xs sm:text-sm text-emerald-950 dark:text-emerald-100 bg-white dark:bg-emerald-900/80 px-3 py-1.5 rounded-xl border border-emerald-200 dark:border-emerald-700 shadow-xs">
                                <Package className="w-4 h-4 text-emerald-600 dark:text-amber-400" />
                                <span>Pack Size: <strong className="font-black text-sm sm:text-base text-emerald-800 dark:text-amber-300">{product.pack_size || `1 ${product.unit}`}</strong> ({product.unit})</span>
                              </div>

                              <div className="flex items-center gap-2">
                                {buyerSavingsPercent > 0 && (
                                  <span className="bg-amber-400 text-emerald-950 font-black text-xs px-2.5 py-1 rounded-lg shadow-xs">
                                    Save {buyerSavingsPercent}%
                                  </span>
                                )}
                                <button
                                  type="button"
                                  onClick={() => jumpToSection('pricing')}
                                  className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-[10px] shadow flex items-center gap-1 cursor-pointer transition"
                                >
                                  <Edit3 className="w-3 h-3" /> Edit Pricing
                                </button>
                              </div>
                            </div>

                            <div className="pt-1 flex items-baseline gap-3 flex-wrap">
                              <div className="flex items-baseline gap-2">
                                <span className="text-xs font-extrabold text-gray-500 dark:text-emerald-300 uppercase tracking-wider">
                                  {product.offer_price && product.offer_price > 0 && product.offer_price < product.selling_price ? 'Offer Price:' : 'Our Price:'}
                                </span>
                                <span className="text-2xl sm:text-3xl font-black text-emerald-800 dark:text-amber-400">
                                  {formatPrice(effectivePrice)}
                                </span>
                              </div>

                              {product.offer_price && product.offer_price > 0 && product.offer_price < product.selling_price ? (
                                <div className="inline-flex items-center gap-1.5 bg-rose-50 dark:bg-rose-950/60 px-2 py-0.5 rounded-lg border border-rose-200 dark:border-rose-800">
                                  <span className="text-sm text-gray-400 line-through font-mono">
                                    Regular: {formatPrice(product.selling_price)}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => removePreviewAttribute('offer')}
                                    className="text-rose-600 dark:text-rose-400 hover:text-rose-800 text-[10px] font-bold px-1.5 py-0.2 rounded bg-rose-100 dark:bg-rose-900 cursor-pointer"
                                    title="Remove Offer Discount"
                                  >
                                    ✕ Remove Offer
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => addPreviewAttribute('offer')}
                                  className="text-[11px] font-bold text-amber-700 dark:text-amber-300 bg-amber-100/80 dark:bg-amber-950/60 px-2.5 py-1 rounded-lg border border-dashed border-amber-400 hover:bg-amber-200 cursor-pointer"
                                >
                                  + Add Special Offer Deal
                                </button>
                              )}

                              {product.mrp && product.mrp > effectivePrice && (
                                <span className="text-xs sm:text-sm text-rose-500 line-through font-mono font-bold">
                                  MRP: {formatPrice(product.mrp)}
                                </span>
                              )}
                            </div>

                            <div className="text-[10.5px] text-gray-500 dark:text-emerald-300/80">
                              Inclusive of all taxes ({product.tax_percent || 0}% GST) • Guaranteed chemical-free fresh store inventory
                            </div>
                          </div>

                          {/* Sourcing & Stock Status Info Panel */}
                          <div 
                            className="group/sim relative bg-white dark:bg-emerald-900/30 p-4 rounded-2xl border-2 border-emerald-100 dark:border-emerald-800 space-y-2 text-xs sm:text-sm hover:border-amber-400 transition-all"
                          >
                            <div className="flex justify-between items-center">
                              <span className="text-gray-600 dark:text-emerald-300 font-medium">Availability:</span>
                              <div className="flex items-center gap-2">
                                {product.stock_status === 'OUT_OF_STOCK' || product.current_stock <= 0 ? (
                                  <span className="font-bold text-rose-600 flex items-center gap-1">
                                    <AlertTriangle className="w-3.5 h-3.5" /> Out of Stock
                                  </span>
                                ) : product.current_stock < (product.reorder_level || 10) ? (
                                  <span className="font-black text-amber-600 dark:text-amber-400 flex items-center gap-1 animate-pulse">
                                    ⚡ Only {product.current_stock} left in stock!
                                  </span>
                                ) : (
                                  <span className="font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-1">
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> In Stock ({product.current_stock} {product.unit} Available)
                                  </span>
                                )}
                                <button
                                  type="button"
                                  onClick={() => jumpToSection('stock')}
                                  className="px-2 py-0.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-[10px] shadow flex items-center gap-0.5 cursor-pointer"
                                >
                                  <Edit3 className="w-2.5 h-2.5" /> Edit Stock
                                </button>
                              </div>
                            </div>

                            <div className="flex justify-between items-center pt-1 border-t border-emerald-100 dark:border-emerald-800/60">
                              <span className="text-gray-600 dark:text-emerald-300 font-medium">Organic Certification:</span>
                              {product.organic_certification ? (
                                <div className="flex items-center gap-1.5">
                                  <span className="font-bold text-emerald-800 dark:text-amber-300">{product.organic_certification}</span>
                                  <button
                                    type="button"
                                    onClick={() => removePreviewAttribute('certification')}
                                    className="text-rose-600 hover:text-rose-800 text-[10px] font-bold cursor-pointer"
                                    title="Remove certification"
                                  >
                                    ✕
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => jumpToSection('storage_specs')}
                                  className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300 hover:underline cursor-pointer"
                                >
                                  + Add Certification
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Ordering Buttons Simulation */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                            <button
                              type="button"
                              className="w-full flex items-center justify-center space-x-2 bg-emerald-700 hover:bg-emerald-800 text-white font-black py-3 px-4 rounded-xl shadow-md text-xs transition cursor-pointer"
                            >
                              <ShoppingBag className="w-4 h-4 text-amber-300" />
                              <span>Add To WhatsApp Order List</span>
                            </button>
                            <button
                              type="button"
                              className="w-full flex items-center justify-center space-x-2 bg-emerald-100 dark:bg-emerald-900 text-emerald-950 dark:text-amber-300 font-bold py-3 px-4 rounded-xl border border-emerald-300 dark:border-emerald-700 text-xs cursor-pointer"
                            >
                              <MessageSquare className="w-4 h-4 text-emerald-600 dark:text-amber-400" />
                              <span>Direct WhatsApp Chat</span>
                            </button>
                          </div>

                          {/* Traditional Benefits & Narrative */}
                          {product.description ? (
                            <div 
                              className="group/sim relative space-y-2 pt-2 border-t border-emerald-100 dark:border-emerald-800/80 p-3.5 rounded-2xl border-2 border-transparent hover:border-amber-400 bg-white dark:bg-emerald-950/60 transition-all"
                            >
                              <div className="flex items-center justify-between">
                                <h3 className="font-serif font-bold text-sm text-gray-900 dark:text-emerald-100 uppercase tracking-wider flex items-center gap-2">
                                  <Leaf className="w-4 h-4 text-emerald-600 dark:text-amber-400" />
                                  <span>Traditional Benefits &amp; Heritage</span>
                                </h3>
                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => jumpToSection('story')}
                                    className="px-2 py-0.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-[10px] shadow flex items-center gap-0.5 cursor-pointer"
                                  >
                                    <Edit3 className="w-2.5 h-2.5" /> Edit
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => removePreviewAttribute('description')}
                                    className="px-2 py-0.5 rounded-lg bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 hover:bg-rose-200 font-bold text-[10px] cursor-pointer"
                                    title="Remove benefits narrative"
                                  >
                                    <X className="w-2.5 h-2.5" /> Remove
                                  </button>
                                </div>
                              </div>
                              <div className="text-xs sm:text-sm text-gray-700 dark:text-emerald-200/90 leading-relaxed bg-emerald-50/50 dark:bg-emerald-950/40 p-3.5 rounded-2xl border border-emerald-100 dark:border-emerald-800 whitespace-pre-line">
                                {product.description}
                              </div>
                            </div>
                          ) : (
                            <div className="p-3 border-2 border-dashed border-emerald-300 dark:border-emerald-700/60 rounded-2xl bg-emerald-50/40 dark:bg-emerald-950/30 flex items-center justify-between gap-3">
                              <div className="text-xs text-emerald-900 dark:text-emerald-200 font-medium">
                                <strong className="block font-bold">🌾 Traditional Benefits &amp; Heritage Narrative</strong>
                                <span>Not displayed on storefront</span>
                              </div>
                              <button
                                type="button"
                                onClick={() => addPreviewAttribute('description')}
                                className="px-3 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-black text-xs shadow transition cursor-pointer flex items-center gap-1 shrink-0"
                              >
                                <Plus className="w-3.5 h-3.5" /> Add Benefits Story
                              </button>
                            </div>
                          )}

                          {/* Farm Sourcing & Soil Origin */}
                          {product.source_description ? (
                            <div 
                              className="group/sim relative space-y-2 p-3.5 bg-emerald-50/60 dark:bg-emerald-950/60 rounded-2xl border-2 border-transparent hover:border-amber-400 transition-all text-xs sm:text-sm"
                            >
                              <div className="flex items-center justify-between">
                                <div className="font-bold flex items-center gap-1.5 text-emerald-900 dark:text-amber-300">
                                  <Leaf className="w-4 h-4 text-emerald-600 dark:text-amber-400" />
                                  <span>Farm Sourcing &amp; Soil Heritage:</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => jumpToSection('story')}
                                    className="px-2 py-0.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-[10px] shadow flex items-center gap-0.5 cursor-pointer"
                                  >
                                    <Edit3 className="w-2.5 h-2.5" /> Edit
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => removePreviewAttribute('source')}
                                    className="px-2 py-0.5 rounded-lg bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 hover:bg-rose-200 font-bold text-[10px] cursor-pointer"
                                  >
                                    <X className="w-2.5 h-2.5" /> Remove
                                  </button>
                                </div>
                              </div>
                              <p className="text-gray-700 dark:text-emerald-200/90 leading-relaxed">
                                {product.source_description}
                              </p>
                            </div>
                          ) : (
                            <div className="p-3 border-2 border-dashed border-emerald-300 dark:border-emerald-700/60 rounded-2xl bg-emerald-50/40 dark:bg-emerald-950/30 flex items-center justify-between gap-3">
                              <div className="text-xs text-emerald-900 dark:text-emerald-200 font-medium">
                                <strong className="block font-bold">🏡 Farm Sourcing &amp; Soil Origin</strong>
                                <span>Not displayed on storefront</span>
                              </div>
                              <button
                                type="button"
                                onClick={() => addPreviewAttribute('source')}
                                className="px-3 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-black text-xs shadow transition cursor-pointer flex items-center gap-1 shrink-0"
                              >
                                <Plus className="w-3.5 h-3.5" /> Add Farm Sourcing
                              </button>
                            </div>
                          )}

                          {/* Itemized Product Specifications Table */}
                          <div 
                            className="group/sim relative space-y-2.5 pt-1 p-3 rounded-2xl border-2 border-emerald-100/80 dark:border-emerald-800/60 bg-white dark:bg-emerald-950/60 hover:border-amber-400 transition-all"
                          >
                            <div className="flex items-center justify-between">
                              <h3 className="font-serif font-bold text-xs uppercase tracking-wider flex items-center gap-2 text-gray-900 dark:text-emerald-100">
                                <FileText className="w-3.5 h-3.5 text-emerald-600 dark:text-amber-400" />
                                <span>Product Specifications &amp; Details</span>
                              </h3>
                              <button
                                type="button"
                                onClick={() => jumpToSection('storage_specs')}
                                className="px-2 py-0.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-[10px] shadow flex items-center gap-0.5 cursor-pointer"
                              >
                                <Edit3 className="w-2.5 h-2.5" /> Edit Specs
                              </button>
                            </div>
                            <div className="bg-emerald-50/50 dark:bg-emerald-950/60 rounded-2xl border border-emerald-100 dark:border-emerald-800 overflow-hidden text-xs divide-y divide-emerald-100 dark:divide-emerald-800/60">
                              <div className="grid grid-cols-2 p-2.5">
                                <span className="font-bold text-gray-500 dark:text-emerald-300">SKU Code:</span>
                                <span className="font-semibold text-gray-900 dark:text-emerald-100">{product.sku}</span>
                              </div>
                              <div className="grid grid-cols-2 p-2.5">
                                <span className="font-bold text-gray-500 dark:text-emerald-300">Net Quantity:</span>
                                <span className="font-semibold text-gray-900 dark:text-emerald-100">{product.pack_size || `1 ${product.unit}`}</span>
                              </div>
                              <div className="grid grid-cols-2 p-2.5">
                                <span className="font-bold text-gray-500 dark:text-emerald-300">Category:</span>
                                <span className="font-semibold text-gray-900 dark:text-emerald-100">{selectedCategory?.name || 'Produce'}</span>
                              </div>
                              <div className="grid grid-cols-2 p-2.5">
                                <span className="font-bold text-gray-500 dark:text-emerald-300">Farming Method:</span>
                                <span className="font-semibold text-gray-900 dark:text-emerald-100">{product.is_organic ? '100% Certified Organic' : 'Traditional Natural Farming'}</span>
                              </div>
                              {product.organic_certification && (
                                <div className="grid grid-cols-2 p-2.5">
                                  <span className="font-bold text-gray-500 dark:text-emerald-300">Organic Certification:</span>
                                  <span className="font-semibold text-gray-900 dark:text-emerald-100">{product.organic_certification}</span>
                                </div>
                              )}
                              {product.tax_percent !== undefined && (
                                <div className="grid grid-cols-2 p-2.5">
                                  <span className="font-bold text-gray-500 dark:text-emerald-300">GST Tax Rate:</span>
                                  <span className="font-semibold text-gray-900 dark:text-emerald-100">{product.tax_percent > 0 ? `${product.tax_percent}% GST Included` : '0% (Exempt Traditional Produce)'}</span>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Storage Guidelines */}
                          {product.storage_info ? (
                            <div 
                              className="group/sim relative text-xs bg-amber-50 dark:bg-amber-950/60 p-3.5 rounded-2xl border-2 border-transparent hover:border-amber-400 transition-all text-amber-900 dark:text-amber-200 space-y-1.5"
                            >
                              <div className="flex items-center justify-between">
                                <div className="font-bold flex items-center gap-1.5">
                                  <HelpCircle className="w-3.5 h-3.5 text-amber-600" />
                                  <span>Storage &amp; Shelf Preservation Guidelines:</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => jumpToSection('storage_specs')}
                                    className="px-2 py-0.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-[10px] shadow flex items-center gap-0.5 cursor-pointer"
                                  >
                                    <Edit3 className="w-2.5 h-2.5" /> Edit
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => removePreviewAttribute('storage')}
                                    className="px-2 py-0.5 rounded-lg bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 hover:bg-rose-200 font-bold text-[10px] cursor-pointer"
                                  >
                                    <X className="w-2.5 h-2.5" /> Remove
                                  </button>
                                </div>
                              </div>
                              <p className="leading-relaxed">{product.storage_info}</p>
                            </div>
                          ) : (
                            <div className="p-3 border-2 border-dashed border-amber-300 dark:border-amber-700/60 rounded-2xl bg-amber-50/40 dark:bg-amber-950/30 flex items-center justify-between gap-3">
                              <div className="text-xs text-amber-900 dark:text-amber-200 font-medium">
                                <strong className="block font-bold">🛡️ Storage &amp; Shelf Preservation Guidelines</strong>
                                <span>Not displayed on storefront</span>
                              </div>
                              <button
                                type="button"
                                onClick={() => addPreviewAttribute('storage')}
                                className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow transition cursor-pointer flex items-center gap-1 shrink-0"
                              >
                                <Plus className="w-3.5 h-3.5" /> Add Storage Info
                              </button>
                            </div>
                          )}

                          {/* Culinary Notes */}
                          {product.notes ? (
                            <div 
                              className="group/sim relative text-xs bg-emerald-50/80 dark:bg-emerald-950/70 p-3.5 rounded-2xl border-2 border-transparent hover:border-amber-400 transition-all text-emerald-950 dark:text-emerald-200 space-y-1.5"
                            >
                              <div className="flex items-center justify-between">
                                <div className="font-bold flex items-center gap-1.5 text-emerald-900 dark:text-amber-300 text-xs">
                                  <Utensils className="w-3.5 h-3.5 text-emerald-600 dark:text-amber-400" />
                                  <span>Culinary &amp; Handling Notes:</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => jumpToSection('story')}
                                    className="px-2 py-0.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-[10px] shadow flex items-center gap-0.5 cursor-pointer"
                                  >
                                    <Edit3 className="w-2.5 h-2.5" /> Edit
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => removePreviewAttribute('notes')}
                                    className="px-2 py-0.5 rounded-lg bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 hover:bg-rose-200 font-bold text-[10px] cursor-pointer"
                                  >
                                    <X className="w-2.5 h-2.5" /> Remove
                                  </button>
                                </div>
                              </div>
                              <p className="text-gray-700 dark:text-emerald-200/90 leading-relaxed whitespace-pre-line">
                                {product.notes}
                              </p>
                            </div>
                          ) : (
                            <div className="p-3 border-2 border-dashed border-emerald-300 dark:border-emerald-700/60 rounded-2xl bg-emerald-50/40 dark:bg-emerald-950/30 flex items-center justify-between gap-3">
                              <div className="text-xs text-emerald-900 dark:text-emerald-200 font-medium">
                                <strong className="block font-bold">🍳 Culinary &amp; Handling Notes</strong>
                                <span>Not displayed on storefront</span>
                              </div>
                              <button
                                type="button"
                                onClick={() => addPreviewAttribute('notes')}
                                className="px-3 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-black text-xs shadow transition cursor-pointer flex items-center gap-1 shrink-0"
                              >
                                <Plus className="w-3.5 h-3.5" /> Add Culinary Notes
                              </button>
                            </div>
                          )}

                        </div>

                      </div>

                    </div>
                  </div>
                )}
              </div>
            )}
          </section>
        )}

        {/* Hidden Sections Quick Restore Banner */}
        {activeSections.length < AVAILABLE_SECTIONS.length && (
          <div className="p-5 rounded-3xl bg-emerald-50/70 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 flex flex-col sm:flex-row items-center justify-between gap-4 animate-fadeIn">
            <div className="flex items-center gap-2.5">
              <span className="text-xl">➕</span>
              <div>
                <span className="font-bold text-sm text-emerald-900 dark:text-emerald-100 block">
                  {AVAILABLE_SECTIONS.length - activeSections.length} Optional Sections Hidden
                </span>
                <span className="text-xs text-slate-500 dark:text-emerald-300">
                  Click any section below to add it back to this product form:
                </span>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {AVAILABLE_SECTIONS.filter(s => !activeSections.includes(s.id)).map(s => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => addSection(s.id)}
                  className="px-3.5 py-1.5 text-xs font-bold rounded-xl bg-white dark:bg-emerald-900 text-emerald-900 dark:text-emerald-100 border border-emerald-300 dark:border-emerald-700 hover:bg-emerald-100 dark:hover:bg-emerald-800 transition shadow-2xs flex items-center gap-1.5 cursor-pointer"
                >
                  <span>{s.iconName}</span>
                  <span>+ Add {s.title.replace(/^[0-9]+\.\s*/, '')}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* ================= 9. STICKY BOTTOM ACTION BAR ================= */}
      <footer className="fixed bottom-0 left-0 right-0 z-40 backdrop-blur-xl bg-white/95 dark:bg-emerald-950/95 border-t border-emerald-100 dark:border-emerald-850 shadow-2xl py-3.5 px-4 sm:px-8">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={promptCancel}
              className="px-5 py-2.5 rounded-2xl bg-slate-100 dark:bg-emerald-900/50 hover:bg-slate-200 dark:hover:bg-emerald-800 text-slate-700 dark:text-emerald-200 font-bold text-xs transition cursor-pointer"
            >
              Cancel &amp; Discard
            </button>
            <div className="hidden sm:block text-xs text-slate-500 dark:text-emerald-400 font-medium">
              <span>SKU: <strong className="font-mono text-slate-800 dark:text-emerald-200">{product.sku}</strong></span>
              <span className="mx-2">•</span>
              <span>Price: <strong className="font-mono text-emerald-800 dark:text-amber-300">{formatPrice(effectivePrice)}</strong></span>
              {product.festival_offer && (
                <>
                  <span className="mx-2">•</span>
                  <span className="text-amber-600 dark:text-amber-400 font-bold">{product.festival_offer}</span>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Primary: Full Page Review & Storefront Preview */}
            <button
              type="button"
              onClick={() => setShowFullPageReview(true)}
              className="px-5 sm:px-6 py-3 rounded-2xl bg-amber-500 hover:bg-amber-600 text-emerald-950 font-black text-xs sm:text-sm shadow-xl hover:shadow-2xl transition-all flex items-center gap-2 cursor-pointer group"
            >
              <Eye className="w-4 h-4 text-emerald-950 group-hover:scale-110 transition-transform" />
              <span>👁️ Review &amp; Full Storefront Preview</span>
            </button>

            {/* Direct Submit Button */}
            <button
              type="button"
              disabled={isSaving}
              onClick={handleSave}
              className="px-6 sm:px-8 py-3 rounded-2xl bg-gradient-to-r from-emerald-600 via-emerald-700 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-extrabold text-xs sm:text-sm shadow-xl hover:shadow-2xl transition-all flex items-center gap-2 group disabled:opacity-50"
            >
              <Save className="w-4 h-4 text-amber-300 group-hover:scale-110 transition-transform" />
              <span>{isNew ? '💾 Submit & Publish' : '💾 Submit Changes'}</span>
            </button>
          </div>
        </div>
      </footer>

      {/* ================= FULL PAGE STOREFRONT REVIEW & CONFIRMATION MODAL ================= */}
      {showFullPageReview && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-fadeIn">
          <div className="bg-white dark:bg-emerald-950 rounded-3xl max-w-5xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-emerald-200 dark:border-emerald-800 overflow-hidden">
            
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-emerald-100 dark:border-emerald-800/80 bg-slate-50 dark:bg-emerald-900/40 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
                  <Eye className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-serif font-bold text-base sm:text-lg text-emerald-950 dark:text-emerald-50">
                    Live Storefront Review &amp; Submission Pre-flight
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-emerald-300">
                    Verify how shoppers will experience this produce before pushing changes live
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowFullPageReview(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-emerald-900 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              
              {/* Storefront Visibility Status Alert */}
              <div className={cn(
                'p-4 rounded-2xl border flex flex-wrap items-center justify-between gap-3 text-xs',
                product.is_visible
                  ? 'bg-emerald-50 dark:bg-emerald-900/40 border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-100'
                  : 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200'
              )}>
                <div className="flex items-center gap-3">
                  <div className={cn('w-3 h-3 rounded-full animate-pulse', product.is_visible ? 'bg-emerald-500' : 'bg-amber-500')} />
                  <div>
                    <div className="font-black text-sm">
                      {product.is_visible ? '🟢 STOREFRONT STATUS: LIVE & PUBLIC' : '⚪ STOREFRONT STATUS: DRAFT / HIDDEN'}
                    </div>
                    <div className="text-[11px] opacity-80">
                      {product.is_visible 
                        ? 'This produce will be immediately discoverable on homepage, shop catalog, and category grids upon submitting.'
                        : 'This produce will be stored in catalog database but HIDDEN from public customers until toggled Live.'}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setProduct((prev) => ({ ...prev, is_visible: !prev.is_visible }))}
                  className="px-3.5 py-1.5 rounded-xl font-bold bg-white dark:bg-emerald-950 shadow-xs border border-current hover:opacity-90 transition text-xs"
                >
                  Switch to {product.is_visible ? 'Draft Mode' : 'Live Mode'}
                </button>
              </div>

              {/* Pre-flight Metrics & Quality Scorecard */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs text-center">
                <div className="p-3 bg-slate-50 dark:bg-emerald-900/30 rounded-2xl border border-slate-200 dark:border-emerald-800">
                  <div className="text-[10px] uppercase font-bold text-slate-400">Effective Price</div>
                  <div className="font-mono text-base font-black text-emerald-800 dark:text-amber-300 mt-0.5">
                    {formatPrice(effectivePrice)}
                  </div>
                  <div className="text-[10px] text-slate-500">
                    {product.mrp > effectivePrice ? `Save ${buyerSavingsPercent}% off MRP` : 'Regular Price'}
                  </div>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-emerald-900/30 rounded-2xl border border-slate-200 dark:border-emerald-800">
                  <div className="text-[10px] uppercase font-bold text-slate-400">Inventory Status</div>
                  <div className="font-mono text-base font-black text-emerald-800 dark:text-emerald-100 mt-0.5">
                    {product.current_stock} {product.unit}
                  </div>
                  <div className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                    {product.current_stock <= product.reorder_level ? '⚠️ Low Stock Alert' : '✓ Stock Healthy'}
                  </div>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-emerald-900/30 rounded-2xl border border-slate-200 dark:border-emerald-800">
                  <div className="text-[10px] uppercase font-bold text-slate-400">Festival Deal Flag</div>
                  <div className="text-xs font-black text-amber-700 dark:text-amber-300 mt-0.5 truncate">
                    {product.festival_offer || 'None Attached'}
                  </div>
                  <div className="text-[10px] text-slate-500">
                    {product.festival_offer ? 'Promoted Deal' : 'Standard SKU'}
                  </div>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-emerald-900/30 rounded-2xl border border-slate-200 dark:border-emerald-800">
                  <div className="text-[10px] uppercase font-bold text-slate-400">Gallery Media</div>
                  <div className="font-mono text-base font-black text-emerald-800 dark:text-emerald-100 mt-0.5">
                    {(product.images?.length || 1)} Images
                  </div>
                  <div className="text-[10px] font-bold text-teal-600 dark:text-teal-400">
                    {product.image_url ? '✓ Cover Set' : '⚠️ Default Cover'}
                  </div>
                </div>
              </div>

              {/* Pre-flight Storefront Simulation Tabs */}
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-emerald-800 pb-2">
                  <h4 className="font-bold text-xs uppercase tracking-wider text-slate-600 dark:text-emerald-300 flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Storefront Customer Experience Simulation</span>
                  </h4>
                  <div className="flex rounded-xl bg-slate-100 dark:bg-emerald-900/60 p-1 text-xs">
                    <button
                      type="button"
                      onClick={() => setPreviewMode('card')}
                      className={cn('px-3 py-1 rounded-lg font-bold transition', previewMode === 'card' ? 'bg-emerald-700 text-white shadow' : 'text-slate-600 dark:text-emerald-300')}
                    >
                      Store Card
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewMode('page')}
                      className={cn('px-3 py-1 rounded-lg font-bold transition', previewMode === 'page' ? 'bg-emerald-700 text-white shadow' : 'text-slate-600 dark:text-emerald-300')}
                    >
                      Detail Page
                    </button>
                  </div>
                </div>

                {/* Render the selected simulation */}
                <div className="flex justify-center p-4 bg-slate-50 dark:bg-emerald-950/60 rounded-3xl border border-slate-200 dark:border-emerald-800">
                  {previewMode === 'card' ? (
                    <div className="w-full max-w-xs bg-white dark:bg-emerald-950 rounded-3xl border border-emerald-100 dark:border-emerald-800 shadow-xl overflow-hidden group">
                      <div className="relative aspect-square overflow-hidden bg-slate-100 dark:bg-emerald-900">
                        <img
                          src={previewActiveImg || product.image_url || 'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&q=80&w=800'}
                          alt={product.name}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute top-2.5 left-2.5 flex flex-col gap-1 items-start">
                          {product.festival_offer && (
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-gradient-to-r from-amber-500 via-rose-500 to-amber-600 text-white shadow-sm flex items-center gap-1 uppercase tracking-wider animate-pulse">
                              <Sparkles className="w-2.5 h-2.5 text-amber-200" />
                              <span>{product.festival_offer}</span>
                            </span>
                          )}
                          {product.is_organic && (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-600 text-white shadow-sm flex items-center gap-1">
                              <Leaf className="w-3 h-3" /> Organic
                            </span>
                          )}
                          {product.is_featured && (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500 text-white shadow-sm flex items-center gap-1">
                              <Star className="w-3 h-3" /> Featured
                            </span>
                          )}
                        </div>
                        {buyerSavingsPercent > 0 && (
                          <div className="absolute top-2.5 right-2.5">
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-rose-600 text-white shadow-sm">
                              {buyerSavingsPercent}% OFF
                            </span>
                          </div>
                        )}
                        {!product.is_visible && (
                          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-[2px] flex items-center justify-center p-3 text-center">
                            <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-500 text-slate-950 shadow">
                              Draft - Not Live to Public
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="p-4 space-y-2.5">
                        <div className="flex items-center justify-between text-[11px] text-slate-400 dark:text-emerald-400 font-mono">
                          <span>{product.sku || 'SKU'}</span>
                          <span>{product.pack_size || '1 kg'}</span>
                        </div>

                        <div>
                          <h3 className="font-serif font-bold text-base text-slate-900 dark:text-white line-clamp-1">{product.name || 'Produce Title'}</h3>
                          {product.tamil_name && <p className="text-xs text-emerald-800 dark:text-emerald-300 font-medium line-clamp-1">{product.tamil_name}</p>}
                        </div>

                        {product.labels && product.labels.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {product.labels.slice(0, 3).map((lbl) => (
                              <span key={lbl} className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-50 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-700">
                                {lbl}
                              </span>
                            ))}
                          </div>
                        )}

                        <div className="pt-2 flex items-baseline justify-between">
                          <div className="flex items-baseline gap-2">
                            <span className="font-mono text-lg font-black text-emerald-900 dark:text-emerald-100">{formatPrice(effectivePrice)}</span>
                            {product.mrp > effectivePrice && (
                              <span className="font-mono text-xs text-slate-400 line-through">{formatPrice(product.mrp)}</span>
                            )}
                          </div>
                          <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                            {product.stock_status === 'OUT_OF_STOCK' ? 'Sold Out' : 'In Stock'}
                          </span>
                        </div>

                        <div className="w-full py-2 rounded-xl bg-gradient-to-r from-emerald-700 to-emerald-800 text-white text-xs font-bold shadow-md flex items-center justify-center gap-1.5">
                          <ShoppingBag className="w-3.5 h-3.5" />
                          <span>Add to Cart</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="w-full max-w-2xl bg-white dark:bg-emerald-950 rounded-2xl border border-emerald-100 dark:border-emerald-800 p-5 space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="relative aspect-square rounded-xl overflow-hidden bg-slate-100 dark:bg-emerald-900">
                          <img
                            src={previewActiveImg || product.image_url || 'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&q=80&w=800'}
                            alt={product.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="space-y-3 text-xs">
                          <div className="flex flex-wrap items-center gap-1.5">
                            {product.festival_offer && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-gradient-to-r from-amber-500 to-rose-500 text-white shadow-sm flex items-center gap-1">
                                <Sparkles className="w-3 h-3" /> {product.festival_offer}
                              </span>
                            )}
                            {product.is_organic && (
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-600 text-white flex items-center gap-1">
                                <Leaf className="w-3 h-3" /> Organic
                              </span>
                            )}
                          </div>
                          <h3 className="font-serif text-xl font-bold text-slate-900 dark:text-white">{product.name}</h3>
                          {product.tamil_name && <p className="text-emerald-700 dark:text-amber-300 font-bold">{product.tamil_name}</p>}
                          
                          <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/50 font-mono">
                            <div className="text-xl font-black text-emerald-900 dark:text-amber-300">
                              {formatPrice(effectivePrice)}
                            </div>
                            {product.mrp > effectivePrice && (
                              <div className="text-xs text-slate-400 line-through">MRP: {formatPrice(product.mrp)}</div>
                            )}
                          </div>

                          <div>
                            <span className="font-bold text-slate-700 dark:text-emerald-200">Pack:</span> {product.pack_size || `1 ${product.unit}`}
                          </div>
                          {product.short_description && (
                            <p className="text-slate-600 dark:text-emerald-300 text-[11px] leading-relaxed">
                              {product.short_description}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Pre-flight Verification Checklist */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-emerald-900/30 border border-slate-200 dark:border-emerald-800 space-y-2 text-xs">
                <span className="font-bold text-slate-700 dark:text-emerald-200 uppercase tracking-wider text-[10px]">
                  Pre-flight Checklist (All Checks Passed):
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                  <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>SKU code registered: <strong>{product.sku}</strong></span>
                  </div>
                  <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Price configured: <strong>{formatPrice(effectivePrice)}</strong> (Margin: {grossMarginPercent}%)</span>
                  </div>
                  <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Inventory ready: <strong>{product.current_stock} {product.unit}</strong></span>
                  </div>
                  <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Storefront visibility: <strong>{product.is_visible ? 'Live Published' : 'Draft'}</strong></span>
                  </div>
                </div>
              </div>

            </div>

            {/* Modal Bottom Action Bar */}
            <div className="px-6 py-4 border-t border-emerald-100 dark:border-emerald-800/80 bg-slate-50 dark:bg-emerald-900/40 flex flex-wrap items-center justify-between gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setShowFullPageReview(false)}
                className="px-5 py-2.5 rounded-2xl bg-white dark:bg-emerald-950 border border-slate-300 dark:border-emerald-700 hover:bg-slate-100 text-slate-700 dark:text-emerald-200 font-bold text-xs transition flex items-center gap-1.5 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>✏️ Back to Edit</span>
              </button>

              <button
                type="button"
                disabled={isSaving}
                onClick={() => {
                  setShowFullPageReview(false);
                  handleSave();
                }}
                className="px-7 py-3 rounded-2xl bg-gradient-to-r from-emerald-600 via-emerald-700 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-black text-sm shadow-xl transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Check className="w-5 h-5 text-amber-300" />
                <span>✅ All Looks Great — Confirm &amp; Submit Product</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ================= FULLSCREEN OVERLAY SAVE ANIMATION WITH LIVE PERCENTAGE ================= */}
      {isSaving && (
        <div className="fixed inset-0 z-50 backdrop-blur-md bg-slate-900/80 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white dark:bg-emerald-950 rounded-3xl p-7 max-w-sm w-full text-center shadow-2xl border border-emerald-100 dark:border-emerald-800 animate-scaleUp space-y-4">
            {saveStep === 'done' ? (
              <div className="w-20 h-20 rounded-full bg-emerald-100 dark:bg-emerald-900/70 text-emerald-600 dark:text-emerald-300 flex items-center justify-center mx-auto shadow-inner border-4 border-emerald-300 dark:border-emerald-700 animate-bounce">
                <Check className="w-10 h-10 stroke-[3]" />
              </div>
            ) : (
              <div className="relative w-24 h-24 mx-auto flex items-center justify-center">
                {/* Outer track */}
                <div className="absolute inset-0 rounded-full border-4 border-emerald-100 dark:border-emerald-900/60" />
                {/* Animated Spinner Ring */}
                <div className="absolute inset-0 rounded-full border-4 border-emerald-600 dark:border-amber-400 border-t-transparent animate-spin" />
                {/* Center Percentage Display */}
                <div className="flex flex-col items-center justify-center relative z-10">
                  <span className="text-2xl font-black text-emerald-950 dark:text-emerald-100 font-mono tracking-tighter">
                    {savePercent}%
                  </span>
                  <span className="text-[9px] uppercase tracking-wider font-extrabold text-emerald-600 dark:text-amber-400">
                    SAVING
                  </span>
                </div>
              </div>
            )}

            <div>
              <h3 className="font-serif text-lg font-bold text-slate-900 dark:text-white">
                {saveStep === 'validating' && 'Validating product data...'}
                {saveStep === 'saving' && 'Saving to catalog store...'}
                {saveStep === 'syncing' && 'Syncing storefront & audit trail...'}
                {saveStep === 'done' && (product.is_visible ? 'Published Successfully!' : 'Saved as Draft (Not Live)')}
              </h3>
              <p className="text-xs text-slate-500 dark:text-emerald-400 mt-1">
                {saveStep === 'done' ? 'Redirecting back to product catalog...' : 'Please wait a moment while updates sync'}
              </p>
            </div>

            {/* Live Percentage Progress Bar */}
            <div className="space-y-1.5 pt-1 text-left">
              <div className="flex justify-between items-center text-[11px] font-bold text-gray-600 dark:text-emerald-300">
                <span className="truncate pr-2 font-mono text-[10px]">
                  {saveStep === 'validating' && 'Checking SKU uniqueness...'}
                  {saveStep === 'saving' && 'Writing produce to catalog...'}
                  {saveStep === 'syncing' && 'Recording price audit log...'}
                  {saveStep === 'done' && 'All records synchronized!'}
                </span>
                <span className="text-emerald-700 dark:text-amber-400 font-mono font-black shrink-0">
                  {savePercent}%
                </span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-emerald-900/80 rounded-full h-3 overflow-hidden p-0.5 border border-emerald-100 dark:border-emerald-800 shadow-inner">
                <div
                  className="bg-gradient-to-r from-emerald-600 via-emerald-500 to-amber-400 h-full rounded-full transition-all duration-300 shadow-sm relative overflow-hidden"
                  style={{ width: `${savePercent}%` }}
                >
                  <div className="absolute inset-0 bg-white/20 animate-pulse" />
                </div>
              </div>
            </div>

            <div className="flex justify-center items-center gap-1.5 pt-1">
              <span className={cn('w-2.5 h-2.5 rounded-full transition-all', ['validating', 'saving', 'syncing', 'done'].includes(saveStep) ? 'bg-emerald-600' : 'bg-slate-300')} />
              <span className={cn('w-2.5 h-2.5 rounded-full transition-all', ['saving', 'syncing', 'done'].includes(saveStep) ? 'bg-emerald-600' : 'bg-slate-300')} />
              <span className={cn('w-2.5 h-2.5 rounded-full transition-all', ['syncing', 'done'].includes(saveStep) ? 'bg-emerald-600' : 'bg-slate-300')} />
              <span className={cn('w-2.5 h-2.5 rounded-full transition-all', saveStep === 'done' ? 'bg-emerald-600 scale-125' : 'bg-slate-300')} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductEditorPage;
