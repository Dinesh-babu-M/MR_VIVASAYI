import React, { useState, useEffect, useMemo } from 'react';
import {
  Truck,
  Plus,
  Search,
  Edit2,
  Eye,
  CheckCircle2,
  X,
  ShoppingCart,
  Package,
  Building2,
  Phone,
  Mail,
  MapPin,
  Clock,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Trash2,
  ShieldAlert,
  RefreshCw,
  Landmark,
  CreditCard,
  FileText,
  DollarSign,
  TrendingUp,
  AlertCircle,
  Tag,
  RotateCcw,
  Layers,
  ArrowUpDown,
  Check,
  Download
} from 'lucide-react';
import { formatPrice, formatDate } from '../../lib/utils';
import { Supplier, PurchaseOrder, PurchaseOrderItem, PurchaseStatus, Product } from '../../types';
import { useNotifications } from '../../contexts/NotificationContext';
import { ExportFormatModal, ExportFormat } from '../../components/common/ExportFormatModal';
import { RefreshSpinnerModal } from '../../components/common/RefreshSpinnerModal';
import { AdminPageSkeleton } from '../../components/common/Skeleton';
import { useActionModal } from '../../contexts/ActionModalContext';
import { getJSONStore, setJSONStore } from '../../lib/dbManager';
import toast from 'react-hot-toast';

