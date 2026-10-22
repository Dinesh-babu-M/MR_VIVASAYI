import React, { useState, useEffect, useMemo } from 'react';
import {
  Boxes,
  AlertTriangle,
  TrendingDown,
  Package,
  Search,
  Plus,
  Minus,
  ArrowUpDown,
  X,
  CheckCircle2,
  RefreshCw,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Trash2,
  Edit2,
  ShieldAlert,
  XCircle,
  PackageCheck,
  History,
  DollarSign,
  Filter,
  Download
} from 'lucide-react';
import { formatPrice, formatDate } from '../../lib/utils';
import { StockStatus, MovementType, StockMovement, Product, Category } from '../../types';
import { useNotifications } from '../../contexts/NotificationContext';
import { useActionModal } from '../../contexts/ActionModalContext';
import { ExportFormatModal, ExportFormat } from '../../components/common/ExportFormatModal';
import { RefreshSpinnerModal } from '../../components/common/RefreshSpinnerModal';
import { AdminPageSkeleton } from '../../components/common/Skeleton';
import { getJSONStore, setJSONStore } from '../../lib/dbManager';
import toast from 'react-hot-toast';

export default function InventoryPage() {
  const { addNotification } = useNotifications();
  const { showConfirmModal } = useActionModal();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        let p = await getJSONStore<Product>('inventory');
        if (!p || p.length === 0) {
          p = await getJSONStore<Product>('products');
        }
        const [c, sm] = await Promise.all([
          getJSONStore<Category>('categories'),
          getJSONStore<StockMovement>('stock_movements'),
        ]);
        setProducts(p || []);
        setCategories(c || []);
        setMovements(sm || []);
      } catch (err) {
        console.error('Failed loading inventory data:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<'recent' | 'name' | 'stock-asc' | 'stock-desc' | 'reorder' | 'sku'>('recent');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Selective Actions State (Multi-select, selective export, edit, delete)
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);

  // Modal State for Adjusting / Editing Stock & All Product Fields
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [adjustType, setAdjustType] = useState<'ADD' | 'REMOVE' | 'SET'>('ADD');
  const [adjustQty, setAdjustQty] = useState<number>(10);
  const [newReorderLevel, setNewReorderLevel] = useState<number>(10);
  const [editSellingPrice, setEditSellingPrice] = useState<number>(0);
  const [editOfferPrice, setEditOfferPrice] = useState<number>(0);
  const [editMrp, setEditMrp] = useState<number>(0);
  const [editPurchasePrice, setEditPurchasePrice] = useState<number>(0);
  const [editPackSize, setEditPackSize] = useState<string>('');
  const [editUnit, setEditUnit] = useState<string>('kg');
  const [adjustReason, setAdjustReason] = useState<string>('Physical stock reconciliation');
  const [activeModalTab, setActiveModalTab] = useState<'stock' | 'pricing' | 'reason'>('stock');

  // Modal State for Delete Product SKU
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Export Modal State
  const [showExportModal, setShowExportModal] = useState(false);

  // Multi-Format Export Handler for Inventory
  const handleExecuteInventoryExport = (format: ExportFormat) => {
    if (filteredProducts.length === 0) {
      addNotification({
        title: 'Export Failed',
        message: 'No inventory items available to export.',
        type: 'warning',
        sourceModule: 'Inventory Control'
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
          <td style="padding: 6px; border-bottom: 1px solid #eee; text-align: center;">${p.current_stock}</td>
          <td style="padding: 6px; border-bottom: 1px solid #eee; text-align: center;">${p.reorder_level}</td>
          <td style="padding: 6px; border-bottom: 1px solid #eee; text-align: right; font-weight: bold; color: #064e3b;">₹${p.selling_price}</td>
          <td style="padding: 6px; border-bottom: 1px solid #eee; text-align: right;">₹${p.current_stock * p.selling_price}</td>
          <td style="padding: 6px; border-bottom: 1px solid #eee; text-align: center;">${p.stock_status}</td>
        </tr>
      `).join('');

      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>MR. VIVASAYI Inventory Stock Audit Report</title>
            <style>
              body { font-family: sans-serif; padding: 24px; color: #064e3b; }
              h1 { color: #064e3b; margin-bottom: 4px; font-size: 22px; }
              p { font-size: 12px; color: #666; margin-top: 0; }
              table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 11px; }
              th { background: #064e3b; color: white; padding: 8px; text-align: left; }
            </style>
          </head>
          <body>
            <h1>🌿 MR. VIVASAYI Stock & Inventory Audit Report</h1>
            <p>Generated on ${new Date().toLocaleString()} | Total Filtered SKUs: ${filteredProducts.length}</p>
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>SKU</th>
                  <th>Product Description</th>
                  <th style="text-align: center;">Current Stock</th>
                  <th style="text-align: center;">Reorder Level</th>
                  <th style="text-align: right;">Selling Price</th>
                  <th style="text-align: right;">Valuation</th>
                  <th style="text-align: center;">Status</th>
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
        title: `Inventory Report ${format === 'PDF' ? 'PDF Generated' : 'Printing Initiated'}`,
        message: `Prepared audit document for ${filteredProducts.length} stock SKUs.`,
        type: 'success',
        sourceModule: 'Inventory Control'
      });
      return;
    }

    const headers = ['SKU', 'Product Name', 'Tamil Name', 'Current Stock', 'Opening Stock', 'Reorder Level', 'Selling Price (₹)', 'Purchase Price (₹)', 'Inventory Value (₹)', 'Stock Status'];
    const rows = filteredProducts.map(p => [
      `"${p.sku}"`,
      `"${p.name}"`,
      `"${p.tamil_name || ''}"`,
      p.current_stock,
      p.opening_stock || 0,
      p.reorder_level,
      p.selling_price,
      p.purchase_price,
      p.current_stock * p.selling_price,
      `"${p.stock_status}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `MR_VIVASAYI_Inventory_Export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    addNotification({
      title: 'Inventory Data Exported',
      message: `Downloaded ${format} stock valuation dataset for ${filteredProducts.length} SKUs.`,
      type: 'success',
      sourceModule: 'Inventory Control'
    });
  };

  // Loading Animation Popup State
  const [isSaving, setIsSaving] = useState(false);
  const [saveProgress, setSaveProgress] = useState(0);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // 1. Overview 4 Box Stats Calculation
  const metrics = useMemo(() => {
    const totalSKUs = products.length;
    const inStockCount = products.filter(p => p.current_stock > p.reorder_level && p.stock_status !== 'OUT_OF_STOCK').length;
    const lowStockCount = products.filter(p => p.current_stock <= p.reorder_level && p.current_stock > 0).length;
    const outOfStockCount = products.filter(p => p.current_stock === 0 || p.stock_status === 'OUT_OF_STOCK').length;
    const totalInventoryValue = products.reduce((sum, p) => sum + (p.current_stock * p.selling_price), 0);

    return { totalSKUs, inStockCount, lowStockCount, outOfStockCount, totalInventoryValue };
  }, [products]);

  // 2. Filter & Sort Logic
  const filteredProducts = useMemo(() => {
    return products.filter(product => {
      const matchesSearch =
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (product.tamil_name && product.tamil_name.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesCategory =
        selectedCategory === 'ALL' || product.category_id === selectedCategory;

      let effectiveStatus = product.stock_status;
      if (!effectiveStatus) {
        if (product.current_stock === 0) effectiveStatus = 'OUT_OF_STOCK';
        else if (product.current_stock <= (product.reorder_level || 10)) effectiveStatus = 'LOW_STOCK';
        else effectiveStatus = 'IN_STOCK';
      }

      const matchesStatus =
        statusFilter === 'ALL' || effectiveStatus === statusFilter || product.stock_status === statusFilter;

      return matchesSearch && matchesCategory && matchesStatus;
    }).sort((a, b) => {
      if (sortBy === 'recent') return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
      if (sortBy === 'stock-asc') return a.current_stock - b.current_stock;
      if (sortBy === 'stock-desc') return b.current_stock - a.current_stock;
      if (sortBy === 'reorder') return (a.reorder_level - a.current_stock) - (b.reorder_level - b.current_stock);
      if (sortBy === 'sku') return a.sku.localeCompare(b.sku);
      return a.name.localeCompare(b.name);
    });
  }, [products, searchQuery, selectedCategory, statusFilter, sortBy]);

  // 3. Pagination Logic
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage) || 1;
  const paginatedProducts = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredProducts.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredProducts, currentPage, itemsPerPage]);

  const handleFilterChange = (setter: React.Dispatch<React.SetStateAction<any>>, value: any) => {
    setter(value);
    setCurrentPage(1);
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedCategory('ALL');
    setStatusFilter('ALL');
    setSortBy('recent');
    setCurrentPage(1);
  };

  // Bulk Selective Actions Handlers
  const handleBulkExportSelectedInventory = () => {
    const list = selectedProductIds.length > 0
      ? products.filter(p => selectedProductIds.includes(p.id))
      : filteredProducts;
    if (list.length === 0) {
      toast.error('No inventory items to export');
      return;
    }
    const headers = ['SKU', 'Product Name', 'Tamil Name', 'Current Stock', 'Unit', 'Reorder Level', 'Stock Status', 'Selling Price', 'MRP'];
    const rows = list.map(p => [
      p.sku,
      `"${p.name || ''}"`,
      `"${p.tamil_name || ''}"`,
      p.current_stock,
      p.unit,
      p.reorder_level,
      p.stock_status,
      p.selling_price,
      p.mrp || p.selling_price
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `inventory_records_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`Exported ${list.length} inventory items to CSV!`);
  };

  const handleBulkSetStockStatus = async (status: StockStatus) => {
    if (selectedProductIds.length === 0) return;
    try {
      const selectedSet = new Set(selectedProductIds);
      const updated = products.map(p => selectedSet.has(p.id) ? { ...p, stock_status: status, updated_at: new Date().toISOString() } : p);
      setProducts(updated);
      await setJSONStore('products', updated);
      toast.success(`Updated ${selectedSet.size} item(s) status to ${status}!`);
      setSelectedProductIds([]);
    } catch (err) {
      console.error(err);
      toast.error('Failed to update stock status');
    }
  };

  const handleBulkDeleteInventory = () => {
    if (selectedProductIds.length === 0) return;
    showConfirmModal({
      title: `Delete ${selectedProductIds.length} Inventory Items?`,
      message: `Are you sure you want to permanently delete ${selectedProductIds.length} inventory items from the system?`,
      confirmText: `Yes, Delete ${selectedProductIds.length} Items`,
      variant: 'danger',
      onConfirm: async () => {
        try {
          const selectedSet = new Set(selectedProductIds);
          const updated = products.filter(p => !selectedSet.has(p.id));
          setProducts(updated);
          await setJSONStore('products', updated);
          setSelectedProductIds([]);
          toast.success(`Deleted ${selectedSet.size} items from inventory!`);
        } catch (err) {
          console.error(err);
          toast.error('Failed to delete items');
        }
      }
    });
  };

  // Open Adjust Modal & Initialize All Product Details
  const handleOpenAdjustModal = (product: Product) => {
    setSelectedProduct(product);
    setAdjustType('ADD');
    setAdjustQty(10);
    setNewReorderLevel(product.reorder_level ?? 10);
    setEditSellingPrice(product.selling_price ?? 0);
    setEditOfferPrice(product.offer_price ?? 0);
    setEditMrp(product.mrp ?? product.selling_price ?? 0);
    setEditPurchasePrice(product.purchase_price ?? 0);
    setEditPackSize(product.pack_size ?? '');
    setEditUnit(product.unit ?? 'kg');
    setAdjustReason('Physical stock reconciliation & price audit');
    setActiveModalTab('stock');
  };

  // Submit Stock Adjustment & All Field Updates with Loading Animation
  const handleAdjustStock = () => {
    if (!selectedProduct) return;

    let newStock = selectedProduct.current_stock;
    if (adjustType === 'ADD') newStock += adjustQty;
    else if (adjustType === 'REMOVE') newStock = Math.max(0, newStock - adjustQty);
    else if (adjustType === 'SET') newStock = Math.max(0, adjustQty);

    let newStatus: StockStatus = 'IN_STOCK';
    if (newStock === 0) newStatus = 'OUT_OF_STOCK';
    else if (newStock <= newReorderLevel) newStatus = 'LOW_STOCK';

    setIsSaving(true);
    setSaveProgress(20);
    setSaveSuccess(false);

    const interval = setInterval(() => {
      setSaveProgress(prev => (prev >= 90 ? 90 : prev + 25));
    }, 120);

    setTimeout(() => {
      clearInterval(interval);
      setSaveProgress(100);
      setSaveSuccess(true);

      setTimeout(() => {
        const finalOfferPrice = Number(editOfferPrice) > 0 ? Number(editOfferPrice) : undefined;
        // Update Product in State with ALL modified fields including offer_price
        const updatedProducts = products.map(p =>
          p.id === selectedProduct.id
            ? {
                ...p,
                current_stock: newStock,
                reorder_level: Number(newReorderLevel) || 0,
                selling_price: Number(editSellingPrice) || 0,
                offer_price: finalOfferPrice,
                mrp: Number(editMrp) || Number(editSellingPrice) || 0,
                purchase_price: Number(editPurchasePrice) || 0,
                pack_size: editPackSize,
                unit: editUnit,
                stock_status: newStatus
              }
            : p
        );
        setProducts(updatedProducts);
        setJSONStore('products', updatedProducts);
        setJSONStore('inventory', updatedProducts);

        // Add Movement Audit Entry
        const movementType: MovementType = adjustType === 'ADD' ? 'ADJUSTMENT' : adjustType === 'REMOVE' ? 'DAMAGE' : 'ADJUSTMENT';
        const newMovement: StockMovement = {
          id: `mov-${Date.now()}`,
          product_id: selectedProduct.id,
          movement_type: movementType,
          quantity: adjustType === 'REMOVE' ? -adjustQty : adjustQty,
          stock_before: selectedProduct.current_stock,
          stock_after: newStock,
          notes: `${adjustReason} | Price: ₹${editSellingPrice} (MRP ₹${editMrp}), Pack: ${editPackSize || '-'} ${editUnit}`,
          created_by: 'Inventory Manager',
          created_at: new Date().toISOString(),
          product: selectedProduct
        };

        const updatedMovements = [newMovement, ...movements];
        setMovements(updatedMovements);
        setJSONStore('stock_movements', updatedMovements);

        addNotification({
          title: 'Stock & Specs Saved Successfully',
          message: `Product "${selectedProduct.name}" updated (Stock: ${newStock} ${editUnit}, Price: ₹${editSellingPrice}).`,
          type: 'success',
          sourceModule: 'Inventory Control'
        });

        setIsSaving(false);
        setSelectedProduct(null);
        setSaveSuccess(false);
      }, 500);
    }, 750);
  };

  // Confirm Product Delete
  const handleConfirmDeleteProduct = () => {
    if (!deletingProduct) return;

    setIsDeleting(true);
    setTimeout(() => {
      const updatedProducts = products.filter(p => p.id !== deletingProduct.id);
      setProducts(updatedProducts);
      setJSONStore('products', updatedProducts);
      setJSONStore('inventory', updatedProducts);
      addNotification({
        title: 'Inventory Item Deleted',
        message: `Product "${deletingProduct.name}" (${deletingProduct.sku}) removed from inventory.`,
        type: 'warning',
        sourceModule: 'Inventory Control'
      });
      setIsDeleting(false);
      setDeletingProduct(null);
    }, 600);
  };

  if (loading) {
    return <AdminPageSkeleton title="Inventory & Stock Control" />;
  }

  return (
    <div className="space-y-6 font-sans pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-emerald-950 p-6 rounded-3xl shadow-sm border border-emerald-100 dark:border-emerald-800">
        <div>
          <h1 className="text-2xl font-bold font-serif text-gray-900 dark:text-emerald-100 flex items-center gap-2">
            <Boxes className="w-7 h-7 text-emerald-600 dark:text-amber-400" />
            Inventory & Stock Control
          </h1>
          <p className="text-xs text-gray-500 dark:text-emerald-300 mt-1">
            Real-time stock auditing, reorder threshold alerts, valuation tracking, and movement logs.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {/* Refresh Button */}
          <button
            onClick={() => setIsRefreshing(true)}
            className="px-3.5 py-2.5 bg-emerald-100/80 dark:bg-emerald-900/80 hover:bg-emerald-200 dark:hover:bg-emerald-800 text-emerald-900 dark:text-emerald-100 font-bold text-xs rounded-2xl border border-emerald-300 dark:border-emerald-700 transition-all flex items-center gap-1.5 shadow-sm"
            title="Refresh stock inventory"
          >
            <RefreshCw className="w-4 h-4 text-emerald-700 dark:text-amber-400" />
            <span>Refresh</span>
          </button>

          {/* Export Button */}
          <button
            onClick={() => setShowExportModal(true)}
            className="px-4 py-2.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-800 dark:text-amber-300 font-bold text-xs rounded-2xl border border-amber-300 dark:border-amber-700/60 transition-all flex items-center gap-1.5 shadow-sm"
            title="Export inventory report"
          >
            <Download className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            <span>Export Stock Report</span>
          </button>
        </div>
      </div>

      {/* ================= 4 OVERVIEW STAT BOXES ================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Box 1: Total Active SKUs */}
        <div className="bg-white dark:bg-emerald-900/40 p-5 rounded-3xl border border-emerald-100 dark:border-emerald-800 shadow-sm relative overflow-hidden group hover:border-emerald-300 transition-all">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-bold text-gray-500 dark:text-emerald-400 uppercase tracking-wider">Total Active SKUs</p>
              <h3 className="text-2xl font-black text-gray-900 dark:text-emerald-100 mt-1">{metrics.totalSKUs}</h3>
              <p className="text-[11px] text-emerald-700 dark:text-emerald-300 font-medium mt-1">Across {categories.length} Categories</p>
            </div>
            <div className="p-3 rounded-2xl bg-emerald-100 dark:bg-emerald-800 text-emerald-700 dark:text-amber-300 group-hover:scale-110 transition-transform">
              <Package className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-emerald-50 dark:border-emerald-800/60 flex justify-between text-xs text-gray-500 dark:text-emerald-300">
            <span>Inventory Valuation</span>
            <span className="font-mono font-bold text-emerald-800 dark:text-amber-400">{formatPrice(metrics.totalInventoryValue)}</span>
          </div>
        </div>

        {/* Box 2: Healthy In-Stock Items */}
        <div className="bg-white dark:bg-emerald-900/40 p-5 rounded-3xl border border-emerald-100 dark:border-emerald-800 shadow-sm relative overflow-hidden group hover:border-emerald-300 transition-all">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-bold text-gray-500 dark:text-emerald-400 uppercase tracking-wider">In-Stock Healthy</p>
              <h3 className="text-2xl font-black text-emerald-700 dark:text-emerald-300 mt-1">{metrics.inStockCount}</h3>
              <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold mt-1 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Normal stock levels
              </p>
            </div>
            <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-800/60 text-emerald-600 dark:text-emerald-300 group-hover:scale-110 transition-transform">
              <PackageCheck className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-emerald-50 dark:border-emerald-800/60 flex justify-between text-xs text-gray-500 dark:text-emerald-300">
            <span>Healthy Share</span>
            <span className="font-bold text-emerald-700 dark:text-emerald-300">
              {metrics.totalSKUs ? Math.round((metrics.inStockCount / metrics.totalSKUs) * 100) : 0}% of catalog
            </span>
          </div>
        </div>

        {/* Box 3: Low Stock Warning */}
        <div className="bg-white dark:bg-emerald-900/40 p-5 rounded-3xl border border-amber-200 dark:border-amber-800/60 shadow-sm relative overflow-hidden group hover:border-amber-400 transition-all">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-bold text-amber-800 dark:text-amber-400 uppercase tracking-wider">Low Stock Warning</p>
              <h3 className="text-2xl font-black text-amber-600 dark:text-amber-300 mt-1">{metrics.lowStockCount}</h3>
              <p className="text-[11px] text-amber-700 dark:text-amber-400 font-semibold mt-1 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" /> Reorder threshold hit
              </p>
            </div>
            <div className="p-3 rounded-2xl bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 group-hover:scale-110 transition-transform">
              <AlertTriangle className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-amber-100 dark:border-amber-800/60 flex justify-between text-xs text-amber-900 dark:text-amber-300">
            <span>Action Needed</span>
            <span className="font-bold">Raise PO to Supplier</span>
          </div>
        </div>

        {/* Box 4: Out of Stock SKUs */}
        <div className="bg-white dark:bg-emerald-900/40 p-5 rounded-3xl border border-rose-100 dark:border-rose-900/60 shadow-sm relative overflow-hidden group hover:border-rose-300 transition-all">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-bold text-rose-700 dark:text-rose-400 uppercase tracking-wider">Out of Stock SKUs</p>
              <h3 className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-1">{metrics.outOfStockCount}</h3>
              <p className="text-[11px] text-rose-600 dark:text-rose-400 font-semibold mt-1 flex items-center gap-1">
                <XCircle className="w-3.5 h-3.5" /> 0 Units remaining
              </p>
            </div>
            <div className="p-3 rounded-2xl bg-rose-100 dark:bg-rose-900/50 text-rose-600 dark:text-rose-300 group-hover:scale-110 transition-transform">
              <TrendingDown className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-rose-100 dark:border-rose-900/60 flex justify-between text-xs text-rose-800 dark:text-rose-300">
            <span>Availability Impact</span>
            <span className="font-bold">Immediate restock required</span>
          </div>
        </div>

      </div>

      {/* ================= FILTER BAR ================= */}
      <div className="bg-white dark:bg-emerald-900/40 p-4 rounded-3xl border border-emerald-100 dark:border-emerald-800 shadow-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          
          {/* Search Bar */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
            <input
              type="text"
              placeholder="Search SKU, English or Tamil name..."
              value={searchQuery}
              onChange={e => handleFilterChange(setSearchQuery, e.target.value)}
              className="w-full pl-9 pr-8 py-2.5 bg-emerald-50/50 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-700 rounded-xl font-medium focus:outline-none dark:text-emerald-100"
            />
            {searchQuery && (
              <button onClick={() => handleFilterChange(setSearchQuery, '')} className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Category Dropdown */}
          <div>
            <select
              value={selectedCategory}
              onChange={e => handleFilterChange(setSelectedCategory, e.target.value)}
              className="w-full px-3 py-2.5 bg-emerald-50/50 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-700 rounded-xl font-bold dark:text-emerald-100"
            >
              <option value="ALL">All Categories ({categories.length})</option>
              {categories.map((c: Category) => (
                <option key={c.id} value={c.id}>
                  {c.icon || '🌾'} {c.name} {c.tamil_name ? `(${c.tamil_name})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Stock Status Dropdown */}
          <div>
            <select
              value={statusFilter}
              onChange={e => handleFilterChange(setStatusFilter, e.target.value)}
              className="w-full px-3 py-2.5 bg-emerald-50/50 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-700 rounded-xl font-bold dark:text-emerald-100"
            >
              <option value="ALL">All Stock Statuses</option>
              <option value="IN_STOCK">In Stock Only</option>
              <option value="LOW_STOCK">Low Stock Alerts</option>
              <option value="OUT_OF_STOCK">Out of Stock (0)</option>
            </select>
          </div>

          {/* Sort By Dropdown */}
          <div>
            <select
              value={sortBy}
              onChange={e => handleFilterChange(setSortBy, e.target.value as any)}
              className="w-full px-3 py-2.5 bg-emerald-50/50 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-700 rounded-xl font-bold dark:text-emerald-100"
            >
              <option value="recent">⚡ Recent SKUs Top (Default)</option>
              <option value="stock-asc">Sort by: Lowest Stock First</option>
              <option value="stock-desc">Sort by: Highest Stock First</option>
              <option value="reorder">Sort by: Urgent Reorder Gap</option>
              <option value="name">Sort by: Name (A-Z)</option>
              <option value="sku">Sort by: SKU Code</option>
            </select>
          </div>

        </div>

        {(searchQuery || selectedCategory !== 'ALL' || statusFilter !== 'ALL' || sortBy !== 'stock-asc') && (
          <div className="flex justify-end pt-1">
            <button onClick={handleResetFilters} className="text-emerald-700 dark:text-amber-400 hover:underline font-bold text-xs flex items-center gap-1">
              <RefreshCw className="w-3.5 h-3.5" /> Reset All Filters
            </button>
          </div>
        )}
      </div>

      {/* ================= MAIN STOCK TABLE ================= */}
      <div className="bg-white dark:bg-emerald-900/40 rounded-3xl border border-emerald-100 dark:border-emerald-800 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-emerald-100 dark:border-emerald-800 flex justify-between items-center bg-gradient-to-r from-emerald-950 to-emerald-900 text-emerald-100">
          <h2 className="text-sm font-bold flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-amber-400" />
            Inventory Stock Records ({filteredProducts.length} Items)
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-emerald-50/80 dark:bg-emerald-950 text-emerald-950 dark:text-emerald-200 uppercase text-[10px] font-bold tracking-wider">
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
                <th className="p-3.5">Product Name & Tamil Name</th>
                <th className="p-3.5">Category English (Tamil)</th>
                <th className="p-3.5 text-right">Current Stock</th>
                <th className="p-3.5 text-right">Reorder Level</th>
                <th className="p-3.5 text-center">Status</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-emerald-100 dark:divide-emerald-800/60 text-gray-700 dark:text-emerald-200">
              {paginatedProducts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-gray-500 dark:text-emerald-300">
                    <Package className="w-10 h-10 mx-auto text-emerald-300 mb-2" />
                    <p className="font-bold text-base">No Inventory Items Match Filters</p>
                  </td>
                </tr>
              ) : (
                paginatedProducts.map(product => {
                  const category = categories.find((c: Category) => c.id === product.category_id);
                  return (
                    <tr key={product.id} className="hover:bg-emerald-50/60 dark:hover:bg-emerald-900/50 transition">
                      <td className="p-3.5 text-center">
                        <input
                          type="checkbox"
                          checked={selectedProductIds.includes(product.id)}
                          onChange={() => setSelectedProductIds(prev => prev.includes(product.id) ? prev.filter(x => x !== product.id) : [...prev, product.id])}
                          className="w-4 h-4 rounded text-emerald-800 focus:ring-emerald-500 cursor-pointer"
                        />
                      </td>
                      <td className="p-3.5 font-mono font-bold text-emerald-900 dark:text-amber-300">{product.sku}</td>
                      <td className="p-3.5">
                        <div className="flex items-center space-x-2.5">
                          <img 
                            src={product.image_url || 'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=150&q=80'} 
                            alt={product.name} 
                            className="w-9 h-9 object-cover rounded-lg border border-emerald-200 dark:border-emerald-700 shrink-0"
                          />
                          <div>
                            <div className="font-bold text-gray-900 dark:text-emerald-100 text-sm">{product.name}</div>
                            {product.tamil_name && (
                              <div className="text-xs text-emerald-700 dark:text-emerald-400 font-semibold">{product.tamil_name}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="p-3.5 font-semibold text-gray-700 dark:text-emerald-200">
                        {category ? `${category.icon || '🌾'} ${category.name}${category.tamil_name ? ` (${category.tamil_name})` : ''}` : 'General'}
                      </td>
                      <td className="p-3.5 text-right font-black text-sm font-mono text-emerald-950 dark:text-emerald-100">
                        {product.current_stock} <span className="text-xs font-normal text-gray-500 dark:text-emerald-400">{product.unit}</span>
                      </td>
                      <td className="p-3.5 text-right font-mono font-bold text-amber-700 dark:text-amber-300">
                        {product.reorder_level} {product.unit}
                      </td>
                      <td className="p-3.5 text-center">
                        <span className={`px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider inline-flex items-center gap-1 shadow-xs border ${
                          product.stock_status === 'IN_STOCK'
                            ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white border-emerald-400'
                            : product.stock_status === 'LOW_STOCK'
                            ? 'bg-gradient-to-r from-amber-400 to-amber-600 text-amber-950 border-amber-300'
                            : 'bg-gradient-to-r from-rose-500 to-red-600 text-white border-rose-400'
                        }`}>
                          {product.stock_status === 'IN_STOCK' && <CheckCircle2 className="w-3 h-3" />}
                          {product.stock_status === 'LOW_STOCK' && <AlertTriangle className="w-3 h-3" />}
                          {product.stock_status === 'OUT_OF_STOCK' && <X className="w-3 h-3" />}
                          {product.stock_status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="p-3.5 text-right space-x-1.5">
                        <button
                          onClick={() => handleOpenAdjustModal(product)}
                          className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-bold text-xs shadow-sm inline-flex items-center gap-1 transition"
                          title="Adjust Stock & Reorder Point"
                        >
                          <ArrowUpDown className="w-3.5 h-3.5 text-amber-300" /> Adjust Stock
                        </button>
                        <button
                          onClick={() => setDeletingProduct(product)}
                          className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950 transition"
                          title="Delete Inventory SKU"
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

      {/* Floating Action Bar for Selected Inventory Items */}
      {selectedProductIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-gray-900/95 backdrop-blur-md text-white px-5 py-3 rounded-2xl shadow-2xl border border-gray-700 flex items-center gap-3 animate-fadeIn flex-wrap justify-center">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-extrabold text-xs">
              {selectedProductIds.length} item(s) selected
            </span>
          </div>
          <div className="h-4 w-px bg-gray-700 hidden sm:block" />
          <button
            onClick={handleBulkExportSelectedInventory}
            className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-amber-300" />
            Export Selected
          </button>
          
          <div className="flex items-center gap-1 bg-gray-800 rounded-xl px-2 py-1">
            <span className="text-[11px] text-gray-400 font-bold">Status:</span>
            <select
              onChange={(e) => {
                if (e.target.value) {
                  handleBulkSetStockStatus(e.target.value as StockStatus);
                  e.target.value = '';
                }
              }}
              defaultValue=""
              className="bg-transparent text-xs font-bold text-white focus:outline-none cursor-pointer"
            >
              <option value="" disabled className="bg-gray-800 text-gray-400">Set Status...</option>
              <option value="IN_STOCK" className="bg-gray-800">In Stock</option>
              <option value="LOW_STOCK" className="bg-gray-800">Low Stock</option>
              <option value="OUT_OF_STOCK" className="bg-gray-800">Out of Stock</option>
            </select>
          </div>

          <button
            onClick={handleBulkDeleteInventory}
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

      {/* Stock Movement Audit History */}
      <div className="bg-white dark:bg-emerald-900/40 rounded-3xl border border-emerald-100 dark:border-emerald-800 p-5 shadow-sm space-y-3">
        <h2 className="text-sm font-bold text-emerald-950 dark:text-emerald-100 flex items-center gap-2">
          <History className="w-4 h-4 text-emerald-600 dark:text-amber-400" />
          Recent Stock Movement Audit Trail
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-emerald-50 dark:bg-emerald-950 text-gray-500 dark:text-emerald-400 text-[10px] uppercase font-bold">
              <tr>
                <th className="p-2.5">Date & Time</th>
                <th className="p-2.5">Product SKU</th>
                <th className="p-2.5">Movement Type</th>
                <th className="p-2.5 text-right">Qty</th>
                <th className="p-2.5 text-right">Before → After</th>
                <th className="p-2.5">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-emerald-100 dark:divide-emerald-800/60 text-gray-700 dark:text-emerald-200">
              {movements.map(m => (
                <tr key={m.id}>
                  <td className="p-2.5 text-[11px] font-mono text-gray-500 dark:text-emerald-400">{formatDate(m.created_at)}</td>
                  <td className="p-2.5 font-semibold text-emerald-950 dark:text-emerald-100">{m.product?.name || 'Item'}</td>
                  <td className="p-2.5">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 dark:bg-emerald-800 text-emerald-900 dark:text-amber-300">
                      {m.movement_type}
                    </span>
                  </td>
                  <td className={`p-2.5 text-right font-mono font-bold ${m.quantity > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                    {m.quantity > 0 ? `+${m.quantity}` : m.quantity}
                  </td>
                  <td className="p-2.5 text-right text-[11px] font-mono text-gray-500 dark:text-emerald-400">
                    {m.stock_before} → <span className="font-bold text-emerald-950 dark:text-emerald-100">{m.stock_after}</span>
                  </td>
                  <td className="p-2.5 text-[11px] text-gray-500 dark:text-emerald-400">{m.notes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Adjust Stock & Full Product Specs Modal */}
      {selectedProduct && (() => {
        let calcNewStock = selectedProduct.current_stock;
        if (adjustType === 'ADD') calcNewStock += adjustQty;
        else if (adjustType === 'REMOVE') calcNewStock = Math.max(0, calcNewStock - adjustQty);
        else if (adjustType === 'SET') calcNewStock = Math.max(0, adjustQty);

        let calcStatus: StockStatus = 'IN_STOCK';
        if (calcNewStock === 0) calcStatus = 'OUT_OF_STOCK';
        else if (calcNewStock <= newReorderLevel) calcStatus = 'LOW_STOCK';

        const mrpDiscount = editMrp > editSellingPrice ? Math.round(((editMrp - editSellingPrice) / editMrp) * 100) : 0;
        const profitMargin = editSellingPrice > editPurchasePrice ? Math.round(((editSellingPrice - editPurchasePrice) / editSellingPrice) * 100) : 0;
        const newValuation = calcNewStock * editSellingPrice;

        return (
          <div className="fixed inset-0 bg-black/75 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-5 animate-fadeIn overflow-y-auto">
            <div className="bg-white dark:bg-emerald-950 rounded-3xl max-w-xl w-full p-5 sm:p-6 shadow-2xl border border-emerald-200 dark:border-emerald-800 space-y-4 max-h-[92vh] flex flex-col justify-between my-auto">
              
              {/* Header */}
              <div className="flex justify-between items-start border-b border-emerald-100 dark:border-emerald-800/80 pb-3">
                <div className="flex items-center gap-3">
                  {selectedProduct.image_url ? (
                    <img
                      src={selectedProduct.image_url}
                      alt={selectedProduct.name}
                      className="w-12 h-12 rounded-2xl object-cover border border-emerald-200 dark:border-emerald-700 shadow-sm"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-900/80 text-emerald-700 dark:text-amber-400 flex items-center justify-center font-bold text-lg border border-emerald-200 dark:border-emerald-700">
                      <Package className="w-6 h-6" />
                    </div>
                  )}
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-extrabold text-emerald-950 dark:text-emerald-50 text-base sm:text-lg">
                        {selectedProduct.name}
                      </h3>
                      {selectedProduct.tamil_name && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/80 text-emerald-800 dark:text-emerald-200 font-semibold">
                          {selectedProduct.tamil_name}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-emerald-300 font-medium">
                      SKU: <code className="font-mono bg-emerald-50 dark:bg-emerald-900/50 px-1.5 py-0.5 rounded text-emerald-700 dark:text-emerald-300">{selectedProduct.sku}</code>
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedProduct(null)}
                  className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-emerald-200 rounded-full hover:bg-gray-100 dark:hover:bg-emerald-900 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Live Preview Outcome Summary Card */}
              <div className="p-3.5 bg-emerald-900 text-white rounded-2xl shadow-inner space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-300 font-medium">Stock Preview:</span>
                    <span className="font-mono text-emerald-200 font-bold">{selectedProduct.current_stock}</span>
                    <span className="text-emerald-400">➔</span>
                    <span className="font-mono text-amber-300 font-extrabold text-sm">{calcNewStock} {editUnit}</span>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold tracking-wide uppercase ${
                    calcStatus === 'IN_STOCK' ? 'bg-emerald-500 text-white' :
                    calcStatus === 'LOW_STOCK' ? 'bg-amber-500 text-white animate-pulse' :
                    'bg-rose-500 text-white'
                  }`}>
                    {calcStatus.replace('_', ' ')}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px] pt-1.5 border-t border-emerald-800/80 text-emerald-100">
                  <div>
                    <span className="text-emerald-300">Total Valuation:</span>{' '}
                    <strong className="text-amber-300 font-mono">₹{newValuation.toLocaleString()}</strong>
                  </div>
                  <div className="text-right">
                    <span className="text-emerald-300">Est. Profit Margin:</span>{' '}
                    <strong className="text-emerald-300 font-mono">₹{Math.max(0, editSellingPrice - editPurchasePrice)} ({profitMargin}%)</strong>
                  </div>
                </div>
              </div>

              {/* Navigation Tabs */}
              <div className="flex border-b border-emerald-100 dark:border-emerald-800/80">
                <button
                  type="button"
                  onClick={() => setActiveModalTab('stock')}
                  className={`flex-1 py-2 text-xs font-extrabold text-center border-b-2 transition-all flex items-center justify-center gap-1.5 ${
                    activeModalTab === 'stock'
                      ? 'border-emerald-600 dark:border-amber-400 text-emerald-800 dark:text-amber-300 bg-emerald-50/50 dark:bg-emerald-900/40 rounded-t-xl'
                      : 'border-transparent text-gray-500 dark:text-emerald-400 hover:text-emerald-700'
                  }`}
                >
                  <Boxes className="w-3.5 h-3.5" />
                  <span>Stock & Reorder</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveModalTab('pricing')}
                  className={`flex-1 py-2 text-xs font-extrabold text-center border-b-2 transition-all flex items-center justify-center gap-1.5 ${
                    activeModalTab === 'pricing'
                      ? 'border-emerald-600 dark:border-amber-400 text-emerald-800 dark:text-amber-300 bg-emerald-50/50 dark:bg-emerald-900/40 rounded-t-xl'
                      : 'border-transparent text-gray-500 dark:text-emerald-400 hover:text-emerald-700'
                  }`}
                >
                  <DollarSign className="w-3.5 h-3.5" />
                  <span>Pricing & Specs</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveModalTab('reason')}
                  className={`flex-1 py-2 text-xs font-extrabold text-center border-b-2 transition-all flex items-center justify-center gap-1.5 ${
                    activeModalTab === 'reason'
                      ? 'border-emerald-600 dark:border-amber-400 text-emerald-800 dark:text-amber-300 bg-emerald-50/50 dark:bg-emerald-900/40 rounded-t-xl'
                      : 'border-transparent text-gray-500 dark:text-emerald-400 hover:text-emerald-700'
                  }`}
                >
                  <History className="w-3.5 h-3.5" />
                  <span>Audit Notes</span>
                </button>
              </div>

              {/* Tab 1: Stock & Reorder */}
              {activeModalTab === 'stock' && (
                <div className="space-y-4 text-xs animate-fadeIn">
                  <div>
                    <label className="block font-bold mb-1.5 text-emerald-950 dark:text-emerald-100">
                      Adjustment Action
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => setAdjustType('ADD')}
                        className={`py-2.5 rounded-xl font-bold flex items-center justify-center gap-1.5 text-xs transition-all ${
                          adjustType === 'ADD'
                            ? 'bg-emerald-700 text-white shadow-md ring-2 ring-emerald-500'
                            : 'bg-emerald-50 dark:bg-emerald-900/60 text-emerald-900 dark:text-emerald-200 hover:bg-emerald-100'
                        }`}
                      >
                        <Plus className="w-4 h-4" /> Add Stock
                      </button>
                      <button
                        type="button"
                        onClick={() => setAdjustType('REMOVE')}
                        className={`py-2.5 rounded-xl font-bold flex items-center justify-center gap-1.5 text-xs transition-all ${
                          adjustType === 'REMOVE'
                            ? 'bg-rose-600 text-white shadow-md ring-2 ring-rose-400'
                            : 'bg-emerald-50 dark:bg-emerald-900/60 text-emerald-900 dark:text-emerald-200 hover:bg-emerald-100'
                        }`}
                      >
                        <Minus className="w-4 h-4" /> Deduct Stock
                      </button>
                      <button
                        type="button"
                        onClick={() => setAdjustType('SET')}
                        className={`py-2.5 rounded-xl font-bold flex items-center justify-center gap-1.5 text-xs transition-all ${
                          adjustType === 'SET'
                            ? 'bg-amber-600 text-white shadow-md ring-2 ring-amber-400'
                            : 'bg-emerald-50 dark:bg-emerald-900/60 text-emerald-900 dark:text-emerald-200 hover:bg-emerald-100'
                        }`}
                      >
                        Set Exact
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="font-bold text-emerald-950 dark:text-emerald-100">
                        {adjustType === 'SET' ? 'Target Stock Quantity' : 'Quantity Change Amount'} ({editUnit})
                      </label>
                      <span className="text-[11px] text-emerald-600 dark:text-emerald-300 font-semibold">
                        Quick Add Pills:
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="0"
                        value={adjustQty}
                        onChange={e => setAdjustQty(Math.max(0, Number(e.target.value)))}
                        className="w-1/2 p-2.5 bg-emerald-50/60 dark:bg-emerald-900/80 border border-emerald-300 dark:border-emerald-700 rounded-xl font-mono font-extrabold text-base text-emerald-950 dark:text-amber-300 focus:ring-2 focus:ring-emerald-500 outline-none"
                      />
                      <div className="w-1/2 flex flex-wrap gap-1">
                        {[5, 10, 25, 50, 100].map(val => (
                          <button
                            key={val}
                            type="button"
                            onClick={() => setAdjustQty(val)}
                            className={`px-2 py-1 text-[11px] font-mono font-bold rounded-lg transition-all ${
                              adjustQty === val
                                ? 'bg-emerald-700 text-white shadow'
                                : 'bg-emerald-100 dark:bg-emerald-900/80 text-emerald-800 dark:text-emerald-200 hover:bg-emerald-200'
                            }`}
                          >
                            +{val}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 pt-1 border-t border-emerald-100 dark:border-emerald-800/80">
                    <div className="flex justify-between items-center">
                      <label className="font-bold text-emerald-950 dark:text-emerald-100">
                        Reorder Alert Level Threshold ({editUnit})
                      </label>
                      <span className="text-[10px] text-gray-500 dark:text-emerald-400">Triggers low stock warnings</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="0"
                        value={newReorderLevel}
                        onChange={e => setNewReorderLevel(Math.max(0, Number(e.target.value)))}
                        className="w-1/2 p-2.5 bg-emerald-50/60 dark:bg-emerald-900/80 border border-emerald-300 dark:border-emerald-700 rounded-xl font-mono font-bold text-amber-600 dark:text-amber-400 focus:ring-2 focus:ring-emerald-500 outline-none"
                      />
                      <div className="w-1/2 flex flex-wrap gap-1">
                        {[5, 10, 15, 20, 50].map(val => (
                          <button
                            key={val}
                            type="button"
                            onClick={() => setNewReorderLevel(val)}
                            className={`px-2 py-1 text-[11px] font-mono font-bold rounded-lg transition-all ${
                              newReorderLevel === val
                                ? 'bg-amber-600 text-white shadow'
                                : 'bg-amber-50 dark:bg-emerald-900/80 text-amber-800 dark:text-amber-300 hover:bg-amber-100'
                            }`}
                          >
                            {val} {editUnit}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 2: Pricing & Pack Specs */}
              {activeModalTab === 'pricing' && (
                <div className="space-y-3.5 text-xs animate-fadeIn">
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block font-bold mb-1 text-emerald-950 dark:text-emerald-100">
                        Our Price (₹) *
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={editSellingPrice}
                        onChange={e => setEditSellingPrice(Math.max(0, Number(e.target.value)))}
                        className="w-full p-2.5 bg-emerald-50/60 dark:bg-emerald-900/80 border border-emerald-300 dark:border-emerald-700 rounded-xl font-mono font-extrabold text-emerald-700 dark:text-emerald-300 focus:ring-2 focus:ring-emerald-500 outline-none"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className="font-bold text-rose-600 dark:text-amber-300">
                          🔥 Offer Price (₹)
                        </label>
                        {editOfferPrice > 0 && editOfferPrice < editSellingPrice && (
                          <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-rose-500 text-white animate-pulse">
                            DEAL
                          </span>
                        )}
                      </div>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="Optional Offer Price"
                        value={editOfferPrice || ''}
                        onChange={e => setEditOfferPrice(Math.max(0, Number(e.target.value)))}
                        className="w-full p-2.5 bg-amber-50/60 dark:bg-emerald-900/80 border border-rose-300 dark:border-rose-700 rounded-xl font-mono font-extrabold text-rose-600 dark:text-amber-300 focus:ring-2 focus:ring-rose-500 outline-none"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className="font-bold text-emerald-950 dark:text-emerald-100">
                          MRP (₹)
                        </label>
                        {mrpDiscount > 0 && (
                          <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-amber-500 text-white">
                            {mrpDiscount}% OFF
                          </span>
                        )}
                      </div>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={editMrp}
                        onChange={e => setEditMrp(Math.max(0, Number(e.target.value)))}
                        className="w-full p-2.5 bg-emerald-50/60 dark:bg-emerald-900/80 border border-emerald-300 dark:border-emerald-700 rounded-xl font-mono font-bold text-gray-700 dark:text-emerald-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block font-bold mb-1 text-emerald-950 dark:text-emerald-100">
                        Purchase Cost (₹)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={editPurchasePrice}
                        onChange={e => setEditPurchasePrice(Math.max(0, Number(e.target.value)))}
                        className="w-full p-2.5 bg-emerald-50/60 dark:bg-emerald-900/80 border border-emerald-300 dark:border-emerald-700 rounded-xl font-mono font-bold text-gray-700 dark:text-emerald-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block font-bold mb-1 text-emerald-950 dark:text-emerald-100">
                        Pack Size
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. 500g / 1 kg"
                        value={editPackSize}
                        onChange={e => setEditPackSize(e.target.value)}
                        className="w-full p-2.5 bg-emerald-50/60 dark:bg-emerald-900/80 border border-emerald-300 dark:border-emerald-700 rounded-xl font-semibold text-gray-900 dark:text-emerald-100 focus:ring-2 focus:ring-emerald-500 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block font-bold mb-1 text-emerald-950 dark:text-emerald-100">
                        Measurement Unit
                      </label>
                      <select
                        value={editUnit}
                        onChange={e => setEditUnit(e.target.value)}
                        className="w-full p-2.5 bg-emerald-50/60 dark:bg-emerald-900/80 border border-emerald-300 dark:border-emerald-700 rounded-xl font-bold text-gray-900 dark:text-emerald-100 focus:ring-2 focus:ring-emerald-500 outline-none"
                      >
                        <option value="kg">kg (Kilogram)</option>
                        <option value="grams">grams (g)</option>
                        <option value="litres">litres (L)</option>
                        <option value="ml">ml (Millilitres)</option>
                        <option value="pcs">pcs (Pieces)</option>
                        <option value="pack">pack (Packets)</option>
                        <option value="box">box (Boxes)</option>
                        <option value="bunch">bunch (Bunches)</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 3: Audit Reason & Notes */}
              {activeModalTab === 'reason' && (
                <div className="space-y-3.5 text-xs animate-fadeIn">
                  <div>
                    <label className="block font-bold mb-1.5 text-emerald-950 dark:text-emerald-100">
                      Quick Preset Audit Reasons
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        '📦 Physical inventory count verification',
                        '🚚 New stock shipment received from supplier',
                        '⚠️ Expired / Damaged stock write-off',
                        '🔄 Customer order return reconciliation',
                        '🏷️ Price adjustment & re-valuation'
                      ].map((preset, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setAdjustReason(preset)}
                          className={`text-left px-2.5 py-1.5 rounded-xl text-[11px] font-semibold border transition-all ${
                            adjustReason === preset
                              ? 'bg-emerald-700 text-white border-emerald-800 shadow'
                              : 'bg-emerald-50/80 dark:bg-emerald-900/50 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 hover:bg-emerald-100'
                          }`}
                        >
                          {preset}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold mb-1 text-emerald-950 dark:text-emerald-100">
                      Detailed Audit Notes / Remark
                    </label>
                    <textarea
                      rows={3}
                      value={adjustReason}
                      onChange={e => setAdjustReason(e.target.value)}
                      placeholder="Specify exact reason for audit logging..."
                      className="w-full p-2.5 bg-emerald-50/60 dark:bg-emerald-900/80 border border-emerald-300 dark:border-emerald-700 rounded-xl font-medium text-gray-900 dark:text-emerald-100 focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                  </div>
                </div>
              )}

              {/* Modal Footer Buttons */}
              <div className="pt-3 border-t border-emerald-100 dark:border-emerald-800/80 flex gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedProduct(null)}
                  className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 dark:bg-emerald-900 dark:hover:bg-emerald-800 text-gray-700 dark:text-emerald-200 rounded-2xl font-bold text-xs transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleAdjustStock}
                  className="flex-1 py-3 bg-emerald-700 hover:bg-emerald-800 active:scale-[0.99] text-white rounded-2xl font-extrabold text-xs shadow-lg shadow-emerald-700/20 flex items-center justify-center gap-1.5 transition-all"
                >
                  <PackageCheck className="w-4 h-4" />
                  <span>Save All Stock & Product Specs</span>
                </button>
              </div>

            </div>
          </div>
        );
      })()}

      {/* Delete SKU Confirmation Modal */}
      {deletingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fadeIn">
          <div className="bg-white dark:bg-emerald-950 max-w-sm w-full p-6 rounded-3xl shadow-2xl border border-rose-200 dark:border-rose-900/60 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-rose-100 dark:bg-rose-900/60 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto border-4 border-rose-200 dark:border-rose-800">
              <ShieldAlert className="w-8 h-8" />
            </div>

            <div>
              <h3 className="text-lg font-black text-gray-900 dark:text-emerald-100">
                Remove Item from Inventory?
              </h3>
              <p className="text-xs text-gray-500 dark:text-emerald-300 mt-1 leading-relaxed">
                Deleting <strong className="text-rose-600 font-bold">{deletingProduct.name}</strong> will remove it from inventory tracking logs.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeletingProduct(null)}
                disabled={isDeleting}
                className="py-2.5 px-4 bg-gray-100 dark:bg-emerald-900 text-gray-700 dark:text-emerald-200 font-bold text-xs rounded-xl hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteProduct}
                disabled={isDeleting}
                className="py-2.5 px-4 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs rounded-xl shadow-lg flex items-center justify-center space-x-1.5"
              >
                {isDeleting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                <span>Delete SKU</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Loading Animation Popup during Stock Adjust */}
      {isSaving && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fadeIn">
          <div className="bg-white dark:bg-emerald-950 p-8 rounded-3xl shadow-2xl border border-emerald-200 dark:border-emerald-700 max-w-sm w-full text-center space-y-4">
            {!saveSuccess ? (
              <>
                <div className="relative w-20 h-20 mx-auto flex items-center justify-center">
                  <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center text-emerald-700 dark:text-amber-300 animate-spin">
                    <RefreshCw className="w-8 h-8" />
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-black text-emerald-950 dark:text-emerald-100">Updating Stock Record...</h3>
                  <p className="text-xs text-gray-500 dark:text-emerald-300 mt-1">Recalculating reorder status & audit log...</p>
                </div>
                <div className="w-full bg-emerald-100 dark:bg-emerald-900 rounded-full h-2.5 overflow-hidden">
                  <div className="bg-gradient-to-r from-emerald-500 to-amber-400 h-full transition-all duration-300" style={{ width: `${saveProgress}%` }} />
                </div>
              </>
            ) : (
              <div className="space-y-3 animate-scaleUp">
                <div className="w-20 h-20 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto border-4 border-emerald-200">
                  <CheckCircle2 className="w-10 h-10" />
                </div>
                <h3 className="text-xl font-black text-emerald-950 dark:text-emerald-100">Stock Updated!</h3>
              </div>
            )}
          </div>
        </div>
      )}

      {/* EXPORT FORMAT MODAL */}
      <ExportFormatModal
        isOpen={showExportModal}
        title="Export Stock Inventory"
        description="Select export format for current inventory list:"
        totalRecords={filteredProducts.length}
        onClose={() => setShowExportModal(false)}
        onExport={handleExecuteInventoryExport}
      />

      {/* REAL ANIMATED REFRESH SPINNER MODAL */}
      <RefreshSpinnerModal
        isOpen={isRefreshing}
        title="Refreshing Stock Inventory..."
        subtitle="Auditing current warehouse stock levels & reorder alerts..."
        moduleName="Inventory Control"
        onComplete={async () => {
          setIsRefreshing(false);
          try {
            let p = await getJSONStore<Product>('inventory');
            if (!p || p.length === 0) {
              p = await getJSONStore<Product>('products');
            }
            const [c, sm] = await Promise.all([
              getJSONStore<Category>('categories'),
              getJSONStore<StockMovement>('stock_movements'),
            ]);
            setProducts(p || []);
            setCategories(c || []);
            setMovements(sm || []);
          } catch(e) {}
          setSortBy('recent');
          setCurrentPage(1);
          toast.success('🔄 Inventory Refreshed! Baseline JSON data loaded.');
          addNotification({
            title: 'Inventory Synced',
            message: 'Refreshed inventory stock list from physical JSON data.',
            type: 'info',
            sourceModule: 'Inventory Control'
          });
        }}
      />

    </div>
  );
}
