import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Boxes, Plus, Search, Edit2, History, Leaf, Check, X, 
  Trash2, AlertTriangle, CheckCircle2, XCircle, Ban,
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
  Sparkles, RefreshCw, Layers, DollarSign, PackageCheck, Package, Image,
  Eye, EyeOff, Tag, FolderPlus, Grid, Info, ShieldAlert, Download, Upload,
  Percent, Globe, ArrowRight, ExternalLink, ShieldCheck, CheckSquare, FileText, Sliders,
  MoreVertical, Zap, FileEdit, Save, RotateCcw
} from 'lucide-react';
import { formatPrice } from '../../lib/utils';
import type { Product, Category, StockStatus, Supplier } from '../../types';
import { useNotifications } from '../../contexts/NotificationContext';
import { ExportFormatModal, ExportFormat } from '../../components/common/ExportFormatModal';
import { RefreshSpinnerModal } from '../../components/common/RefreshSpinnerModal';
import { AutoRefreshDropdown } from '../../components/common/AutoRefreshDropdown';
import { AdminPageSkeleton } from '../../components/common/Skeleton';
import { getJSONStore, setJSONStore, recordAuditLog, recordPriceHistory, PriceHistoryRecord, deleteRecordFromDB } from '../../lib/dbManager';
import { useActionModal } from '../../contexts/ActionModalContext';
import toast from 'react-hot-toast';