export default function SuppliersPage() {
  const { addNotification } = useNotifications();
  const { showActionModal, showConfirmModal } = useActionModal();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'SUPPLIERS' | 'POS'>('SUPPLIERS');
  const [selectedSupplierIds, setSelectedSupplierIds] = useState<string[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [s, po, p] = await Promise.all([
          getJSONStore<Supplier>('suppliers'),
          getJSONStore<PurchaseOrder>('purchase_orders'),
          getJSONStore<Product>('products'),
        ]);
        setSuppliers(s);
        setPurchaseOrders(po);
        setProducts(p);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // Available Categories in English (Tamil) format
  const PRODUCT_CATEGORIES = [
    { id: 'cat-1', name: 'Organic Rice (இயற்கை அரிசி)' },
    { id: 'cat-2', name: 'Traditional Millets (பாரம்பரிய சிறுதானியங்கள்)' },
    { id: 'cat-3', name: 'Spices & Masalas (மசாலா மற்றும் நறுமணப் பொருட்கள்)' },
    { id: 'cat-4', name: 'Cold Pressed Oils (மரச்செக்கு எண்ணெய்)' },
    { id: 'cat-5', name: 'Natural Sweeteners (இயற்கை சர்க்கரை & வெல்லம்)' },
    { id: 'cat-6', name: 'Herbal & Health (மூலிகை மற்றும் ஆரோக்கியம்)' },
    { id: 'cat-7', name: 'Pulses & Dals (பருப்பு வகைகள்)' }
  ];

  // Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [districtFilter, setDistrictFilter] = useState('ALL');
  const [paymentTermsFilter, setPaymentTermsFilter] = useState('ALL');

  // Export Modal State
  const [showExportModal, setShowExportModal] = useState(false);

  // Multi-Format Export Handler for Suppliers / Purchase Orders
  const handleExecuteSupplierExport = (format: ExportFormat) => {
    setShowExportModal(false);

    showActionModal({
      title: `Exporting ${activeTab === 'SUPPLIERS' ? 'Suppliers Directory' : 'Purchase Orders Stack'} (${format})`,
      subtitle: `Preparing dataset for ${activeTab === 'SUPPLIERS' ? filteredSuppliers.length : filteredPOs.length} records...`,
      durationMs: 750,
      steps: [
        'Querying procurement records and partner profiles',
        'Formatting financials and order allocations',
        `Compiling ${format} report structure`,
        'Export generated successfully'
      ],
      onComplete: () => {
        if (activeTab === 'SUPPLIERS') {
          if (filteredSuppliers.length === 0) {
            addNotification({
              title: 'Export Failed',
              message: 'No supplier records available to export.',
              type: 'warning',
              sourceModule: 'Procurement Sourcing'
            });
            return;
          }

          if (format === 'PRINT' || format === 'PDF') {
        const printWindow = window.open('', '_blank', 'width=900,height=950');
        if (!printWindow) return;

        const rowsHtml = filteredSuppliers.map((s, idx) => `
          <tr>
            <td style="padding: 6px; border-bottom: 1px solid #eee;">${idx + 1}</td>
            <td style="padding: 6px; border-bottom: 1px solid #eee;"><strong>${s.name}</strong> ${s.business_name ? `(${s.business_name})` : ''}</td>
            <td style="padding: 6px; border-bottom: 1px solid #eee;">${s.phone || '—'}</td>
            <td style="padding: 6px; border-bottom: 1px solid #eee;">${s.district || 'Theni'}, ${s.state || 'TN'}</td>
            <td style="padding: 6px; border-bottom: 1px solid #eee; text-align: center;">${s.payment_terms || 'NET 15'}</td>
          </tr>
        `).join('');

        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>MR. VIVASAYI Supplier Directory Report</title>
              <style>
                body { font-family: sans-serif; padding: 24px; color: #064e3b; }
                h1 { color: #064e3b; margin-bottom: 4px; font-size: 22px; }
                p { font-size: 12px; color: #666; margin-top: 0; }
                table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 11px; }
                th { background: #064e3b; color: white; padding: 8px; text-align: left; }
              </style>
            </head>
            <body>
              <h1>🌿 MR. VIVASAYI Producer & Supplier Directory Report</h1>
              <p>Generated on ${new Date().toLocaleString()} | Total Filtered Suppliers: ${filteredSuppliers.length}</p>
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Supplier Partner</th>
                    <th>Phone</th>
                    <th>District</th>
                    <th style="text-align: center;">Payment Terms</th>
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
          title: `Supplier Directory ${format === 'PDF' ? 'PDF Generated' : 'Printing Initiated'}`,
          message: `Prepared directory report for ${filteredSuppliers.length} supplier partners.`,
          type: 'success',
          sourceModule: 'Procurement Sourcing'
        });
        return;
      }

      const headers = ['ID', 'Supplier Name', 'Business Name', 'Phone', 'Email', 'District', 'State', 'Pincode', 'Payment Terms', 'Notes'];
      const rows = filteredSuppliers.map(s => [
        s.id,
        `"${s.name}"`,
        `"${s.business_name || ''}"`,
        s.phone || '',
        s.email || '',
        `"${s.district || 'Theni'}"`,
        `"${s.state || 'Tamil Nadu'}"`,
        s.pincode || '',
        `"${s.payment_terms || 'NET 15'}"`,
        `"${(s.notes || '').replace(/"/g, '""')}"`
      ]);

      const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `MR_VIVASAYI_Suppliers_Export_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      addNotification({
        title: 'Supplier Data Exported',
        message: `Downloaded ${format} dataset for ${filteredSuppliers.length} supplier partners.`,
        type: 'success',
        sourceModule: 'Procurement Sourcing'
      });
    } else {
      if (filteredPOs.length === 0) {
        addNotification({
          title: 'Export Failed',
          message: 'No purchase order records available to export.',
          type: 'warning',
          sourceModule: 'Procurement PO'
        });
        return;
      }

      const headers = ['PO Number', 'Supplier Name', 'Status', 'Ordered At', 'Subtotal (₹)', 'Tax (₹)', 'Total Amount (₹)', 'Paid Amount (₹)'];
      const rows = filteredPOs.map((po: PurchaseOrder) => [
        po.po_number,
        `"${po.supplier?.name || ''}"`,
        po.status,
        po.ordered_at ? new Date(po.ordered_at).toLocaleDateString() : '',
        po.subtotal,
        po.tax_amount,
        po.total,
        po.paid_amount
      ]);

      const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `MR_VIVASAYI_PurchaseOrders_Export_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      addNotification({
        title: 'PO Data Exported',
        message: `Downloaded ${format} dataset for ${filteredPOs.length} purchase orders.`,
        type: 'success',
        sourceModule: 'Procurement PO'
      });
    }
      }
    });
  };

  // Pagination State for Suppliers
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(6);

  // Edit / Add Supplier Modal State
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);

  // Supplier Form Data State
  const [supplierFormData, setSupplierFormData] = useState({
    name: '',
    business_name: '',
    phone: '',
    email: '',
    address: '',
    district: 'Theni',
    state: 'Tamil Nadu',
    pincode: '625516',
    payment_terms: 'NET 15',
    bank_details: '',
    notes: '',
    is_active: true
  });

  // Delete Supplier Modal State
  const [deletingSupplier, setDeletingSupplier] = useState<Supplier | null>(null);

  // ================= PO MODALS STATE =================
  const [showPOModal, setShowPOModal] = useState(false);
  const [editingPO, setEditingPO] = useState<PurchaseOrder | null>(null);
  const [isNewPO, setIsNewPO] = useState(false);

  // Quick Add New Product Modal State (for PO Stack)
  const [showNewProductModal, setShowNewProductModal] = useState(false);
  const [targetPOItemIndex, setTargetPOItemIndex] = useState<number | null>(null);
  const [newProductFormData, setNewProductFormData] = useState({
    name: '',
    tamil_name: '',
    category_name: 'Organic Rice (இயற்கை அரிசி)',
    sku: '',
    pack_size: '1 kg',
    unit: 'kg',
    purchase_price: 100,
    selling_price: 140,
    mrp: 160
  });

  // PO Form Data State
  const [poFormData, setPoFormData] = useState({
    po_number: `PO-2026-${Math.floor(1000 + Math.random() * 9000)}`,
    supplier_id: suppliers[0]?.id || 'sup-1',
    status: 'ORDERED' as PurchaseStatus,
    discount: 0,
    tax_amount: 0,
    delivery_charge: 0,
    paid_amount: 0,
    notes: 'Direct farm produce procurement',
    sourcing_notes: 'Sourced directly from farmer cooperative in Cumbum Valley',
    items: [
      {
        id: `po-item-1`,
        product_id: products[0]?.id || 'p-001',
        product_name_snapshot: products[0]?.name || 'Mapillai Samba Rice',
        quantity: 50,
        received_quantity: 50,
        purchase_price: products[0]?.purchase_price || 120,
        total: 50 * (products[0]?.purchase_price || 120)
      }
    ]
  });

  // Delete PO State
  const [deletingPO, setDeletingPO] = useState<PurchaseOrder | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // View PO Modal State
  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null);



  // 1. Overview 4 Box Metrics Calculation
  const metrics = useMemo(() => {
    const activeSuppliersCount = suppliers.filter(s => s.is_active).length;
    const totalPOCount = purchaseOrders.length;
    const totalProcurementSpend = purchaseOrders.reduce((sum, po) => sum + po.total, 0);
    const pendingPOPayments = purchaseOrders.reduce((sum, po) => sum + (po.total - po.paid_amount), 0);

    return { activeSuppliersCount, totalPOCount, totalProcurementSpend, pendingPOPayments };
  }, [suppliers, purchaseOrders]);

  // Extract unique districts
  const districts = useMemo(() => {
    const set = new Set<string>();
    suppliers.forEach(s => { if (s.district) set.add(s.district); });
    return Array.from(set);
  }, [suppliers]);

  // 2. Filter Logic for Suppliers
  const filteredSuppliers = useMemo(() => {
    const list = suppliers.filter(s => {
      const matchesSearch =
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (s.business_name && s.business_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (s.district && s.district.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (s.phone && s.phone.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesDistrict = districtFilter === 'ALL' || s.district === districtFilter;
      const matchesTerms = paymentTermsFilter === 'ALL' || (s.payment_terms || '').toUpperCase().includes(paymentTermsFilter.toUpperCase());

      return matchesSearch && matchesDistrict && matchesTerms;
    });

    // Default Sort: Recent First
    return list.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
  }, [suppliers, searchQuery, districtFilter, paymentTermsFilter]);

  // Bulk actions for selected suppliers
  const handleBulkExportSelectedSuppliers = () => {
    const list = selectedSupplierIds.length > 0
      ? suppliers.filter(s => selectedSupplierIds.includes(s.id))
      : filteredSuppliers;
    if (list.length === 0) {
      toast.error('No suppliers to export');
      return;
    }
    const headers = ['Supplier Name', 'Business Name', 'District', 'Phone', 'Payment Terms', 'Status'];
    const rows = list.map(s => [
      `"${s.name || ''}"`,
      `"${s.business_name || ''}"`,
      s.district || '',
      s.phone || '',
      s.payment_terms || '',
      s.is_active ? 'ACTIVE' : 'INACTIVE'
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `suppliers_records_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`Exported ${list.length} suppliers to CSV!`);
  };

  const handleBulkDeleteSuppliers = () => {
    if (selectedSupplierIds.length === 0) return;
    showConfirmModal({
      title: `Delete ${selectedSupplierIds.length} Selected Suppliers?`,
      message: `Are you sure you want to permanently delete ${selectedSupplierIds.length} suppliers? This action cannot be undone.`,
      confirmText: `Yes, Delete ${selectedSupplierIds.length} Suppliers`,
      variant: 'danger',
      onConfirm: async () => {
        try {
          const selectedSet = new Set(selectedSupplierIds);
          const updated = suppliers.filter(s => !selectedSet.has(s.id));
          setSuppliers(updated);
          await setJSONStore('suppliers', updated);
          setSelectedSupplierIds([]);
          toast.success(`Deleted ${selectedSet.size} suppliers successfully!`);
        } catch (err) {
          console.error(err);
          toast.error('Failed to delete suppliers');
        }
      }
    });
  };

  // Filter Logic for Purchase Orders
  const filteredPOs = useMemo(() => {
    return purchaseOrders.filter(po => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const matchNum = po.po_number.toLowerCase().includes(q);
      const matchSupp = po.supplier?.name.toLowerCase().includes(q) || false;
      return matchNum || matchSupp;
    });
  }, [purchaseOrders, searchQuery]);

  // 3. Pagination Logic for Suppliers
  const totalPages = Math.ceil(filteredSuppliers.length / itemsPerPage) || 1;
  const paginatedSuppliers = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredSuppliers.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredSuppliers, currentPage, itemsPerPage]);

  const handleFilterChange = (setter: React.Dispatch<React.SetStateAction<any>>, value: any) => {
    setter(value);
    setCurrentPage(1);
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setDistrictFilter('ALL');
    setPaymentTermsFilter('ALL');
    setCurrentPage(1);
  };

  // Open Create Supplier Modal
  const handleOpenAddSupplier = () => {
    setEditingSupplier(null);
    setSupplierFormData({
      name: '',
      business_name: '',
      phone: '',
      email: '',
      address: '',
      district: 'Theni',
      state: 'Tamil Nadu',
      pincode: '625516',
      payment_terms: 'NET 15',
      bank_details: '',
      notes: '',
      is_active: true
    });
    setShowSupplierModal(true);
  };

  // Open Edit Supplier Modal
  const handleOpenEditSupplier = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setSupplierFormData({
      name: supplier.name,
      business_name: supplier.business_name || '',
      phone: supplier.phone || '',
      email: supplier.email || '',
      address: supplier.address || '',
      district: supplier.district || 'Theni',
      state: supplier.state || 'Tamil Nadu',
      pincode: supplier.pincode || '625516',
      payment_terms: supplier.payment_terms || 'NET 15',
      bank_details: typeof supplier.bank_details === 'string' ? supplier.bank_details : (supplier.bank_details ? JSON.stringify(supplier.bank_details) : ''),
      notes: supplier.notes || '',
      is_active: supplier.is_active
    });
    setShowSupplierModal(true);
  };

  // Save Supplier Handler with Live Animated Percentage Action Modal
  const handleSaveSupplier = (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierFormData.name.trim()) return;

    setShowSupplierModal(false);

    showActionModal({
      title: editingSupplier ? 'Updating Producer Partner' : 'Registering Producer Partner',
      subtitle: `Saving partner credentials for ${supplierFormData.name}...`,
      durationMs: 850,
      steps: [
        'Validating partner details and district coordinates',
        'Linking banking & procurement payment terms',
        'Saving supplier record to directory',
        'Producer partner saved successfully'
      ],
      onComplete: () => {
        if (editingSupplier) {
          const updated = suppliers.map(s =>
            s.id === editingSupplier.id
              ? { ...s, ...supplierFormData, updated_at: new Date().toISOString() }
              : s
          );
          setSuppliers(updated);
          setJSONStore('suppliers', updated);
          toast.success(`Supplier "${supplierFormData.name}" updated!`);
          addNotification({
            title: 'Supplier Updated',
            message: `Supplier "${supplierFormData.name}" details updated successfully.`,
            type: 'info',
            sourceModule: 'Procurement'
          });
        } else {
          const created: Supplier = {
            id: `sup-${Date.now()}`,
            ...supplierFormData,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
          const updated = [created, ...suppliers];
          setSuppliers(updated);
          setJSONStore('suppliers', updated);
          toast.success(`Producer partner "${supplierFormData.name}" registered!`);
          addNotification({
            title: 'New Producer Added',
            message: `Producer partner "${supplierFormData.name}" added to procurement network.`,
            type: 'success',
            sourceModule: 'Procurement'
          });
        }
      }
    });
  };

  // Confirm Delete Supplier
  const handleConfirmDeleteSupplier = () => {
    if (!deletingSupplier) return;

    const targetSupplier = deletingSupplier;
    setDeletingSupplier(null);

    showActionModal({
      title: 'Removing Supplier Partner',
      subtitle: `Removing ${targetSupplier.name} from procurement network...`,
      durationMs: 750,
      steps: [
        'Checking open purchase orders & balances',
        'Archiving supplier profile history',
        'Removing record from active directory',
        'Supplier partner removed'
      ],
      onComplete: () => {
        const updated = suppliers.filter(s => s.id !== targetSupplier.id);
        setSuppliers(updated);
        setJSONStore('suppliers', updated);
        toast.success(`Supplier "${targetSupplier.name}" removed`);
        addNotification({
          title: 'Supplier Partner Removed',
          message: `Supplier "${targetSupplier.name}" removed from procurement system.`,
          type: 'warning',
          sourceModule: 'Procurement'
        });
      }
    });
  };

  // ================= PO MODAL HANDLERS =================

  // Automatic Bulk Discount Calculator based on Procurement Tiers
  const calculateAutoBulkDiscount = (subtotal: number) => {
    if (subtotal >= 10000) return Math.round(subtotal * 0.10); // 10% Bulk Discount Tier
    if (subtotal >= 5000) return Math.round(subtotal * 0.05);   // 5% Bulk Discount Tier
    if (subtotal >= 2000) return Math.round(subtotal * 0.03);   // 3% Bulk Discount Tier
    return 0;
  };

  // Open Create Purchase Order Modal
  const handleOpenAddPO = () => {
    setIsNewPO(true);
    setEditingPO(null);
    const initialPrice = products[0]?.purchase_price || 120;
    const initialQty = 50;
    const initialSubtotal = initialQty * initialPrice;
    const autoDiscount = calculateAutoBulkDiscount(initialSubtotal);

    setPoFormData({
      po_number: `PO-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      supplier_id: suppliers[0]?.id || 'sup-1',
      status: 'ORDERED',
      discount: autoDiscount,
      tax_amount: 0,
      delivery_charge: 0,
      paid_amount: 0,
      notes: 'Direct farm produce procurement',
      sourcing_notes: 'Sourced directly from farmer cooperative in Cumbum Valley',
      items: [
        {
          id: `po-item-${Date.now()}-1`,
          product_id: products[0]?.id || 'p-001',
          product_name_snapshot: products[0]?.name || 'Mapillai Samba Rice',
          quantity: initialQty,
          received_quantity: initialQty,
          purchase_price: initialPrice,
          total: initialSubtotal
        }
      ]
    });
    setShowPOModal(true);
  };

  // Open Edit Purchase Order Modal
  const handleOpenEditPO = (po: PurchaseOrder) => {
    setIsNewPO(false);
    setEditingPO(po);
    setPoFormData({
      po_number: po.po_number,
      supplier_id: po.supplier_id,
      status: po.status,
      discount: po.discount || 0,
      tax_amount: po.tax_amount || 0,
      delivery_charge: po.delivery_charge || 0,
      paid_amount: po.paid_amount,
      notes: po.notes || '',
      sourcing_notes: po.sourcing_notes || '',
      items: (po.items && po.items.length > 0) ? po.items.map(it => ({
        id: it.id,
        product_id: it.product_id,
        product_name_snapshot: it.product_name_snapshot,
        quantity: it.quantity,
        received_quantity: it.received_quantity,
        purchase_price: it.purchase_price,
        total: it.total
      })) : [
        {
          id: `po-item-1`,
          product_id: products[0]?.id || 'p-001',
          product_name_snapshot: products[0]?.name || 'Mapillai Samba Rice',
          quantity: 20,
          received_quantity: 20,
          purchase_price: 120,
          total: 2400
        }
      ]
    });
    setShowPOModal(true);
  };

  // Quick Add New Product Handler (Inside PO Product Stack)
  const handleOpenQuickAddProduct = (itemIndex: number) => {
    setTargetPOItemIndex(itemIndex);
    setNewProductFormData({
      name: '',
      tamil_name: '',
      category_name: 'Organic Rice (இயற்கை அரிசி)',
      sku: `SKU-${Math.floor(1000 + Math.random() * 9000)}`,
      pack_size: '1 kg',
      unit: 'kg',
      purchase_price: 100,
      selling_price: 140,
      mrp: 160
    });
    setShowNewProductModal(true);
  };

  const handleSaveQuickNewProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProductFormData.name.trim()) return;

    showActionModal({
      title: 'Creating Product SKU',
      subtitle: `Adding ${newProductFormData.name} into catalog & PO stack...`,
      durationMs: 700,
      steps: [
        'Validating SKU code and pricing metadata',
        'Configuring Tamil & English naming snapshots',
        'Adding product into procurement catalog',
        'Product SKU registered successfully'
      ],
      onComplete: () => {
        const newProd: Product = {
          id: `prod-quick-${Date.now()}`,
          sku: newProductFormData.sku || `SKU-${Date.now().toString().slice(-4)}`,
          name: newProductFormData.name,
          tamil_name: newProductFormData.tamil_name,
          slug: newProductFormData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
          pack_size: newProductFormData.pack_size,
          unit: newProductFormData.unit,
          purchase_price: Number(newProductFormData.purchase_price),
          landed_cost: Number(newProductFormData.purchase_price),
          mrp: Number(newProductFormData.mrp),
          selling_price: Number(newProductFormData.selling_price),
          tax_percent: 5,
          reorder_level: 20,
          opening_stock: 0,
          current_stock: 0,
          stock_status: 'IN_STOCK',
          is_featured: false,
          is_visible: true,
          is_organic: true,
          expiry_tracking: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        setProducts(prev => [newProd, ...prev]);

        if (targetPOItemIndex !== null) {
          handleUpdatePOLineItem(targetPOItemIndex, 'product_id', newProd.id, newProd);
        }

        toast.success(`Product "${newProd.name}" added to PO stack!`);
        addNotification({
          title: 'New Product SKU Added',
          message: `Product "${newProd.name}${newProd.tamil_name ? ` (${newProd.tamil_name})` : ''}" created & linked to PO stack!`,
          type: 'success',
          sourceModule: 'Catalog & PO Stack'
        });

        setShowNewProductModal(false);
        setTargetPOItemIndex(null);
      }
    });
  };

  // PO Line Item Stack Operations
  const handleAddPOLineItem = () => {
    const prod = products[0];
    setPoFormData(prev => ({
      ...prev,
      items: [
        ...prev.items,
        {
          id: `po-item-${Date.now()}-${prev.items.length + 1}`,
          product_id: prod?.id || 'p-001',
          product_name_snapshot: prod?.name + (prod?.tamil_name ? ` (${prod.tamil_name})` : ''),
          quantity: 10,
          received_quantity: 10,
          purchase_price: prod?.purchase_price || 100,
          total: 10 * (prod?.purchase_price || 100)
        }
      ]
    }));
  };

  const handleUpdatePOLineItem = (index: number, field: string, value: any, customProductObj?: Product) => {
    setPoFormData(prev => {
      const updatedItems = [...prev.items];
      const targetItem = { ...updatedItems[index] };

      if (field === 'product_id') {
        if (value === 'CREATE_NEW_PRODUCT') {
          handleOpenQuickAddProduct(index);
          return prev;
        }
        const prod = customProductObj || products.find(p => p.id === value);
        if (prod) {
          targetItem.product_id = prod.id;
          targetItem.product_name_snapshot = prod.name + (prod.tamil_name ? ` (${prod.tamil_name})` : '');
          targetItem.purchase_price = prod.purchase_price;
          targetItem.total = targetItem.quantity * prod.purchase_price;
        }
      } else if (field === 'quantity') {
        targetItem.quantity = Number(value);
        targetItem.received_quantity = Number(value);
        targetItem.total = targetItem.quantity * targetItem.purchase_price;
      } else if (field === 'purchase_price') {
        targetItem.purchase_price = Number(value);
        targetItem.total = targetItem.quantity * targetItem.purchase_price;
      }

      updatedItems[index] = targetItem;
      return { ...prev, items: updatedItems };
    });
  };

  const handleRemovePOLineItem = (index: number) => {
    if (poFormData.items.length === 1) {
      alert('A purchase order must contain at least one product line item.');
      return;
    }
    setPoFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, idx) => idx !== index)
    }));
  };

  // Calculate PO Totals
  const poSubtotal = useMemo(() => {
    return poFormData.items.reduce((sum, item) => sum + item.total, 0);
  }, [poFormData.items]);

  const poGrandTotal = useMemo(() => {
    return Math.max(0, poSubtotal - (poFormData.discount || 0) + (poFormData.tax_amount || 0) + (poFormData.delivery_charge || 0));
  }, [poSubtotal, poFormData.discount, poFormData.tax_amount, poFormData.delivery_charge]);

  // Save Purchase Order Handler
  const handleSavePO = (e: React.FormEvent) => {
    e.preventDefault();

    const selectedSupplierObj = suppliers.find(s => s.id === poFormData.supplier_id);
    setShowPOModal(false);

    showActionModal({
      title: isNewPO ? 'Issuing Purchase Order' : 'Updating Purchase Order',
      subtitle: `Processing PO ${poFormData.po_number} with ${poFormData.items.length} line items...`,
      durationMs: 850,
      steps: [
        'Verifying line items, unit quantities and purchase prices',
        'Calculating bulk tier discounts, delivery charges & taxes',
        'Registering purchase order ledger & supplier link',
        'Purchase order issued successfully'
      ],
      onComplete: () => {
        const poItemsFormatted: PurchaseOrderItem[] = poFormData.items.map((it, idx) => ({
          id: it.id || `po-item-${Date.now()}-${idx}`,
          purchase_order_id: isNewPO ? `po-${Date.now()}` : editingPO!.id,
          product_id: it.product_id,
          product_name_snapshot: it.product_name_snapshot,
          quantity: it.quantity,
          received_quantity: it.received_quantity,
          purchase_price: it.purchase_price,
          total: it.total,
          created_at: new Date().toISOString()
        }));

        const newPO: PurchaseOrder = {
          id: isNewPO ? `po-${Date.now()}` : editingPO!.id,
          po_number: poFormData.po_number,
          supplier_id: poFormData.supplier_id,
          status: poFormData.status,
          ordered_at: new Date().toISOString(),
          subtotal: poSubtotal,
          discount: poFormData.discount,
          tax_amount: poFormData.tax_amount,
          delivery_charge: poFormData.delivery_charge,
          total: poGrandTotal,
          paid_amount: poFormData.paid_amount,
          notes: poFormData.notes,
          sourcing_notes: poFormData.sourcing_notes,
          created_by: 'Procurement Officer',
          created_at: isNewPO ? new Date().toISOString() : editingPO!.created_at,
          updated_at: new Date().toISOString(),
          supplier: selectedSupplierObj,
          items: poItemsFormatted
        };

        if (isNewPO) {
          const updated = [newPO, ...purchaseOrders];
          setPurchaseOrders(updated);
          setJSONStore('purchase_orders', updated);
          toast.success(`Purchase Order "${newPO.po_number}" issued!`);
          addNotification({
            title: 'Purchase Order Issued',
            message: `PO "${newPO.po_number}" created for ${selectedSupplierObj?.name || 'Supplier'}. Total: ${formatPrice(poGrandTotal)}`,
            type: 'success',
            sourceModule: 'Procurement PO'
          });
        } else {
          const updated = purchaseOrders.map(po => po.id === newPO.id ? newPO : po);
          setPurchaseOrders(updated);
          setJSONStore('purchase_orders', updated);
          toast.success(`Purchase Order "${newPO.po_number}" updated!`);
          addNotification({
            title: 'Purchase Order Updated',
            message: `PO "${newPO.po_number}" details updated successfully.`,
            type: 'info',
            sourceModule: 'Procurement PO'
          });
        }
      }
    });
  };

  // Confirm Delete PO
  const handleConfirmDeletePO = () => {
    if (!deletingPO) return;

    const targetPO = deletingPO;
    setDeletingPO(null);

    showActionModal({
      title: 'Cancelling Purchase Order',
      subtitle: `Removing PO ${targetPO.po_number}...`,
      durationMs: 700,
      steps: [
        'Cancelling supplier procurement commitment',
        'Reverting supplier allocation records',
        'Removing PO from active procurement ledger',
        'Purchase order removed'
      ],
      onComplete: () => {
        const updated = purchaseOrders.filter(po => po.id !== targetPO.id);
        setPurchaseOrders(updated);
        setJSONStore('purchase_orders', updated);
        toast.success(`PO "${targetPO.po_number}" removed`);
        addNotification({
          title: 'Purchase Order Cancelled/Deleted',
          message: `PO "${targetPO.po_number}" has been permanently removed.`,
          type: 'warning',
          sourceModule: 'Procurement PO'
        });
      }
    });
  };

  if (loading) {
    return <AdminPageSkeleton title="Suppliers & Farmer Procurement Hub" />;
  }

  return (
    <div className="space-y-6 font-sans pb-12">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-emerald-950 p-6 rounded-3xl shadow-sm border border-emerald-100 dark:border-emerald-800">
        <div>
          <h1 className="text-2xl font-bold font-serif text-gray-900 dark:text-emerald-100 flex items-center gap-2">
            <Truck className="w-7 h-7 text-emerald-600 dark:text-amber-400" />
            Suppliers & Purchase Procurement
          </h1>
          <p className="text-xs text-gray-500 dark:text-emerald-300 mt-1">
            Manage traditional farmer cooperatives, direct producer sourcing, bank details, and purchase orders.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Refresh Button */}
          <button
            onClick={() => setIsRefreshing(true)}
            className="px-3.5 py-2 bg-emerald-100/80 dark:bg-emerald-900/80 hover:bg-emerald-200 dark:hover:bg-emerald-800 text-emerald-900 dark:text-emerald-100 font-bold text-xs rounded-xl border border-emerald-300 dark:border-emerald-700 transition-all flex items-center gap-1.5 shadow-sm"
            title="Refresh suppliers directory & PO stack"
          >
            <RefreshCw className="w-4 h-4 text-emerald-700 dark:text-amber-400" />
            <span>Refresh</span>
          </button>

          {/* Export Button */}
          <button
            onClick={() => setShowExportModal(true)}
            className="px-3.5 py-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-800 dark:text-amber-300 font-bold text-xs rounded-xl border border-amber-300 dark:border-amber-700/60 transition-all flex items-center gap-1.5 shadow-sm"
            title="Export supplier directory / PO records"
          >
            <Download className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            <span>Export {activeTab === 'SUPPLIERS' ? 'Suppliers' : 'POs'}</span>
          </button>

          {/* Tab Selector */}
          <div className="flex bg-emerald-50/80 dark:bg-emerald-900/60 p-1.5 rounded-2xl border border-emerald-100 dark:border-emerald-800">
            <button
              onClick={() => setActiveTab('SUPPLIERS')}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition ${
                activeTab === 'SUPPLIERS'
                  ? 'bg-emerald-700 text-white shadow'
                  : 'text-gray-600 dark:text-emerald-300 hover:text-emerald-900'
              }`}
            >
              Suppliers Directory ({suppliers.length})
            </button>
            <button
              onClick={() => setActiveTab('POS')}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition ${
                activeTab === 'POS'
                  ? 'bg-emerald-700 text-white shadow'
                  : 'text-gray-600 dark:text-emerald-300 hover:text-emerald-900'
              }`}
            >
              Purchase Orders ({purchaseOrders.length})
            </button>
          </div>
        </div>
      </div>

      {/* ================= 4 OVERVIEW STAT BOXES ================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Box 1: Active Supplier Partners */}
        <div className="bg-white dark:bg-emerald-900/40 p-5 rounded-3xl border border-emerald-100 dark:border-emerald-800 shadow-sm relative overflow-hidden group hover:border-emerald-300 transition-all">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-bold text-gray-500 dark:text-emerald-400 uppercase tracking-wider">Active Suppliers</p>
              <h3 className="text-2xl font-black text-gray-900 dark:text-emerald-100 mt-1">{metrics.activeSuppliersCount}</h3>
              <p className="text-[11px] text-emerald-700 dark:text-emerald-300 font-medium mt-1">Across {districts.length} Districts</p>
            </div>
            <div className="p-3 rounded-2xl bg-emerald-100 dark:bg-emerald-800 text-emerald-700 dark:text-amber-300 group-hover:scale-110 transition-transform">
              <Building2 className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-emerald-50 dark:border-emerald-800/60 flex justify-between text-xs text-gray-500 dark:text-emerald-300">
            <span>Network Reach</span>
            <span className="font-bold text-emerald-700 dark:text-emerald-300">Tamil Nadu Farmers</span>
          </div>
        </div>

        {/* Box 2: Total Purchase Orders */}
        <div className="bg-white dark:bg-emerald-900/40 p-5 rounded-3xl border border-emerald-100 dark:border-emerald-800 shadow-sm relative overflow-hidden group hover:border-emerald-300 transition-all">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-bold text-gray-500 dark:text-emerald-400 uppercase tracking-wider">Purchase Orders</p>
              <h3 className="text-2xl font-black text-emerald-700 dark:text-emerald-300 mt-1">{metrics.totalPOCount} Orders</h3>
              <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold mt-1 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Direct farm fulfillment
              </p>
            </div>
            <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-800/60 text-emerald-600 dark:text-emerald-300 group-hover:scale-110 transition-transform">
              <ShoppingCart className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-emerald-50 dark:border-emerald-800/60 flex justify-between text-xs text-gray-500 dark:text-emerald-300">
            <span>Fulfillment Rate</span>
            <span className="font-bold text-emerald-700 dark:text-emerald-300">100% Received</span>
          </div>
        </div>

        {/* Box 3: Total Procurement Spend */}
        <div className="bg-white dark:bg-emerald-900/40 p-5 rounded-3xl border border-emerald-100 dark:border-emerald-800 shadow-sm relative overflow-hidden group hover:border-emerald-300 transition-all">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-bold text-gray-500 dark:text-emerald-400 uppercase tracking-wider">Total Procurement Spend</p>
              <h3 className="text-2xl font-black text-emerald-800 dark:text-amber-400 mt-1">{formatPrice(metrics.totalProcurementSpend)}</h3>
              <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold mt-1 flex items-center gap-1">
                <TrendingUp className="w-3.5 h-3.5" /> Fair trade pricing
              </p>
            </div>
            <div className="p-3 rounded-2xl bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 group-hover:scale-110 transition-transform">
              <DollarSign className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-emerald-50 dark:border-emerald-800/60 flex justify-between text-xs text-gray-500 dark:text-emerald-300">
            <span>Direct Sourcing</span>
            <span className="font-bold text-emerald-800 dark:text-amber-400">Zero Middlemen</span>
          </div>
        </div>

        {/* Box 4: Pending PO Payments */}
        <div className="bg-white dark:bg-emerald-900/40 p-5 rounded-3xl border border-amber-200 dark:border-amber-800/60 shadow-sm relative overflow-hidden group hover:border-amber-400 transition-all">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-bold text-amber-800 dark:text-amber-400 uppercase tracking-wider">Pending PO Payments</p>
              <h3 className="text-2xl font-black text-amber-600 dark:text-amber-300 mt-1">{formatPrice(metrics.pendingPOPayments)}</h3>
              <p className="text-[11px] text-amber-700 dark:text-amber-400 font-semibold mt-1 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" /> Due within payment terms
              </p>
            </div>
            <div className="p-3 rounded-2xl bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 group-hover:scale-110 transition-transform">
              <CreditCard className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-amber-100 dark:border-amber-800/60 flex justify-between text-xs text-amber-900 dark:text-amber-300">
            <span>Payment Health</span>
            <span className="font-bold">On Schedule</span>
          </div>
        </div>

      </div>

      {activeTab === 'SUPPLIERS' && (
        <div className="space-y-4">
          
          {/* ================= FILTER BAR & TOP ACTIONS ================= */}
          <div className="bg-white dark:bg-emerald-900/40 p-4 rounded-3xl border border-emerald-100 dark:border-emerald-800 shadow-sm space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              
              {/* Search Bar */}
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search supplier, business, district..."
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

              {/* District Filter */}
              <div>
                <select
                  value={districtFilter}
                  onChange={e => handleFilterChange(setDistrictFilter, e.target.value)}
                  className="w-full px-3 py-2.5 bg-emerald-50/50 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-700 rounded-xl font-bold dark:text-emerald-100"
                >
                  <option value="ALL">All Districts ({districts.length})</option>
                  {districts.map(d => (
                    <option key={d} value={d}>{d} District</option>
                  ))}
                </select>
              </div>

              {/* Payment Terms Filter */}
              <div>
                <select
                  value={paymentTermsFilter}
                  onChange={e => handleFilterChange(setPaymentTermsFilter, e.target.value)}
                  className="w-full px-3 py-2.5 bg-emerald-50/50 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-700 rounded-xl font-bold dark:text-emerald-100"
                >
                  <option value="ALL">All Payment Terms</option>
                  <option value="CASH">Cash on Delivery</option>
                  <option value="NET 7">NET 7 Days</option>
                  <option value="NET 15">NET 15 Days</option>
                  <option value="NET 30">NET 30 Days</option>
                  <option value="ADVANCE">Advance Payment</option>
                </select>
              </div>

              {/* Add New Supplier Button */}
              <div>
                <button
                  onClick={handleOpenAddSupplier}
                  className="w-full py-2.5 bg-gradient-to-r from-emerald-700 to-emerald-800 hover:from-emerald-800 hover:to-emerald-900 text-white font-extrabold rounded-xl shadow transition-all flex items-center justify-center gap-2 group"
                >
                  <Plus className="w-4 h-4 text-amber-300 group-hover:rotate-90 transition-transform duration-300" />
                  <span>Add New Supplier</span>
                </button>
              </div>

            </div>

            {(searchQuery || districtFilter !== 'ALL' || paymentTermsFilter !== 'ALL') && (
              <div className="flex justify-end pt-1 border-t border-emerald-100 dark:border-emerald-800/60">
                <button onClick={handleResetFilters} className="text-emerald-700 dark:text-amber-400 hover:underline font-bold text-xs flex items-center gap-1">
                  <RefreshCw className="w-3.5 h-3.5" /> Reset All Filters
                </button>
              </div>
            )}
          </div>

          {/* ================= SUPPLIER GRID ================= */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {suppliers.length === 0 ? (
              <div className="col-span-full text-center py-16 bg-white dark:bg-emerald-900/40 rounded-3xl border border-emerald-100 dark:border-emerald-800 p-8 space-y-3">
                <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-800 text-emerald-800 dark:text-emerald-200 flex items-center justify-center mx-auto shadow-2xs">
                  <Building2 className="w-6 h-6 text-emerald-700 dark:text-emerald-300" />
                </div>
                <h4 className="font-black text-base text-gray-800 dark:text-emerald-100">No Active Supplier Partners in Directory</h4>
                <p className="text-xs text-gray-500 max-w-sm mx-auto">Currently there are no supplier records found. You can add your first organic farm supplier now.</p>
                <div className="pt-2">
                  <button
                    onClick={() => { setEditingSupplier(null); setShowSupplierModal(true); }}
                    className="px-4 py-2 bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs rounded-xl shadow-xs inline-flex items-center gap-1.5 transition"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add First Supplier
                  </button>
                </div>
              </div>
            ) : paginatedSuppliers.length === 0 ? (
              <div className="col-span-full text-center py-12 bg-white dark:bg-emerald-900/40 rounded-3xl border border-emerald-100 dark:border-emerald-800 p-8 space-y-3">
                <div className="w-12 h-12 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center mx-auto shadow-2xs">
                  <Search className="w-6 h-6 text-gray-400" />
                </div>
                <p className="font-bold text-base text-gray-800 dark:text-emerald-100">No Supplier Partners Match Filters</p>
                <p className="text-xs text-gray-500">No suppliers match your search query {searchQuery ? `"${searchQuery}"` : ''} or selected district filter.</p>
                <div className="pt-2">
                  <button
                    onClick={() => { setSearchQuery(''); setDistrictFilter('ALL'); setPaymentTermsFilter('ALL'); }}
                    className="px-4 py-2 bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs rounded-xl shadow-xs inline-flex items-center gap-1.5 transition"
                  >
                    <RotateCcw className="w-3.5 h-3.5" /> Clear All Filters
                  </button>
                </div>
              </div>
            ) : (
              paginatedSuppliers.map(supplier => (
                <div key={supplier.id} className="bg-white dark:bg-emerald-900/40 rounded-3xl p-5 shadow-sm border border-emerald-100 dark:border-emerald-800/80 flex flex-col justify-between hover:border-emerald-300 dark:hover:border-emerald-700 transition-all">
                  <div>
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-start gap-2.5">
                        <input
                          type="checkbox"
                          checked={selectedSupplierIds.includes(supplier.id)}
                          onChange={() => setSelectedSupplierIds(prev => prev.includes(supplier.id) ? prev.filter(x => x !== supplier.id) : [...prev, supplier.id])}
                          className="w-4 h-4 mt-0.5 rounded text-emerald-800 focus:ring-emerald-500 cursor-pointer"
                        />
                        <div>
                          <h3 className="font-extrabold text-emerald-950 dark:text-emerald-100 text-sm flex items-center gap-1.5">
                            <Building2 className="w-4 h-4 text-emerald-600 dark:text-amber-400" />
                            {supplier.name}
                          </h3>
                          {supplier.business_name && (
                            <p className="text-xs text-amber-700 dark:text-amber-400 font-bold mt-0.5">{supplier.business_name}</p>
                          )}
                        </div>
                      </div>
                      <span className={`px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider shadow-xs border ${
                        supplier.is_active
                          ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white border-emerald-400'
                          : 'bg-gradient-to-r from-gray-400 to-gray-500 text-white border-gray-300'
                      }`}>
                        {supplier.is_active ? 'Active Partner' : 'Inactive'}
                      </span>
                    </div>

                    <div className="space-y-2 text-xs text-gray-600 dark:text-emerald-300 border-t border-b border-emerald-100 dark:border-emerald-800/60 py-3 my-3">
                      {supplier.phone && (
                        <div className="flex items-center gap-2">
                          <Phone className="w-3.5 h-3.5 text-emerald-600 dark:text-amber-400" />
                          <span className="font-mono font-bold text-gray-900 dark:text-emerald-100">{supplier.phone}</span>
                        </div>
                      )}
                      {supplier.email && (
                        <div className="flex items-center gap-2">
                          <Mail className="w-3.5 h-3.5 text-emerald-600 dark:text-amber-400" />
                          <span>{supplier.email}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5 text-emerald-600 dark:text-amber-400" />
                        <span>{supplier.district}, {supplier.state} - {supplier.pincode || '625516'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5 text-emerald-600 dark:text-amber-400" />
                        <span>Payment Terms: <strong className="text-emerald-950 dark:text-amber-300">{supplier.payment_terms || 'NET 15'}</strong></span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 flex justify-between items-center text-xs">
                    <span className="text-[10px] text-gray-400">Added {formatDate(supplier.created_at)}</span>
                    <div className="flex items-center space-x-1.5">
                      <button
                        onClick={() => handleOpenEditSupplier(supplier)}
                        className="px-3 py-1 bg-emerald-50 dark:bg-emerald-950 text-emerald-800 dark:text-amber-300 font-bold rounded-xl hover:bg-emerald-100 dark:hover:bg-emerald-800 transition flex items-center gap-1"
                      >
                        <Edit2 className="w-3.5 h-3.5" /> Edit
                      </button>
                      <button
                        onClick={() => setDeletingSupplier(supplier)}
                        className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950 transition"
                        title="Remove Supplier"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* ================= PAGINATION CONTROLS ================= */}
          <div className="p-4 bg-white dark:bg-emerald-900/40 rounded-3xl border border-emerald-100 dark:border-emerald-800 shadow-sm flex flex-col sm:flex-row justify-between items-center gap-4 text-xs">
            <div className="flex items-center space-x-3 text-gray-600 dark:text-emerald-300 font-medium">
              <span>Showing <strong className="text-emerald-950 dark:text-emerald-100">{filteredSuppliers.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1}</strong> to <strong className="text-emerald-950 dark:text-emerald-100">{Math.min(currentPage * itemsPerPage, filteredSuppliers.length)}</strong> of <strong className="text-emerald-950 dark:text-emerald-100">{filteredSuppliers.length}</strong> suppliers</span>
              <div className="flex items-center space-x-1 pl-3 border-l border-emerald-200 dark:border-emerald-800">
                <span>Per page:</span>
                <select
                  value={itemsPerPage}
                  onChange={e => {
                    setItemsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="px-2 py-1 bg-emerald-50 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-700 rounded-lg font-bold"
                >
                  <option value={6}>6</option>
                  <option value={12}>12</option>
                  <option value={24}>24</option>
                </select>
              </div>
            </div>

            <div className="flex items-center space-x-1">
              <button
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg border border-emerald-200 dark:border-emerald-700 bg-white dark:bg-emerald-900 text-gray-700 dark:text-emerald-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-emerald-100"
              >
                <ChevronsLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg border border-emerald-200 dark:border-emerald-700 bg-white dark:bg-emerald-900 text-gray-700 dark:text-emerald-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-emerald-100"
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
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-lg border border-emerald-200 dark:border-emerald-700 bg-white dark:bg-emerald-900 text-gray-700 dark:text-emerald-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-emerald-100"
              >
                <ChevronsRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Floating Action Bar for Selected Suppliers */}
          {selectedSupplierIds.length > 0 && (
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-gray-900/95 backdrop-blur-md text-white px-5 py-3 rounded-2xl shadow-2xl border border-gray-700 flex items-center gap-3 animate-fadeIn flex-wrap justify-center">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="font-extrabold text-xs">
                  {selectedSupplierIds.length} supplier(s) selected
                </span>
              </div>
              <div className="h-4 w-px bg-gray-700 hidden sm:block" />
              <button
                onClick={handleBulkExportSelectedSuppliers}
                className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-amber-300" />
                Export Selected
              </button>
              <button
                onClick={handleBulkDeleteSuppliers}
                className="px-3 py-1.5 bg-rose-700 hover:bg-rose-600 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete Selected
              </button>
              <button
                onClick={() => setSelectedSupplierIds([])}
                className="px-2.5 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Clear
              </button>
            </div>
          )}
        </div>
      )}

      {/* ================= PURCHASE ORDERS TAB ================= */}
      {activeTab === 'POS' && (
        <div className="space-y-4">
          
          <div className="flex justify-between items-center bg-white dark:bg-emerald-900/40 p-4 rounded-3xl border border-emerald-100 dark:border-emerald-800 shadow-sm">
            <h2 className="text-sm font-bold text-emerald-950 dark:text-emerald-100 flex items-center gap-2">
              <ShoppingCart className="w-4 h-4 text-amber-400" />
              Procurement Purchase Orders Log ({purchaseOrders.length})
            </h2>

            <button
              onClick={handleOpenAddPO}
              className="px-5 py-2.5 bg-gradient-to-r from-emerald-700 to-emerald-800 hover:from-emerald-800 hover:to-emerald-900 text-white font-extrabold text-xs rounded-2xl shadow-lg hover:shadow-xl transition-all flex items-center gap-2 group"
            >
              <Plus className="w-4 h-4 text-amber-300 group-hover:rotate-90 transition-transform duration-300" />
              <span>+ Create Purchase Order</span>
            </button>
          </div>

          <div className="bg-white dark:bg-emerald-900/40 rounded-3xl border border-emerald-100 dark:border-emerald-800 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-gradient-to-r from-emerald-950 to-emerald-900 text-emerald-100 font-bold uppercase tracking-wider">
                  <tr>
                    <th className="p-3.5">PO Number</th>
                    <th className="p-3.5">Supplier Partner</th>
                    <th className="p-3.5 text-center">Status</th>
                    <th className="p-3.5">Ordered Date</th>
                    <th className="p-3.5 text-right">Subtotal / Discount</th>
                    <th className="p-3.5 text-right">Total Amount</th>
                    <th className="p-3.5 text-right">Paid Amount</th>
                    <th className="p-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-emerald-100 dark:divide-emerald-800/60 text-gray-700 dark:text-emerald-200">
                  {purchaseOrders.map(po => (
                    <tr key={po.id} className="hover:bg-emerald-50/60 dark:hover:bg-emerald-900/50 transition">
                      <td className="p-3.5 font-mono font-bold text-emerald-950 dark:text-amber-300">{po.po_number}</td>
                      <td className="p-3.5 font-bold text-gray-900 dark:text-emerald-100">
                        {po.supplier?.name || 'Farmer Co-op Partner'}
                      </td>
                      <td className="p-3.5 text-center">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                          po.status === 'RECEIVED'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300'
                            : po.status === 'ORDERED'
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-300'
                            : 'bg-amber-100 text-amber-800'
                        }`}>
                          {po.status}
                        </span>
                      </td>
                      <td className="p-3.5 font-mono text-gray-500 dark:text-emerald-400">{formatDate(po.created_at)}</td>
                      <td className="p-3.5 text-right font-mono">
                        <div>{formatPrice(po.subtotal)}</div>
                        {po.discount ? (
                          <div className="text-[10px] text-rose-600 dark:text-rose-400 font-bold">Disc: -{formatPrice(po.discount)}</div>
                        ) : null}
                      </td>
                      <td className="p-3.5 text-right font-mono font-black text-emerald-950 dark:text-emerald-100">
                        {formatPrice(po.total)}
                      </td>
                      <td className="p-3.5 text-right font-mono font-bold text-emerald-700 dark:text-amber-400">
                        {formatPrice(po.paid_amount)}
                      </td>
                      <td className="p-3.5 text-right space-x-1.5">
                        <button
                          onClick={() => setSelectedPO(po)}
                          className="p-1.5 rounded-lg text-gray-500 hover:text-emerald-700 dark:hover:text-amber-300 hover:bg-emerald-100 dark:hover:bg-emerald-800 transition"
                          title="View PO Summary"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleOpenEditPO(po)}
                          className="p-1.5 rounded-lg text-emerald-700 hover:text-emerald-900 dark:text-amber-400 hover:bg-emerald-100 dark:hover:bg-emerald-800 transition font-bold"
                          title="Edit Full PO & Item Stack"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeletingPO(po)}
                          className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950 transition"
                          title="Delete / Cancel PO"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* ================= COMPREHENSIVE ADD / EDIT SUPPLIER MODAL ================= */}
      {showSupplierModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn overflow-y-auto">
          <div className="bg-white dark:bg-emerald-950 rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-emerald-100 dark:border-emerald-800 space-y-4 my-8 max-h-[90vh] overflow-y-auto">
            
            {/* Modal Header */}
            <div className="flex justify-between items-center border-b border-emerald-100 dark:border-emerald-800 pb-3">
              <div className="flex items-center space-x-2">
                <Building2 className="w-6 h-6 text-emerald-600 dark:text-amber-400" />
                <h3 className="font-bold text-lg text-gray-900 dark:text-emerald-100">
                  {editingSupplier ? `Edit Supplier: ${editingSupplier.name}` : 'Add New Producer / Supplier Partner'}
                </h3>
              </div>
              <button onClick={() => setShowSupplierModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSupplier} className="space-y-4 text-xs">
              
              {/* SECTION 1: BUSINESS & CONTACT INFO */}
              <div className="bg-emerald-50/50 dark:bg-emerald-900/40 p-4 rounded-2xl border border-emerald-100 dark:border-emerald-800 space-y-3">
                <h4 className="font-extrabold text-emerald-900 dark:text-amber-300 text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <Building2 className="w-4 h-4" /> Contact & Business Info
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-gray-700 dark:text-emerald-200 mb-1">
                      Contact Person / Farmer Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Rajan Krishnamurthy"
                      value={supplierFormData.name}
                      onChange={e => setSupplierFormData({ ...supplierFormData, name: e.target.value })}
                      className="w-full p-2.5 bg-white dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-700 rounded-xl font-bold text-gray-900 dark:text-emerald-100"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-gray-700 dark:text-emerald-200 mb-1">
                      Cooperative / Business Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Rajan Agro Farms & Mills"
                      value={supplierFormData.business_name}
                      onChange={e => setSupplierFormData({ ...supplierFormData, business_name: e.target.value })}
                      className="w-full p-2.5 bg-white dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-700 rounded-xl font-bold text-emerald-800 dark:text-amber-300"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-gray-700 dark:text-emerald-200 mb-1">
                      Phone / WhatsApp Number *
                    </label>
                    <input
                      type="tel"
                      required
                      placeholder="e.g. 9876543201"
                      value={supplierFormData.phone}
                      onChange={e => setSupplierFormData({ ...supplierFormData, phone: e.target.value })}
                      className="w-full p-2.5 bg-white dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-700 rounded-xl font-mono font-bold text-gray-900 dark:text-emerald-100"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-gray-700 dark:text-emerald-200 mb-1">
                      Email Address
                    </label>
                    <input
                      type="email"
                      placeholder="e.g. rajan@rajanagro.com"
                      value={supplierFormData.email}
                      onChange={e => setSupplierFormData({ ...supplierFormData, email: e.target.value })}
                      className="w-full p-2.5 bg-white dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-700 rounded-xl font-bold text-gray-900 dark:text-emerald-100"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 2: LOCATION & ADDRESS */}
              <div className="bg-emerald-50/50 dark:bg-emerald-900/40 p-4 rounded-2xl border border-emerald-100 dark:border-emerald-800 space-y-3">
                <h4 className="font-extrabold text-emerald-900 dark:text-amber-300 text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <MapPin className="w-4 h-4" /> Location & Address Details
                </h4>

                <div>
                  <label className="block font-bold text-gray-700 dark:text-emerald-200 mb-1">
                    Farm / Warehouse Address *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 45, Farm Road, Palani"
                    value={supplierFormData.address}
                    onChange={e => setSupplierFormData({ ...supplierFormData, address: e.target.value })}
                    className="w-full p-2.5 bg-white dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-700 rounded-xl font-bold text-gray-900 dark:text-emerald-100"
                  />
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block font-bold text-gray-700 dark:text-emerald-200 mb-1">District *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Dindigul"
                      value={supplierFormData.district}
                      onChange={e => setSupplierFormData({ ...supplierFormData, district: e.target.value })}
                      className="w-full p-2.5 bg-white dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-700 rounded-xl font-bold"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-gray-700 dark:text-emerald-200 mb-1">State *</label>
                    <input
                      type="text"
                      required
                      placeholder="Tamil Nadu"
                      value={supplierFormData.state}
                      onChange={e => setSupplierFormData({ ...supplierFormData, state: e.target.value })}
                      className="w-full p-2.5 bg-white dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-700 rounded-xl font-bold"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-gray-700 dark:text-emerald-200 mb-1">Pincode *</label>
                    <input
                      type="text"
                      required
                      maxLength={6}
                      placeholder="624601"
                      value={supplierFormData.pincode}
                      onChange={e => setSupplierFormData({ ...supplierFormData, pincode: e.target.value })}
                      className="w-full p-2.5 bg-white dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-700 rounded-xl font-mono font-bold"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 3: PAYMENT TERMS & BANK DETAILS */}
              <div className="bg-emerald-50/50 dark:bg-emerald-900/40 p-4 rounded-2xl border border-emerald-100 dark:border-emerald-800 space-y-3">
                <h4 className="font-extrabold text-emerald-900 dark:text-amber-300 text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <Landmark className="w-4 h-4" /> Payment Terms & Bank Accounts
                </h4>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-gray-700 dark:text-emerald-200 mb-1">Payment Terms</label>
                    <select
                      value={supplierFormData.payment_terms}
                      onChange={e => setSupplierFormData({ ...supplierFormData, payment_terms: e.target.value })}
                      className="w-full p-2.5 bg-white dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-700 rounded-xl font-bold text-emerald-900 dark:text-emerald-100"
                    >
                      <option value="CASH">Cash on Delivery</option>
                      <option value="NET 7">NET 7 Days</option>
                      <option value="NET 15">NET 15 Days</option>
                      <option value="NET 30">NET 30 Days</option>
                      <option value="ADVANCE">Advance Payment Required</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-gray-700 dark:text-emerald-200 mb-1">Account Status</label>
                    <select
                      value={supplierFormData.is_active ? 'active' : 'inactive'}
                      onChange={e => setSupplierFormData({ ...supplierFormData, is_active: e.target.value === 'active' })}
                      className="w-full p-2.5 bg-white dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-700 rounded-xl font-bold text-emerald-900 dark:text-emerald-100"
                    >
                      <option value="active">Active Procurement Partner</option>
                      <option value="inactive">Inactive / On Hold</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-gray-700 dark:text-emerald-200 mb-1">
                    Bank Account & NEFT / UPI Details
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Canara Bank, A/C: 1234567890, IFSC: CNRB0001234"
                    value={supplierFormData.bank_details}
                    onChange={e => setSupplierFormData({ ...supplierFormData, bank_details: e.target.value })}
                    className="w-full p-2.5 bg-white dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-700 rounded-xl font-mono text-gray-900 dark:text-emerald-100"
                  />
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex justify-end space-x-3 pt-3 border-t border-emerald-100 dark:border-emerald-800">
                <button
                  type="button"
                  onClick={() => setShowSupplierModal(false)}
                  className="px-5 py-2.5 bg-gray-200 dark:bg-emerald-900 text-gray-800 dark:text-emerald-100 font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold rounded-xl shadow flex items-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{editingSupplier ? 'Save Supplier Changes' : 'Save Supplier Partner'}</span>
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* ================= COMPREHENSIVE ADD / EDIT PURCHASE ORDER MODAL ================= */}
      {showPOModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn overflow-y-auto">
          <div className="bg-white dark:bg-emerald-950 rounded-3xl max-w-3xl w-full p-6 shadow-2xl border border-emerald-100 dark:border-emerald-800 space-y-4 my-8 max-h-[90vh] overflow-y-auto">
            
            {/* Modal Header */}
            <div className="flex justify-between items-center border-b border-emerald-100 dark:border-emerald-800 pb-3">
              <div className="flex items-center space-x-2">
                <ShoppingCart className="w-6 h-6 text-emerald-600 dark:text-amber-400" />
                <h3 className="font-bold text-lg text-gray-900 dark:text-emerald-100">
                  {isNewPO ? 'Create New Purchase Order' : `Edit Purchase Order: ${poFormData.po_number}`}
                </h3>
              </div>
              <button onClick={() => setShowPOModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePO} className="space-y-4 text-xs">
              
              {/* SECTION 1: PO HEADER & SUPPLIER */}
              <div className="bg-emerald-50/50 dark:bg-emerald-900/40 p-4 rounded-2xl border border-emerald-100 dark:border-emerald-800 space-y-3">
                <h4 className="font-extrabold text-emerald-900 dark:text-amber-300 text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <Tag className="w-4 h-4" /> Purchase Order Header
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-bold text-gray-700 dark:text-emerald-200 mb-1">PO Number *</label>
                    <input
                      type="text"
                      required
                      value={poFormData.po_number}
                      onChange={e => setPoFormData({ ...poFormData, po_number: e.target.value })}
                      className="w-full p-2.5 bg-white dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-700 rounded-xl font-mono font-bold text-emerald-900 dark:text-amber-300"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-gray-700 dark:text-emerald-200 mb-1">Supplier Partner *</label>
                    <select
                      value={poFormData.supplier_id}
                      onChange={e => setPoFormData({ ...poFormData, supplier_id: e.target.value })}
                      className="w-full p-2.5 bg-white dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-700 rounded-xl font-bold text-gray-900 dark:text-emerald-100"
                    >
                      {suppliers.map(s => (
                        <option key={s.id} value={s.id}>{s.name} ({s.business_name || s.district})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block font-bold text-gray-700 dark:text-emerald-200 mb-1">Procurement Status</label>
                    <select
                      value={poFormData.status}
                      onChange={e => setPoFormData({ ...poFormData, status: e.target.value as PurchaseStatus })}
                      className="w-full p-2.5 bg-white dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-700 rounded-xl font-bold"
                    >
                      <option value="DRAFT">DRAFT (Pending Release)</option>
                      <option value="ORDERED">ORDERED (Sent to Farmer)</option>
                      <option value="PARTIAL">PARTIAL (Partial Delivery)</option>
                      <option value="RECEIVED">RECEIVED (In Stock)</option>
                      <option value="CANCELLED">CANCELLED</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* SECTION 2: PRODUCT STACK LINE ITEMS */}
              <div className="bg-emerald-50/50 dark:bg-emerald-900/40 p-4 rounded-2xl border border-emerald-100 dark:border-emerald-800 space-y-3">
                <div className="flex justify-between items-center">
                  <h4 className="font-extrabold text-emerald-900 dark:text-amber-300 text-xs uppercase tracking-wider flex items-center gap-1.5">
                    <Layers className="w-4 h-4" /> Ordered Products Stack ({poFormData.items.length} Items)
                  </h4>
                  <button
                    type="button"
                    onClick={handleAddPOLineItem}
                    className="px-3 py-1.5 bg-emerald-700 text-white rounded-xl font-extrabold text-xs flex items-center gap-1 shadow hover:bg-emerald-800"
                  >
                    <Plus className="w-3.5 h-3.5" /> + Add Product Item
                  </button>
                </div>

                <div className="space-y-2">
                  {poFormData.items.map((item, index) => (
                    <div key={item.id || index} className="p-3 bg-white dark:bg-emerald-950 rounded-2xl border border-emerald-200 dark:border-emerald-700 grid grid-cols-12 gap-2 items-center">
                      
                      {/* Product Selector */}
                      <div className="col-span-5">
                        <div className="flex justify-between items-center mb-1">
                          <label className="block text-[10px] font-extrabold uppercase tracking-wide text-gray-500 dark:text-emerald-400">
                            Select Catalog SKU
                          </label>
                          <button
                            type="button"
                            onClick={() => handleOpenQuickAddProduct(index)}
                            className="px-2 py-0.5 bg-amber-100 hover:bg-amber-200 dark:bg-amber-900/60 dark:hover:bg-amber-800 text-amber-800 dark:text-amber-300 font-extrabold rounded-lg text-[10px] flex items-center gap-1 transition-all shadow-xs border border-amber-200 dark:border-amber-700/50"
                          >
                            <Plus className="w-3 h-3 text-amber-600 dark:text-amber-300" />
                            <span>New SKU</span>
                          </button>
                        </div>
                        <select
                          value={item.product_id}
                          onChange={e => handleUpdatePOLineItem(index, 'product_id', e.target.value)}
                          className="w-full p-2 bg-emerald-50/50 dark:bg-emerald-900 border border-emerald-200 dark:border-emerald-700 rounded-xl font-bold text-xs dark:text-emerald-100"
                        >
                          <option value="CREATE_NEW_PRODUCT">+ Add New Product SKU (புதிய தயாரிப்பு)</option>
                          {products.map(p => (
                            <option key={p.id} value={p.id}>
                              {p.name} {p.tamil_name ? `(${p.tamil_name})` : ''} - {p.sku}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Quantity */}
                      <div className="col-span-2">
                        <label className="block text-[10px] font-bold text-gray-500 dark:text-emerald-400">Qty Ordered</label>
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={e => handleUpdatePOLineItem(index, 'quantity', e.target.value)}
                          className="w-full mt-0.5 p-2 bg-emerald-50/50 dark:bg-emerald-900 border border-emerald-200 dark:border-emerald-700 rounded-xl font-mono font-bold text-xs"
                        />
                      </div>

                      {/* Unit Price */}
                      <div className="col-span-2">
                        <label className="block text-[10px] font-bold text-gray-500 dark:text-emerald-400">Cost Price (₹)</label>
                        <input
                          type="number"
                          value={item.purchase_price}
                          onChange={e => handleUpdatePOLineItem(index, 'purchase_price', e.target.value)}
                          className="w-full mt-0.5 p-2 bg-emerald-50/50 dark:bg-emerald-900 border border-emerald-200 dark:border-emerald-700 rounded-xl font-mono font-bold text-xs"
                        />
                      </div>

                      {/* Line Total */}
                      <div className="col-span-2 text-right">
                        <span className="block text-[10px] font-bold text-gray-500 dark:text-emerald-400">Line Total</span>
                        <span className="font-mono font-black text-emerald-800 dark:text-amber-400 text-xs">
                          {formatPrice(item.total)}
                        </span>
                      </div>

                      {/* Remove Line Item */}
                      <div className="col-span-1 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemovePOLineItem(index)}
                          className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg"
                          title="Remove Item"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                    </div>
                  ))}
                </div>
              </div>

              {/* SECTION 3: BILLING SUMMARY & FINANCIAL BREAKDOWN */}
              <div className="bg-emerald-950 text-white p-4 rounded-2xl space-y-3 shadow">
                <div className="flex justify-between items-center text-emerald-200 text-xs border-b border-emerald-800/80 pb-2">
                  <span className="font-bold uppercase tracking-wider text-[11px]">Items Stack Subtotal Amount:</span>
                  <span className="font-mono font-bold text-sm text-emerald-100">{formatPrice(poSubtotal)}</span>
                </div>

                <div className="grid grid-cols-3 gap-3 pt-1 text-xs">
                  <div className="space-y-1">
                    <div className="flex justify-between items-center">
                      <label className="block font-bold text-rose-300">Ongoing Bulk Discount (₹)</label>
                      <button
                        type="button"
                        onClick={() => setPoFormData(prev => ({ ...prev, discount: calculateAutoBulkDiscount(poSubtotal) }))}
                        className="text-[10px] font-black text-amber-300 hover:text-amber-200 bg-emerald-900 px-1.5 py-0.5 rounded border border-amber-400/40 flex items-center gap-0.5 shadow-xs transition"
                        title="Auto-calculate bulk discount tier based on subtotal"
                      >
                        ⚡ Auto Tier ({calculateAutoBulkDiscount(poSubtotal) > 0 ? formatPrice(calculateAutoBulkDiscount(poSubtotal)) : '0%'})
                      </button>
                    </div>

                    <input
                      type="number"
                      value={poFormData.discount}
                      onChange={e => setPoFormData({ ...poFormData, discount: Number(e.target.value) })}
                      placeholder="0"
                      className="w-full p-2 bg-emerald-900 border border-emerald-700 rounded-xl font-mono font-bold text-rose-300 focus:outline-none focus:ring-1 focus:ring-rose-400"
                    />

                    {/* Quick Discount Presets */}
                    <div className="flex flex-wrap gap-1 pt-1">
                      <button
                        type="button"
                        onClick={() => setPoFormData(prev => ({ ...prev, discount: Math.round(poSubtotal * 0.10) }))}
                        className="px-1.5 py-0.5 bg-rose-950 hover:bg-rose-900 border border-rose-700/60 text-rose-300 font-extrabold rounded text-[9px] transition"
                      >
                        10% ({formatPrice(Math.round(poSubtotal * 0.10))})
                      </button>
                      <button
                        type="button"
                        onClick={() => setPoFormData(prev => ({ ...prev, discount: Math.round(poSubtotal * 0.05) }))}
                        className="px-1.5 py-0.5 bg-rose-950 hover:bg-rose-900 border border-rose-700/60 text-rose-300 font-extrabold rounded text-[9px] transition"
                      >
                        5% ({formatPrice(Math.round(poSubtotal * 0.05))})
                      </button>
                      <button
                        type="button"
                        onClick={() => setPoFormData(prev => ({ ...prev, discount: Math.round(poSubtotal * 0.03) }))}
                        className="px-1.5 py-0.5 bg-rose-950 hover:bg-rose-900 border border-rose-700/60 text-rose-300 font-extrabold rounded text-[9px] transition"
                      >
                        3% ({formatPrice(Math.round(poSubtotal * 0.03))})
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-amber-300 mb-1">GST / Tax Amount (₹)</label>
                    <input
                      type="number"
                      value={poFormData.tax_amount}
                      onChange={e => setPoFormData({ ...poFormData, tax_amount: Number(e.target.value) })}
                      placeholder="0"
                      className="w-full p-2 bg-emerald-900 border border-emerald-700 rounded-xl font-mono font-bold text-amber-300 focus:outline-none focus:ring-1 focus:ring-amber-400"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-emerald-300 mb-1">Delivery & Freight Price (₹)</label>
                    <input
                      type="number"
                      value={poFormData.delivery_charge}
                      onChange={e => setPoFormData({ ...poFormData, delivery_charge: Number(e.target.value) })}
                      placeholder="0"
                      className="w-full p-2 bg-emerald-900 border border-emerald-700 rounded-xl font-mono font-bold text-emerald-300 focus:outline-none focus:ring-1 focus:ring-emerald-400"
                    />
                  </div>
                </div>

                <div className="flex justify-between items-center font-black text-sm text-amber-300 pt-2 border-t border-emerald-800">
                  <span className="text-xs uppercase tracking-wider text-amber-400">Final Delivery Price (Grand Total):</span>
                  <span className="text-lg font-mono font-black text-amber-300">{formatPrice(poGrandTotal)}</span>
                </div>
              </div>

              {/* SECTION 4: PAYMENT STATUS, DELIVERY & SOURCING NOTES */}
              <div className="bg-emerald-50/50 dark:bg-emerald-900/40 p-4 rounded-2xl border border-emerald-100 dark:border-emerald-800 space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="font-extrabold text-emerald-900 dark:text-amber-300 text-xs uppercase tracking-wider flex items-center gap-1.5">
                    <CreditCard className="w-4 h-4" /> Payment Status, Delivery & Sourcing Notes
                  </h4>

                  {/* Payment Status Badge Indicator */}
                  <span className={`px-3 py-1 rounded-full text-[10px] font-black tracking-wide ${
                    poFormData.paid_amount >= poGrandTotal
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200 border border-emerald-300'
                      : poFormData.paid_amount > 0
                      ? 'bg-amber-100 text-amber-900 dark:bg-amber-900/70 dark:text-amber-200 border border-amber-300'
                      : 'bg-rose-100 text-rose-800 dark:bg-rose-900/70 dark:text-rose-200 border border-rose-300'
                  }`}>
                    {poFormData.paid_amount >= poGrandTotal
                      ? '✓ FULL PAID'
                      : poFormData.paid_amount > 0
                      ? `PARTIAL (Due: ${formatPrice(poGrandTotal - poFormData.paid_amount)})`
                      : 'UNPAID PENDING'}
                  </span>
                </div>

                <div className="space-y-4">
                  
                  {/* Amount Paid with Auto Apply & Manual Entry */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="block font-bold text-gray-700 dark:text-emerald-200">Amount Paid (₹)</label>
                      <span className="text-[10px] font-semibold text-gray-500 dark:text-emerald-400">Auto apply or manual entry</span>
                    </div>

                    <input
                      type="number"
                      value={poFormData.paid_amount}
                      onChange={e => setPoFormData({ ...poFormData, paid_amount: Number(e.target.value) })}
                      placeholder="Enter paid amount manually..."
                      className="w-full p-2.5 bg-white dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-700 rounded-xl font-mono font-bold text-emerald-900 dark:text-emerald-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />

                    {/* Auto Apply Quick Buttons */}
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      <button
                        type="button"
                        onClick={() => setPoFormData({ ...poFormData, paid_amount: poGrandTotal })}
                        className="px-2.5 py-1 bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold rounded-lg text-[10px] flex items-center gap-1 shadow-xs transition"
                      >
                        ⚡ Full Paid (100% = {formatPrice(poGrandTotal)})
                      </button>
                      <button
                        type="button"
                        onClick={() => setPoFormData({ ...poFormData, paid_amount: Math.round(poGrandTotal / 2) })}
                        className="px-2.5 py-1 bg-amber-100 hover:bg-amber-200 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200 font-extrabold rounded-lg text-[10px] transition"
                      >
                        50% Advance ({formatPrice(Math.round(poGrandTotal / 2))})
                      </button>
                      <button
                        type="button"
                        onClick={() => setPoFormData({ ...poFormData, paid_amount: 0 })}
                        className="px-2 py-1 bg-gray-200 hover:bg-gray-300 dark:bg-emerald-900 text-gray-700 dark:text-emerald-300 font-bold rounded-lg text-[10px] transition"
                      >
                        Reset (₹0)
                      </button>
                    </div>
                  </div>

                  {/* Dual Notes Grid: Delivery Notes & Sourcing Notes */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                    
                    {/* Delivery Notes */}
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <label className="block font-bold text-gray-700 dark:text-emerald-200">Delivery & Logistics Notes</label>
                      </div>

                      <input
                        type="text"
                        placeholder="e.g. Call farmer 1 hour before dispatch"
                        value={poFormData.notes}
                        onChange={e => setPoFormData({ ...poFormData, notes: e.target.value })}
                        className="w-full p-2.5 bg-white dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-700 rounded-xl font-medium text-xs dark:text-emerald-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />

                      {/* Preset Delivery Chips */}
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {[
                          '🚚 Direct farm harvest pickup',
                          '📦 Cold-chain transport required',
                          '📞 Call farmer before dispatch'
                        ].map(preset => (
                          <button
                            key={preset}
                            type="button"
                            onClick={() => setPoFormData(prev => ({
                              ...prev,
                              notes: prev.notes ? `${prev.notes} | ${preset}` : preset
                            }))}
                            className="px-2 py-0.5 bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-900/80 dark:hover:bg-emerald-800 text-emerald-900 dark:text-emerald-200 text-[10px] font-bold rounded-md transition"
                          >
                            + {preset}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Sourcing & Origin Notes */}
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <label className="block font-bold text-amber-700 dark:text-amber-300">Sourcing & Origin Notes</label>
                      </div>

                      <input
                        type="text"
                        placeholder="e.g. Sourced from organic cooperative in Cumbum"
                        value={poFormData.sourcing_notes}
                        onChange={e => setPoFormData({ ...poFormData, sourcing_notes: e.target.value })}
                        className="w-full p-2.5 bg-white dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-700 rounded-xl font-medium text-xs text-amber-900 dark:text-amber-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />

                      {/* Preset Sourcing Chips */}
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {[
                          '🌾 Direct Farmer Co-op Sourcing',
                          '📍 Sourced from Theni & Cumbum Valley',
                          '📜 Organic Farm Verification Certificate Attached',
                          '🚜 Batch Harvested Fresh Today'
                        ].map(preset => (
                          <button
                            key={preset}
                            type="button"
                            onClick={() => setPoFormData(prev => ({
                              ...prev,
                              sourcing_notes: prev.sourcing_notes ? `${prev.sourcing_notes} | ${preset}` : preset
                            }))}
                            className="px-2 py-0.5 bg-amber-100 hover:bg-amber-200 dark:bg-amber-900/80 dark:hover:bg-amber-800 text-amber-900 dark:text-amber-200 text-[10px] font-bold rounded-md transition"
                          >
                            + {preset}
                          </button>
                        ))}
                      </div>
                    </div>

                  </div>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex justify-end space-x-3 pt-3 border-t border-emerald-100 dark:border-emerald-800">
                <button
                  type="button"
                  onClick={() => setShowPOModal(false)}
                  className="px-5 py-2.5 bg-gray-200 dark:bg-emerald-900 text-gray-800 dark:text-emerald-100 font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold rounded-xl shadow flex items-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  <span>{isNewPO ? 'Issue Purchase Order' : 'Save PO Changes'}</span>
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* Custom Delete Supplier Modal */}
      {deletingSupplier && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fadeIn">
          <div className="bg-white dark:bg-emerald-950 max-w-sm w-full p-6 rounded-3xl shadow-2xl border border-rose-200 dark:border-rose-900/60 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-rose-100 dark:bg-rose-900/60 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto border-4 border-rose-200 dark:border-rose-800">
              <ShieldAlert className="w-8 h-8" />
            </div>

            <div>
              <h3 className="text-lg font-black text-gray-900 dark:text-emerald-100">
                Remove Supplier Partner?
              </h3>
              <p className="text-xs text-gray-500 dark:text-emerald-300 mt-1 leading-relaxed">
                Deleting <strong className="text-rose-600 font-bold">{deletingSupplier.name}</strong> will remove them from procurement records.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeletingSupplier(null)}
                disabled={isDeleting}
                className="py-2.5 px-4 bg-gray-100 dark:bg-emerald-900 text-gray-700 dark:text-emerald-200 font-bold text-xs rounded-xl hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteSupplier}
                disabled={isDeleting}
                className="py-2.5 px-4 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs rounded-xl shadow-lg flex items-center justify-center space-x-1.5"
              >
                {isDeleting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                <span>Delete Partner</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Delete PO Modal */}
      {deletingPO && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fadeIn">
          <div className="bg-white dark:bg-emerald-950 max-w-sm w-full p-6 rounded-3xl shadow-2xl border border-rose-200 dark:border-rose-900/60 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-rose-100 dark:bg-rose-900/60 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto border-4 border-rose-200 dark:border-rose-800">
              <ShieldAlert className="w-8 h-8" />
            </div>

            <div>
              <h3 className="text-lg font-black text-gray-900 dark:text-emerald-100">
                Cancel / Delete PO Record?
              </h3>
              <p className="text-xs text-gray-500 dark:text-emerald-300 mt-1 leading-relaxed">
                Deleting Purchase Order <strong className="text-rose-600 font-mono font-bold">{deletingPO.po_number}</strong> ({formatPrice(deletingPO.total)}). This action cannot be undone.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeletingPO(null)}
                disabled={isDeleting}
                className="py-2.5 px-4 bg-gray-100 dark:bg-emerald-900 text-gray-700 dark:text-emerald-200 font-bold text-xs rounded-xl hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeletePO}
                disabled={isDeleting}
                className="py-2.5 px-4 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs rounded-xl shadow-lg flex items-center justify-center space-x-1.5"
              >
                {isDeleting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                <span>Delete PO</span>
              </button>
            </div>
          </div>
        </div>
      )}



      {/* View PO Modal */}
      {selectedPO && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white dark:bg-emerald-950 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-emerald-100 dark:border-emerald-800 space-y-4">
            <div className="flex justify-between items-center border-b border-emerald-100 dark:border-emerald-800 pb-3">
              <h3 className="font-bold text-emerald-950 dark:text-emerald-100 text-base font-mono">
                PO Record: {selectedPO.po_number}
              </h3>
              <button onClick={() => setSelectedPO(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-emerald-50 dark:bg-emerald-900/50 rounded-2xl flex justify-between items-center">
                <div>
                  <span className="text-gray-500 dark:text-emerald-300 block text-[10px]">Supplier Partner</span>
                  <span className="font-bold text-gray-900 dark:text-emerald-100 text-sm">{selectedPO.supplier?.name}</span>
                </div>
                <span className="px-2.5 py-1 bg-emerald-100 dark:bg-emerald-800 text-emerald-800 dark:text-amber-300 font-bold rounded-full text-[10px]">
                  {selectedPO.status}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-3 bg-gray-50 dark:bg-emerald-950 rounded-2xl text-xs border border-emerald-100 dark:border-emerald-800">
                <div>
                  <span className="text-gray-400 text-[10px] block">Items Subtotal</span>
                  <span className="font-mono font-bold text-gray-900 dark:text-emerald-100">
                    {formatPrice(selectedPO.subtotal)}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400 text-[10px] block">Bulk Discount</span>
                  <span className="font-mono font-bold text-rose-500">
                    {selectedPO.discount ? `- ${formatPrice(selectedPO.discount)}` : '₹0'}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400 text-[10px] block">Delivery & Tax</span>
                  <span className="font-mono font-bold text-emerald-600 dark:text-emerald-300">
                    + {formatPrice((selectedPO.delivery_charge || 0) + (selectedPO.tax_amount || 0))}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400 text-[10px] block font-bold">Final Delivery Price</span>
                  <span className="font-mono font-black text-amber-600 dark:text-amber-400 text-sm">
                    {formatPrice(selectedPO.total)}
                  </span>
                </div>
              </div>

              {selectedPO.notes && (
                <div className="p-2.5 bg-emerald-50 dark:bg-emerald-900/40 rounded-xl border border-emerald-100 dark:border-emerald-800 text-xs">
                  <span className="font-bold text-emerald-800 dark:text-emerald-300 block text-[10px]">Delivery & Logistics Notes:</span>
                  <p className="text-emerald-950 dark:text-emerald-100 mt-0.5">{selectedPO.notes}</p>
                </div>
              )}

              {selectedPO.sourcing_notes && (
                <div className="p-2.5 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-200 dark:border-amber-800 text-xs">
                  <span className="font-bold text-amber-800 dark:text-amber-300 block text-[10px]">Sourcing & Origin Notes:</span>
                  <p className="text-amber-900 dark:text-amber-200 mt-0.5">{selectedPO.sourcing_notes}</p>
                </div>
              )}
            </div>

            <div className="pt-2 flex justify-end">
              <button onClick={() => setSelectedPO(null)} className="px-5 py-2 bg-emerald-700 text-white font-bold rounded-xl">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= QUICK NEW PRODUCT MODAL (INSIDE PO STACK) ================= */}
      {showNewProductModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[60] flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white dark:bg-emerald-950 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-amber-300 dark:border-emerald-700 space-y-4">
            <div className="flex justify-between items-center border-b border-emerald-100 dark:border-emerald-800 pb-3">
              <div className="flex items-center space-x-2">
                <Package className="w-5 h-5 text-amber-500" />
                <h3 className="font-extrabold text-base text-gray-900 dark:text-emerald-100">
                  Enter New Product & Tamil Details
                </h3>
              </div>
              <button onClick={() => setShowNewProductModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveQuickNewProduct} className="space-y-3 text-xs">
              
              {/* Category Selection in English (Tamil) Format */}
              <div>
                <label className="block font-bold text-gray-700 dark:text-emerald-200 mb-1">
                  Category Name (English & Tamil) *
                </label>
                <select
                  required
                  value={newProductFormData.category_name}
                  onChange={e => setNewProductFormData({ ...newProductFormData, category_name: e.target.value })}
                  className="w-full p-2.5 bg-emerald-50/60 dark:bg-emerald-900 border border-emerald-200 dark:border-emerald-700 rounded-xl font-bold dark:text-emerald-100"
                >
                  {PRODUCT_CATEGORIES.map(cat => (
                    <option key={cat.id} value={cat.name}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Product English Name & Tamil Name */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 dark:text-emerald-200 mb-1">
                    Product Name (English) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Mapillai Samba Rice"
                    value={newProductFormData.name}
                    onChange={e => setNewProductFormData({ ...newProductFormData, name: e.target.value })}
                    className="w-full p-2.5 bg-white dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-700 rounded-xl font-bold dark:text-emerald-100"
                  />
                </div>

                <div>
                  <label className="block font-bold text-amber-700 dark:text-amber-300 mb-1">
                    Tamil Name (தயாரிப்பு பெயர்) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. மாப்பிள்ளை சம்பா அரிசி"
                    value={newProductFormData.tamil_name}
                    onChange={e => setNewProductFormData({ ...newProductFormData, tamil_name: e.target.value })}
                    className="w-full p-2.5 bg-white dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-700 rounded-xl font-bold text-amber-900 dark:text-amber-200"
                  />
                </div>
              </div>

              {/* SKU Code & Pack Size / Unit */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 dark:text-emerald-200 mb-1">SKU Code</label>
                  <input
                    type="text"
                    required
                    value={newProductFormData.sku}
                    onChange={e => setNewProductFormData({ ...newProductFormData, sku: e.target.value })}
                    className="w-full p-2 bg-white dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-700 rounded-xl font-mono font-bold dark:text-emerald-100"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 dark:text-emerald-200 mb-1">Pack Size</label>
                  <input
                    type="text"
                    placeholder="e.g. 1 kg / 500g"
                    value={newProductFormData.pack_size}
                    onChange={e => setNewProductFormData({ ...newProductFormData, pack_size: e.target.value })}
                    className="w-full p-2 bg-white dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-700 rounded-xl font-bold dark:text-emerald-100"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 dark:text-emerald-200 mb-1">Unit</label>
                  <select
                    value={newProductFormData.unit}
                    onChange={e => setNewProductFormData({ ...newProductFormData, unit: e.target.value })}
                    className="w-full p-2 bg-white dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-700 rounded-xl font-bold dark:text-emerald-100"
                  >
                    <option value="kg">kg</option>
                    <option value="g">gram</option>
                    <option value="L">Litre</option>
                    <option value="ml">ml</option>
                    <option value="pcs">Pcs</option>
                  </select>
                </div>
              </div>

              {/* Pricing Stack */}
              <div className="grid grid-cols-3 gap-3 p-3 bg-emerald-50 dark:bg-emerald-900/40 rounded-2xl border border-emerald-100 dark:border-emerald-800">
                <div>
                  <label className="block font-bold text-emerald-900 dark:text-emerald-200 mb-1">Purchase Price (₹)</label>
                  <input
                    type="number"
                    required
                    value={newProductFormData.purchase_price}
                    onChange={e => setNewProductFormData({ ...newProductFormData, purchase_price: Number(e.target.value) })}
                    className="w-full p-2 bg-white dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-700 rounded-xl font-mono font-bold dark:text-emerald-100"
                  />
                </div>

                <div>
                  <label className="block font-bold text-emerald-900 dark:text-emerald-200 mb-1">Selling Price (₹)</label>
                  <input
                    type="number"
                    required
                    value={newProductFormData.selling_price}
                    onChange={e => setNewProductFormData({ ...newProductFormData, selling_price: Number(e.target.value) })}
                    className="w-full p-2 bg-white dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-700 rounded-xl font-mono font-bold dark:text-emerald-100"
                  />
                </div>

                <div>
                  <label className="block font-bold text-emerald-900 dark:text-emerald-200 mb-1">MRP (₹)</label>
                  <input
                    type="number"
                    required
                    value={newProductFormData.mrp}
                    onChange={e => setNewProductFormData({ ...newProductFormData, mrp: Number(e.target.value) })}
                    className="w-full p-2 bg-white dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-700 rounded-xl font-mono font-bold dark:text-emerald-100"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t border-emerald-100 dark:border-emerald-800">
                <button
                  type="button"
                  onClick={() => setShowNewProductModal(false)}
                  className="px-4 py-2 bg-gray-200 dark:bg-emerald-900 text-gray-800 dark:text-emerald-100 font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-gradient-to-r from-emerald-700 to-emerald-800 hover:from-emerald-800 hover:to-emerald-900 text-white font-extrabold rounded-xl shadow flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4 text-amber-300" />
                  <span>Create & Add to Stack</span>
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* EXPORT FORMAT MODAL */}
      <ExportFormatModal
        isOpen={showExportModal}
        title={`Export ${activeTab === 'SUPPLIERS' ? 'Suppliers Directory' : 'Purchase Orders Stack'}`}
        description={`Select export format for current ${activeTab === 'SUPPLIERS' ? 'supplier' : 'purchase order'} list:`}
        totalRecords={activeTab === 'SUPPLIERS' ? filteredSuppliers.length : filteredPOs.length}
        onClose={() => setShowExportModal(false)}
        onExport={handleExecuteSupplierExport}
      />

      {/* REAL ANIMATED REFRESH SPINNER MODAL */}
      <RefreshSpinnerModal
        isOpen={isRefreshing}
        title="Refreshing Suppliers & Procurement..."
        subtitle="Syncing farmer partners, district lists & PO statuses..."
        moduleName="Procurement Sourcing"
        onComplete={() => {
          setIsRefreshing(false);
          setCurrentPage(1);
          toast.success('🔄 Procurement Data Refreshed!');
          addNotification({
            title: 'Suppliers & PO Stack Synced',
            message: 'Refreshed supplier directory & purchase orders.',
            type: 'info',
            sourceModule: 'Procurement Sourcing'
          });
        }}
      />

    </div>
  );
}