export const ProductsManagerPage: React.FC = () => {
  const navigate = useNavigate();
  const { addNotification } = useNotifications();
  const { showActionModal, showConfirmModal } = useActionModal();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [autoRefreshSec, setAutoRefreshSec] = useState<number>(0);

  // Live Auto-Refresh Interval
  useEffect(() => {
    if (!autoRefreshSec || autoRefreshSec <= 0) return;
    const interval = setInterval(() => {
      setIsRefreshing(true);
    }, autoRefreshSec * 1000);
    return () => clearInterval(interval);
  }, [autoRefreshSec]);

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Dropdown states for Quick Edit vs Detailed Edit
  const [editDropdownId, setEditDropdownId] = useState<string | null>(null);
  const [addDropdownOpen, setAddDropdownOpen] = useState(false);

  useEffect(() => {
    const handleGlobalClick = () => {
      setEditDropdownId(null);
      setAddDropdownOpen(false);
    };
    window.addEventListener('click', handleGlobalClick);
    return () => window.removeEventListener('click', handleGlobalClick);
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [p, c, s] = await Promise.all([
        getJSONStore<Product>('products'),
        getJSONStore<Category>('categories'),
        getJSONStore<Supplier>('suppliers'),
      ]);
      setProducts(p || []);
      setCategories(c || []);
      setSuppliers(s || []);
    } catch (err: any) {
      console.error('Failed to load products:', err);
      setError(err?.message || 'Failed to connect to products catalog database.');
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    loadData();
  }, []);

  // Helper to format Category Name as "English (Tamil)"
  const getCategoryDisplayName = (cat?: Category | null) => {
    if (!cat) return 'General';
    return cat.tamil_name ? `${cat.name} (${cat.tamil_name})` : cat.name;
  };

  // Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [stockStatusFilter, setStockStatusFilter] = useState<string>('all');
  const [organicFilter, setOrganicFilter] = useState<string>('all');
  const [offerFilter, setOfferFilter] = useState<'all' | 'offer' | 'regular'>('all');
  const [visibilityFilter, setVisibilityFilter] = useState<'all' | 'live' | 'not_live'>('all');
  const [festivalFilter, setFestivalFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'recent' | 'name' | 'price-asc' | 'price-desc' | 'stock-asc' | 'sku'>('recent');

  const resetProductFilters = () => {
    setSearchQuery('');
    setCategoryFilter('all');
    setStockStatusFilter('all');
    setOrganicFilter('all');
    setOfferFilter('all');
    setVisibilityFilter('all');
    setFestivalFilter('all');
    setSortBy('recent');
    setCurrentPage(1);
    toast.success('Filters cleared! Showing all catalog products.');
  };

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Selective actions state (Multi-select, selective export, edit, delete)
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);

  const handleBulkExportSelectedProducts = () => {
    const list = selectedProductIds.length > 0
      ? products.filter(p => selectedProductIds.includes(p.id))
      : filteredProducts;
    if (list.length === 0) {
      toast.error('No products to export');
      return;
    }
    const headers = ['SKU', 'Name', 'Tamil Name', 'Pack Size', 'Selling Price', 'Offer Price', 'MRP', 'Current Stock', 'Stock Status', 'Visibility'];
    const rows = list.map(p => [
      p.sku,
      `"${p.name || ''}"`,
      `"${p.tamil_name || ''}"`,
      p.pack_size || '',
      p.selling_price,
      p.offer_price || '',
      p.mrp || '',
      p.current_stock,
      p.stock_status,
      p.is_visible ? 'LIVE' : 'HIDDEN'
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `products_catalog_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`Exported ${list.length} products to CSV!`);
  };

  const handleBulkToggleVisibility = async (makeLive: boolean) => {
    if (selectedProductIds.length === 0) return;
    try {
      const selectedSet = new Set(selectedProductIds);
      const updated = products.map(p => selectedSet.has(p.id) ? { ...p, is_visible: makeLive, updated_at: new Date().toISOString() } : p);
      setProducts(updated);
      await setJSONStore('products', updated);
      toast.success(`${selectedSet.size} product(s) marked as ${makeLive ? 'LIVE' : 'HIDDEN'}!`);
      setSelectedProductIds([]);
    } catch (err) {
      console.error(err);
      toast.error('Failed to update product visibility');
    }
  };

  const handleBulkDeleteProducts = () => {
    if (selectedProductIds.length === 0) return;
    showConfirmModal({
      title: `Delete ${selectedProductIds.length} Selected Products?`,
      message: `Are you sure you want to permanently delete ${selectedProductIds.length} products from the catalog? This action cannot be undone.`,
      confirmText: `Yes, Delete ${selectedProductIds.length} Products`,
      variant: 'danger',
      onConfirm: async () => {
        try {
          const selectedSet = new Set(selectedProductIds);
          const updated = products.filter(p => !selectedSet.has(p.id));
          setProducts(updated);
          await setJSONStore('products', updated);
          setSelectedProductIds([]);
          toast.success(`Permanently deleted ${selectedSet.size} product(s)!`);
        } catch (err) {
          console.error(err);
          toast.error('Failed to delete products');
        }
      }
    });
  };

  // Edit / Add Product Modal State
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isNewProduct, setIsNewProduct] = useState(false);
  const [activeProductTab, setActiveProductTab] = useState<'basic' | 'pricing' | 'details' | 'media' | 'preview'>('basic');
  const [previewMode, setPreviewMode] = useState<'card' | 'page'>('page');
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  
  // Price History Audit Log State
  const [showHistoryModal, setShowHistoryModal] = useState<Product | null>(null);
  const [historyLogs, setHistoryLogs] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [newRevisionPrice, setNewRevisionPrice] = useState<number>(0);
  const [newRevisionOffer, setNewRevisionOffer] = useState<number | undefined>(undefined);
  const [newRevisionReason, setNewRevisionReason] = useState<string>('');
  const [isSubmittingRevision, setIsSubmittingRevision] = useState(false);

  const [newCarouselUrl, setNewCarouselUrl] = useState('');
  const [previewActiveImg, setPreviewActiveImg] = useState<string>('');

  // Delete Modal State
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Add / Edit Category Modal State
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false);
  const [newCategoryData, setNewCategoryData] = useState({
    name: '',
    tamil_name: '',
    slug: '',
    description: '',
    icon: '🌾',
    image_url: '',
    display_order: 1,
    is_active: true,
    is_visible: true
  });

  // Quick Stock Adjustment Modal State
  const [quickStockProduct, setQuickStockProduct] = useState<Product | null>(null);
  const [quickStockAmount, setQuickStockAmount] = useState<number>(5);
  const [quickStockMode, setQuickStockMode] = useState<'ADD' | 'SUBTRACT' | 'SET'>('ADD');
  const [quickStockReason, setQuickStockReason] = useState<string>('');

  // Loading Animation Popup State for SKU Save & Category Save
  const [isSaving, setIsSaving] = useState(false);
  const [saveProgress, setSaveProgress] = useState(0);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('Saving SKU to Catalog...');

  // 1. Overview 4 Box Metrics Calculation
  const metrics = useMemo(() => {
    const totalCount = products.length;
    const inStockCount = products.filter(p => p.current_stock > p.reorder_level && p.stock_status !== 'OUT_OF_STOCK' && p.stock_status !== 'DISABLED').length;
    const lowStockCount = products.filter(p => p.current_stock <= p.reorder_level && p.current_stock > 0).length;
    const outOfStockCount = products.filter(p => p.current_stock === 0 || p.stock_status === 'OUT_OF_STOCK' || p.stock_status === 'DISABLED').length;
    const totalInventoryValue = products.reduce((acc, p) => acc + (p.current_stock * p.selling_price), 0);

    return { totalCount, inStockCount, lowStockCount, outOfStockCount, totalInventoryValue };
  }, [products]);

  // 2. Filtering & Sorting Logic
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      // Category Filter
      if (categoryFilter !== 'all' && p.category_id !== categoryFilter) return false;
      
      // Stock Status Filter
      if (stockStatusFilter === 'in_stock' && (p.current_stock <= p.reorder_level || p.current_stock === 0)) return false;
      if (stockStatusFilter === 'low_stock' && (p.current_stock > p.reorder_level || p.current_stock === 0)) return false;
      if (stockStatusFilter === 'out_of_stock' && p.current_stock > 0) return false;
      if (stockStatusFilter === 'disabled' && p.stock_status !== 'DISABLED') return false;

      // Organic Filter
      if (organicFilter === 'organic' && !p.is_organic) return false;
      if (organicFilter === 'conventional' && p.is_organic) return false;

      // Offer Price Filter
      if (offerFilter === 'offer' && !(p.offer_price && p.offer_price > 0 && p.offer_price < p.selling_price)) return false;
      if (offerFilter === 'regular' && p.offer_price && p.offer_price > 0 && p.offer_price < p.selling_price) return false;

      // Storefront Visibility Filter (Live / Not Live)
      if (visibilityFilter === 'live' && p.is_visible === false) return false;
      if (visibilityFilter === 'not_live' && p.is_visible !== false) return false;

      // Festival Deals Filter
      if (festivalFilter !== 'all') {
        if (festivalFilter === 'any_festival' && !p.festival_offer) return false;
        if (festivalFilter !== 'any_festival' && p.festival_offer !== festivalFilter) return false;
      }

      // Search Query Filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = p.name.toLowerCase().includes(q);
        const matchTamil = p.tamil_name ? p.tamil_name.toLowerCase().includes(q) : false;
        const matchSku = p.sku.toLowerCase().includes(q);
        const matchFestival = p.festival_offer ? p.festival_offer.toLowerCase().includes(q) : false;
        return matchName || matchTamil || matchSku || matchFestival;
      }

      return true;
    }).sort((a, b) => {
      if (sortBy === 'recent') return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
      if (sortBy === 'price-asc') return (a.offer_price || a.selling_price) - (b.offer_price || b.selling_price);
      if (sortBy === 'price-desc') return (b.offer_price || b.selling_price) - (a.offer_price || a.selling_price);
      if (sortBy === 'stock-asc') return a.current_stock - b.current_stock;
      if (sortBy === 'sku') return a.sku.localeCompare(b.sku);
      return a.name.localeCompare(b.name);
    });
  }, [products, searchQuery, categoryFilter, stockStatusFilter, organicFilter, offerFilter, visibilityFilter, festivalFilter, sortBy]);

  // 3. Pagination Logic
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage) || 1;
  const paginatedProducts = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredProducts.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredProducts, currentPage, itemsPerPage]);

  // Reset page when filters change
  const handleFilterChange = (setter: React.Dispatch<React.SetStateAction<any>>, value: any) => {
    setter(value);
    setCurrentPage(1);
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setCategoryFilter('all');
    setStockStatusFilter('all');
    setOrganicFilter('all');
    setOfferFilter('all');
    setVisibilityFilter('all');
    setFestivalFilter('all');
    setSortBy('recent');
    setCurrentPage(1);
  };

  // Price History Audit Log Loader
  useEffect(() => {
    if (!showHistoryModal) {
      setHistoryLogs([]);
      return;
    }
    setNewRevisionPrice(showHistoryModal.selling_price || 0);
    setNewRevisionOffer(showHistoryModal.offer_price);
    setNewRevisionReason('');
    setHistoryLoading(true);

    async function loadHistory() {
      try {
        const [allAudits, allPriceHistory] = await Promise.all([
          getJSONStore<any>('audit_logs'),
          getJSONStore<PriceHistoryRecord>('product_price_history')
        ]);

        const priceRecords = (allPriceHistory || []).filter(
          h => h.product_id === showHistoryModal!.id || h.sku === showHistoryModal!.sku
        );

        const auditRecords = (allAudits || []).filter(
          a => a.object_id === showHistoryModal!.sku || a.object_id === showHistoryModal!.id || (a.description && a.description.includes(showHistoryModal!.sku))
        );

        const combined = [
          ...priceRecords.map(p => ({
            type: 'PRICE_REVISION',
            id: p.id,
            date: p.created_at,
            user: p.changed_by || 'Store Admin',
            selling_price: p.new_selling_price,
            offer_price: p.new_offer_price,
            mrp: p.mrp,
            cost: p.purchase_price,
            reason: p.reason || 'Price adjustment'
          })),
          ...auditRecords.map(a => ({
            type: 'AUDIT_LOG',
            id: a.id,
            date: a.created_at,
            user: a.user_name || a.user_email || 'Staff',
            action: a.action,
            description: a.description,
            new_data: a.new_data
          }))
        ].sort((x, y) => new Date(y.date || 0).getTime() - new Date(x.date || 0).getTime());

        setHistoryLogs(combined);
      } catch (err) {
        console.error('Failed to load price audit logs:', err);
      } finally {
        setHistoryLoading(false);
      }
    }

    loadHistory();
  }, [showHistoryModal]);

  const handleQuickPriceRevision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showHistoryModal) return;
    setIsSubmittingRevision(true);
    try {
      const updatedProduct: Product = {
        ...showHistoryModal,
        selling_price: Number(newRevisionPrice),
        offer_price: newRevisionOffer ? Number(newRevisionOffer) : undefined,
        updated_at: new Date().toISOString()
      };

      const updatedList = products.map(p => p.id === showHistoryModal.id ? updatedProduct : p);
      setProducts(updatedList);
      await setJSONStore('products', updatedList);

      await recordPriceHistory({
        product_id: showHistoryModal.id,
        sku: showHistoryModal.sku,
        name: showHistoryModal.name,
        old_selling_price: showHistoryModal.selling_price,
        new_selling_price: Number(newRevisionPrice),
        old_offer_price: showHistoryModal.offer_price,
        new_offer_price: newRevisionOffer ? Number(newRevisionOffer) : undefined,
        mrp: showHistoryModal.mrp,
        purchase_price: showHistoryModal.purchase_price,
        landed_cost: showHistoryModal.landed_cost,
        changed_by: 'Store Administrator',
        reason: newRevisionReason.trim() || 'Direct Price Revision'
      });

      await recordAuditLog({
        action: 'UPDATE',
        object_type: 'PRICE_UPDATE',
        object_id: showHistoryModal.sku,
        description: `Price revised for ${showHistoryModal.name} (${showHistoryModal.sku}): selling was ${formatPrice(showHistoryModal.selling_price)}, now ${formatPrice(newRevisionPrice)}${newRevisionReason ? ` (Reason: ${newRevisionReason})` : ''}`,
        new_data: updatedProduct as any
      });

      toast.success('Price revision recorded and synced!');
      setShowHistoryModal(updatedProduct);
    } catch (err) {
      toast.error('Failed to update price revision');
    } finally {
      setIsSubmittingRevision(false);
    }
  };

  // Open Create New Product Modal
  const handleOpenAddProduct = () => {
    setIsNewProduct(true);
    setActiveProductTab('basic');
    setNewCarouselUrl('');
    setPreviewActiveImg('');
    setEditingProduct({
      id: `prod-${Date.now()}`,
      sku: `LIF-${Math.floor(1000 + Math.random() * 9000)}`,
      name: '',
      tamil_name: '',
      slug: '',
      category_id: categories[0]?.id || 'cat-1',
      supplier_id: suppliers[0]?.id || 'sup-1',
      purchase_price: 100,
      landed_cost: 110,
      mrp: 180,
      selling_price: 150,
      offer_price: undefined,
      tax_percent: 5,
      reorder_level: 10,
      opening_stock: 50,
      current_stock: 50,
      stock_status: 'IN_STOCK',
      is_featured: false,
      is_visible: true,
      is_organic: true,
      unit: 'kg',
      pack_size: '1 kg',
      short_description: '',
      description: '',
      organic_certification: 'NPOP India Organic Certified',
      storage_info: 'Store in a cool dry place in airtight container',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });
  };

  // Open Edit Existing Product Modal
  const handleOpenEditProduct = (product: Product) => {
    setIsNewProduct(false);
    setActiveProductTab('basic');
    setNewCarouselUrl('');
    setPreviewActiveImg('');
    const existingImgs = (product.images && product.images.length > 0)
      ? product.images
      : (product.image_url ? [product.image_url] : []);
    setEditingProduct({
      ...product,
      images: existingImgs
    });
  };

  // Save Product Handler with Confirmation & Percentage Progress
  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct || !editingProduct.name.trim()) {
      toast.error('Product Name is required.');
      return;
    }

    const currentEditing = { ...editingProduct };
    const isNew = isNewProduct;

    showConfirmModal({
      title: isNew ? 'Create New Catalog SKU?' : 'Save Changes to SKU?',
      message: isNew
        ? `Are you sure you want to add new produce "${currentEditing.name}" to the catalog?`
        : `Are you sure you want to save pricing and inventory updates for "${currentEditing.name}" (${currentEditing.sku})?`,
      description: `Selling Price: ₹${currentEditing.selling_price || 0} • Stock: ${currentEditing.current_stock || 0} ${currentEditing.unit || 'kg'} • Store Status: ${currentEditing.is_visible !== false ? 'Live' : 'Draft'}`,
      confirmText: isNew ? 'Yes, Create Product' : 'Yes, Save Changes',
      variant: 'success',
      onConfirm: async () => {
        setLoadingMessage(isNew ? 'Creating New Catalog SKU...' : 'Updating Product SKU...');
        setIsSaving(true);
        setSaveProgress(25);
        setSaveSuccess(false);

        try {
          const currentStockNum = Math.max(0, Number(currentEditing.current_stock) || 0);
          const reorderLevelNum = Math.max(0, Number(currentEditing.reorder_level) || 5);
          let calculatedStatus: StockStatus = currentEditing.stock_status;
          if (calculatedStatus !== 'DISABLED') {
            calculatedStatus = currentStockNum === 0 ? 'OUT_OF_STOCK' : (currentStockNum <= reorderLevelNum ? 'LOW_STOCK' : 'IN_STOCK');
          }

          const finalImages = (currentEditing.images && currentEditing.images.length > 0)
            ? currentEditing.images
            : (currentEditing.image_url ? [currentEditing.image_url] : []);
          const finalCover = currentEditing.image_url || finalImages[0] || '';

          const sanitizedProduct: Product = {
            ...currentEditing,
            image_url: finalCover,
            images: finalImages,
            selling_price: Number(currentEditing.selling_price) || 0,
            mrp: Number(currentEditing.mrp) || Number(currentEditing.selling_price) || 0,
            offer_price: currentEditing.offer_price ? Number(currentEditing.offer_price) : undefined,
            festival_offer: currentEditing.festival_offer?.trim() || undefined,
            purchase_price: Number(currentEditing.purchase_price) || 0,
            landed_cost: Number(currentEditing.landed_cost) || Number(currentEditing.purchase_price) || 0,
            current_stock: currentStockNum,
            reorder_level: reorderLevelNum,
            opening_stock: Number(currentEditing.opening_stock) || currentStockNum,
            tax_percent: Number(currentEditing.tax_percent) || 0,
            stock_status: calculatedStatus,
            slug: currentEditing.slug || currentEditing.name.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-'),
            updated_at: new Date().toISOString()
          };

          setSaveProgress(65);

          let updated: Product[];
          if (isNew) {
            updated = [sanitizedProduct, ...products];
          } else {
            updated = products.map((p) => (p.id === sanitizedProduct.id ? sanitizedProduct : p));
          }

          setProducts(updated);
          await setJSONStore('products', updated);
          setSaveProgress(100);
          setSaveSuccess(true);

          await recordAuditLog({
            action: isNew ? 'CREATE' : 'UPDATE',
            object_type: 'PRODUCTS',
            object_id: sanitizedProduct.sku,
            description: isNew
              ? `Created new product catalog SKU "${sanitizedProduct.name}" (${sanitizedProduct.sku})`
              : `Updated details & pricing for product "${sanitizedProduct.name}" (${sanitizedProduct.sku})`,
            new_data: sanitizedProduct as any
          });

          addNotification({
            title: isNew ? 'New SKU Added' : 'SKU Updated',
            message: `Product "${sanitizedProduct.name}" (${sanitizedProduct.sku}) saved and synced to database.`,
            type: 'success',
            sourceModule: 'Catalog Manager'
          });
          toast.success(`Product "${sanitizedProduct.name}" saved successfully!`);

          setTimeout(() => {
            setIsSaving(false);
            setEditingProduct(null);
            setSaveSuccess(false);
          }, 350);
        } catch (err) {
          console.error('Error saving product:', err);
          setIsSaving(false);
          toast.error('Failed to save product to database. Please try again.');
        }
      }
    });
  };

  // Open Add Category Modal
  const handleOpenAddCategory = () => {
    setEditingCategory(null);
    setNewCategoryData({
      name: '',
      tamil_name: '',
      slug: '',
      description: '',
      icon: '🌿',
      image_url: '',
      display_order: categories.length + 1,
      is_active: true,
      is_visible: true
    });
    setShowAddCategoryModal(true);
  };

  // Open Edit Category Modal
  const handleOpenEditCategory = (cat: Category) => {
    setEditingCategory(cat);
    setNewCategoryData({
      name: cat.name,
      tamil_name: cat.tamil_name || '',
      slug: cat.slug || '',
      description: cat.description || '',
      icon: cat.icon || '🌿',
      image_url: cat.image_url || '',
      display_order: cat.display_order ?? 1,
      is_active: cat.is_active ?? true,
      is_visible: cat.is_visible ?? true
    });
    setShowAddCategoryModal(true);
  };

  // Save / Update Category Handler with Confirmation & Percentage Progress
  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryData.name.trim()) return;

    const isEdit = Boolean(editingCategory);
    const catName = newCategoryData.name.trim();

    showConfirmModal({
      title: isEdit ? 'Update Produce Category?' : 'Register New Category?',
      message: isEdit
        ? `Are you sure you want to update category "${catName}"?`
        : `Are you sure you want to register new category "${catName}" in the catalog?`,
      confirmText: isEdit ? 'Yes, Update Category' : 'Yes, Register Category',
      variant: 'success',
      onConfirm: async () => {
        setLoadingMessage(isEdit ? 'Updating Category Specs...' : 'Registering New Category...');
        setIsSaving(true);
        setSaveProgress(30);
        setSaveSuccess(false);

        try {
          const targetId = editingCategory ? editingCategory.id : `cat-${Date.now()}`;
          const targetSlug = newCategoryData.slug.trim() || newCategoryData.name.toLowerCase().replace(/\s+/g, '-');

          const updatedCatObj: Category = {
            id: targetId,
            name: newCategoryData.name.trim(),
            tamil_name: newCategoryData.tamil_name.trim() || undefined,
            slug: targetSlug,
            description: newCategoryData.description.trim() || undefined,
            icon: newCategoryData.icon || '🌾',
            image_url: newCategoryData.image_url.trim() || undefined,
            display_order: Number(newCategoryData.display_order) || 1,
            is_active: newCategoryData.is_active,
            is_visible: newCategoryData.is_visible,
            created_at: editingCategory?.created_at || new Date().toISOString(),
            updated_at: new Date().toISOString(),
            product_count: editingCategory?.product_count || 0
          };

          setSaveProgress(70);

          let updatedCategories: Category[];
          if (editingCategory) {
            updatedCategories = categories.map(c => c.id === editingCategory.id ? updatedCatObj : c);
          } else {
            updatedCategories = [...categories, updatedCatObj];
          }

          setCategories(updatedCategories);
          await setJSONStore('categories', updatedCategories);
          setSaveProgress(100);
          setSaveSuccess(true);

          if (editingProduct) {
            setEditingProduct((prev) => prev ? { ...prev, category_id: updatedCatObj.id } : null);
          } else {
            setCategoryFilter(updatedCatObj.id);
          }

          addNotification({
            title: isEdit ? 'Category Updated' : 'Category Created',
            message: `Category "${getCategoryDisplayName(updatedCatObj)}" saved and synced directly to store database.`,
            type: 'success',
            sourceModule: 'Catalog Manager'
          });
          toast.success(`Category "${updatedCatObj.name}" saved!`);

          setTimeout(() => {
            setIsSaving(false);
            setShowAddCategoryModal(false);
            setEditingCategory(null);
            setSaveSuccess(false);
          }, 350);
        } catch (err) {
          console.error('Error saving category:', err);
          setIsSaving(false);
          toast.error('Failed to save category.');
        }
      }
    });
  };

  // Confirm Product Delete Handler with Percentage Loading Animation
  const handleConfirmDeleteProduct = async () => {
    if (!deletingProduct) return;
    const target = deletingProduct;
    setDeletingProduct(null);

    showActionModal({
      title: 'Deleting SKU from Catalog',
      subtitle: `Permanently removing "${target.name}" (${target.sku})...`,
      badge: 'Catalog Engine',
      duration: 850,
      steps: [
        'Checking SKU catalog dependencies...',
        'Removing product record from database...',
        'Syncing inventory and audit trails...',
        'SKU permanently deleted!'
      ],
      onComplete: async () => {
        try {
          const updated = products.filter((p) => p.id !== target.id);
          setProducts(updated);
          await setJSONStore('products', updated);
          await deleteRecordFromDB('products', target.id);
          addNotification({
            title: 'SKU Removed',
            message: `Product "${target.name}" (${target.sku}) has been permanently deleted.`,
            type: 'warning',
            sourceModule: 'Catalog Manager'
          });
          toast.success(`Product "${target.name}" removed from catalog.`);
        } catch (err) {
          console.error('Error deleting product:', err);
          toast.error('Failed to delete product.');
        }
      }
    });
  };

  // Quick Storefront Visibility Toggle (Live / Draft) with Confirmation & Percentage Progress
  const handleToggleVisibility = (p: Product) => {
    const nextVisible = p.is_visible === false ? true : false;
    showConfirmModal({
      title: nextVisible ? 'Publish Product LIVE?' : 'Change Product to DRAFT?',
      message: nextVisible
        ? `Are you sure you want to make "${p.name}" LIVE on the storefront?`
        : `Are you sure you want to change "${p.name}" to DRAFT (Unpublished)?`,
      description: nextVisible
        ? 'Customers will immediately be able to view, search, and order this produce.'
        : 'This produce will be hidden from the website catalog and cannot be ordered online.',
      confirmText: nextVisible ? '🟢 Yes, Make LIVE' : '⚪ Yes, Set to DRAFT',
      variant: nextVisible ? 'success' : 'warning',
      onConfirm: () => {
        showActionModal({
          title: nextVisible ? 'Publishing Produce LIVE' : 'Moving Produce to Draft',
          subtitle: `Updating storefront visibility for ${p.name} (${p.sku})...`,
          badge: 'Storefront Live',
          duration: 800,
          steps: [
            'Verifying storefront configurations...',
            'Updating visibility status in database...',
            'Syncing storefront product catalog cache...',
            'Storefront visibility updated successfully!'
          ],
          onComplete: async () => {
            try {
              const updatedProduct: Product = {
                ...p,
                is_visible: nextVisible,
                updated_at: new Date().toISOString()
              };
              const updatedList = products.map((item) => (item.id === p.id ? updatedProduct : item));
              setProducts(updatedList);
              await setJSONStore('products', updatedList);
              await recordAuditLog({
                action: 'UPDATE',
                object_type: 'PRODUCTS',
                object_id: p.sku,
                description: `Product "${p.name}" visibility changed to ${nextVisible ? 'LIVE' : 'DRAFT'}`,
                new_data: { is_visible: nextVisible }
              });
              toast.success(`"${p.name}" is now ${nextVisible ? '🟢 LIVE on Storefront' : '⚪ DRAFT (Unpublished)'}`);
            } catch (err) {
              console.error('Failed to toggle visibility:', err);
              toast.error('Failed to update storefront visibility');
            }
          }
        });
      }
    });
  };

  // Quick Stock Adjustment / Refill Handler with Confirmation & Percentage Progress
  const handleQuickStockSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickStockProduct) return;

    const current = Number(quickStockProduct.current_stock) || 0;
    const amount = Number(quickStockAmount) || 0;
    let finalStock = current;

    if (quickStockMode === 'ADD') {
      finalStock = current + amount;
    } else if (quickStockMode === 'SUBTRACT') {
      finalStock = Math.max(0, current - amount);
    } else {
      finalStock = Math.max(0, amount);
    }

    const target = quickStockProduct;
    const modeDesc = quickStockMode === 'ADD' 
      ? `adding +${amount} ${target.unit}` 
      : (quickStockMode === 'SUBTRACT' ? `deducting -${amount} ${target.unit}` : `setting to ${amount} ${target.unit}`);
    const note = quickStockReason.trim();

    showConfirmModal({
      title: 'Confirm Stock Adjustment?',
      message: `Are you sure you want to adjust stock for "${target.name}" (${target.sku}) by ${modeDesc}?`,
      description: `Stock level will change from ${current} ${target.unit} to ${finalStock} ${target.unit}.${note ? ` Reason: ${note}` : ''}`,
      confirmText: 'Yes, Apply Stock Update',
      variant: 'info',
      onConfirm: () => {
        setQuickStockProduct(null);
        setQuickStockReason('');

        showActionModal({
          title: 'Updating Inventory Ledger',
          subtitle: `Recording stock change for ${target.name}...`,
          badge: 'Inventory Refill',
          duration: 800,
          steps: [
            'Verifying physical unit quantity...',
            'Recording stock transaction in inventory ledger...',
            'Updating low-stock threshold alarms...',
            'Inventory stock updated successfully!'
          ],
          onComplete: async () => {
            const reorderLevel = target.reorder_level || 5;
            let newStatus: StockStatus = target.stock_status;
            if (newStatus !== 'DISABLED') {
              newStatus = finalStock === 0 ? 'OUT_OF_STOCK' : (finalStock <= reorderLevel ? 'LOW_STOCK' : 'IN_STOCK');
            }

            const updatedProduct: Product = {
              ...target,
              current_stock: finalStock,
              stock_status: newStatus,
              updated_at: new Date().toISOString()
            };

            const updatedList = products.map(p => p.id === target.id ? updatedProduct : p);
            setProducts(updatedList);
            await setJSONStore('products', updatedList);

            await recordAuditLog({
              action: 'UPDATE',
              object_type: 'PRODUCTS',
              object_id: target.sku,
              description: `Stock adjusted (${quickStockMode}): was ${current} ${target.unit}, now ${finalStock} ${target.unit}${note ? ` [Note: ${note}]` : ''}`,
              new_data: updatedProduct as any
            });

            addNotification({
              title: 'Stock Updated',
              message: `Updated stock for ${target.name} to ${finalStock} ${target.unit}.`,
              type: 'success',
              sourceModule: 'Catalog Manager'
            });
            toast.success(`Stock updated: ${finalStock} ${target.unit}`);
          }
        });
      }
    });
  };

  // Export Modal State
  const [showExportModal, setShowExportModal] = useState(false);

  // Export Catalog Handler with Multi-Format Support
  const handleExecuteExportFormat = (format: ExportFormat) => {
    if (filteredProducts.length === 0) {
      addNotification({
        title: 'Export Failed',
        message: 'No product SKUs match the selected filters to export.',
        type: 'warning',
        sourceModule: 'Catalog Manager'
      });
      return;
    }

    if (format === 'PRINT' || format === 'PDF') {
      const printWindow = window.open('', '_blank', 'width=900,height=950');
      if (!printWindow) return;

      const rowsHtml = filteredProducts.map((p, idx) => `
        <tr>
          <td style="padding: 6px; border-bottom: 1px solid #eee;">${idx + 1}</td>
          <td style="padding: 6px; border-bottom: 1px solid #eee;"><strong>${p.sku}</strong></td>
          <td style="padding: 6px; border-bottom: 1px solid #eee;">${p.name} ${p.tamil_name ? `(${p.tamil_name})` : ''}</td>
          <td style="padding: 6px; border-bottom: 1px solid #eee;">${p.pack_size || '1 kg'}</td>
          <td style="padding: 6px; border-bottom: 1px solid #eee; text-align: right;">₹${p.mrp}</td>
          <td style="padding: 6px; border-bottom: 1px solid #eee; text-align: right; font-weight: bold; color: #064e3b;">₹${p.offer_price || p.selling_price}</td>
          <td style="padding: 6px; border-bottom: 1px solid #eee; text-align: center;">${p.current_stock}</td>
          <td style="padding: 6px; border-bottom: 1px solid #eee; text-align: center;">${p.is_organic ? '🌿 Organic' : 'Conventional'}</td>
        </tr>
      `).join('');

      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>MR. VIVASAYI Catalog Report (${filteredProducts.length} SKUs)</title>
            <style>
              body { font-family: sans-serif; padding: 24px; color: #064e3b; }
              h1 { color: #064e3b; margin-bottom: 4px; font-size: 22px; }
              p { font-size: 12px; color: #666; margin-top: 0; }
              table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 11px; }
              th { background: #064e3b; color: white; padding: 8px; text-align: left; }
            </style>
          </head>
          <body>
            <h1>🌿 MR. VIVASAYI Product Catalog & Pricing Report</h1>
            <p>Generated on ${new Date().toLocaleString()} | Total Filtered SKUs: ${filteredProducts.length}</p>
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>SKU</th>
                  <th>Product Name</th>
                  <th>Pack Size</th>
                  <th style="text-align: right;">MRP</th>
                  <th style="text-align: right;">Selling Price</th>
                  <th style="text-align: center;">Stock</th>
                  <th style="text-align: center;">Type</th>
                </tr>
              </thead>
              <tbody>
                ${rowsHtml}
              </tbody>
            </table>
          </body>
        </html>
      `);

      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => printWindow.print(), 400);

      addNotification({
        title: `Catalog ${format === 'PDF' ? 'PDF Generated' : 'Printing Initiated'}`,
        message: `Prepared catalog report for ${filteredProducts.length} products.`,
        type: 'success',
        sourceModule: 'Catalog Manager'
      });
      return;
    }

    // CSV & Excel Export
    const headers = [
      'SKU', 'Product Name', 'Tamil Name', 'Category', 'Pack Size', 'Unit',
      'MRP (₹)', 'Selling Price (₹)', 'Offer Price (₹)', 'Landed Cost (₹)',
      'Current Stock', 'Stock Status', 'Organic', 'Visible'
    ];

    const rows = filteredProducts.map((p) => [
      `"${(p.sku || '').replace(/"/g, '""')}"`,
      `"${(p.name || '').replace(/"/g, '""')}"`,
      `"${(p.tamil_name || '').replace(/"/g, '""')}"`,
      `"${(getCategoryDisplayName(categories.find(c => c.id === p.category_id)) || '').replace(/"/g, '""')}"`,
      `"${(p.pack_size || '').replace(/"/g, '""')}"`,
      `"${(p.unit || '').replace(/"/g, '""')}"`,
      p.mrp || 0,
      p.selling_price || 0,
      p.offer_price || 0,
      p.landed_cost || 0,
      p.current_stock || 0,
      `"${p.stock_status || ''}"`,
      p.is_organic ? 'Yes' : 'No',
      p.is_visible ? 'Yes' : 'No'
    ]);

    const ext = format === 'EXCEL' ? 'csv' : 'csv';
    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `MR_VIVASAYI_Catalog_Export_${new Date().toISOString().slice(0, 10)}.${ext}`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    addNotification({
      title: 'Catalog Exported',
      message: `Successfully exported ${filteredProducts.length} product SKUs in ${format} format!`,
      type: 'success',
      sourceModule: 'Catalog Manager'
    });
  };

  if (loading) {
    return <AdminPageSkeleton title="Product Catalog & Inventory Sku Management" />;
  }

  return (
    <div className="space-y-6 font-sans pb-12">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-serif font-bold text-gray-900 dark:text-emerald-100 flex items-center gap-2">
            <Boxes className="w-7 h-7 text-emerald-600 dark:text-amber-400" />
            Product Catalog & Pricing Manager
          </h1>
          <p className="text-xs text-gray-500 dark:text-emerald-300">
            Manage traditional food SKUs, Tamil names, landed costs, MRPs, categories, organic certifications, and stock levels.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {/* Auto-Refresh Dropdown */}
          <AutoRefreshDropdown
            intervalSec={autoRefreshSec}
            onIntervalChange={(sec) => {
              setAutoRefreshSec(sec);
              if (sec > 0) setIsRefreshing(true);
            }}
            onRefresh={() => setIsRefreshing(true)}
            variant="emerald"
          />

          {/* Refresh Button */}
          <button
            onClick={() => setIsRefreshing(true)}
            className="px-3.5 py-2.5 bg-emerald-100/80 dark:bg-emerald-900/80 hover:bg-emerald-200 dark:hover:bg-emerald-800 text-emerald-900 dark:text-emerald-100 font-bold text-xs rounded-2xl border border-emerald-300 dark:border-emerald-700 transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
            title="Refresh product catalog data"
          >
            <RefreshCw className="w-4 h-4 text-emerald-700 dark:text-amber-400" />
            <span>Refresh</span>
          </button>

          {/* Export Catalog Button */}
          <button
            onClick={() => setShowExportModal(true)}
            className="px-4 py-2.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-800 dark:text-amber-300 font-bold text-xs rounded-2xl border border-amber-300 dark:border-amber-700/60 transition-all flex items-center gap-1.5 shadow-sm"
            title="Export filtered catalog - choose format"
          >
            <Download className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            <span>Export Catalog</span>
          </button>

          {/* Add Category Button */}
          <button
            onClick={handleOpenAddCategory}
            className="px-4 py-2.5 bg-emerald-100 dark:bg-emerald-900/80 hover:bg-emerald-200 dark:hover:bg-emerald-800 text-emerald-900 dark:text-emerald-100 font-bold text-xs rounded-2xl border border-emerald-300 dark:border-emerald-700 transition-all flex items-center gap-1.5 shadow-sm"
          >
            <FolderPlus className="w-4 h-4 text-emerald-700 dark:text-amber-400" />
            <span>+ New Category</span>
          </button>

          {/* Add New SKU Button with Dropdown (Full Page vs Quick Modal) */}
          <div className="relative inline-block text-left">
            <div className="flex items-center rounded-2xl shadow-lg bg-gradient-to-r from-emerald-700 to-emerald-800 overflow-hidden">
              <button
                type="button"
                onClick={() => navigate('/admin/products/new')}
                className="px-4 py-2.5 hover:from-emerald-800 hover:to-emerald-900 text-white font-extrabold text-xs transition-all flex items-center gap-2 group cursor-pointer"
                title="Open Full Page Product Editor"
              >
                <Plus className="w-4 h-4 text-amber-300 group-hover:rotate-90 transition-transform duration-300" />
                <span>Add New SKU</span>
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setAddDropdownOpen(!addDropdownOpen);
                }}
                className="px-2.5 py-2.5 text-white/80 hover:text-white hover:bg-emerald-900/60 border-l border-emerald-600/40 transition cursor-pointer"
                title="Choose Add Mode"
              >
                <ChevronRight className={`w-3.5 h-3.5 transition-transform ${addDropdownOpen ? 'rotate-90' : ''}`} />
              </button>
            </div>

            {addDropdownOpen && (
              <div
                onClick={(e) => e.stopPropagation()}
                className="absolute right-0 mt-1.5 w-56 rounded-2xl bg-white dark:bg-emerald-950 shadow-2xl border border-emerald-200 dark:border-emerald-800 py-1.5 z-30 animate-fadeIn text-left"
              >
                <div className="px-3 py-1.5 border-b border-emerald-100 dark:border-emerald-800/80">
                  <span className="text-[10px] font-black uppercase tracking-wider text-gray-500 dark:text-emerald-300">
                    Add Product Mode
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setAddDropdownOpen(false);
                    navigate('/admin/products/new');
                  }}
                  className="w-full px-3 py-2 text-xs font-bold text-gray-700 dark:text-emerald-100 hover:bg-emerald-50 dark:hover:bg-emerald-900/60 flex items-center gap-2 transition cursor-pointer"
                >
                  <FileEdit className="w-4 h-4 text-emerald-600 dark:text-amber-300 shrink-0" />
                  <div>
                    <div className="font-extrabold text-emerald-900 dark:text-emerald-100">📝 Full Page Editor</div>
                    <div className="text-[10px] text-gray-500 dark:text-emerald-400 font-normal">Dedicated full-page layout</div>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAddDropdownOpen(false);
                    handleOpenAddProduct();
                  }}
                  className="w-full px-3 py-2 text-xs font-bold text-gray-700 dark:text-emerald-100 hover:bg-emerald-50 dark:hover:bg-emerald-900/60 flex items-center gap-2 transition cursor-pointer border-t border-emerald-50 dark:border-emerald-900/40"
                >
                  <Zap className="w-4 h-4 text-amber-500 shrink-0" />
                  <div>
                    <div className="font-extrabold text-emerald-900 dark:text-emerald-100">⚡ Quick Add (Modal)</div>
                    <div className="text-[10px] text-gray-500 dark:text-emerald-400 font-normal">Fast 5-step modal workflow</div>
                  </div>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ================= 4 PRODUCT OVERVIEW BOXES ================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Box 1: Total SKUs */}
        <div className="bg-white dark:bg-emerald-900/40 p-5 rounded-3xl border border-emerald-100 dark:border-emerald-800 shadow-sm relative overflow-hidden group hover:border-emerald-300 transition-all">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-bold text-gray-500 dark:text-emerald-400 uppercase tracking-wider">
                Total Catalog SKUs
              </p>
              <h3 className="text-2xl font-black text-gray-900 dark:text-emerald-100 mt-1">
                {metrics.totalCount}
              </h3>
              <p className="text-[11px] text-emerald-700 dark:text-emerald-300 font-medium mt-1">
                Across {categories.length} Active Categories
              </p>
            </div>
            <div className="p-3 rounded-2xl bg-emerald-100 dark:bg-emerald-800 text-emerald-700 dark:text-amber-300 group-hover:scale-110 transition-transform">
              <Boxes className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-emerald-50 dark:border-emerald-800/60 flex justify-between text-xs text-gray-500 dark:text-emerald-300">
            <span>Inventory Valuation</span>
            <span className="font-mono font-bold text-emerald-800 dark:text-amber-400">{formatPrice(metrics.totalInventoryValue)}</span>
          </div>
        </div>

        {/* Box 2: In-Stock Products */}
        <div className="bg-white dark:bg-emerald-900/40 p-5 rounded-3xl border border-emerald-100 dark:border-emerald-800 shadow-sm relative overflow-hidden group hover:border-emerald-300 transition-all">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-bold text-gray-500 dark:text-emerald-400 uppercase tracking-wider">
                In-Stock Products
              </p>
              <h3 className="text-2xl font-black text-emerald-700 dark:text-emerald-300 mt-1">
                {metrics.inStockCount}
              </h3>
              <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold mt-1 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Healthy stock status
              </p>
            </div>
            <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-800/60 text-emerald-600 dark:text-emerald-300 group-hover:scale-110 transition-transform">
              <PackageCheck className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-emerald-50 dark:border-emerald-800/60 flex justify-between text-xs text-gray-500 dark:text-emerald-300">
            <span>Stock Share</span>
            <span className="font-bold text-emerald-700 dark:text-emerald-300">
              {metrics.totalCount ? Math.round((metrics.inStockCount / metrics.totalCount) * 100) : 0}% of catalog
            </span>
          </div>
        </div>

        {/* Box 3: Low Stock Alerts */}
        <div className="bg-white dark:bg-emerald-900/40 p-5 rounded-3xl border border-amber-200 dark:border-amber-800/60 shadow-sm relative overflow-hidden group hover:border-amber-400 transition-all">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-bold text-amber-800 dark:text-amber-400 uppercase tracking-wider">
                Low Stock Alerts
              </p>
              <h3 className="text-2xl font-black text-amber-600 dark:text-amber-300 mt-1">
                {metrics.lowStockCount}
              </h3>
              <p className="text-[11px] text-amber-700 dark:text-amber-400 font-semibold mt-1 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" /> Below reorder threshold
              </p>
            </div>
            <div className="p-3 rounded-2xl bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 group-hover:scale-110 transition-transform">
              <AlertTriangle className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-amber-100 dark:border-amber-800/60 flex justify-between text-xs text-amber-900 dark:text-amber-300">
            <span>Action Needed</span>
            <span className="font-bold">Reorder recommended</span>
          </div>
        </div>

        {/* Box 4: Out of Stock / Disabled */}
        <div className="bg-white dark:bg-emerald-900/40 p-5 rounded-3xl border border-rose-100 dark:border-rose-900/60 shadow-sm relative overflow-hidden group hover:border-rose-300 transition-all">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-bold text-rose-700 dark:text-rose-400 uppercase tracking-wider">
                Out of Stock / Disabled
              </p>
              <h3 className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-1">
                {metrics.outOfStockCount}
              </h3>
              <p className="text-[11px] text-rose-600 dark:text-rose-400 font-semibold mt-1 flex items-center gap-1">
                <XCircle className="w-3.5 h-3.5" /> 0 Units remaining
              </p>
            </div>
            <div className="p-3 rounded-2xl bg-rose-100 dark:bg-rose-900/50 text-rose-600 dark:text-rose-300 group-hover:scale-110 transition-transform">
              <Ban className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-rose-100 dark:border-rose-900/60 flex justify-between text-xs text-rose-800 dark:text-rose-300">
            <span>Catalog Impact</span>
            <span className="font-bold">Unavailable online</span>
          </div>
        </div>

      </div>

      {/* ================= ADVANCED FILTER BAR ================= */}
      <div className="bg-white dark:bg-emerald-900/40 p-4 rounded-3xl border border-emerald-100 dark:border-emerald-800 shadow-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 text-xs">
          
          {/* Search Input */}
          <div className="relative sm:col-span-2">
            <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
            <input
              type="text"
              placeholder="Search SKU, English name, Tamil name, or Festival..."
              value={searchQuery}
              onChange={(e) => handleFilterChange(setSearchQuery, e.target.value)}
              className="w-full pl-9 pr-8 py-2.5 bg-emerald-50/50 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-700 rounded-xl font-medium focus:outline-none dark:text-emerald-100"
            />
            {searchQuery && (
              <button 
                onClick={() => handleFilterChange(setSearchQuery, '')}
                className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Dynamic Category Filter displaying "English (Tamil)" */}
          <div>
            <select
              value={categoryFilter}
              onChange={(e) => handleFilterChange(setCategoryFilter, e.target.value)}
              className="w-full px-3 py-2.5 bg-emerald-50/50 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-700 rounded-xl font-bold dark:text-emerald-100"
            >
              <option value="all">🌾 All Categories ({categories.length})</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>
                  {c.icon || '🌾'} {getCategoryDisplayName(c)}
                </option>
              ))}
            </select>
          </div>

          {/* Stock Status Filter */}
          <div>
            <select
              value={stockStatusFilter}
              onChange={(e) => handleFilterChange(setStockStatusFilter, e.target.value)}
              className="w-full px-3 py-2.5 bg-emerald-50/50 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-700 rounded-xl font-bold dark:text-emerald-100"
            >
              <option value="all">📦 All Stock Statuses</option>
              <option value="in_stock">In Stock Only</option>
              <option value="low_stock">Low Stock Alerts</option>
              <option value="out_of_stock">Out of Stock (0)</option>
              <option value="disabled">Disabled SKUs</option>
            </select>
          </div>

          {/* Offer Price Filter */}
          <div>
            <select
              value={offerFilter}
              onChange={(e) => handleFilterChange(setOfferFilter, e.target.value as any)}
              className="w-full px-3 py-2.5 bg-emerald-50/50 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-700 rounded-xl font-bold dark:text-emerald-100"
            >
              <option value="all">🏷️ All Pricing (Any)</option>
              <option value="offer">🔥 Offer Price Active Only</option>
              <option value="regular">Regular Price (No Offer)</option>
            </select>
          </div>

          {/* Storefront Visibility Filter (Live / Not Live) */}
          <div>
            <select
              value={visibilityFilter}
              onChange={(e) => handleFilterChange(setVisibilityFilter, e.target.value as any)}
              className="w-full px-3 py-2.5 bg-emerald-50/50 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-700 rounded-xl font-bold dark:text-emerald-100"
            >
              <option value="all">👁️ All Storefront Status</option>
              <option value="live">🟢 Live on Storefront (Published)</option>
              <option value="not_live">⚪ Not Live (Draft / Hidden)</option>
            </select>
          </div>

          {/* Festival Deals Filter */}
          <div>
            <select
              value={festivalFilter}
              onChange={(e) => handleFilterChange(setFestivalFilter, e.target.value)}
              className="w-full px-3 py-2.5 bg-emerald-50/50 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-700 rounded-xl font-bold dark:text-emerald-100"
            >
              <option value="all">🎉 All Festive Deals</option>
              <option value="any_festival">✨ Any Festive Deal Active</option>
              <option value="🪔 Diwali Special Offer">🪔 Diwali Special Offer</option>
              <option value="🌾 Pongal Harvest Fest Offer">🌾 Pongal Harvest Fest Offer</option>
              <option value="🎉 New Year Special Deal">🎉 New Year Special Deal</option>
              <option value="🌱 Tamil New Year (Puthandu) Deal">🌱 Tamil New Year (Puthandu)</option>
              <option value="✨ Dussehra / Navratri Festive Offer">✨ Dussehra / Navratri</option>
              <option value="🪔 Karthigai Deepam Special">🪔 Karthigai Deepam</option>
            </select>
          </div>

          {/* Sort Dropdown */}
          <div>
            <select
              value={sortBy}
              onChange={(e) => handleFilterChange(setSortBy, e.target.value as any)}
              className="w-full px-3 py-2.5 bg-emerald-50/50 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-700 rounded-xl font-bold dark:text-emerald-100"
            >
              <option value="recent">⚡ Recent SKUs Top (Default)</option>
              <option value="name">Sort by: Name (A-Z)</option>
              <option value="sku">Sort by: SKU Code</option>
              <option value="price-asc">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
              <option value="stock-asc">Stock Level: Lowest First</option>
            </select>
          </div>

        </div>

        {/* Secondary Filter Row: Organic Status & Reset */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-emerald-100 dark:border-emerald-800/60 text-xs">
          <div className="flex items-center space-x-2">
            <span className="font-bold text-gray-600 dark:text-emerald-300">Organic Flag:</span>
            <button
              onClick={() => handleFilterChange(setOrganicFilter, 'all')}
              className={`px-3 py-1 rounded-lg font-bold transition-all ${
                organicFilter === 'all' 
                  ? 'bg-emerald-700 text-white' 
                  : 'bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200'
              }`}
            >
              All
            </button>
            <button
              onClick={() => handleFilterChange(setOrganicFilter, 'organic')}
              className={`px-3 py-1 rounded-lg font-bold flex items-center gap-1 transition-all ${
                organicFilter === 'organic' 
                  ? 'bg-emerald-700 text-white' 
                  : 'bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200'
              }`}
            >
              <Leaf className="w-3.5 h-3.5 text-emerald-400" /> Organic
            </button>
            <button
              onClick={() => handleFilterChange(setOrganicFilter, 'conventional')}
              className={`px-3 py-1 rounded-lg font-bold transition-all ${
                organicFilter === 'conventional' 
                  ? 'bg-emerald-700 text-white' 
                  : 'bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200'
              }`}
            >
              Conventional
            </button>
          </div>

          {(searchQuery || categoryFilter !== 'all' || stockStatusFilter !== 'all' || organicFilter !== 'all' || offerFilter !== 'all' || visibilityFilter !== 'all' || festivalFilter !== 'all' || sortBy !== 'recent') && (
            <button
              onClick={handleResetFilters}
              className="text-emerald-700 dark:text-amber-400 hover:underline font-bold flex items-center gap-1"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Reset All Filters
            </button>
          )}
        </div>
      </div>

      {/* ================= PRODUCT CATALOG TABLE ================= */}
      <div className="bg-white dark:bg-emerald-900/40 rounded-3xl border border-emerald-100 dark:border-emerald-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gradient-to-r from-emerald-950 via-emerald-900 to-emerald-950 text-emerald-100 font-bold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="p-3.5 text-center">
                  <input
                    type="checkbox"
                    checked={paginatedProducts.length > 0 && paginatedProducts.every(p => selectedProductIds.includes(p.id))}
                    onChange={() => {
                      const ids = paginatedProducts.map(p => p.id);
                      const isAll = ids.every(id => selectedProductIds.includes(id));
                      setSelectedProductIds(prev => isAll ? prev.filter(id => !ids.includes(id)) : Array.from(new Set([...prev, ...ids])));
                    }}
                    className="w-4 h-4 rounded text-emerald-800 focus:ring-emerald-500 cursor-pointer"
                  />
                </th>
                <th className="p-3.5">SKU Code</th>
                <th className="p-3.5">Produce &amp; Tamil Title</th>
                <th className="p-3.5">Category (EN / தமிழ்)</th>
                <th className="p-3.5">Landed Cost / MRP</th>
                <th className="p-3.5">Selling Price &amp; Deals</th>
                <th className="p-3.5">Store Stock &amp; Units</th>
                <th className="p-3.5">Live Status</th>
                <th className="p-3.5">Badges &amp; Festival Deals</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-emerald-100 dark:divide-emerald-800/60">
              {error ? (
                <tr>
                  <td colSpan={10} className="text-center py-12">
                    <div className="max-w-md mx-auto p-6 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-3xl text-center space-y-3 shadow-xs">
                      <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center mx-auto shadow-2xs">
                        <AlertTriangle className="w-6 h-6 text-rose-600" />
                      </div>
                      <h4 className="font-black text-rose-950 dark:text-rose-100 text-base">Unable to Load Products Catalog</h4>
                      <p className="text-xs text-rose-800 dark:text-rose-300 leading-relaxed font-medium">
                        {error}
                      </p>
                      <div className="pt-2">
                        <button
                          onClick={loadData}
                          className="px-4 py-2 bg-rose-700 hover:bg-rose-800 text-white font-bold text-xs rounded-xl shadow-xs inline-flex items-center gap-1.5 transition"
                        >
                          <RefreshCw className="w-3.5 h-3.5" /> Retry Fetching Products
                        </button>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={10} className="text-center py-12">
                    <div className="max-w-md mx-auto p-6 bg-emerald-50/50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-3xl text-center space-y-3 shadow-xs">
                      <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center mx-auto shadow-2xs">
                        <Boxes className="w-6 h-6 text-emerald-700" />
                      </div>
                      <h4 className="font-black text-emerald-950 dark:text-emerald-100 text-base">No Active Products in Catalog</h4>
                      <p className="text-xs text-gray-600 dark:text-emerald-300 leading-relaxed font-medium">
                        Currently there are no product records in the catalog. You can create a new SKU now or navigate to the dedicated product editor.
                      </p>
                      <div className="flex items-center justify-center gap-2 pt-2 flex-wrap">
                        <button
                          onClick={handleOpenAddProduct}
                          className="px-4 py-2 bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs rounded-xl shadow-xs inline-flex items-center gap-1.5 transition"
                        >
                          <Plus className="w-3.5 h-3.5" /> Add First Product
                        </button>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : paginatedProducts.length === 0 ? (
                <tr>
                  <td colSpan={10} className="text-center py-12 text-gray-500 dark:text-emerald-300">
                    <div className="max-w-md mx-auto p-6 bg-gray-50 dark:bg-emerald-950/30 border border-gray-200 dark:border-emerald-800 rounded-3xl text-center space-y-3 shadow-xs">
                      <div className="w-12 h-12 rounded-full bg-gray-200 text-gray-700 flex items-center justify-center mx-auto shadow-2xs">
                        <Search className="w-6 h-6 text-gray-500" />
                      </div>
                      <h4 className="font-black text-gray-900 dark:text-emerald-100 text-base">No Results Found</h4>
                      <p className="text-xs text-gray-500 dark:text-emerald-300 leading-relaxed">
                        No product SKUs match your current search query {searchQuery ? `"${searchQuery}"` : ''} or the selected filter criteria.
                      </p>
                      <div className="pt-2">
                        <button
                          onClick={resetProductFilters}
                          className="px-4 py-2 bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs rounded-xl shadow-xs inline-flex items-center gap-1.5 transition"
                        >
                          <RotateCcw className="w-3.5 h-3.5" /> Clear All Filters
                        </button>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedProducts.map((p) => {
                  const catObj = categories.find(c => c.id === p.category_id);
                  const isOutOfStock = p.current_stock === 0;
                  const isLowStock = p.current_stock > 0 && p.current_stock <= (p.reorder_level || 5);
                  const hasOffer = Boolean(p.offer_price && p.offer_price > 0 && p.offer_price < p.selling_price);

                  return (
                    <tr key={p.id} className="hover:bg-emerald-50/60 dark:hover:bg-emerald-900/50 transition-colors">
                      <td className="p-3.5 text-center">
                        <input
                          type="checkbox"
                          checked={selectedProductIds.includes(p.id)}
                          onChange={() => setSelectedProductIds(prev => prev.includes(p.id) ? prev.filter(x => x !== p.id) : [...prev, p.id])}
                          className="w-4 h-4 rounded text-emerald-800 focus:ring-emerald-500 cursor-pointer"
                        />
                      </td>
                      {/* SKU Code */}
                      <td className="p-3.5 font-mono font-bold text-emerald-900 dark:text-amber-300">
                        <div className="flex items-center gap-1.5">
                          <span>{p.sku}</span>
                        </div>
                      </td>

                      {/* Produce & Tamil Title */}
                      <td className="p-3.5">
                        <div className="flex items-center space-x-3">
                          <div className="relative shrink-0">
                            <img 
                              src={p.image_url || 'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=150&q=80'} 
                              alt={p.name} 
                              className="w-11 h-11 object-cover rounded-xl border border-emerald-200 dark:border-emerald-700 shadow-2xs"
                            />
                            {p.is_organic && (
                              <span className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-600 rounded-full flex items-center justify-center text-[9px] text-white" title="100% Certified Organic">
                                🌱
                              </span>
                            )}
                          </div>
                          <div>
                            <div className="font-bold text-gray-900 dark:text-emerald-100 text-sm">
                              {p.name}
                            </div>
                            {p.tamil_name && (
                              <div className="text-xs text-emerald-700 dark:text-emerald-400 font-semibold">
                                {p.tamil_name}
                              </div>
                            )}
                            <div className="text-[10px] text-gray-500 dark:text-emerald-400/80 font-medium mt-0.5">
                              Pack: <span className="font-bold text-slate-700 dark:text-emerald-300">{p.pack_size || `1 ${p.unit}`}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="p-3.5 font-semibold text-gray-700 dark:text-emerald-200">
                        <span className="inline-flex items-center gap-1.5 font-bold px-2.5 py-1 rounded-xl bg-emerald-50 dark:bg-emerald-950/70 border border-emerald-100 dark:border-emerald-800 text-xs">
                          <span>{catObj?.icon || '🌾'}</span>
                          <span>{getCategoryDisplayName(catObj)}</span>
                        </span>
                      </td>

                      {/* Landed Cost / MRP (High Contrast & Enlarged) */}
                      <td className="p-3.5">
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-[10px] uppercase font-black text-slate-500 dark:text-emerald-400">Cost:</span>
                          <span className="text-base font-black font-mono text-slate-900 dark:text-emerald-100">
                            {formatPrice(p.landed_cost || p.purchase_price)}
                          </span>
                        </div>
                        <div className="flex items-baseline gap-1.5 mt-0.5">
                          <span className="text-[10px] uppercase font-bold text-rose-500">MRP:</span>
                          <span className="text-xs font-black font-mono text-rose-500 dark:text-rose-400 line-through">
                            {formatPrice(p.mrp)}
                          </span>
                        </div>
                        {p.landed_cost && p.purchase_price && p.landed_cost !== p.purchase_price && (
                          <div className="text-[9px] text-slate-400 dark:text-emerald-400/70 font-mono mt-0.5">
                            Base: {formatPrice(p.purchase_price)}
                          </div>
                        )}
                      </td>

                      {/* Selling Price & Deals */}
                      <td className="p-3.5">
                        <div className="font-black text-emerald-800 dark:text-amber-400 text-base font-mono">
                          {formatPrice(p.offer_price || p.selling_price)}
                        </div>
                        {hasOffer ? (
                          <div className="flex flex-wrap items-center gap-1 mt-1">
                            <span className="inline-flex items-center gap-1 text-[10px] bg-rose-600 text-white px-2 py-0.5 rounded-full font-black shadow-xs animate-pulse">
                              <span>🔥 Offer Active</span>
                              <span>({Math.round(((p.selling_price - p.offer_price!) / p.selling_price) * 100)}% OFF)</span>
                            </span>
                            <span className="text-[10px] text-slate-400 line-through font-mono">
                              {formatPrice(p.selling_price)}
                            </span>
                          </div>
                        ) : p.mrp > p.selling_price ? (
                          <div className="mt-0.5">
                            <span className="text-[10px] text-emerald-800 dark:text-emerald-300 font-extrabold bg-emerald-100 dark:bg-emerald-950 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                              Save {Math.round(((p.mrp - p.selling_price) / p.mrp) * 100)}% vs MRP
                            </span>
                          </div>
                        ) : (
                          <div className="text-[10px] text-slate-400 dark:text-emerald-400/60 font-semibold mt-0.5">
                            Regular Price
                          </div>
                        )}
                      </td>

                      {/* Store Stock & Units */}
                      <td className="p-3.5">
                        <div className="space-y-1">
                          <button
                            type="button"
                            onClick={() => {
                              setQuickStockProduct(p);
                              setQuickStockAmount(5);
                              setQuickStockMode('ADD');
                              setQuickStockReason('');
                            }}
                            className={`px-3 py-1.5 rounded-xl font-bold font-mono text-xs cursor-pointer hover:ring-2 hover:ring-emerald-400 transition-all flex items-center gap-2 shadow-xs group ${
                              isOutOfStock
                                ? 'bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-300 border border-rose-300 dark:border-rose-700'
                                : isLowStock
                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300 border border-amber-300 dark:border-amber-700' 
                                : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700'
                            }`}
                            title="Click + to refill or adjust inventory"
                          >
                            <span className="font-black text-sm">{p.current_stock}</span>
                            <span className="text-[11px] font-semibold opacity-80">{p.unit}</span>
                            <div className="w-5 h-5 rounded-md bg-white/80 dark:bg-emerald-800/80 flex items-center justify-center text-emerald-800 dark:text-amber-300 group-hover:scale-110 transition-transform">
                              <Plus className="w-3.5 h-3.5" />
                            </div>
                          </button>
                          <div>
                            {isOutOfStock ? (
                              <span className="text-[9px] font-black text-rose-600 dark:text-rose-400 uppercase tracking-wide">
                                ● Out of Stock
                              </span>
                            ) : isLowStock ? (
                              <span className="text-[9px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-wide">
                                ⚠️ Low Stock (Min: {p.reorder_level || 5})
                              </span>
                            ) : (
                              <span className="text-[9px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-wide">
                                ✓ Healthy Stock
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Live Status (Renamed from Status, Live vs Draft) */}
                      <td className="p-3.5">
                        <button
                          type="button"
                          onClick={() => handleToggleVisibility(p)}
                          className="group flex flex-col items-start gap-1 cursor-pointer text-left"
                          title={p.is_visible !== false ? 'Click to set as Draft (Hide from Storefront)' : 'Click to publish Live'}
                        >
                          {p.is_visible !== false ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-black bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700 shadow-xs group-hover:ring-2 group-hover:ring-emerald-400 transition-all">
                              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                              <span>🟢 Live</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-black bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-300 dark:border-slate-700 shadow-xs group-hover:ring-2 group-hover:ring-slate-400 transition-all">
                              <span className="w-2 h-2 rounded-full bg-slate-400" />
                              <span>⚪ Draft</span>
                            </span>
                          )}
                          <span className="text-[9px] text-slate-400 dark:text-emerald-400/70 font-semibold group-hover:underline">
                            {p.is_visible !== false ? 'Public on website' : 'Hidden from public'}
                          </span>
                        </button>
                      </td>

                      {/* Badges & Festival Deals */}
                      <td className="p-3.5 space-y-1">
                        {p.festival_offer && (
                          <div>
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-gradient-to-r from-amber-500 via-rose-500 to-amber-600 text-white shadow-xs border border-amber-300 animate-pulse">
                              <Sparkles className="w-3 h-3 text-amber-200" />
                              <span>{p.festival_offer}</span>
                            </span>
                          </div>
                        )}
                        <div className="flex flex-wrap items-center gap-1">
                          {p.is_organic && (
                            <span className="text-emerald-700 dark:text-emerald-300 font-extrabold text-[10px] inline-flex items-center gap-0.5 bg-emerald-100/70 dark:bg-emerald-950 px-1.5 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                              <Leaf className="w-2.5 h-2.5 text-emerald-600" /> Organic
                            </span>
                          )}
                          {p.is_featured && (
                            <span className="text-amber-700 dark:text-amber-300 font-extrabold text-[10px] inline-flex items-center gap-0.5 bg-amber-100/70 dark:bg-amber-950 px-1.5 py-0.5 rounded border border-amber-200 dark:border-amber-800">
                              <Sparkles className="w-2.5 h-2.5 text-amber-500" /> Featured
                            </span>
                          )}
                          {p.labels && p.labels.slice(0, 2).map((lbl) => (
                            <span key={lbl} className="text-[9px] font-bold bg-slate-100 dark:bg-emerald-950 text-slate-700 dark:text-emerald-300 px-1.5 py-0.2 rounded border border-slate-200 dark:border-emerald-800">
                              {lbl}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="p-3.5 text-right space-x-1.5">
                        <button
                          onClick={() => setShowHistoryModal(p)}
                          className="p-1.5 rounded-lg text-gray-500 hover:text-emerald-700 dark:hover:text-amber-300 hover:bg-emerald-100 dark:hover:bg-emerald-800 transition"
                          title="View Price Audit Log"
                        >
                          <History className="w-4 h-4" />
                        </button>
                        {/* Edit Dropdown (Quick Edit vs Detailed Edit) */}
                        <div className="relative inline-block text-left">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditDropdownId(editDropdownId === p.id ? null : p.id);
                            }}
                            className={`p-1.5 rounded-lg transition font-bold flex items-center gap-0.5 cursor-pointer ${
                              editDropdownId === p.id
                                ? 'bg-emerald-600 text-white shadow-sm'
                                : 'text-emerald-700 hover:text-emerald-900 dark:text-amber-400 hover:bg-emerald-100 dark:hover:bg-emerald-800'
                            }`}
                            title="Edit Product Options"
                          >
                            <Edit2 className="w-4 h-4" />
                            <ChevronRight className={`w-3 h-3 transition-transform ${editDropdownId === p.id ? 'rotate-90' : ''}`} />
                          </button>

                          {editDropdownId === p.id && (
                            <div
                              onClick={(e) => e.stopPropagation()}
                              className="absolute right-0 mt-1 w-52 rounded-2xl bg-white dark:bg-emerald-950 shadow-2xl border border-emerald-200 dark:border-emerald-800 py-1.5 z-30 animate-fadeIn text-left"
                            >
                              <div className="px-3 py-1.5 border-b border-emerald-100 dark:border-emerald-800/80">
                                <span className="text-[10px] font-black uppercase tracking-wider text-gray-500 dark:text-emerald-300">
                                  Select Edit Mode
                                </span>
                              </div>

                              <button
                                type="button"
                                onClick={() => {
                                  setEditDropdownId(null);
                                  handleOpenEditProduct(p);
                                }}
                                className="w-full px-3 py-2 text-xs font-bold text-gray-700 dark:text-emerald-100 hover:bg-emerald-50 dark:hover:bg-emerald-900/60 flex items-center gap-2 transition cursor-pointer text-left"
                              >
                                <Zap className="w-4 h-4 text-amber-500 shrink-0" />
                                <div>
                                  <div className="font-extrabold text-emerald-900 dark:text-amber-300">⚡ Quick Edit</div>
                                  <div className="text-[10px] text-gray-500 dark:text-emerald-400 font-normal">Fast price, stock & modal specs</div>
                                </div>
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  setEditDropdownId(null);
                                  navigate(`/admin/products/edit/${p.id}`);
                                }}
                                className="w-full px-3 py-2 text-xs font-bold text-gray-700 dark:text-emerald-100 hover:bg-emerald-50 dark:hover:bg-emerald-900/60 flex items-center gap-2 transition cursor-pointer border-t border-emerald-50 dark:border-emerald-900/40 text-left"
                              >
                                <FileEdit className="w-4 h-4 text-emerald-600 dark:text-emerald-300 shrink-0" />
                                <div>
                                  <div className="font-extrabold text-emerald-900 dark:text-emerald-200">📝 Detailed Edit</div>
                                  <div className="text-[10px] text-gray-500 dark:text-emerald-400 font-normal">Full-page editor & descriptions</div>
                                </div>
                              </button>
                            </div>
                          )}
                        </div>
                        <button
                          onClick={() => setDeletingProduct(p)}
                          className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950 transition"
                          title="Delete Product SKU"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* ================= PAGINATION CONTROLS ================= */}
        <div className="p-4 bg-emerald-50/60 dark:bg-emerald-950 border-t border-emerald-100 dark:border-emerald-800/60 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs">
          
          <div className="flex items-center space-x-3 text-gray-600 dark:text-emerald-300 font-medium">
            <span>Showing <strong className="text-emerald-950 dark:text-emerald-100">{filteredProducts.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1}</strong> to <strong className="text-emerald-950 dark:text-emerald-100">{Math.min(currentPage * itemsPerPage, filteredProducts.length)}</strong> of <strong className="text-emerald-950 dark:text-emerald-100">{filteredProducts.length}</strong> items</span>
            <div className="flex items-center space-x-1 pl-3 border-l border-emerald-200 dark:border-emerald-800">
              <span>Per page:</span>
              <select
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="px-2 py-1 bg-white dark:bg-emerald-900 border border-emerald-200 dark:border-emerald-700 rounded-lg font-bold"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </div>
          </div>

          <div className="flex items-center space-x-1">
            <button
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
              className="p-1.5 rounded-lg border border-emerald-200 dark:border-emerald-700 bg-white dark:bg-emerald-900 text-gray-700 dark:text-emerald-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-emerald-100"
              title="First Page"
            >
              <ChevronsLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded-lg border border-emerald-200 dark:border-emerald-700 bg-white dark:bg-emerald-900 text-gray-700 dark:text-emerald-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-emerald-100"
              title="Previous Page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="px-3 py-1 font-bold text-emerald-950 dark:text-emerald-100">
              Page {currentPage} of {totalPages}
            </span>

            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded-lg border border-emerald-200 dark:border-emerald-700 bg-white dark:bg-emerald-900 text-gray-700 dark:text-emerald-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-emerald-100"
              title="Next Page"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded-lg border border-emerald-200 dark:border-emerald-700 bg-white dark:bg-emerald-900 text-gray-700 dark:text-emerald-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-emerald-100"
              title="Last Page"
            >
              <ChevronsRight className="w-4 h-4" />
            </button>
          </div>

        </div>
      </div>

      {/* Floating Action Bar for Selected Products */}
      {selectedProductIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-gray-900/95 backdrop-blur-md text-white px-5 py-3 rounded-2xl shadow-2xl border border-gray-700 flex items-center gap-3 animate-fadeIn flex-wrap justify-center">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-extrabold text-xs">
              {selectedProductIds.length} product(s) selected
            </span>
          </div>
          <div className="h-4 w-px bg-gray-700 hidden sm:block" />
          <button
            onClick={handleBulkExportSelectedProducts}
            className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-amber-300" />
            Export Selected
          </button>
          <button
            onClick={() => handleBulkToggleVisibility(true)}
            className="px-3 py-1.5 bg-indigo-700 hover:bg-indigo-600 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
          >
            <Eye className="w-3.5 h-3.5" />
            Set Live
          </button>
          <button
            onClick={() => handleBulkToggleVisibility(false)}
            className="px-3 py-1.5 bg-amber-700 hover:bg-amber-600 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
          >
            <EyeOff className="w-3.5 h-3.5" />
            Hide
          </button>
          <button
            onClick={handleBulkDeleteProducts}
            className="px-3 py-1.5 bg-rose-700 hover:bg-rose-600 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Delete Selected
          </button>
          <button
            onClick={() => setSelectedProductIds([])}
            className="px-2.5 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl text-xs font-bold transition cursor-pointer"
          >
            Clear
          </button>
        </div>
      )}

      {/* ================= USER-FRIENDLY EDIT / ADD PRODUCT MODAL ================= */}
      {editingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto animate-fadeIn">
          <div className="bg-white dark:bg-emerald-950 max-w-4xl w-full p-4 sm:p-6 rounded-3xl shadow-2xl border border-emerald-200 dark:border-emerald-800 space-y-4 my-auto max-h-[94vh] flex flex-col justify-between">
            
            {/* Modal Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-emerald-100 dark:border-emerald-800/80 pb-3.5">
              <div className="flex items-center space-x-3">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white flex items-center justify-center font-bold shadow-md shadow-emerald-700/20">
                  <Boxes className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-extrabold text-base sm:text-lg text-gray-900 dark:text-emerald-100">
                      {isNewProduct ? '✨ Add New Product SKU' : `Edit Product SKU: ${editingProduct.sku}`}
                    </h3>
                    <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full flex items-center gap-1.5 border ${
                      editingProduct.is_visible 
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/80 dark:text-emerald-200 border-emerald-300 dark:border-emerald-700' 
                        : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 border-gray-300 dark:border-gray-700'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${editingProduct.is_visible ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400'}`} />
                      {editingProduct.is_visible ? 'Live on Storefront' : 'Hidden from Store'}
                    </span>
                    {editingProduct.is_organic && (
                      <span className="bg-emerald-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-0.5">
                        <Leaf className="w-3 h-3" /> Organic
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-gray-500 dark:text-emerald-300 mt-0.5">
                    Configure product attributes, instant pricing margins, photo carousel, and website live display.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-center">
                <button
                  type="button"
                  onClick={() => setShowPreviewModal(true)}
                  className="flex items-center gap-1.5 text-xs font-extrabold px-3 py-1.5 rounded-xl bg-amber-500/15 text-amber-700 dark:text-amber-300 hover:bg-amber-500/25 border border-amber-400/40 transition cursor-pointer"
                  title="Live Website Storefront Preview"
                >
                  <Eye className="w-3.5 h-3.5 text-amber-500" />
                  <span className="hidden xs:inline">Quick Store Preview</span>
                </button>
                <button 
                  type="button"
                  onClick={() => setEditingProduct(null)} 
                  className="p-2 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-emerald-900 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Navigation Tabs Bar */}
            <div className="flex border-b border-emerald-100 dark:border-emerald-800/80 overflow-x-auto gap-1">
              <button
                type="button"
                onClick={() => setActiveProductTab('basic')}
                className={`py-2 px-3 text-xs font-black whitespace-nowrap border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeProductTab === 'basic'
                    ? 'border-emerald-600 dark:border-amber-400 text-emerald-800 dark:text-amber-300 bg-emerald-50/70 dark:bg-emerald-900/50 rounded-t-xl'
                    : 'border-transparent text-gray-500 dark:text-emerald-400 hover:text-emerald-700 hover:bg-emerald-50/30'
                }`}
              >
                <Tag className="w-3.5 h-3.5" />
                <span>1. Basic Info</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveProductTab('pricing')}
                className={`py-2 px-3 text-xs font-black whitespace-nowrap border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeProductTab === 'pricing'
                    ? 'border-emerald-600 dark:border-amber-400 text-emerald-800 dark:text-amber-300 bg-emerald-50/70 dark:bg-emerald-900/50 rounded-t-xl'
                    : 'border-transparent text-gray-500 dark:text-emerald-400 hover:text-emerald-700 hover:bg-emerald-50/30'
                }`}
              >
                <DollarSign className="w-3.5 h-3.5" />
                <span>2. Pricing & Stock</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveProductTab('details')}
                className={`py-2 px-3 text-xs font-black whitespace-nowrap border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeProductTab === 'details'
                    ? 'border-emerald-600 dark:border-amber-400 text-emerald-800 dark:text-amber-300 bg-emerald-50/70 dark:bg-emerald-900/50 rounded-t-xl'
                    : 'border-transparent text-gray-500 dark:text-emerald-400 hover:text-emerald-700 hover:bg-emerald-50/30'
                }`}
              >
                <Info className="w-3.5 h-3.5" />
                <span>3. Details & Story</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveProductTab('media')}
                className={`py-2 px-3 text-xs font-black whitespace-nowrap border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeProductTab === 'media'
                    ? 'border-emerald-600 dark:border-amber-400 text-emerald-800 dark:text-amber-300 bg-emerald-50/70 dark:bg-emerald-900/50 rounded-t-xl'
                    : 'border-transparent text-gray-500 dark:text-emerald-400 hover:text-emerald-700 hover:bg-emerald-50/30'
                }`}
              >
                <Image className="w-3.5 h-3.5" />
                <span>4. Media & Carousel</span>
                {editingProduct.images && editingProduct.images.length > 0 && (
                  <span className="text-[10px] bg-emerald-700 text-white px-1.5 py-0.2 rounded-full font-mono">
                    {editingProduct.images.length}
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={() => setActiveProductTab('preview')}
                className={`py-2 px-3 text-xs font-black whitespace-nowrap border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeProductTab === 'preview'
                    ? 'border-amber-500 dark:border-amber-400 text-amber-700 dark:text-amber-300 bg-amber-50/70 dark:bg-emerald-900/60 rounded-t-xl'
                    : 'border-transparent text-gray-500 dark:text-emerald-400 hover:text-emerald-700 hover:bg-emerald-50/30'
                }`}
              >
                <Eye className="w-3.5 h-3.5 text-amber-500" />
                <span>5. Storefront Preview</span>
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-4 text-xs overflow-y-auto pr-1">
              
              {/* TAB 1: BASIC SPECS */}
              {activeProductTab === 'basic' && (
                <div className="space-y-4 animate-fadeIn">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className="font-black text-gray-700 dark:text-emerald-200 flex items-center gap-1">
                          <Tag className="w-3.5 h-3.5 text-emerald-600 dark:text-amber-400" />
                          <span>SKU Code *</span>
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            const newSku = `LIF-${Math.floor(1000 + Math.random() * 9000)}`;
                            setEditingProduct({ ...editingProduct, sku: newSku });
                            toast.success(`Generated SKU: ${newSku}`);
                          }}
                          className="text-[10px] font-bold text-emerald-700 dark:text-amber-400 hover:underline flex items-center gap-0.5"
                        >
                          <Sparkles className="w-3 h-3" /> Auto SKU
                        </button>
                      </div>
                      <input
                        type="text"
                        required
                        value={editingProduct.sku}
                        onChange={(e) => setEditingProduct({ ...editingProduct, sku: e.target.value })}
                        className="w-full p-2.5 bg-emerald-50/50 dark:bg-emerald-900 border border-emerald-300 dark:border-emerald-700 rounded-xl font-mono font-extrabold text-emerald-900 dark:text-amber-300 focus:ring-2 focus:ring-emerald-500 outline-none"
                      />
                    </div>

                    <div>
                      <label className="font-black text-gray-700 dark:text-emerald-200 block mb-1">
                        English Product Name *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Mapillai Samba Traditional Rice"
                        value={editingProduct.name}
                        onChange={(e) => setEditingProduct({ 
                          ...editingProduct, 
                          name: e.target.value,
                          slug: e.target.value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '')
                        })}
                        className="w-full p-2.5 bg-emerald-50/50 dark:bg-emerald-900 border border-emerald-300 dark:border-emerald-700 rounded-xl font-bold text-gray-900 dark:text-emerald-100 focus:ring-2 focus:ring-emerald-500 outline-none"
                      />
                    </div>

                    <div>
                      <label className="font-black text-gray-700 dark:text-emerald-200 block mb-1">
                        Tamil Name (தமிழ்)
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. மாப்பிள்ளை சம்பா அரிசி"
                        value={editingProduct.tamil_name || ''}
                        onChange={(e) => setEditingProduct({ ...editingProduct, tamil_name: e.target.value })}
                        className="w-full p-2.5 bg-emerald-50/50 dark:bg-emerald-900 border border-emerald-300 dark:border-emerald-700 rounded-xl font-bold text-emerald-800 dark:text-amber-300 focus:ring-2 focus:ring-emerald-500 outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className="font-black text-gray-700 dark:text-emerald-200">Category *</label>
                        <button
                          type="button"
                          onClick={handleOpenAddCategory}
                          className="text-[10px] text-emerald-700 dark:text-amber-400 font-extrabold hover:underline"
                        >
                          + New Category
                        </button>
                      </div>
                      <select
                        value={editingProduct.category_id || ''}
                        onChange={(e) => setEditingProduct({ ...editingProduct, category_id: e.target.value })}
                        className="w-full p-2.5 bg-emerald-50/50 dark:bg-emerald-900 border border-emerald-300 dark:border-emerald-700 rounded-xl font-bold text-gray-900 dark:text-emerald-100 focus:ring-2 focus:ring-emerald-500 outline-none"
                      >
                        {categories.map(c => (
                          <option key={c.id} value={c.id}>
                            {c.icon || '🌾'} {getCategoryDisplayName(c)}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="font-black text-gray-700 dark:text-emerald-200 block mb-1">Supplier *</label>
                      <select
                        value={editingProduct.supplier_id || ''}
                        onChange={(e) => setEditingProduct({ ...editingProduct, supplier_id: e.target.value })}
                        className="w-full p-2.5 bg-emerald-50/50 dark:bg-emerald-900 border border-emerald-300 dark:border-emerald-700 rounded-xl font-bold text-gray-900 dark:text-emerald-100 focus:ring-2 focus:ring-emerald-500 outline-none"
                      >
                        {suppliers.map((s: Supplier) => (
                          <option key={s.id} value={s.id}>{s.name} ({s.district || 'Tamil Nadu'})</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="font-black text-gray-700 dark:text-emerald-200 block mb-1">Pack Size & Unit</label>
                      <div className="flex items-center space-x-2">
                        <input
                          type="text"
                          placeholder="e.g. 500g / 1 kg"
                          value={editingProduct.pack_size || ''}
                          onChange={(e) => setEditingProduct({ ...editingProduct, pack_size: e.target.value })}
                          className="w-2/3 p-2.5 bg-emerald-50/50 dark:bg-emerald-900 border border-emerald-300 dark:border-emerald-700 rounded-xl font-bold text-gray-900 dark:text-emerald-100 focus:ring-2 focus:ring-emerald-500 outline-none"
                        />
                        <select
                          value={editingProduct.unit}
                          onChange={(e) => setEditingProduct({ ...editingProduct, unit: e.target.value })}
                          className="w-1/3 p-2.5 bg-emerald-50/50 dark:bg-emerald-900 border border-emerald-300 dark:border-emerald-700 rounded-xl font-bold text-gray-900 dark:text-emerald-100 focus:ring-2 focus:ring-emerald-500 outline-none"
                        >
                          <option value="kg">kg</option>
                          <option value="grams">grams</option>
                          <option value="litres">litres</option>
                          <option value="ml">ml</option>
                          <option value="pcs">pcs</option>
                          <option value="pack">pack</option>
                          <option value="box">box</option>
                          <option value="bunch">bunch</option>
                        </select>
                      </div>

                      {/* Quick Pack Size Presets */}
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {[
                          { label: '500g', unit: 'grams' },
                          { label: '1 kg', unit: 'kg' },
                          { label: '2 kg', unit: 'kg' },
                          { label: '5 kg', unit: 'kg' },
                          { label: '250 ml', unit: 'ml' },
                          { label: '500 ml', unit: 'ml' },
                          { label: '1 Litre', unit: 'litres' },
                          { label: 'Combo', unit: 'pack' }
                        ].map((preset, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => setEditingProduct({ ...editingProduct, pack_size: preset.label, unit: preset.unit })}
                            className="text-[10px] px-2 py-0.5 rounded-lg bg-emerald-100 dark:bg-emerald-900/80 text-emerald-800 dark:text-emerald-200 font-extrabold hover:bg-emerald-200 border border-emerald-300 dark:border-emerald-700 transition cursor-pointer"
                          >
                            {preset.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Live Storefront Route & Slug Preview */}
                  <div className="p-3 bg-emerald-50/60 dark:bg-emerald-900/40 rounded-2xl border border-emerald-200 dark:border-emerald-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Globe className="w-4 h-4 text-emerald-600 dark:text-amber-400 shrink-0" />
                      <div className="text-xs">
                        <span className="text-gray-500 dark:text-emerald-300 font-medium">Public Storefront Route: </span>
                        <span className="font-mono font-bold text-emerald-800 dark:text-amber-300">
                          /products/{editingProduct.slug || 'product-slug'}
                        </span>
                      </div>
                    </div>
                    <span className="text-[10px] bg-emerald-200 dark:bg-emerald-800 text-emerald-900 dark:text-emerald-200 px-2 py-0.5 rounded-md font-mono">
                      SEO Friendly
                    </span>
                  </div>
                </div>
              )}

              {/* TAB 2: PRICING & STOCK CONTROL */}
              {activeProductTab === 'pricing' && (() => {
                const effectivePrice = (editingProduct.offer_price && editingProduct.offer_price > 0 && editingProduct.offer_price < editingProduct.selling_price)
                  ? editingProduct.offer_price
                  : editingProduct.selling_price;
                const purchasePrice = editingProduct.purchase_price || 0;
                const mrp = editingProduct.mrp || 0;
                const grossMarginAmt = effectivePrice - purchasePrice;
                const grossMarginPct = effectivePrice > 0 && purchasePrice > 0 
                  ? Math.round((grossMarginAmt / effectivePrice) * 100) 
                  : 0;
                const customerSavingsAmt = mrp > effectivePrice ? (mrp - effectivePrice) : 0;
                const customerSavingsPct = mrp > 0 && mrp > effectivePrice 
                  ? Math.round((customerSavingsAmt / mrp) * 100) 
                  : 0;
                const taxRate = editingProduct.tax_percent || 0;
                const basePriceExclTax = taxRate > 0 ? (effectivePrice / (1 + (taxRate / 100))) : effectivePrice;
                const gstAmount = effectivePrice - basePriceExclTax;

                return (
                  <div className="space-y-4 animate-fadeIn">
                    {/* Live Margin, Discount & GST Metrics Bar */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3.5 bg-gradient-to-br from-emerald-900/90 to-teal-950 text-white rounded-2xl border border-emerald-700/80 shadow-md">
                      <div className="border-r border-emerald-800/80 pr-2">
                        <span className="text-[10px] text-emerald-300 font-bold block uppercase tracking-wider">
                          Effective Price
                        </span>
                        <div className="text-base font-black text-amber-300 flex items-center gap-1 font-mono">
                          {formatPrice(effectivePrice)}
                          {editingProduct.offer_price && editingProduct.offer_price < editingProduct.selling_price && (
                            <span className="text-[9px] bg-rose-600 text-white px-1.5 py-0.2 rounded font-sans">
                              OFFER
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-emerald-400">Customer pays</span>
                      </div>

                      <div className="border-r border-emerald-800/80 pr-2">
                        <span className="text-[10px] text-emerald-300 font-bold block uppercase tracking-wider">
                          Gross Margin
                        </span>
                        <div className={`text-base font-black font-mono flex items-center gap-1 ${grossMarginAmt >= 0 ? 'text-emerald-300' : 'text-rose-400'}`}>
                          {formatPrice(grossMarginAmt)}
                          <span className="text-xs">({grossMarginPct}%)</span>
                        </div>
                        <span className="text-[10px] text-emerald-400">Profit vs Purchase</span>
                      </div>

                      <div className="border-r border-emerald-800/80 pr-2">
                        <span className="text-[10px] text-emerald-300 font-bold block uppercase tracking-wider">
                          Buyer Savings
                        </span>
                        <div className="text-base font-black text-amber-300 font-mono flex items-center gap-1">
                          {formatPrice(customerSavingsAmt)}
                          {customerSavingsPct > 0 && <span className="text-xs">({customerSavingsPct}% OFF)</span>}
                        </div>
                        <span className="text-[10px] text-emerald-400">Discount vs MRP</span>
                      </div>

                      <div>
                        <span className="text-[10px] text-emerald-300 font-bold block uppercase tracking-wider">
                          GST Breakdown ({taxRate}%)
                        </span>
                        <div className="text-xs font-mono font-bold text-emerald-200">
                          Base: {formatPrice(basePriceExclTax)}
                        </div>
                        <div className="text-[10px] text-emerald-400 font-mono">
                          Tax: {formatPrice(gstAmount)}
                        </div>
                      </div>
                    </div>

                    {/* Pricing Inputs */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div>
                        <label className="font-black text-gray-700 dark:text-emerald-200 block mb-1">
                          Our Selling Price (₹) *
                        </label>
                        <input
                          type="number"
                          required
                          min="0"
                          step="0.01"
                          value={editingProduct.selling_price}
                          onChange={(e) => setEditingProduct({ ...editingProduct, selling_price: Number(e.target.value) })}
                          className="w-full p-2.5 bg-emerald-50/50 dark:bg-emerald-900 border border-emerald-300 dark:border-emerald-700 rounded-xl font-mono font-extrabold text-emerald-700 dark:text-emerald-300 focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
                        />
                      </div>

                      <div>
                        <label className="font-black text-rose-600 dark:text-amber-300 block mb-1">
                          🔥 Offer Price (₹)
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="Optional offer price"
                          value={editingProduct.offer_price || ''}
                          onChange={(e) => setEditingProduct({ ...editingProduct, offer_price: e.target.value ? Number(e.target.value) : undefined })}
                          className="w-full p-2.5 bg-amber-50/60 dark:bg-emerald-900 border border-rose-300 dark:border-rose-700 rounded-xl font-mono font-extrabold text-rose-600 dark:text-amber-300 focus:ring-2 focus:ring-rose-500 outline-none text-sm"
                        />
                      </div>

                      <div>
                        <label className="font-black text-gray-700 dark:text-emerald-200 block mb-1">MRP (₹)</label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={editingProduct.mrp}
                          onChange={(e) => setEditingProduct({ ...editingProduct, mrp: Number(e.target.value) })}
                          className="w-full p-2.5 bg-emerald-50/50 dark:bg-emerald-900 border border-emerald-300 dark:border-emerald-700 rounded-xl font-mono font-bold text-gray-700 dark:text-emerald-200 focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
                        />
                      </div>

                      <div>
                        <label className="font-black text-gray-700 dark:text-emerald-200 block mb-1">Purchase Price (₹)</label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={editingProduct.purchase_price}
                          onChange={(e) => setEditingProduct({ ...editingProduct, purchase_price: Number(e.target.value) })}
                          className="w-full p-2.5 bg-emerald-50/50 dark:bg-emerald-900 border border-emerald-300 dark:border-emerald-700 rounded-xl font-mono font-bold text-gray-700 dark:text-emerald-200 focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
                        />
                      </div>
                    </div>

                    {/* Quick Pricing Shortcuts */}
                    <div className="flex flex-wrap items-center gap-1.5 p-2 bg-emerald-50/60 dark:bg-emerald-900/40 rounded-xl border border-emerald-200 dark:border-emerald-800">
                      <span className="text-[10px] font-black text-gray-600 dark:text-emerald-300 mr-1 flex items-center gap-1">
                        <Percent className="w-3 h-3 text-emerald-600 dark:text-amber-400" />
                        Quick Markup:
                      </span>
                      {[
                        { label: '+20% Cost', calc: () => Math.round((editingProduct.purchase_price || 0) * 1.2) },
                        { label: '+30% Cost', calc: () => Math.round((editingProduct.purchase_price || 0) * 1.3) },
                        { label: '+50% Cost', calc: () => Math.round((editingProduct.purchase_price || 0) * 1.5) },
                        { label: '10% OFF MRP', calc: () => Math.round((editingProduct.mrp || 0) * 0.9) },
                        { label: '15% OFF MRP', calc: () => Math.round((editingProduct.mrp || 0) * 0.85) },
                      ].map((shortcut, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            const val = shortcut.calc();
                            if (val > 0) {
                              setEditingProduct({ ...editingProduct, selling_price: val });
                              toast.success(`Set Selling Price to ₹${val}`);
                            } else {
                              toast.error('Set Purchase Price or MRP first to use markup');
                            }
                          }}
                          className="text-[10px] font-extrabold px-2 py-0.5 rounded-lg bg-white dark:bg-emerald-800 text-emerald-800 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700 hover:bg-emerald-100 transition cursor-pointer"
                        >
                          {shortcut.label}
                        </button>
                      ))}
                      {editingProduct.offer_price && (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingProduct({ ...editingProduct, offer_price: undefined });
                            toast.success('Cleared Offer Price');
                          }}
                          className="text-[10px] font-extrabold px-2 py-0.5 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 transition cursor-pointer ml-auto"
                        >
                          ✕ Clear Offer
                        </button>
                      )}
                    </div>

                    {/* Festival Offer Deal Tag */}
                    <div className="p-3 bg-gradient-to-r from-amber-50 via-rose-50/50 to-amber-50 dark:from-emerald-950/60 dark:to-emerald-900/60 rounded-2xl border border-amber-300 dark:border-amber-700/80 space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="font-extrabold text-xs text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                          <Sparkles className="w-4 h-4 text-amber-500 animate-pulse" />
                          <span>🪔 Festival Offer Deal Tag (Live on Website & POS Cards)</span>
                        </label>
                        {editingProduct.festival_offer && (
                          <button
                            type="button"
                            onClick={() => {
                              setEditingProduct({ ...editingProduct, festival_offer: undefined });
                              toast.success('Festival offer cleared');
                            }}
                            className="text-[10px] text-rose-600 dark:text-rose-400 hover:underline font-bold cursor-pointer"
                          >
                            ✕ Clear Festival Tag
                          </button>
                        )}
                      </div>

                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="e.g. 🪔 Diwali Special Deal or 🌾 Pongal Harvest Deal"
                          value={editingProduct.festival_offer || ''}
                          onChange={(e) => setEditingProduct({ ...editingProduct, festival_offer: e.target.value || undefined })}
                          className="flex-1 p-2 bg-white dark:bg-emerald-900 border border-amber-300 dark:border-amber-700 rounded-xl font-bold text-amber-900 dark:text-amber-200 text-xs focus:ring-2 focus:ring-amber-500 outline-none"
                        />
                      </div>

                      {/* Quick Festival Presets */}
                      <div className="flex flex-wrap gap-1.5 pt-0.5">
                        {[
                          '🪔 Diwali Special Deal',
                          '🌾 Pongal Harvest Deal',
                          '✨ Ayudha Pooja Offer',
                          '🌿 Tamil New Year Special',
                          '🎉 New Year Grand Mega Deal',
                          '🪔 Karthigai Deepam Special'
                        ].map((preset) => (
                          <button
                            key={preset}
                            type="button"
                            onClick={() => {
                              setEditingProduct({ ...editingProduct, festival_offer: preset });
                              toast.success(`Tagged: ${preset}`);
                            }}
                            className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border transition cursor-pointer ${
                              editingProduct.festival_offer === preset
                                ? 'bg-amber-500 text-white border-amber-600 shadow-sm'
                                : 'bg-white/80 dark:bg-emerald-900 text-amber-900 dark:text-amber-300 border-amber-200 dark:border-emerald-700 hover:bg-amber-100 dark:hover:bg-emerald-800'
                            }`}
                          >
                            {preset}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Tax & Stock Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div>
                        <label className="font-black text-gray-700 dark:text-emerald-200 block mb-1">GST / Tax Rate (%)</label>
                        <select
                          value={editingProduct.tax_percent}
                          onChange={(e) => setEditingProduct({ ...editingProduct, tax_percent: Number(e.target.value) })}
                          className="w-full p-2.5 bg-emerald-50/50 dark:bg-emerald-900 border border-emerald-300 dark:border-emerald-700 rounded-xl font-bold text-gray-900 dark:text-emerald-100"
                        >
                          <option value={0}>0% (Exempt Grains / Rice / Pulses)</option>
                          <option value={5}>5% (Organic Spices & Flours)</option>
                          <option value={12}>12% (Cold-Pressed Oils & Combos)</option>
                          <option value={18}>18% (Value Added / Ready Mixes)</option>
                        </select>
                      </div>

                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <label className="font-black text-gray-700 dark:text-emerald-200">
                            Current Stock ({editingProduct.unit})
                          </label>
                        </div>
                        <input
                          type="number"
                          min="0"
                          value={editingProduct.current_stock}
                          onChange={(e) => {
                            const stock = Math.max(0, Number(e.target.value));
                            const status: StockStatus = stock <= 0 
                              ? 'OUT_OF_STOCK' 
                              : stock <= (editingProduct.reorder_level || 10) 
                              ? 'LOW_STOCK' 
                              : 'IN_STOCK';
                            setEditingProduct({ ...editingProduct, current_stock: stock, stock_status: status });
                          }}
                          className="w-full p-2.5 bg-emerald-50/50 dark:bg-emerald-900 border border-emerald-300 dark:border-emerald-700 rounded-xl font-mono font-extrabold text-emerald-700 dark:text-emerald-300"
                        />
                        {/* Quick Stock Adjustment Pills */}
                        <div className="flex gap-1 mt-1.5">
                          {[-10, 5, 10, 25, 50].map((adj) => (
                            <button
                              key={adj}
                              type="button"
                              onClick={() => {
                                const newStock = Math.max(0, (editingProduct.current_stock || 0) + adj);
                                const status: StockStatus = newStock <= 0 
                                  ? 'OUT_OF_STOCK' 
                                  : newStock <= (editingProduct.reorder_level || 10) 
                                  ? 'LOW_STOCK' 
                                  : 'IN_STOCK';
                                setEditingProduct({ ...editingProduct, current_stock: newStock, stock_status: status });
                                toast.success(`Stock adjusted to ${newStock} ${editingProduct.unit}`);
                              }}
                              className="text-[10px] font-mono font-extrabold px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-800 text-emerald-800 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700 hover:bg-emerald-200 cursor-pointer"
                            >
                              {adj > 0 ? `+${adj}` : adj}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="font-black text-gray-700 dark:text-emerald-200 block mb-1">Reorder Alert Level</label>
                        <input
                          type="number"
                          min="0"
                          value={editingProduct.reorder_level}
                          onChange={(e) => setEditingProduct({ ...editingProduct, reorder_level: Math.max(0, Number(e.target.value)) })}
                          className="w-full p-2.5 bg-emerald-50/50 dark:bg-emerald-900 border border-emerald-300 dark:border-emerald-700 rounded-xl font-mono font-bold text-amber-600 dark:text-amber-400"
                        />
                        <span className="text-[10px] text-gray-500 dark:text-emerald-400 block mt-1">Triggers low stock alert</span>
                      </div>

                      <div>
                        <label className="font-black text-gray-700 dark:text-emerald-200 block mb-1">Stock Status Flag</label>
                        <select
                          value={editingProduct.stock_status}
                          onChange={(e) => setEditingProduct({ ...editingProduct, stock_status: e.target.value as StockStatus })}
                          className="w-full p-2.5 bg-emerald-50/50 dark:bg-emerald-900 border border-emerald-300 dark:border-emerald-700 rounded-xl font-bold text-gray-900 dark:text-emerald-100"
                        >
                          <option value="IN_STOCK">IN_STOCK (Active & Available)</option>
                          <option value="LOW_STOCK">LOW_STOCK (Low Quantity Alert)</option>
                          <option value="OUT_OF_STOCK">OUT_OF_STOCK (Sold Out)</option>
                          <option value="DISABLED">DISABLED (Hidden from Catalog)</option>
                        </select>
                        <span className="text-[10px] text-gray-500 dark:text-emerald-400 block mt-1">Controls Buy button state</span>
                      </div>
                    </div>

                    {/* Live Storefront Stock Notice Simulator */}
                    <div className="p-3 bg-emerald-50/60 dark:bg-emerald-900/40 rounded-2xl border border-emerald-200 dark:border-emerald-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Package className="w-4 h-4 text-emerald-600 dark:text-amber-400 shrink-0" />
                        <span className="text-xs font-medium text-gray-600 dark:text-emerald-300">
                          Storefront Product Card Stock Badge:
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {editingProduct.current_stock <= 0 || editingProduct.stock_status === 'OUT_OF_STOCK' ? (
                          <span className="text-xs font-black px-3 py-1 rounded-full bg-rose-100 text-rose-700 border border-rose-300">
                            ❌ Out of Stock (Sold Out on Web)
                          </span>
                        ) : editingProduct.current_stock <= 20 ? (
                          <span className="text-xs font-black px-3 py-1 rounded-full bg-amber-100 text-amber-800 border border-amber-300 animate-pulse">
                            ⚡ Only {editingProduct.current_stock} left! (Hurry Up Notice)
                          </span>
                        ) : (
                          <span className="text-xs font-black px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                            ✓ In Stock & Ready to Dispatch
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* TAB 3: DESCRIPTIONS & SOURCING */}
              {activeProductTab === 'details' && (
                <div className="space-y-4 animate-fadeIn">
                  {/* Teaser Description */}
                  <div>
                    <label className="font-black text-gray-700 dark:text-emerald-200 block mb-1">
                      Short Teaser Description (Displays on public product cards & search lists)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Traditional high-stamina unpolished rice grown naturally in Thanjavur delta."
                      value={editingProduct.short_description || ''}
                      onChange={(e) => setEditingProduct({ ...editingProduct, short_description: e.target.value })}
                      className="w-full p-2.5 bg-emerald-50/50 dark:bg-emerald-900 border border-emerald-300 dark:border-emerald-700 rounded-xl font-medium text-gray-900 dark:text-emerald-100 focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                    {/* Quick Teaser Presets */}
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {[
                        '🌾 Traditional native unpolished heirloom grain from Tamil Nadu.',
                        '🥥 100% Pure single-origin cold-pressed (Wood Chekku) oil.',
                        '💪 High dietary fibre & low glycemic index for diabetic care.',
                        '🌿 Pure natural produce with zero pesticides and chemicals.'
                      ].map((preset, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setEditingProduct({ ...editingProduct, short_description: preset })}
                          className="text-[10px] px-2 py-0.5 rounded-lg bg-emerald-50 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-700 hover:bg-emerald-100 cursor-pointer"
                        >
                          + {preset}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Full Description & Nutrition Benefits */}
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="font-black text-gray-700 dark:text-emerald-200">
                        Full Product Description, Health Benefits & Culinary Notes
                      </label>
                      <span className="text-[10px] text-gray-500 dark:text-emerald-400">
                        Displays on the website product details page
                      </span>
                    </div>
                    <textarea
                      rows={4}
                      placeholder="Detailed nutritional story, medicinal benefits, cooking instructions, and traditional heritage..."
                      value={editingProduct.description || ''}
                      onChange={(e) => setEditingProduct({ ...editingProduct, description: e.target.value })}
                      className="w-full p-2.5 bg-emerald-50/50 dark:bg-emerald-900 border border-emerald-300 dark:border-emerald-700 rounded-xl font-medium text-gray-900 dark:text-emerald-100 focus:ring-2 focus:ring-emerald-500 outline-none"
                    />

                    {/* 1-Click Health & Nutrition Feature Presets */}
                    <div className="mt-2 p-2.5 bg-emerald-50/60 dark:bg-emerald-900/40 rounded-xl border border-emerald-200 dark:border-emerald-800">
                      <span className="text-[10px] font-black text-gray-600 dark:text-emerald-300 block mb-1.5 uppercase tracking-wider">
                        ✨ 1-Click Health & Heritage Point Appender (Click to append):
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {[
                          '🌱 100% Organically Farmed',
                          '🌾 Native Heirloom Variety',
                          '💪 High Natural Dietary Fibre',
                          '🩸 Low Glycemic Index (GI)',
                          '🚫 Zero Chemical Pesticides & Preservatives',
                          '🌿 Traditional Wood Cold-Pressed (Marachekku)',
                          '🧘 Ayurvedic Energy & Vitality Booster',
                          '🥗 Rich in Essential Micronutrients'
                        ].map((point, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => {
                              const curr = editingProduct.description || '';
                              if (curr.includes(point)) {
                                toast.error('Point already included in description');
                                return;
                              }
                              const updated = curr ? `${curr}\n• ${point}` : `• ${point}`;
                              setEditingProduct({ ...editingProduct, description: updated });
                              toast.success(`Appended: ${point}`);
                            }}
                            className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-white dark:bg-emerald-800 text-emerald-800 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700 hover:bg-emerald-100 dark:hover:bg-emerald-700 transition cursor-pointer"
                          >
                            + {point}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="font-black text-gray-700 dark:text-emerald-200 block mb-1">
                        Storage & Shelf Life Info
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Store in cool dry place, shelf life 6 months"
                        value={editingProduct.storage_info || ''}
                        onChange={(e) => setEditingProduct({ ...editingProduct, storage_info: e.target.value })}
                        className="w-full p-2.5 bg-emerald-50/50 dark:bg-emerald-900 border border-emerald-300 dark:border-emerald-700 rounded-xl font-medium text-gray-900 dark:text-emerald-100 focus:ring-2 focus:ring-emerald-500 outline-none"
                      />
                      {/* Storage Info Presets */}
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {[
                          '📦 Store in cool dry place (6 Months)',
                          '🫙 Keep in airtight container (12 Months)',
                          '❄️ Refrigerate after opening (3 Months)',
                          '☀️ Store away from direct sunlight (9 Months)'
                        ].map((preset, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => setEditingProduct({ ...editingProduct, storage_info: preset })}
                            className="text-[10px] px-2 py-0.5 rounded-lg bg-emerald-100 dark:bg-emerald-900/80 text-emerald-800 dark:text-emerald-200 font-bold hover:bg-emerald-200 border border-emerald-200 dark:border-emerald-700 transition cursor-pointer"
                          >
                            {preset}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="font-black text-gray-700 dark:text-emerald-200 block mb-1">
                        Organic Certification Code / Seal
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. NPOP India Organic #TN-8821"
                        value={editingProduct.organic_certification || ''}
                        onChange={(e) => setEditingProduct({ ...editingProduct, organic_certification: e.target.value })}
                        className="w-full p-2.5 bg-emerald-50/50 dark:bg-emerald-900 border border-emerald-300 dark:border-emerald-700 rounded-xl font-semibold text-emerald-800 dark:text-amber-300 focus:ring-2 focus:ring-emerald-500 outline-none"
                      />
                      {/* Certification Presets */}
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {[
                          'NPOP India Organic #TN-8821',
                          'Jaivik Bharat FSSAI #224215',
                          'PGS-India Green #TN-602',
                          'Natural SPNF Zero-Budget Farm'
                        ].map((cert, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => setEditingProduct({ ...editingProduct, organic_certification: cert })}
                            className="text-[10px] px-2 py-0.5 rounded-lg bg-emerald-100 dark:bg-emerald-900/80 text-emerald-800 dark:text-emerald-200 font-bold hover:bg-emerald-200 border border-emerald-200 dark:border-emerald-700 transition cursor-pointer"
                          >
                            {cert}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: MEDIA & VISIBILITY */}
              {activeProductTab === 'media' && (
                <div className="space-y-3.5 animate-fadeIn">
                  {/* Primary Cover Image Box */}
                  <div className="space-y-2 bg-emerald-50/50 dark:bg-emerald-950/40 p-3.5 rounded-2xl border border-emerald-200 dark:border-emerald-800">
                    <label className="font-extrabold text-xs text-gray-800 dark:text-emerald-100 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Image className="w-4 h-4 text-emerald-600 dark:text-amber-400" />
                        <span>Primary Cover Image (Card & Catalog Default)</span>
                      </span>
                      <span className="text-[10px] text-emerald-700 dark:text-amber-300 font-normal">Catalog default thumbnail</span>
                    </label>

                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                      <input
                        type="text"
                        placeholder="https://images.unsplash.com/... or upload file below"
                        value={editingProduct.image_url || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          const currentImgs = editingProduct.images || [];
                          const updatedImgs = currentImgs.includes(val) ? currentImgs : [val, ...currentImgs].filter(Boolean);
                          setEditingProduct({ ...editingProduct, image_url: val, images: updatedImgs });
                        }}
                        className="flex-1 p-2.5 bg-white dark:bg-emerald-900 border border-emerald-300 dark:border-emerald-700 rounded-xl font-mono text-xs text-gray-900 dark:text-emerald-100"
                      />
                      
                      {/* Upload File Input Button */}
                      <label className="px-4 py-2.5 bg-emerald-100 dark:bg-emerald-900/80 hover:bg-emerald-200 text-emerald-900 dark:text-emerald-100 font-extrabold text-xs rounded-xl border border-emerald-300 dark:border-emerald-700 cursor-pointer flex items-center justify-center gap-1.5 transition shadow-sm shrink-0">
                        <Upload className="w-4 h-4 text-emerald-700 dark:text-amber-400" />
                        <span>Upload Cover (&lt; 100 KB)</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const MAX_SIZE_BYTES = 100 * 1024;
                              if (file.size > MAX_SIZE_BYTES) {
                                const sizeInKB = (file.size / 1024).toFixed(1);
                                toast.error(`❌ File size (${sizeInKB} KB) exceeds 100 KB maximum limit! Please upload a smaller image.`);
                                e.target.value = '';
                                return;
                              }
                              const reader = new FileReader();
                              reader.onload = (uploadEvent) => {
                                const result = uploadEvent.target?.result as string;
                                if (result) {
                                  const currentImgs = editingProduct.images || [];
                                  const updatedImgs = [result, ...currentImgs.filter(i => i !== result)];
                                  setEditingProduct({ ...editingProduct, image_url: result, images: updatedImgs });
                                  toast.success('📷 Cover image uploaded successfully (< 100 KB)!');
                                }
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                        />
                      </label>
                    </div>

                    <p className="text-[11px] text-amber-600 dark:text-amber-300 font-medium">
                      ⚠️ Note: Maximum allowed image size is 100 KB (JPEG, PNG, WEBP, SVG)
                    </p>

                    {/* Image Preview Box */}
                    {editingProduct.image_url && (
                      <div className="flex items-center gap-3 p-2 bg-emerald-900 text-white rounded-xl border border-emerald-700 mt-1">
                        <img
                          src={editingProduct.image_url}
                          alt="Preview"
                          className="w-12 h-12 object-cover rounded-lg border border-emerald-600 shadow-sm"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = '/mr-vivasayi-logo.png';
                          }}
                        />
                        <div className="text-xs">
                          <span className="font-extrabold text-amber-300 block">Active Cover Image Attached</span>
                          <span className="text-[10px] text-emerald-200 font-mono truncate max-w-[260px] block">
                            {editingProduct.image_url.startsWith('data:') ? 'Base64 Local Image File' : editingProduct.image_url}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Carousel & Multi-Image Gallery Manager */}
                  <div className="space-y-3 bg-white dark:bg-emerald-900/50 p-4 rounded-2xl border border-emerald-200 dark:border-emerald-800">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                      <div>
                        <h4 className="font-black text-xs text-gray-900 dark:text-emerald-100 flex items-center gap-1.5 uppercase tracking-wider">
                          <Sparkles className="w-4 h-4 text-amber-500" />
                          <span>Website Carousel & Gallery Images ({editingProduct.images?.length || 0})</span>
                        </h4>
                        <p className="text-[11px] text-gray-500 dark:text-emerald-300">
                          These images display in the interactive carousel slider on the website product details page.
                        </p>
                      </div>
                    </div>

                    {/* Add Image to Carousel Form */}
                    <div className="flex flex-col sm:flex-row gap-2">
                      <input
                        type="text"
                        placeholder="Paste image URL to append to carousel..."
                        value={newCarouselUrl}
                        onChange={(e) => setNewCarouselUrl(e.target.value)}
                        className="flex-1 p-2 bg-emerald-50/50 dark:bg-emerald-950 border border-emerald-300 dark:border-emerald-700 rounded-xl font-mono text-xs text-gray-900 dark:text-emerald-100"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (!newCarouselUrl.trim()) return;
                          const currentImgs = editingProduct.images || (editingProduct.image_url ? [editingProduct.image_url] : []);
                          if (currentImgs.includes(newCarouselUrl.trim())) {
                            toast.error('Image already exists in the carousel!');
                            return;
                          }
                          const updatedImgs = [...currentImgs, newCarouselUrl.trim()];
                          setEditingProduct({
                            ...editingProduct,
                            images: updatedImgs,
                            image_url: editingProduct.image_url || updatedImgs[0]
                          });
                          setNewCarouselUrl('');
                          toast.success('Added new image to carousel!');
                        }}
                        className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-1 shrink-0"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add to Carousel</span>
                      </button>

                      {/* Upload Carousel File Button */}
                      <label className="px-3 py-2 bg-emerald-100 dark:bg-emerald-800 hover:bg-emerald-200 text-emerald-900 dark:text-emerald-100 font-extrabold text-xs rounded-xl border border-emerald-300 dark:border-emerald-700 cursor-pointer flex items-center justify-center gap-1 transition shadow-sm shrink-0">
                        <Upload className="w-3.5 h-3.5 text-emerald-700 dark:text-amber-400" />
                        <span>Upload File (&lt; 100 KB)</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const MAX_SIZE_BYTES = 100 * 1024;
                              if (file.size > MAX_SIZE_BYTES) {
                                const sizeInKB = (file.size / 1024).toFixed(1);
                                toast.error(`❌ File size (${sizeInKB} KB) exceeds 100 KB maximum limit!`);
                                e.target.value = '';
                                return;
                              }
                              const reader = new FileReader();
                              reader.onload = (uploadEvent) => {
                                const result = uploadEvent.target?.result as string;
                                if (result) {
                                  const currentImgs = editingProduct.images || (editingProduct.image_url ? [editingProduct.image_url] : []);
                                  const updatedImgs = [...currentImgs, result];
                                  setEditingProduct({
                                    ...editingProduct,
                                    images: updatedImgs,
                                    image_url: editingProduct.image_url || result
                                  });
                                  toast.success('📷 Image uploaded & added to carousel (< 100 KB)!');
                                }
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                        />
                      </label>
                    </div>

                    {/* Thumbnail Grid of Carousel Images */}
                    {(!editingProduct.images || editingProduct.images.length === 0) ? (
                      <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-dashed border-emerald-300 dark:border-emerald-700 text-center text-xs text-gray-500 dark:text-emerald-300">
                        No carousel images added yet. Add image URLs or upload files above to create an interactive multi-image carousel on the website.
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                        {editingProduct.images.map((imgUrl, idx) => {
                          const isCover = imgUrl === editingProduct.image_url;
                          return (
                            <div
                              key={idx}
                              className={`relative rounded-xl overflow-hidden border-2 p-1.5 flex flex-col justify-between transition-all ${
                                isCover
                                  ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-900/60 shadow-md ring-2 ring-emerald-400/40'
                                  : 'border-emerald-200 dark:border-emerald-800 bg-emerald-50/30 dark:bg-emerald-950/40'
                              }`}
                            >
                              <div className="relative aspect-square w-full rounded-lg overflow-hidden bg-emerald-100 dark:bg-emerald-950 mb-1.5">
                                <img
                                  src={imgUrl}
                                  alt={`Carousel ${idx + 1}`}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).src = '/mr-vivasayi-logo.png';
                                  }}
                                />
                                {isCover && (
                                  <span className="absolute top-1 left-1 bg-emerald-700 text-white text-[9px] font-black px-1.5 py-0.5 rounded shadow">
                                    ★ Cover
                                  </span>
                                )}
                                <span className="absolute bottom-1 right-1 bg-black/60 text-white text-[9px] font-mono px-1 rounded">
                                  #{idx + 1}
                                </span>
                              </div>

                              <div className="flex items-center justify-between gap-1 text-[10px]">
                                {!isCover ? (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingProduct({ ...editingProduct, image_url: imgUrl });
                                      toast.success(`Set image #${idx + 1} as main cover!`);
                                    }}
                                    className="text-emerald-700 dark:text-amber-300 font-extrabold hover:underline"
                                  >
                                    Set as Cover
                                  </button>
                                ) : (
                                  <span className="text-emerald-600 dark:text-emerald-400 font-black">
                                    Main Cover
                                  </span>
                                )}

                                <button
                                  type="button"
                                  onClick={() => {
                                    const currentImgs = editingProduct.images || [];
                                    const updatedImgs = currentImgs.filter((_, i) => i !== idx);
                                    let newCover = editingProduct.image_url;
                                    if (isCover) {
                                      newCover = updatedImgs[0] || '';
                                    }
                                    setEditingProduct({
                                      ...editingProduct,
                                      images: updatedImgs,
                                      image_url: newCover
                                    });
                                    toast.success('Image removed from carousel.');
                                  }}
                                  className="text-rose-600 hover:text-rose-800 p-1 rounded hover:bg-rose-100 dark:hover:bg-rose-950 transition-colors"
                                  title="Remove from carousel"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Storefront Badges & Flags */}
                  <div className="grid grid-cols-2 gap-3 pt-2 border-t border-emerald-100 dark:border-emerald-800">
                    <label className="flex items-center space-x-2 font-bold cursor-pointer bg-emerald-50/60 dark:bg-emerald-900/50 p-2.5 rounded-xl border border-emerald-200 dark:border-emerald-800">
                      <input
                        type="checkbox"
                        checked={editingProduct.is_organic}
                        onChange={(e) => setEditingProduct({ ...editingProduct, is_organic: e.target.checked })}
                        className="rounded text-emerald-600 w-4 h-4"
                      />
                      <span className="flex items-center gap-1 text-xs text-gray-800 dark:text-emerald-100">
                        <Leaf className="w-3.5 h-3.5 text-emerald-600" /> Certified Organic Produce
                      </span>
                    </label>

                    <label className="flex items-center space-x-2 font-bold cursor-pointer bg-emerald-50/60 dark:bg-emerald-900/50 p-2.5 rounded-xl border border-emerald-200 dark:border-emerald-800">
                      <input
                        type="checkbox"
                        checked={editingProduct.is_featured}
                        onChange={(e) => setEditingProduct({ ...editingProduct, is_featured: e.target.checked })}
                        className="rounded text-emerald-600 w-4 h-4"
                      />
                      <span className="flex items-center gap-1 text-xs text-gray-800 dark:text-emerald-100">
                        <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Showcase On Homepage
                      </span>
                    </label>

                    <label className="flex items-center space-x-2 font-bold cursor-pointer bg-emerald-50/60 dark:bg-emerald-900/50 p-2.5 rounded-xl border border-emerald-200 dark:border-emerald-800">
                      <input
                        type="checkbox"
                        checked={editingProduct.is_visible}
                        onChange={(e) => setEditingProduct({ ...editingProduct, is_visible: e.target.checked })}
                        className="rounded text-emerald-600 w-4 h-4"
                      />
                      <span className="flex items-center gap-1 text-xs text-gray-800 dark:text-emerald-100">
                        <Eye className="w-3.5 h-3.5 text-blue-500" /> Store Catalog Visible
                      </span>
                    </label>

                    <label className="flex items-center space-x-2 font-bold cursor-pointer bg-emerald-50/60 dark:bg-emerald-900/50 p-2.5 rounded-xl border border-emerald-200 dark:border-emerald-800">
                      <input
                        type="checkbox"
                        checked={editingProduct.expiry_tracking ?? true}
                        onChange={(e) => setEditingProduct({ ...editingProduct, expiry_tracking: e.target.checked })}
                        className="rounded text-emerald-600 w-4 h-4"
                      />
                      <span className="flex items-center gap-1 text-xs text-gray-800 dark:text-emerald-100">
                        <History className="w-3.5 h-3.5 text-amber-600" /> Expiry Tracking Active
                      </span>
                    </label>
                  </div>
                </div>
              )}

              {/* TAB 5: LIVE WEBSITE PREVIEWS (CARD & FULL DESCRIPTION PAGE) */}
              {activeProductTab === 'preview' && (
                <div className="space-y-4 animate-fadeIn">
                  <div className="bg-emerald-950 p-4 rounded-3xl border border-emerald-800 text-white space-y-4">
                    {/* View Switcher Header */}
                    <div className="flex flex-col sm:flex-row justify-between items-center gap-2 bg-emerald-900/90 p-2 rounded-2xl border border-emerald-700">
                      <div className="flex gap-2 text-xs w-full sm:w-auto">
                        <button
                          type="button"
                          onClick={() => setPreviewMode('page')}
                          className={`px-3.5 py-1.5 rounded-xl font-extrabold transition-all flex items-center gap-1.5 cursor-pointer text-xs ${
                            previewMode === 'page'
                              ? 'bg-amber-400 text-emerald-950 shadow-md'
                              : 'bg-emerald-800/80 text-emerald-200 hover:bg-emerald-800'
                          }`}
                        >
                          <Eye className="w-3.5 h-3.5" /> 📄 Full Description Page Preview
                        </button>
                        <button
                          type="button"
                          onClick={() => setPreviewMode('card')}
                          className={`px-3.5 py-1.5 rounded-xl font-extrabold transition-all flex items-center gap-1.5 cursor-pointer text-xs ${
                            previewMode === 'card'
                              ? 'bg-amber-400 text-emerald-950 shadow-md'
                              : 'bg-emerald-800/80 text-emerald-200 hover:bg-emerald-800'
                          }`}
                        >
                          <Grid className="w-3.5 h-3.5" /> 🎴 Storefront Grid Card Preview
                        </button>
                      </div>
                      <span className="text-[10px] text-amber-300 font-mono font-bold px-2.5 py-1 rounded-full bg-emerald-800 border border-emerald-600">
                        ⚡ Real-Time Live Sync
                      </span>
                    </div>

                    {/* PREVIEW MODE 1: FULL DESCRIPTION PAGE */}
                    {previewMode === 'page' ? (
                      <div className="bg-white dark:bg-emerald-900 text-gray-900 dark:text-emerald-100 rounded-3xl p-5 shadow-2xl border border-emerald-200 dark:border-emerald-700 space-y-4 max-w-xl mx-auto">
                        {/* Top Badges & Category Header */}
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-emerald-100 dark:border-emerald-800 pb-3">
                          <div className="flex flex-wrap items-center gap-2">
                            {editingProduct.festival_offer && (
                              <span className="bg-gradient-to-r from-amber-500 via-rose-500 to-amber-600 text-white text-[11px] font-black px-2.5 py-0.5 rounded-full shadow flex items-center gap-1 border border-amber-300 animate-pulse">
                                <Sparkles className="w-3.5 h-3.5 text-amber-200" />
                                <span>{editingProduct.festival_offer}</span>
                              </span>
                            )}
                            {editingProduct.is_organic && (
                              <span className="bg-emerald-700 text-white text-[11px] font-extrabold px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow">
                                <Leaf className="w-3.5 h-3.5" /> 100% Certified Organic
                              </span>
                            )}
                            {editingProduct.offer_price && editingProduct.offer_price < editingProduct.selling_price ? (
                              <span className="bg-rose-600 text-white text-[11px] font-black px-2.5 py-0.5 rounded-full shadow animate-pulse">
                                🔥 {editingProduct.mrp > editingProduct.offer_price ? `${Math.round(((editingProduct.mrp - editingProduct.offer_price) / editingProduct.mrp) * 100)}% OFF` : 'SPECIAL OFFER'}
                              </span>
                            ) : null}
                          </div>
                          <span className="text-xs font-mono text-gray-500 dark:text-emerald-300">
                            SKU: {editingProduct.sku || 'N/A'}
                          </span>
                        </div>

                        {/* Image & Main Info Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="flex flex-col gap-2">
                            <div className="h-48 rounded-2xl overflow-hidden bg-emerald-50 dark:bg-emerald-950 flex items-center justify-center border border-emerald-100 dark:border-emerald-800 relative shadow-inner">
                              {(previewActiveImg || editingProduct.image_url) ? (
                                <img
                                  src={previewActiveImg || editingProduct.image_url}
                                  alt={editingProduct.name}
                                  className="w-full h-full object-cover transition-all duration-300"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).src = '/mr-vivasayi-logo.png';
                                  }}
                                />
                              ) : (
                                <div className="text-center p-4 text-emerald-600 dark:text-emerald-400">
                                  <Package className="w-12 h-12 mx-auto mb-1 opacity-50" />
                                  <span className="text-xs font-bold">Product Image</span>
                                </div>
                              )}
                            </div>

                            {/* Carousel Thumbnail Strip */}
                            {editingProduct.images && editingProduct.images.length > 1 && (
                              <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                                {editingProduct.images.map((img, idx) => {
                                  const isSelected = (previewActiveImg || editingProduct.image_url) === img;
                                  return (
                                    <button
                                      key={idx}
                                      type="button"
                                      onClick={() => setPreviewActiveImg(img)}
                                      className={`w-11 h-11 rounded-lg overflow-hidden border-2 shrink-0 transition-all cursor-pointer ${
                                        isSelected
                                          ? 'border-emerald-600 ring-2 ring-emerald-400 shadow-md scale-105'
                                          : 'border-emerald-200 dark:border-emerald-800 opacity-60 hover:opacity-100'
                                      }`}
                                    >
                                      <img src={img} alt={`Carousel ${idx + 1}`} className="w-full h-full object-cover" />
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </div>

                          <div className="space-y-2">
                            <h3 className="font-serif font-extrabold text-xl text-gray-900 dark:text-emerald-100 leading-snug">
                              {editingProduct.name || 'Product Title Placeholder'}
                            </h3>
                            {editingProduct.tamil_name && (
                              <p className="text-sm font-extrabold text-emerald-700 dark:text-amber-300">
                                {editingProduct.tamil_name}
                              </p>
                            )}

                            {/* Price Breakdown */}
                            <div className="pt-2">
                              <div className="flex items-baseline gap-2 flex-wrap">
                                <span className="text-2xl font-black font-mono text-emerald-800 dark:text-amber-300">
                                  ₹{editingProduct.offer_price || editingProduct.selling_price}
                                </span>
                                {editingProduct.mrp > (editingProduct.offer_price || editingProduct.selling_price) && (
                                  <span className="text-xs font-mono text-gray-400 line-through">
                                    MRP ₹{editingProduct.mrp}
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-emerald-700 dark:text-emerald-300 font-semibold">
                                Pack Size: {editingProduct.pack_size || '1 kg'} ({editingProduct.unit})
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Short Description */}
                        {editingProduct.short_description && (
                          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/60 rounded-xl border border-emerald-100 dark:border-emerald-800 text-xs text-gray-700 dark:text-emerald-200">
                            <span className="font-bold text-emerald-800 dark:text-amber-300">Overview: </span>
                            {editingProduct.short_description}
                          </div>
                        )}

                        {/* Full Detailed Description */}
                        <div className="space-y-1.5 pt-1">
                          <h4 className="text-xs font-extrabold text-gray-900 dark:text-emerald-200 uppercase tracking-wider flex items-center gap-1">
                            📜 Full Description & Traditional Food Benefits
                          </h4>
                          <div className="p-3 bg-white dark:bg-emerald-950 rounded-xl border border-gray-200 dark:border-emerald-800 text-xs text-gray-600 dark:text-emerald-200 leading-relaxed max-h-36 overflow-y-auto">
                            {editingProduct.description || 'No detailed description added yet. Add full health benefits and traditional usage instructions in Tab 3.'}
                          </div>
                        </div>

                        {/* Storage Guidelines */}
                        {editingProduct.storage_info && (
                          <div className="p-3 bg-amber-50 dark:bg-amber-950/50 rounded-xl border border-amber-200 dark:border-amber-800/60 text-xs text-amber-900 dark:text-amber-200 space-y-1">
                            <span className="font-extrabold flex items-center gap-1 text-amber-800 dark:text-amber-300">
                              🫙 Storage & Shelf Life Info:
                            </span>
                            <p className="leading-relaxed">{editingProduct.storage_info}</p>
                          </div>
                        )}

                        {/* Stock & Sourcing Specs Bar */}
                        <div className="bg-emerald-50/80 dark:bg-emerald-950/80 p-3 rounded-xl border border-emerald-100 dark:border-emerald-800 text-xs space-y-1.5">
                          <div className="flex justify-between items-center text-gray-700 dark:text-emerald-200">
                            <span>Sourcing / Origin:</span>
                            <span className="font-bold">{editingProduct.source_description || 'Madurai / Tanjore Farmer Network'}</span>
                          </div>
                          <div className="flex justify-between items-center text-gray-700 dark:text-emerald-200">
                            <span>Available Stock:</span>
                            <span className="font-bold text-emerald-700 dark:text-amber-300">
                              {editingProduct.current_stock || 0} {editingProduct.unit} in stock
                            </span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* PREVIEW MODE 2: STOREFRONT CARD PREVIEW */
                      <div className="max-w-xs mx-auto bg-white dark:bg-emerald-900 rounded-3xl p-4 shadow-2xl border border-emerald-100 dark:border-emerald-800 text-gray-900 dark:text-emerald-100 space-y-3 relative overflow-hidden">
                        {/* Floating Badges */}
                        <div className="absolute top-3 left-3 z-10 flex flex-col gap-1">
                          {editingProduct.festival_offer && (
                            <span className="bg-gradient-to-r from-amber-500 via-rose-500 to-amber-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-md animate-pulse flex items-center gap-1 border border-amber-300">
                              <Sparkles className="w-3 h-3 text-amber-200" />
                              <span>{editingProduct.festival_offer}</span>
                            </span>
                          )}
                          {editingProduct.is_organic && (
                            <span className="bg-emerald-700 text-white text-[10px] font-extrabold px-2 py-0.5 rounded-full shadow flex items-center gap-1">
                              <Leaf className="w-3 h-3" /> Organic
                            </span>
                          )}
                          {editingProduct.offer_price && editingProduct.offer_price < editingProduct.selling_price ? (
                            <span className="bg-rose-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow animate-pulse">
                              🔥 {editingProduct.mrp > editingProduct.offer_price ? `${Math.round(((editingProduct.mrp - editingProduct.offer_price) / editingProduct.mrp) * 100)}% OFF` : 'SPECIAL OFFER'}
                            </span>
                          ) : editingProduct.mrp > editingProduct.selling_price ? (
                            <span className="bg-amber-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow">
                              ⏱️ {Math.round(((editingProduct.mrp - editingProduct.selling_price) / editingProduct.mrp) * 100)}% OFF
                            </span>
                          ) : null}
                        </div>

                        {/* Image Preview Container */}
                        <div className="h-44 w-full rounded-2xl overflow-hidden bg-emerald-50 dark:bg-emerald-950 flex items-center justify-center relative border border-emerald-100 dark:border-emerald-800">
                          {editingProduct.image_url ? (
                            <img
                              src={editingProduct.image_url}
                              alt={editingProduct.name}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=400&q=80';
                              }}
                            />
                          ) : (
                            <div className="text-center p-4 text-emerald-600 dark:text-emerald-400">
                              <Package className="w-12 h-12 mx-auto mb-1 opacity-50" />
                              <span className="text-[11px] font-bold">No Image Attached</span>
                            </div>
                          )}
                        </div>

                        {/* Content */}
                        <div className="space-y-1">
                          <div className="flex items-center justify-between gap-1 text-[10px]">
                            <span className="font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-100/80 dark:bg-emerald-950/80 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800 truncate max-w-[140px]">
                              {categories.find(c => c.id === editingProduct.category_id)?.name || 'Produce'}
                            </span>
                            <span className="text-gray-500 dark:text-emerald-400 font-semibold shrink-0">
                              {editingProduct.pack_size || '1 kg'}
                            </span>
                          </div>
                          <h4 className="font-serif font-bold text-gray-900 dark:text-emerald-100 text-sm leading-snug line-clamp-1">
                            {editingProduct.name || 'Product Title'}
                          </h4>
                          {editingProduct.tamil_name && (
                            <p className="text-xs font-semibold text-emerald-700 dark:text-amber-300">
                              {editingProduct.tamil_name}
                            </p>
                          )}
                          <p className="text-[11px] text-gray-500 dark:text-emerald-300 line-clamp-2 leading-relaxed">
                            {editingProduct.short_description || editingProduct.description || 'Traditional farm fresh product sourced directly from certified natural farmers.'}
                          </p>
                        </div>

                        {/* Pricing Footer */}
                        <div className="flex items-center justify-between pt-2 border-t border-emerald-100 dark:border-emerald-800">
                          <div>
                            <div className="flex items-baseline gap-1.5">
                              <span className="font-extrabold text-base font-mono text-emerald-800 dark:text-amber-300">
                                ₹{editingProduct.offer_price || editingProduct.selling_price}
                              </span>
                              {editingProduct.mrp > (editingProduct.offer_price || editingProduct.selling_price) && (
                                <span className="text-xs font-mono text-gray-400 line-through">
                                  ₹{editingProduct.mrp}
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-gray-500 dark:text-emerald-400 font-medium">
                              Pack: {editingProduct.pack_size || '1 kg'} ({editingProduct.unit})
                            </span>
                          </div>

                          <button
                            type="button"
                            className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold text-xs rounded-xl shadow flex items-center gap-1"
                          >
                            <Plus className="w-3.5 h-3.5" /> Add
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Quick Edits & Direct Save Action Banner */}
                    <div className="bg-emerald-900/80 border border-amber-400/40 p-4 rounded-2xl text-center space-y-3">
                      <div className="flex flex-wrap items-center justify-center gap-2 text-xs">
                        <span className="text-emerald-200 font-medium">Need to tweak details before saving?</span>
                        <button
                          type="button"
                          onClick={() => setActiveProductTab('basic')}
                          className="px-2.5 py-1 bg-emerald-800 hover:bg-emerald-700 text-amber-300 font-bold rounded-lg text-[11px] transition cursor-pointer"
                        >
                          ✏️ Edit Basic Info
                        </button>
                        <button
                          type="button"
                          onClick={() => setActiveProductTab('pricing')}
                          className="px-2.5 py-1 bg-emerald-800 hover:bg-emerald-700 text-amber-300 font-bold rounded-lg text-[11px] transition cursor-pointer"
                        >
                          💰 Edit Pricing
                        </button>
                        <button
                          type="button"
                          onClick={() => setActiveProductTab('details')}
                          className="px-2.5 py-1 bg-emerald-800 hover:bg-emerald-700 text-amber-300 font-bold rounded-lg text-[11px] transition cursor-pointer"
                        >
                          📦 Edit Storage & Description
                        </button>
                      </div>

                      <div className="pt-2 border-t border-emerald-800/60 flex flex-col sm:flex-row items-center justify-between gap-3">
                        <p className="text-[11px] text-emerald-300 text-left font-medium">
                          ✅ Preview looks good? Save now to publish this product directly to live store & inventory!
                        </p>

                        <button
                          type="submit"
                          className="w-full sm:w-auto px-6 py-2.5 bg-gradient-to-r from-amber-400 to-emerald-400 hover:from-amber-300 hover:to-emerald-300 text-emerald-950 font-black text-xs uppercase tracking-wider rounded-xl shadow-lg hover:shadow-2xl transition-all transform hover:-translate-y-0.5 flex items-center justify-center gap-2 cursor-pointer"
                        >
                          <Check className="w-4 h-4 stroke-[3]" />
                          <span>{isNewProduct ? 'Create & Publish Product' : 'Save & Publish Product Now'}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Modal Footer Step Navigation & Save Buttons */}
              <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-3.5 border-t border-emerald-100 dark:border-emerald-800/80">
                <button
                  type="button"
                  onClick={() => setEditingProduct(null)}
                  className="w-full sm:w-auto px-4 py-2.5 bg-gray-200 dark:bg-emerald-900 text-gray-800 dark:text-emerald-100 font-bold rounded-xl hover:bg-gray-300 dark:hover:bg-emerald-800 transition text-xs cursor-pointer"
                >
                  Cancel
                </button>

                <div className="flex flex-wrap items-center justify-end gap-2 w-full sm:w-auto">
                  {activeProductTab !== 'basic' && (
                    <button
                      type="button"
                      onClick={() => {
                        if (activeProductTab === 'pricing') setActiveProductTab('basic');
                        else if (activeProductTab === 'details') setActiveProductTab('pricing');
                        else if (activeProductTab === 'media') setActiveProductTab('details');
                        else if (activeProductTab === 'preview') setActiveProductTab('media');
                      }}
                      className="px-3.5 py-2.5 bg-emerald-100 dark:bg-emerald-800/80 text-emerald-900 dark:text-emerald-100 font-bold rounded-xl hover:bg-emerald-200 dark:hover:bg-emerald-700 transition text-xs flex items-center gap-1 cursor-pointer"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      <span>Back</span>
                    </button>
                  )}

                  {activeProductTab !== 'preview' && (
                    <button
                      type="button"
                      onClick={() => {
                        if (activeProductTab === 'basic') setActiveProductTab('pricing');
                        else if (activeProductTab === 'pricing') setActiveProductTab('details');
                        else if (activeProductTab === 'details') setActiveProductTab('media');
                        else if (activeProductTab === 'media') setActiveProductTab('preview');
                      }}
                      className="px-4 py-2.5 bg-emerald-100 dark:bg-emerald-800/80 text-emerald-900 dark:text-emerald-100 font-bold rounded-xl hover:bg-emerald-200 dark:hover:bg-emerald-700 transition text-xs flex items-center gap-1 cursor-pointer"
                    >
                      <span>Next Step</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  )}

                  {/* Ever-Present 1-Click Save & Publish Button */}
                  <button
                    type="submit"
                    className="w-full sm:w-auto px-6 py-2.5 bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-0.5 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Check className="w-4 h-4 stroke-[3]" />
                    <span>{isNewProduct ? '💾 Create & Publish' : '💾 Save & Publish'}</span>
                  </button>
                </div>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* ================= DEDICATED LIVE PRODUCT PREVIEW POPUP MODAL ================= */}
      {showPreviewModal && editingProduct && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
          <div className="bg-white dark:bg-emerald-950 rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-emerald-700 text-gray-900 dark:text-emerald-100 space-y-5 relative max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex justify-between items-center border-b border-emerald-100 dark:border-emerald-800 pb-3">
              <div>
                <h3 className="text-lg font-black text-emerald-800 dark:text-amber-300 flex items-center gap-2">
                  <Eye className="w-5 h-5 text-amber-400 animate-pulse" /> Live Website Storefront Preview
                </h3>
                <p className="text-xs text-gray-500 dark:text-emerald-300">
                  Verify how your product appears live to customers before publishing.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowPreviewModal(false)}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-white rounded-full bg-gray-100 dark:bg-emerald-900 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* View Mode Toggle */}
            <div className="flex justify-between items-center bg-emerald-100 dark:bg-emerald-900/90 p-2 rounded-2xl border border-emerald-300 dark:border-emerald-700">
              <div className="flex gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setPreviewMode('page')}
                  className={`px-4 py-2 rounded-xl font-extrabold transition-all flex items-center gap-1.5 cursor-pointer text-xs ${
                    previewMode === 'page'
                      ? 'bg-amber-400 text-emerald-950 shadow-md'
                      : 'bg-emerald-800/80 text-emerald-200 hover:bg-emerald-800'
                  }`}
                >
                  <Eye className="w-4 h-4" /> 📄 Full Description Page Preview
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewMode('card')}
                  className={`px-4 py-2 rounded-xl font-extrabold transition-all flex items-center gap-1.5 cursor-pointer text-xs ${
                    previewMode === 'card'
                      ? 'bg-amber-400 text-emerald-950 shadow-md'
                      : 'bg-emerald-800/80 text-emerald-200 hover:bg-emerald-800'
                  }`}
                >
                  <Grid className="w-4 h-4" /> 🎴 Storefront Grid Card Preview
                </button>
              </div>
              <span className="text-[11px] text-amber-600 dark:text-amber-300 font-mono font-bold px-2.5 py-1 rounded-full bg-emerald-200 dark:bg-emerald-800 border border-emerald-400 dark:border-emerald-600">
                Live Preview Active
              </span>
            </div>

            {/* LIVE PREVIEW BODY */}
            {previewMode === 'page' ? (
              <div className="bg-white dark:bg-emerald-900 text-gray-900 dark:text-emerald-100 rounded-3xl p-5 shadow-2xl border border-emerald-200 dark:border-emerald-700 space-y-4">
                {/* Badges & Category Header */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-emerald-100 dark:border-emerald-800 pb-3">
                  <div className="flex flex-wrap items-center gap-2">
                    {/* ONLY SHOW ORGANIC BADGE IF IS_ORGANIC IS TRUE */}
                    {editingProduct.is_organic ? (
                      <span className="bg-emerald-700 text-white text-[11px] font-extrabold px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow">
                        <Leaf className="w-3.5 h-3.5" /> 100% Certified Organic
                      </span>
                    ) : (
                      <span className="bg-gray-100 dark:bg-emerald-950 text-gray-600 dark:text-emerald-300 text-[11px] font-bold px-2.5 py-0.5 rounded-full border border-gray-300 dark:border-emerald-800">
                        Standard Produce
                      </span>
                    )}

                    {editingProduct.offer_price && editingProduct.offer_price < editingProduct.selling_price ? (
                      <span className="bg-rose-600 text-white text-[11px] font-black px-2.5 py-0.5 rounded-full shadow animate-pulse">
                        🔥 {editingProduct.mrp > editingProduct.offer_price ? `${Math.round(((editingProduct.mrp - editingProduct.offer_price) / editingProduct.mrp) * 100)}% OFF` : 'SPECIAL OFFER'}
                      </span>
                    ) : null}
                  </div>
                  <span className="text-xs font-mono text-gray-500 dark:text-emerald-300">
                    SKU: {editingProduct.sku || 'N/A'}
                  </span>
                </div>

                {/* Image & Main Info Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-2">
                    <div className="h-48 rounded-2xl overflow-hidden bg-emerald-50 dark:bg-emerald-950 flex items-center justify-center border border-emerald-100 dark:border-emerald-800 relative shadow-inner">
                      {(previewActiveImg || editingProduct.image_url) ? (
                        <img
                          src={previewActiveImg || editingProduct.image_url}
                          alt={editingProduct.name}
                          className="w-full h-full object-cover transition-all duration-300"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = '/mr-vivasayi-logo.png';
                          }}
                        />
                      ) : (
                        <div className="text-center p-4 text-emerald-600 dark:text-emerald-400">
                          <Package className="w-12 h-12 mx-auto mb-1 opacity-50" />
                          <span className="text-xs font-bold">Product Image</span>
                        </div>
                      )}
                    </div>

                    {/* Carousel Thumbnail Strip */}
                    {editingProduct.images && editingProduct.images.length > 1 && (
                      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                        {editingProduct.images.map((img, idx) => {
                          const isSelected = (previewActiveImg || editingProduct.image_url) === img;
                          return (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => setPreviewActiveImg(img)}
                              className={`w-11 h-11 rounded-lg overflow-hidden border-2 shrink-0 transition-all cursor-pointer ${
                                isSelected
                                  ? 'border-emerald-600 ring-2 ring-emerald-400 shadow-md scale-105'
                                  : 'border-emerald-200 dark:border-emerald-800 opacity-60 hover:opacity-100'
                              }`}
                            >
                              <img src={img} alt={`Carousel ${idx + 1}`} className="w-full h-full object-cover" />
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <h3 className="font-serif font-extrabold text-xl text-gray-900 dark:text-emerald-100 leading-snug">
                      {editingProduct.name || 'Product Title'}
                    </h3>
                    {editingProduct.tamil_name && (
                      <p className="text-sm font-extrabold text-emerald-700 dark:text-amber-300">
                        {editingProduct.tamil_name}
                      </p>
                    )}

                    {/* Price Breakdown */}
                    <div className="pt-2">
                      <div className="flex items-baseline gap-2 flex-wrap">
                        <span className="text-2xl font-black font-mono text-emerald-800 dark:text-amber-300">
                          ₹{editingProduct.offer_price || editingProduct.selling_price}
                        </span>
                        {editingProduct.mrp > (editingProduct.offer_price || editingProduct.selling_price) && (
                          <span className="text-xs font-mono text-gray-400 line-through">
                            MRP ₹{editingProduct.mrp}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-emerald-700 dark:text-emerald-300 font-semibold">
                        Pack Size: {editingProduct.pack_size || '1 kg'} ({editingProduct.unit})
                      </p>
                    </div>
                  </div>
                </div>

                {/* Short Description */}
                {editingProduct.short_description && (
                  <div className="p-3 bg-emerald-50 dark:bg-emerald-950/60 rounded-xl border border-emerald-100 dark:border-emerald-800 text-xs text-gray-700 dark:text-emerald-200">
                    <span className="font-bold text-emerald-800 dark:text-amber-300">Overview: </span>
                    {editingProduct.short_description}
                  </div>
                )}

                {/* Full Detailed Description */}
                <div className="space-y-1.5 pt-1">
                  <h4 className="text-xs font-extrabold text-gray-900 dark:text-emerald-200 uppercase tracking-wider flex items-center gap-1">
                    📜 Full Description & Traditional Food Benefits
                  </h4>
                  <div className="p-3 bg-white dark:bg-emerald-950 rounded-xl border border-gray-200 dark:border-emerald-800 text-xs text-gray-600 dark:text-emerald-200 leading-relaxed max-h-36 overflow-y-auto">
                    {editingProduct.description || 'No detailed description added yet. You can add traditional food benefits in Tab 3.'}
                  </div>
                </div>

                {/* Storage Guidelines */}
                {editingProduct.storage_info && (
                  <div className="p-3 bg-amber-50 dark:bg-amber-950/50 rounded-xl border border-amber-200 dark:border-amber-800/60 text-xs text-amber-900 dark:text-amber-200 space-y-1">
                    <span className="font-extrabold flex items-center gap-1 text-amber-800 dark:text-amber-300">
                      🫙 Storage & Shelf Life Info:
                    </span>
                    <p className="leading-relaxed">{editingProduct.storage_info}</p>
                  </div>
                )}

                {/* Stock & Sourcing Specs Bar */}
                <div className="bg-emerald-50/80 dark:bg-emerald-950/80 p-3 rounded-xl border border-emerald-100 dark:border-emerald-800 text-xs space-y-1.5">
                  <div className="flex justify-between items-center text-gray-700 dark:text-emerald-200">
                    <span>Sourcing / Origin:</span>
                    <span className="font-bold">{editingProduct.source_description || 'Madurai / Tanjore Farmer Network'}</span>
                  </div>
                  <div className="flex justify-between items-center text-gray-700 dark:text-emerald-200">
                    <span>Available Stock:</span>
                    <span className="font-bold text-emerald-700 dark:text-amber-300">
                      {editingProduct.current_stock || 0} {editingProduct.unit} in stock
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              /* CARD PREVIEW */
              <div className="max-w-xs mx-auto bg-white dark:bg-emerald-900 rounded-3xl p-4 shadow-2xl border border-emerald-100 dark:border-emerald-800 text-gray-900 dark:text-emerald-100 space-y-3 relative overflow-hidden">
                {/* Floating Badges */}
                <div className="absolute top-3 left-3 z-10 flex flex-col gap-1">
                  {/* ONLY SHOW ORGANIC BADGE IF IS_ORGANIC IS TRUE */}
                  {editingProduct.is_organic && (
                    <span className="bg-emerald-700 text-white text-[10px] font-extrabold px-2 py-0.5 rounded-full shadow flex items-center gap-1">
                      <Leaf className="w-3 h-3" /> Organic
                    </span>
                  )}
                  {editingProduct.offer_price && editingProduct.offer_price < editingProduct.selling_price ? (
                    <span className="bg-rose-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow animate-pulse">
                      🔥 {editingProduct.mrp > editingProduct.offer_price ? `${Math.round(((editingProduct.mrp - editingProduct.offer_price) / editingProduct.mrp) * 100)}% OFF` : 'SPECIAL OFFER'}
                    </span>
                  ) : editingProduct.mrp > editingProduct.selling_price ? (
                    <span className="bg-amber-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow">
                      ⏱️ {Math.round(((editingProduct.mrp - editingProduct.selling_price) / editingProduct.mrp) * 100)}% OFF
                    </span>
                  ) : null}
                </div>

                {/* Image Container */}
                <div className="h-44 w-full rounded-2xl overflow-hidden bg-emerald-50 dark:bg-emerald-950 flex items-center justify-center relative border border-emerald-100 dark:border-emerald-800">
                  {editingProduct.image_url ? (
                    <img
                      src={editingProduct.image_url}
                      alt={editingProduct.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=400&q=80';
                      }}
                    />
                  ) : (
                    <div className="text-center p-4 text-emerald-600 dark:text-emerald-400">
                      <Package className="w-12 h-12 mx-auto mb-1 opacity-50" />
                      <span className="text-[11px] font-bold">No Image</span>
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="space-y-1">
                  <h4 className="font-serif font-bold text-gray-900 dark:text-emerald-100 text-sm leading-snug line-clamp-1">
                    {editingProduct.name || 'Product Title'}
                  </h4>
                  {editingProduct.tamil_name && (
                    <p className="text-xs font-semibold text-emerald-700 dark:text-amber-300">
                      {editingProduct.tamil_name}
                    </p>
                  )}
                  <p className="text-[11px] text-gray-500 dark:text-emerald-300 line-clamp-2 leading-relaxed">
                    {editingProduct.short_description || editingProduct.description || 'Traditional farm fresh product sourced directly from certified natural farmers.'}
                  </p>
                </div>

                {/* Pricing Footer */}
                <div className="flex items-center justify-between pt-2 border-t border-emerald-100 dark:border-emerald-800">
                  <div>
                    <div className="flex items-baseline gap-1.5">
                      <span className="font-extrabold text-base font-mono text-emerald-800 dark:text-amber-300">
                        ₹{editingProduct.offer_price || editingProduct.selling_price}
                      </span>
                      {editingProduct.mrp > (editingProduct.offer_price || editingProduct.selling_price) && (
                        <span className="text-xs font-mono text-gray-400 line-through">
                          ₹{editingProduct.mrp}
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-gray-500 dark:text-emerald-400 font-medium">
                      Pack: {editingProduct.pack_size || '1 kg'} ({editingProduct.unit})
                    </span>
                  </div>

                  <button
                    type="button"
                    className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold text-xs rounded-xl shadow flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add
                  </button>
                </div>
              </div>
            )}

            {/* Modal Action Buttons */}
            <div className="pt-4 border-t border-emerald-100 dark:border-emerald-800 flex flex-col sm:flex-row justify-between items-center gap-3">
              <button
                type="button"
                onClick={() => setShowPreviewModal(false)}
                className="w-full sm:w-auto px-5 py-2.5 bg-emerald-100 dark:bg-emerald-900 text-emerald-950 dark:text-emerald-100 font-extrabold rounded-xl hover:bg-emerald-200 transition text-xs flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" /> ✏️ Back to Edit Tabs
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowPreviewModal(false);
                  const dummyEvent = { preventDefault: () => {} } as React.FormEvent;
                  handleSaveProduct(dummyEvent);
                }}
                className="w-full sm:w-auto px-6 py-2.5 bg-gradient-to-r from-amber-400 via-emerald-400 to-emerald-500 hover:from-amber-300 hover:to-emerald-400 text-emerald-950 font-black rounded-xl shadow-xl hover:shadow-2xl transition-all transform hover:-translate-y-0.5 text-xs flex items-center justify-center gap-2 cursor-pointer"
              >
                <Check className="w-4.5 h-4.5 stroke-[3]" />
                <span>All Okay - Save & Publish SKU Now</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= ADD / EDIT STORE CATEGORY MODAL ================= */}
      {showAddCategoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/75 backdrop-blur-md overflow-y-auto animate-fadeIn">
          <div className="bg-white dark:bg-emerald-950 max-w-lg w-full p-6 rounded-3xl shadow-2xl border border-emerald-200 dark:border-emerald-800 space-y-4 my-auto max-h-[92vh] flex flex-col justify-between">
            
            {/* Header */}
            <div className="flex justify-between items-center border-b border-emerald-100 dark:border-emerald-800/80 pb-3">
              <div className="flex items-center space-x-2">
                <FolderPlus className="w-6 h-6 text-emerald-600 dark:text-amber-400" />
                <div>
                  <h3 className="font-extrabold text-base text-gray-900 dark:text-emerald-100">
                    {editingCategory ? `Edit Category — ${editingCategory.name}` : 'Create New Store Category'}
                  </h3>
                  <p className="text-[11px] text-gray-500 dark:text-emerald-300 font-medium">
                    Changes directly affect storefront navigation & category filters
                  </p>
                </div>
              </div>
              <button 
                onClick={() => {
                  setShowAddCategoryModal(false);
                  setEditingCategory(null);
                }} 
                className="p-1 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-emerald-900 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Category Selector / Manager Pills */}
            <div className="bg-emerald-50/60 dark:bg-emerald-900/40 p-2.5 rounded-2xl border border-emerald-200 dark:border-emerald-800 space-y-1.5">
              <div className="flex justify-between items-center text-[11px] font-bold text-emerald-950 dark:text-emerald-200">
                <span>Select Category to Edit:</span>
                <button
                  type="button"
                  onClick={handleOpenAddCategory}
                  className="text-emerald-700 dark:text-amber-400 hover:underline flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" /> New
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
                {categories.map(c => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => handleOpenEditCategory(c)}
                    className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all flex items-center gap-1 ${
                      editingCategory?.id === c.id
                        ? 'bg-emerald-700 text-white shadow ring-2 ring-emerald-500'
                        : 'bg-white dark:bg-emerald-950 text-emerald-900 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100'
                    }`}
                  >
                    <span>{c.icon || '🌾'}</span>
                    <span>{c.name}</span>
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={handleSaveCategory} className="space-y-3.5 text-xs overflow-y-auto pr-1">
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 dark:text-emerald-200 mb-1">
                    Category Name (English) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Organic Ghee & Honey"
                    value={newCategoryData.name}
                    onChange={(e) => setNewCategoryData({ 
                      ...newCategoryData, 
                      name: e.target.value,
                      slug: e.target.value.toLowerCase().replace(/\s+/g, '-') 
                    })}
                    className="w-full p-2.5 bg-emerald-50/50 dark:bg-emerald-900 border border-emerald-200 dark:border-emerald-700 rounded-xl font-bold text-gray-900 dark:text-emerald-100 focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 dark:text-emerald-200 mb-1">
                    Tamil Category Name (தமிழ்)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. இயற்கை நெய் & தேன்"
                    value={newCategoryData.tamil_name}
                    onChange={(e) => setNewCategoryData({ ...newCategoryData, tamil_name: e.target.value })}
                    className="w-full p-2.5 bg-emerald-50/50 dark:bg-emerald-900 border border-emerald-200 dark:border-emerald-700 rounded-xl font-bold text-emerald-800 dark:text-amber-300 focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
              </div>

              {/* Format Preview Badge */}
              <div className="bg-emerald-900 text-white p-3 rounded-2xl shadow-inner flex items-center justify-between text-xs">
                <span className="font-medium text-emerald-300">Storefront Pill Preview:</span>
                <span className="font-extrabold text-amber-300 bg-emerald-950 px-3 py-1 rounded-xl border border-emerald-700 shadow-sm flex items-center gap-1.5">
                  <span className="text-base">{newCategoryData.icon}</span>
                  <span>{newCategoryData.name || 'Category Name'}</span>
                  {newCategoryData.tamil_name && <span className="text-[10px] text-emerald-300">({newCategoryData.tamil_name})</span>}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 dark:text-emerald-200 mb-1">
                    Category Icon (Manual Emoji / Symbol Input) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Type/paste any emoji e.g. 🌾 🥥 🥭"
                    value={newCategoryData.icon}
                    onChange={(e) => setNewCategoryData({ ...newCategoryData, icon: e.target.value })}
                    className="w-full p-2.5 bg-emerald-50/50 dark:bg-emerald-900 border border-emerald-200 dark:border-emerald-700 rounded-xl font-bold text-base text-gray-900 dark:text-emerald-100 focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {['🌾', '🌿', '🫘', '🫙', '🍯', '🥨', '🫚', '🍵', '🧈', '🔥', '🥥', '🍌', '🥭', '🌶️', '🥛', '🥜'].map(emoji => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => setNewCategoryData({ ...newCategoryData, icon: emoji })}
                        className={`w-7 h-7 rounded-lg text-sm flex items-center justify-center transition-all ${
                          newCategoryData.icon === emoji
                            ? 'bg-emerald-700 text-white shadow ring-2 ring-emerald-400 scale-110'
                            : 'bg-emerald-100 dark:bg-emerald-900 text-gray-800 dark:text-emerald-200 hover:bg-emerald-200'
                        }`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-gray-700 dark:text-emerald-200 mb-1">
                    Display Order Priority
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={newCategoryData.display_order}
                    onChange={(e) => setNewCategoryData({ ...newCategoryData, display_order: Number(e.target.value) })}
                    className="w-full p-2.5 bg-emerald-50/50 dark:bg-emerald-900 border border-emerald-200 dark:border-emerald-700 rounded-xl font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 dark:text-emerald-200 mb-1">
                  Category Image Banner URL (Optional)
                </label>
                <input
                  type="text"
                  placeholder="https://images.unsplash.com/..."
                  value={newCategoryData.image_url}
                  onChange={(e) => setNewCategoryData({ ...newCategoryData, image_url: e.target.value })}
                  className="w-full p-2.5 bg-emerald-50/50 dark:bg-emerald-900 border border-emerald-200 dark:border-emerald-700 rounded-xl font-medium"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 dark:text-emerald-200 mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  placeholder="Short summary of items in this category..."
                  value={newCategoryData.description}
                  onChange={(e) => setNewCategoryData({ ...newCategoryData, description: e.target.value })}
                  className="w-full p-2.5 bg-emerald-50/50 dark:bg-emerald-900 border border-emerald-200 dark:border-emerald-700 rounded-xl font-medium"
                />
              </div>

              {/* Status & Visibility Toggles */}
              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-emerald-100 dark:border-emerald-800">
                <label className="flex items-center space-x-2 bg-emerald-50/60 dark:bg-emerald-900/50 p-2.5 rounded-xl border border-emerald-200 dark:border-emerald-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newCategoryData.is_visible}
                    onChange={(e) => setNewCategoryData({ ...newCategoryData, is_visible: e.target.checked })}
                    className="w-4 h-4 text-emerald-600 rounded border-emerald-300 focus:ring-emerald-500"
                  />
                  <span className="font-bold text-xs text-gray-800 dark:text-emerald-100">
                    Show on Website Storefront
                  </span>
                </label>

                <label className="flex items-center space-x-2 bg-emerald-50/60 dark:bg-emerald-900/50 p-2.5 rounded-xl border border-emerald-200 dark:border-emerald-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newCategoryData.is_active}
                    onChange={(e) => setNewCategoryData({ ...newCategoryData, is_active: e.target.checked })}
                    className="w-4 h-4 text-emerald-600 rounded border-emerald-300 focus:ring-emerald-500"
                  />
                  <span className="font-bold text-xs text-gray-800 dark:text-emerald-100">
                    Category Active
                  </span>
                </label>
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t border-emerald-100 dark:border-emerald-800">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddCategoryModal(false);
                    setEditingCategory(null);
                  }}
                  className="px-5 py-2.5 bg-gray-200 dark:bg-emerald-900 text-gray-800 dark:text-emerald-100 font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold rounded-xl shadow-lg transition-all flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>{editingCategory ? 'Save Category Specs' : 'Create Category'}</span>
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* ================= CUSTOM ANIMATED DELETE CONFIRMATION POPUP ================= */}
      {deletingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fadeIn">
          <div className="bg-white dark:bg-emerald-950 max-w-sm w-full p-6 rounded-3xl shadow-2xl border border-rose-200 dark:border-rose-900/60 text-center space-y-4">
            
            <div className="w-16 h-16 rounded-full bg-rose-100 dark:bg-rose-900/60 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto border-4 border-rose-200 dark:border-rose-800">
              <ShieldAlert className="w-8 h-8" />
            </div>

            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider mb-2 bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300">
                <ShieldAlert className="w-3 h-3" />
                <span>Confirmation Required</span>
              </div>
              <h3 className="text-lg font-black text-rose-950 dark:text-rose-200">
                Are you sure you want to delete this SKU?
              </h3>
              <p className="text-xs text-gray-500 dark:text-emerald-300 mt-1 leading-relaxed">
                You are about to permanently remove <strong className="text-rose-600 font-bold">{deletingProduct.name}</strong> (<span className="font-mono">{deletingProduct.sku}</span>) from the store catalog. This action cannot be undone.
              </p>
            </div>

            {/* Product Card Snippet */}
            <div className="p-3 bg-emerald-50 dark:bg-emerald-900/40 rounded-2xl border border-emerald-100 dark:border-emerald-800 flex items-center space-x-3 text-left">
              <img 
                src={deletingProduct.image_url || 'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=150&q=80'} 
                alt={deletingProduct.name} 
                className="w-12 h-12 object-cover rounded-xl border border-emerald-200 dark:border-emerald-700 shrink-0"
              />
              <div className="flex-1 min-w-0 text-xs">
                <div className="font-bold text-gray-900 dark:text-emerald-100 truncate">{deletingProduct.name}</div>
                <div className="text-[11px] text-emerald-700 dark:text-amber-400 font-mono font-bold">
                  {formatPrice(deletingProduct.selling_price)} • Stock: {deletingProduct.current_stock} {deletingProduct.unit}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeletingProduct(null)}
                className="py-2.5 px-4 bg-gray-100 dark:bg-emerald-900 text-gray-700 dark:text-emerald-200 font-bold text-xs rounded-xl hover:bg-gray-200 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteProduct}
                className="py-2.5 px-4 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs rounded-xl shadow-lg hover:shadow-xl transition flex items-center justify-center space-x-1.5 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>Yes, Confirm Delete</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ================= ANIMATED LOADING POPUP DURING SKU / CATEGORY SAVE ================= */}
      {isSaving && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fadeIn">
          <div className="bg-white dark:bg-emerald-950 p-8 rounded-3xl shadow-2xl border border-emerald-200 dark:border-emerald-700 max-w-sm w-full text-center space-y-4">
            
            {!saveSuccess ? (
              <>
                <div className="relative w-20 h-20 mx-auto flex items-center justify-center">
                  <div className="absolute inset-0 rounded-full border-4 border-emerald-200 dark:border-emerald-800 animate-ping opacity-30" />
                  <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center text-emerald-700 dark:text-amber-300 animate-spin">
                    <RefreshCw className="w-8 h-8" />
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-black text-emerald-950 dark:text-emerald-100">
                    {loadingMessage}
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-emerald-300 mt-1">
                    Updating store catalog records and database...
                  </p>
                </div>

                {/* Animated Progress Bar with Live Percentage */}
                <div className="space-y-1.5 text-left">
                  <div className="flex justify-between items-center text-xs font-bold text-gray-500 dark:text-emerald-300">
                    <span>Synchronizing Catalog</span>
                    <span className="text-emerald-800 dark:text-amber-400 font-mono font-black">{saveProgress}%</span>
                  </div>
                  <div className="w-full bg-emerald-100 dark:bg-emerald-900 rounded-full h-3 overflow-hidden p-0.5 border border-emerald-200 dark:border-emerald-800 shadow-inner">
                    <div 
                      className="bg-gradient-to-r from-emerald-500 via-emerald-600 to-amber-400 h-full rounded-full transition-all duration-200 ease-out" 
                      style={{ width: `${saveProgress}%` }}
                    />
                  </div>
                </div>
              </>
            ) : (
              <div className="space-y-3 animate-scaleUp">
                <div className="w-20 h-20 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto border-4 border-emerald-200">
                  <CheckCircle2 className="w-10 h-10" />
                </div>
                <h3 className="text-xl font-black text-emerald-950 dark:text-emerald-100">
                  Catalog Updated!
                </h3>
                <p className="text-xs text-emerald-700 dark:text-emerald-300 font-bold">
                  Record saved successfully to store database.
                </p>
              </div>
            )}

          </div>
        </div>
      )}

      {/* ================= QUICK STOCK ADJUSTMENT / REFILL MODAL ================= */}
      {quickStockProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fadeIn">
          <div className="bg-white dark:bg-emerald-950 max-w-md w-full p-6 rounded-3xl shadow-2xl border border-emerald-200 dark:border-emerald-800 space-y-4">
            <div className="flex justify-between items-center border-b border-gray-100 dark:border-emerald-800 pb-3">
              <div>
                <h3 className="text-base font-extrabold text-emerald-950 dark:text-emerald-100 flex items-center gap-2">
                  <Boxes className="w-5 h-5 text-emerald-600 dark:text-amber-400" />
                  <span>Store Stock Inventory Manager</span>
                </h3>
                <p className="text-xs text-gray-500 dark:text-emerald-400">
                  {quickStockProduct.name} ({quickStockProduct.sku})
                </p>
              </div>
              <button 
                type="button"
                onClick={() => setQuickStockProduct(null)} 
                className="text-gray-400 hover:text-gray-600 dark:hover:text-emerald-300 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Product Summary Card */}
            <div className="p-3 bg-emerald-50 dark:bg-emerald-900/40 rounded-2xl border border-emerald-100 dark:border-emerald-800 flex items-center gap-3">
              <img 
                src={quickStockProduct.image_url || 'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=150&q=80'} 
                alt={quickStockProduct.name} 
                className="w-12 h-12 object-cover rounded-xl border border-emerald-200 dark:border-emerald-700 shrink-0"
              />
              <div className="flex-1 min-w-0 text-xs">
                <div className="font-bold text-gray-900 dark:text-emerald-100 truncate">{quickStockProduct.name}</div>
                <div className="text-[11px] text-gray-500 dark:text-emerald-300 font-mono">
                  SKU: {quickStockProduct.sku} • Reorder Alert: {quickStockProduct.reorder_level || 5} {quickStockProduct.unit}
                </div>
                <div className="text-[11px] font-black text-emerald-800 dark:text-amber-300 font-mono mt-0.5">
                  Current Stock: {quickStockProduct.current_stock || 0} {quickStockProduct.unit}
                </div>
              </div>
            </div>

            <form onSubmit={handleQuickStockSubmit} className="space-y-3.5 text-xs">
              {/* 3 Modes: Increase, Decrease, Set Exact */}
              <div className="grid grid-cols-3 gap-1 p-1 rounded-2xl bg-gray-100 dark:bg-emerald-900/60 border border-emerald-100 dark:border-emerald-800">
                <button
                  type="button"
                  onClick={() => setQuickStockMode('ADD')}
                  className={`py-2 px-1.5 rounded-xl font-bold transition flex items-center justify-center gap-1 ${
                    quickStockMode === 'ADD' 
                      ? 'bg-emerald-700 text-white shadow' 
                      : 'text-gray-600 dark:text-emerald-300 hover:bg-gray-200 dark:hover:bg-emerald-800'
                  }`}
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Increase</span>
                </button>
                <button
                  type="button"
                  onClick={() => setQuickStockMode('SUBTRACT')}
                  className={`py-2 px-1.5 rounded-xl font-bold transition flex items-center justify-center gap-1 ${
                    quickStockMode === 'SUBTRACT' 
                      ? 'bg-rose-700 text-white shadow' 
                      : 'text-gray-600 dark:text-emerald-300 hover:bg-gray-200 dark:hover:bg-emerald-800'
                  }`}
                >
                  <span className="font-black text-sm">−</span>
                  <span>− Decrease</span>
                </button>
                <button
                  type="button"
                  onClick={() => setQuickStockMode('SET')}
                  className={`py-2 px-1.5 rounded-xl font-bold transition flex items-center justify-center gap-1 ${
                    quickStockMode === 'SET' 
                      ? 'bg-indigo-700 text-white shadow' 
                      : 'text-gray-600 dark:text-emerald-300 hover:bg-gray-200 dark:hover:bg-emerald-800'
                  }`}
                >
                  <span>= Set Exact</span>
                </button>
              </div>

              {/* Quantity Input */}
              <div>
                <label className="block font-bold text-gray-700 dark:text-emerald-200 mb-1">
                  {quickStockMode === 'ADD' 
                    ? `Quantity to Add / Refill (${quickStockProduct.unit})` 
                    : quickStockMode === 'SUBTRACT'
                    ? `Quantity to Decrease (${quickStockProduct.unit})`
                    : `New Absolute Stock Count (${quickStockProduct.unit})`}
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  step="1"
                  value={quickStockAmount}
                  onChange={(e) => setQuickStockAmount(Math.max(0, Number(e.target.value)))}
                  className="w-full p-2.5 bg-white dark:bg-emerald-900 border border-emerald-300 dark:border-emerald-700 rounded-xl font-mono font-black text-emerald-800 dark:text-emerald-200 text-lg outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Quick Presets */}
              <div>
                <div className="text-[10px] font-bold text-gray-500 dark:text-emerald-400 mb-1.5">
                  Quick Presets (Click to select):
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {quickStockMode === 'ADD' && [5, 10, 20, 25, 50, 100].map(amt => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setQuickStockAmount(amt)}
                      className="px-2.5 py-1 rounded-lg bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200 font-bold hover:bg-emerald-200 transition"
                    >
                      +{amt}
                    </button>
                  ))}
                  {quickStockMode === 'SUBTRACT' && [1, 2, 5, 10, 20, 25].map(amt => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setQuickStockAmount(amt)}
                      className="px-2.5 py-1 rounded-lg bg-rose-100 dark:bg-rose-900/60 text-rose-800 dark:text-rose-200 font-bold hover:bg-rose-200 transition"
                    >
                      -{amt}
                    </button>
                  ))}
                  {quickStockMode === 'SET' && [0, 10, 25, 50, 100].map(amt => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setQuickStockAmount(amt)}
                      className="px-2.5 py-1 rounded-lg bg-indigo-100 dark:bg-indigo-900/60 text-indigo-800 dark:text-indigo-200 font-bold hover:bg-indigo-200 transition"
                    >
                      {amt === 0 ? '0 (Out of stock)' : amt}
                    </button>
                  ))}
                </div>
              </div>

              {/* Real-time Math Display */}
              <div className="p-3 rounded-2xl bg-emerald-50/80 dark:bg-emerald-900/60 border border-emerald-200 dark:border-emerald-700 grid grid-cols-3 gap-2 text-center text-xs">
                <div>
                  <div className="text-[10px] text-gray-500 dark:text-emerald-400 font-bold">Current</div>
                  <div className="font-mono font-black text-gray-800 dark:text-emerald-100 text-sm">
                    {quickStockProduct.current_stock || 0}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-gray-500 dark:text-emerald-400 font-bold">Change</div>
                  <div className={`font-mono font-black text-sm ${
                    quickStockMode === 'ADD' ? 'text-emerald-600 dark:text-emerald-400' : quickStockMode === 'SUBTRACT' ? 'text-rose-600 dark:text-rose-400' : 'text-indigo-600 dark:text-indigo-300'
                  }`}>
                    {quickStockMode === 'ADD' ? `+${quickStockAmount}` : quickStockMode === 'SUBTRACT' ? `-${quickStockAmount}` : `=${quickStockAmount}`}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-gray-500 dark:text-emerald-400 font-bold">New Total</div>
                  <div className="font-mono font-black text-emerald-900 dark:text-amber-300 text-sm">
                    {quickStockMode === 'ADD' 
                      ? (quickStockProduct.current_stock || 0) + Number(quickStockAmount)
                      : quickStockMode === 'SUBTRACT'
                      ? Math.max(0, (quickStockProduct.current_stock || 0) - Number(quickStockAmount))
                      : Number(quickStockAmount)} {quickStockProduct.unit}
                  </div>
                </div>
              </div>

              {/* Optional Reason Input */}
              <div>
                <label className="block font-bold text-gray-700 dark:text-emerald-200 mb-1">
                  Adjustment Reason / Audit Note (Optional)
                </label>
                <input
                  type="text"
                  value={quickStockReason}
                  onChange={(e) => setQuickStockReason(e.target.value)}
                  placeholder="e.g. Supplier delivery, damaged goods deduction, customer return..."
                  className="w-full p-2 bg-white dark:bg-emerald-900/50 border border-gray-200 dark:border-emerald-700 rounded-xl text-xs text-gray-800 dark:text-emerald-100 outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-gray-100 dark:border-emerald-800">
                <button
                  type="button"
                  onClick={() => setQuickStockProduct(null)}
                  className="px-4 py-2 bg-gray-100 dark:bg-emerald-900 text-gray-700 dark:text-emerald-200 font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold rounded-xl shadow transition"
                >
                  Update &amp; Sync Stock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= PRICE HISTORY AUDIT MODAL ================= */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-emerald-950 max-w-lg w-full max-h-[90vh] flex flex-col p-6 rounded-3xl shadow-2xl border border-emerald-100 dark:border-emerald-800 space-y-4">
            <div className="flex justify-between items-center border-b border-emerald-100 dark:border-emerald-800 pb-3">
              <div>
                <h3 className="font-bold text-sm text-gray-900 dark:text-emerald-100 flex items-center gap-1.5">
                  <History className="w-4 h-4 text-emerald-600 dark:text-amber-400" />
                  <span>Price History &amp; Audit Log</span>
                </h3>
                <p className="text-xs text-gray-500 dark:text-emerald-300">
                  {showHistoryModal.name} ({showHistoryModal.sku})
                </p>
              </div>
              <button 
                onClick={() => setShowHistoryModal(null)} 
                className="text-gray-400 hover:text-gray-600 dark:hover:text-emerald-300 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {/* Current Active Pricing Bar */}
            <div className="p-3.5 bg-emerald-50 dark:bg-emerald-900/50 rounded-2xl border border-emerald-200 dark:border-emerald-800 grid grid-cols-3 gap-2 text-center text-xs">
              <div>
                <div className="text-[10px] font-bold text-gray-500 dark:text-emerald-400">Current Selling</div>
                <div className="font-mono font-black text-emerald-800 dark:text-amber-400 text-sm sm:text-base">
                  {formatPrice(showHistoryModal.selling_price)}
                </div>
              </div>
              <div>
                <div className="text-[10px] font-bold text-gray-500 dark:text-emerald-400">Offer Price</div>
                <div className="font-mono font-black text-rose-600 dark:text-rose-400 text-sm sm:text-base">
                  {showHistoryModal.offer_price ? formatPrice(showHistoryModal.offer_price) : 'None'}
                </div>
              </div>
              <div>
                <div className="text-[10px] font-bold text-gray-500 dark:text-emerald-400">Cost / MRP</div>
                <div className="font-mono font-bold text-gray-700 dark:text-emerald-200 text-xs">
                  {formatPrice(showHistoryModal.landed_cost || showHistoryModal.purchase_price)} / <span className="line-through text-rose-500">{formatPrice(showHistoryModal.mrp)}</span>
                </div>
              </div>
            </div>

            {/* Quick Record Price Revision Accordion Form */}
            <details className="bg-slate-50 dark:bg-emerald-900/30 rounded-2xl p-3 border border-slate-200 dark:border-emerald-800 text-xs">
              <summary className="font-bold text-emerald-800 dark:text-amber-300 cursor-pointer select-none flex items-center justify-between">
                <span>⚡ Record New Price Revision</span>
                <span className="text-[10px] font-semibold text-gray-400">+ Expand Form</span>
              </summary>
              <form onSubmit={handleQuickPriceRevision} className="mt-3 space-y-2.5 pt-2 border-t border-slate-200 dark:border-emerald-800">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-600 dark:text-emerald-300 mb-0.5">New Selling Price (₹)</label>
                    <input
                      type="number"
                      required
                      min="0"
                      value={newRevisionPrice}
                      onChange={(e) => setNewRevisionPrice(Number(e.target.value))}
                      className="w-full p-2 rounded-xl border border-gray-300 dark:border-emerald-700 bg-white dark:bg-emerald-950 font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-600 dark:text-emerald-300 mb-0.5">Offer Price (Optional)</label>
                    <input
                      type="number"
                      min="0"
                      value={newRevisionOffer ?? ''}
                      onChange={(e) => setNewRevisionOffer(e.target.value ? Number(e.target.value) : undefined)}
                      placeholder="Leave blank for regular"
                      className="w-full p-2 rounded-xl border border-gray-300 dark:border-emerald-700 bg-white dark:bg-emerald-950 font-mono font-bold"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-600 dark:text-emerald-300 mb-0.5">Revision Reason / Note</label>
                  <input
                    type="text"
                    value={newRevisionReason}
                    onChange={(e) => setNewRevisionReason(e.target.value)}
                    placeholder="e.g. Festival harvest discount, wholesale cost increase..."
                    className="w-full p-2 rounded-xl border border-gray-300 dark:border-emerald-700 bg-white dark:bg-emerald-950 text-xs"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isSubmittingRevision}
                  className="w-full py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold rounded-xl transition flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5 text-amber-300" />
                  <span>{isSubmittingRevision ? 'Saving Revision...' : 'Save & Log Price Change'}</span>
                </button>
              </form>
            </details>

            {/* Audit Log Entries List */}
            <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 max-h-64 text-xs">
              <div className="font-bold text-gray-700 dark:text-emerald-200 uppercase tracking-wider text-[10px] flex items-center justify-between">
                <span>Audit Log Timeline ({historyLogs.length})</span>
                {historyLoading && <span className="text-amber-500 font-normal">Loading records...</span>}
              </div>

              {historyLoading ? (
                <div className="text-center py-8 text-gray-400">Loading audit history...</div>
              ) : historyLogs.length === 0 ? (
                <div className="p-4 bg-emerald-50/60 dark:bg-emerald-900/30 rounded-2xl border border-emerald-100 dark:border-emerald-800 text-center space-y-2">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
                  <div className="font-bold text-gray-800 dark:text-emerald-100">Initial Catalog Baseline Active</div>
                  <p className="text-[11px] text-gray-500 dark:text-emerald-400">
                    This SKU is at its baseline catalog pricing (Selling: {formatPrice(showHistoryModal.selling_price)}). Any revisions saved via the editor or logged above will appear here with timestamps and price diffs.
                  </p>
                </div>
              ) : (
                historyLogs.map((log) => (
                  <div
                    key={log.id}
                    className="p-3 bg-slate-50 dark:bg-emerald-900/40 rounded-2xl border border-slate-200 dark:border-emerald-800/80 space-y-1.5 transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-gray-800 dark:text-emerald-100 flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        {log.type === 'PRICE_REVISION' ? 'Price Revision' : log.action || 'Catalog Update'}
                      </span>
                      <span className="font-mono text-[10px] text-gray-500 dark:text-emerald-400">
                        {log.date ? new Date(log.date).toLocaleDateString('en-IN', {
                          day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                        }) : 'N/A'}
                      </span>
                    </div>

                    {log.selling_price && (
                      <div className="flex items-center justify-between font-mono pt-1">
                        <span className="text-[11px] text-gray-500 dark:text-emerald-300">
                          Selling Price: <strong className="text-emerald-700 dark:text-amber-300">{formatPrice(log.selling_price)}</strong>
                        </span>
                        {log.offer_price && (
                          <span className="text-[10px] bg-rose-100 dark:bg-rose-900/60 text-rose-800 dark:text-rose-200 px-1.5 py-0.5 rounded font-bold">
                            Offer: {formatPrice(log.offer_price)}
                          </span>
                        )}
                      </div>
                    )}

                    <div className="text-[11px] text-gray-600 dark:text-emerald-300 leading-snug">
                      {log.description || log.reason}
                    </div>

                    <div className="text-[10px] text-gray-400 dark:text-emerald-400/80 flex items-center justify-between pt-1 border-t border-slate-100 dark:border-emerald-800/60">
                      <span>By: {log.user || 'Store Admin'}</span>
                      <span className="font-mono text-[9px]">{log.id}</span>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="flex justify-end pt-2 border-t border-gray-100 dark:border-emerald-800">
              <button
                type="button"
                onClick={() => setShowHistoryModal(null)}
                className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold rounded-xl transition text-xs"
              >
                Close Log
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EXPORT FORMAT MODAL */}
      <ExportFormatModal
        isOpen={showExportModal}
        title="Export Product Catalog"
        description="Select export format for current filtered SKUs:"
        totalRecords={filteredProducts.length}
        onClose={() => setShowExportModal(false)}
        onExport={handleExecuteExportFormat}
      />

      {/* REAL ANIMATED REFRESH SPINNER MODAL */}
      <RefreshSpinnerModal
        isOpen={isRefreshing}
        title="Refreshing Catalog SKUs..."
        subtitle="Syncing latest MR. VIVASAYI product pricing & stock levels..."
        moduleName="Catalog Manager"
        onComplete={() => {
          setIsRefreshing(false);
          setSortBy('recent');
          setCurrentPage(1);
          toast.success('🔄 Catalog Refreshed! Recent SKUs placed on top.');
          addNotification({
            title: 'Catalog Synced',
            message: 'Refreshed product catalog dataset. Recent SKUs placed on top.',
            type: 'info',
            sourceModule: 'Catalog Manager'
          });
        }}
      />

    </div>
  );
};

export default ProductsManagerPage;
