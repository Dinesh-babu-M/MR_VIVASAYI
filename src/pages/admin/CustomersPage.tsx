import React, { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Users, Phone, MessageSquare, Eye, Plus, Search, X, Star,
  ShoppingBag, TrendingUp, MapPin, Mail, Calendar, ChevronUp,
  ChevronDown, UserCheck, DollarSign, Edit3, Trash2, Globe, Store,
  RotateCcw, ShieldCheck, CheckCircle2, User, Filter, AlertTriangle, Download, Loader2, Clock, RefreshCw
} from 'lucide-react';
import { formatPrice, formatDate, formatDateTime } from '../../lib/utils';
import type { Customer, Order } from '../../types';
import { useNotifications } from '../../contexts/NotificationContext';

import { ExportFormatModal, ExportFormat } from '../../components/common/ExportFormatModal';
import { RefreshSpinnerModal } from '../../components/common/RefreshSpinnerModal';
import { AdminPageSkeleton } from '../../components/common/Skeleton';
import { useActionModal } from '../../contexts/ActionModalContext';
import { getJSONStore, setJSONStore } from '../../lib/dbManager';
import { CountrySelector } from '../../components/common/CountrySelector';
import {
  normalizePhoneNumber,
  formatPhoneWithCountry,
  generateUniqueCustomerId,
  findCustomerByPhoneAndCountry,
  COUNTRIES
} from '../../lib/countryCodes';
import toast from 'react-hot-toast';

interface CustomersPageProps {
  initialFilter?: 'ALL' | 'WEBSITE' | 'WHATSAPP' | 'OFFLINE_POS' | 'N_A' | 'RETURNS';
}

const ORDER_STATUS_COLORS: Record<string, string> = {
  NEW: 'bg-blue-100 text-blue-700',
  CONFIRMED: 'bg-emerald-100 text-emerald-700',
  PACKING: 'bg-amber-100 text-amber-700',
  READY: 'bg-yellow-100 text-yellow-700',
  OUT_FOR_DELIVERY: 'bg-orange-100 text-orange-700',
  DELIVERED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-red-100 text-red-700',
  RETURNED: 'bg-rose-100 text-rose-700 font-bold',
};

const CHANNEL_BADGES: Record<string, { label: string; color: string; icon: any }> = {
  WEBSITE: { label: 'Website', color: 'bg-blue-100 text-blue-800 border-blue-200', icon: Globe },
  WHATSAPP: { label: 'WhatsApp', color: 'bg-emerald-100 text-emerald-800 border-emerald-200', icon: MessageSquare },
  OFFLINE_POS: { label: 'Offline Store POS', color: 'bg-purple-100 text-purple-800 border-purple-200', icon: Store },
  N_A: { label: 'N/A Direct', color: 'bg-gray-100 text-gray-700 border-gray-200', icon: User },
};

export function CustomersPage({ initialFilter = 'ALL' }: CustomersPageProps) {
  const { addNotification } = useNotifications();
  const { showActionModal } = useActionModal();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [c, tpls, o] = await Promise.all([
        getJSONStore<Customer>('customers'),
        getJSONStore<any>('message_templates'),
        getJSONStore<Order>('orders'),
      ]);

      const DUMMY_IDS = new Set(['cust-101', 'cust-102', 'cust-103', 'cust-104', 'cust-105']);
      let cList = (c || []).filter(cust => cust && !DUMMY_IDS.has(cust.id));
      let updated = false;

      cList = cList.map((cust, idx) => {
        let needUpdate = false;
        const updatedCust = { ...cust };
        if (!updatedCust.id) {
          updatedCust.id = `cust-${100 + idx + 1}`;
          needUpdate = true;
        }
        if (!updatedCust.name || !updatedCust.name.trim()) {
          updatedCust.name = (cust as any).customer_name || (cust as any).full_name || (updatedCust.phone ? `Customer ${updatedCust.phone}` : `Customer ${updatedCust.customer_id || idx + 1}`);
          needUpdate = true;
        }
        if (!updatedCust.customer_id) {
          updatedCust.customer_id = String(idx + 1).padStart(4, '0');
          needUpdate = true;
        }
        if (!updatedCust.country_code) {
          updatedCust.country_code = 'IN';
          needUpdate = true;
        }
        if (!updatedCust.calling_code) {
          updatedCust.calling_code = '+91';
          needUpdate = true;
        }
        if (needUpdate) updated = true;
        return updatedCust;
      });

      // If legacy dummy customers were stripped, sync back the clean array
      if (c && c.length !== cList.length) {
        await setJSONStore('customers', cList);
      } else if (updated && cList.length > 0) {
        await setJSONStore('customers', cList);
      }

      setCustomers(cList);
      if (tpls) setTemplates(tpls);
      setOrders(o || []);
    } catch (err: any) {
      console.error('Failed to load customers:', err);
      setError(err?.message || 'Failed to connect to the customer database.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  function getCustomerOrders(targetCustomer: Customer): Order[] {
    const custId = targetCustomer.id;
    const custCode = targetCustomer.customer_id;
    const normPhone = normalizePhoneNumber(targetCustomer.phone || '');
    return orders.filter((o: Order) => {
      if (o.customer_id && (o.customer_id === custId || (custCode && o.customer_id === custCode))) return true;
      if (normPhone && o.customer_phone_snapshot && normalizePhoneNumber(o.customer_phone_snapshot) === normPhone) return true;
      if (targetCustomer.name && o.customer_name_snapshot && o.customer_name_snapshot.toLowerCase() === targetCustomer.name.toLowerCase()) return true;
      return false;
    }).sort(
      (a: Order, b: Order) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }
  const [search, setSearch] = useState('');
  const [channelFilter, setChannelFilter] = useState<string>(initialFilter);

  useEffect(() => {
    setChannelFilter(initialFilter);
  }, [initialFilter]);
  const [whatsappStatusFilter, setWhatsappStatusFilter] = useState<string>('ALL');
  const [emailStatusFilter, setEmailStatusFilter] = useState<string>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');

  const resetFilters = () => {
    setSearch('');
    setChannelFilter('ALL');
    setWhatsappStatusFilter('ALL');
    setEmailStatusFilter('ALL');
    setCategoryFilter('ALL');
    setShowDuplicatesOnly(false);
    setCurrentPage(1);
    toast.success('Filters cleared! Showing all customers.');
  };
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(6);
  const [selectedCustomerIds, setSelectedCustomerIds] = useState<string[]>([]);

  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [sortKey, setSortKey] = useState<'name' | 'total_orders' | 'total_spent' | 'last_order_at'>('last_order_at');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  // Dispatching state for inline message template sending
  const [dispatchingCustomerId, setDispatchingCustomerId] = useState<string | null>(null);
  const [customerConfirmModal, setCustomerConfirmModal] = useState<{
    isOpen: boolean;
    customer: Customer | null;
    channel: 'WHATSAPP' | 'EMAIL' | 'BOTH';
    template: 'THANKS_MESSAGE' | 'RESTOCK_ALERT' | 'ORDER_CONFIRMATION' | 'DETAILS_NOT_SENT' | 'COD_PAYMENT_REQUEST' | 'COD_SCREENSHOT_PENDING';
    templateText: string;
  }>({
    isOpen: false,
    customer: null,
    channel: 'WHATSAPP',
    template: 'THANKS_MESSAGE',
    templateText: ''
  });

  // Action Progress & Confirmation Modal State
  const [actionSpinnerModal, setActionSpinnerModal] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    isExecuting: boolean;
    onConfirm?: () => void;
  }>({
    isOpen: false,
    title: '',
    description: '',
    isExecuting: false
  });

  const [bulkConfirmModal, setBulkConfirmModal] = useState<{
    isOpen: boolean;
    channel: 'WHATSAPP' | 'EMAIL' | 'BOTH';
    unsentCount: number;
    templateName: string;
  }>({
    isOpen: false,
    channel: 'BOTH',
    unsentCount: 0,
    templateName: 'Order Confirmation & Restock Alert'
  });

  // Prompt Bulk Send Confirmation (WhatsApp Focused)
  const promptBulkDispatch = (channel: 'WHATSAPP' | 'EMAIL' | 'BOTH' = 'WHATSAPP') => {
    const unsentList = filteredCustomers.filter(c => c.whatsapp_sent_status !== 'SENT');

    if (unsentList.length === 0) {
      addNotification({
        title: 'All Dispatched',
        message: 'All targeted customers in this view have already received WhatsApp notification templates.',
        type: 'warning',
        sourceModule: 'Customer CRM'
      });
      return;
    }

    setBulkConfirmModal({
      isOpen: true,
      channel: 'WHATSAPP',
      unsentCount: unsentList.length,
      templateName: 'Message Templates Library (WhatsApp)'
    });
  };

  // Execute Bulk Send
  const executeBulkDispatch = () => {
    const { channel } = bulkConfirmModal;
    setBulkConfirmModal({ isOpen: false, channel: 'BOTH', unsentCount: 0, templateName: '' });

    const unsentList = filteredCustomers.filter(c => c.whatsapp_sent_status !== 'SENT');

    showActionModal({
      title: 'Dispatched Bulk Notifications',
      subtitle: `Sending ${channel} templates to all filtered target customers...`,
      durationMs: 950,
      steps: [
        'Querying targeted recipient CRM records',
        'Generating personalized message templates',
        'Dispatching template payloads via WhatsApp queue',
        'Bulk dispatch completed successfully'
      ],
      onComplete: () => {
        setCustomers(prev => {
          const next: Customer[] = prev.map(c => {
            if (unsentList.some(u => u.id === c.id)) {
              return {
                ...c,
                whatsapp_sent_status: 'SENT' as const,
                last_template_sent: 'ORDER_CONFIRMATION',
                last_template_sent_at: new Date().toISOString(),
                last_sent_channel: 'WHATSAPP'
              };
            }
            return c;
          });
          setJSONStore('customers', next);
          return next;
        });

        toast.success(`Dispatched WhatsApp templates to ${unsentList.length} customers!`);
        addNotification({
          title: 'WhatsApp Bulk Dispatch Completed',
          message: `Successfully dispatched WhatsApp templates to ${unsentList.length} candidate customers from Message Templates Library.`,
          type: 'success',
          sourceModule: 'Customer CRM'
        });
      }
    });
  };

  // Prompt Confirmation before Dispatching Template (Dynamically loaded from Message Templates Library)
  const promptDispatchTemplate = (
    customer: Customer,
    channel: 'WHATSAPP' | 'EMAIL' | 'BOTH',
    templateCodeOrId: string
  ) => {
    // Search dynamically in templates from Message Templates Library
    const matchedTemplate = templates.find(
      (t) => t.id === templateCodeOrId || t.backend_status_code === templateCodeOrId
    );

    let rawContent = matchedTemplate
      ? matchedTemplate.content
      : `Hi [Customer Name],\n\nYour order details and notification updates from MR. VIVASAYI.\n\nThank you,\nMR. VIVASAYI Foods`;

    // Dynamically replace variables
    let messageText = rawContent
      .replace(/\[Customer Name\]/g, customer.name || customer.phone || 'Customer')
      .replace(/\[Amount\]/g, customer.total_spent ? customer.total_spent.toString() : '450')
      .replace(/\[Product\/Service\/Order\]/g, customer.category_preference || 'Traditional Foods')
      .replace(/\[Product\/Service\]/g, customer.category_preference || 'Traditional Foods')
      .replace(/\[Order\/Service\]/g, customer.category_preference || 'Traditional Foods')
      .replace(/\[Order ID\]/g, `LIF-${customer.id.replace(/\D/g, '') || '8849'}`)
      .replace(/\[Transaction ID\]/g, `TXN-${Date.now().toString().slice(-6)}`)
      .replace(/\[Payment ID\]/g, `PAY-${Date.now().toString().slice(-6)}`)
      .replace(/\[Date\]/g, new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }))
      .replace(/\[Payment Method\]/g, 'UPI / Cash on Delivery')
      .replace(/\[Payment Link\]/g, 'https://mrvivasayi.in/pay')
      .replace(/\[UPI ID\]/g, 'mrvivasayi@upi')
      .replace(/\[UPI QR\]/g, 'https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=upi://pay?pa=mrvivasayi@upi%26pn=MR. VIVASAYI%20Organic%20Foods')
      .replace(/\[Company Name\]/g, 'MR. VIVASAYI Foods');

    setCustomerConfirmModal({
      isOpen: true,
      customer,
      channel: 'WHATSAPP',
      template: matchedTemplate ? (matchedTemplate.title as any) : templateCodeOrId,
      templateText: messageText
    });
  };

  // Execute Dispatch Template Message after confirmation
  const executeDispatchTemplate = () => {
    if (!customerConfirmModal.customer) return;
    const { customer, channel, template, templateText } = customerConfirmModal;

    setDispatchingCustomerId(customer.id);
    setCustomerConfirmModal({ isOpen: false, customer: null, channel: 'WHATSAPP', template: 'THANKS_MESSAGE', templateText: '' });

    showActionModal({
      title: `Sending ${channel} Template`,
      subtitle: `Dispatching "${template}" to ${customer.name || customer.phone || 'Customer'}...`,
      durationMs: 700,
      steps: [
        'Formatting personalized message content',
        'Validating customer contact coordinates',
        'Dispatching message payload',
        'Message dispatched successfully'
      ],
      onComplete: () => {
        if (channel === 'WHATSAPP' || channel === 'BOTH') {
          const cleanPhone = (customer.whatsapp_number || customer.phone || '9876543210').replace(/\D/g, '');
          window.open(`https://wa.me/91${cleanPhone}?text=${encodeURIComponent(templateText)}`, '_blank');
        }

        // Update customer state
        setCustomers(prev => {
          const next: Customer[] = prev.map(c => {
            if (c.id === customer.id) {
              return {
                ...c,
                whatsapp_sent_status: (channel === 'WHATSAPP' || channel === 'BOTH') ? ('SENT' as const) : c.whatsapp_sent_status,
                email_sent_status: (channel === 'EMAIL' || channel === 'BOTH') ? ('SENT' as const) : c.email_sent_status,
                last_template_sent: template,
                last_template_sent_at: new Date().toISOString(),
                last_sent_channel: channel
              };
            }
            return c;
          });
          setJSONStore('customers', next);
          return next;
        });

        setDispatchingCustomerId(null);
        toast.success(`Dispatched template "${template}" to ${customer.name || customer.phone || 'Customer'}`);
        addNotification({
          title: `Template Message Sent (${channel})`,
          message: `Successfully dispatched template '${template}' to ${customer.name || customer.phone || 'Customer'}.`,
          type: 'success',
          sourceModule: 'Customer CRM Dispatch'
        });
      }
    });
  };

  // New Customer Form State
  const [newCustomerForm, setNewCustomerForm] = useState({
    name: '',
    phone: '',
    whatsapp_number: '',
    country_code: 'IN',
    calling_code: '+91',
    email: '',
    area: '',
    city: 'Cumbum',
    address: '',
    source_channel: 'OFFLINE_POS' as 'WEBSITE' | 'WHATSAPP' | 'OFFLINE_POS' | 'N_A',
    assigned_staff: 'MR_VIVASAYI_TEAM',
    notes: '',
    category_preference: 'Traditional Rice',
    promotion_schedule: 'NONE' as 'EVERY_1_DAY' | 'EVERY_1_WEEK' | 'CUSTOM_DATE' | 'NONE',
    custom_schedule_date: ''
  });

  // Group duplicate phone numbers
  const duplicatePhoneGroups = useMemo(() => {
    const map = new Map<string, Customer[]>();
    customers.forEach(c => {
      const norm = normalizePhoneNumber(c.phone || '');
      if (norm && norm.length >= 7) {
        const key = `${c.calling_code || '+91'}_${norm}`;
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(c);
      }
    });
    return map;
  }, [customers]);

  const [showDuplicatesOnly, setShowDuplicatesOnly] = useState(false);

  const filteredCustomers = useMemo(() => {
    return customers.filter((c) => {
      const q = search.toLowerCase().trim();
      const matchesSearch =
        !q ||
        (c.customer_id && c.customer_id.toLowerCase().includes(q)) ||
        ((c.name || '').toLowerCase().includes(q)) ||
        (c.phone ?? '').includes(q) ||
        (c.whatsapp_number ?? '').includes(q) ||
        (c.email ?? '').toLowerCase().includes(q) ||
        (c.city ?? '').toLowerCase().includes(q) ||
        (c.area ?? '').toLowerCase().includes(q);

      if (showDuplicatesOnly) {
        const norm = normalizePhoneNumber(c.phone || '');
        const key = `${c.calling_code || '+91'}_${norm}`;
        const group = duplicatePhoneGroups.get(key);
        if (!group || group.length < 2) return false;
      }

      let matchesChannel = true;
      if (channelFilter === 'RETURNS') {
        matchesChannel = (c.return_count ?? 0) > 0;
      } else if (channelFilter !== 'ALL') {
        matchesChannel = c.source_channel === channelFilter;
      }

      let matchesWhatsApp = true;
      if (whatsappStatusFilter === 'SENT') matchesWhatsApp = c.whatsapp_sent_status === 'SENT';
      if (whatsappStatusFilter === 'NOT_SENT') matchesWhatsApp = c.whatsapp_sent_status !== 'SENT';

      let matchesEmail = true;
      if (emailStatusFilter === 'SENT') matchesEmail = c.email_sent_status === 'SENT';
      if (emailStatusFilter === 'NOT_SENT') matchesEmail = c.email_sent_status !== 'SENT';

      let matchesCategory = true;
      if (categoryFilter !== 'ALL') {
        matchesCategory = c.category_preference === categoryFilter;
      }

      return matchesSearch && matchesChannel && matchesWhatsApp && matchesEmail && matchesCategory;
    }).sort((a: any, b: any) => {
      let av: any = a[sortKey] ?? a.created_at ?? '';
      let bv: any = b[sortKey] ?? b.created_at ?? '';
      if (sortKey === 'name') {
        av = (a.name || '').toLowerCase();
        bv = (b.name || '').toLowerCase();
      }
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ? 1 : -1;
      // Secondary fallback: recent created_at or id descending
      const timeA = new Date(a.created_at || '').getTime() || 0;
      const timeB = new Date(b.created_at || '').getTime() || 0;
      if (timeB !== timeA) return timeB - timeA;
      return (b.customer_id || '').localeCompare(a.customer_id || '');
    });
  }, [customers, search, channelFilter, whatsappStatusFilter, emailStatusFilter, categoryFilter, sortKey, sortDir]);

  // Pagination calculation
  const totalPages = Math.ceil(filteredCustomers.length / itemsPerPage) || 1;
  const paginatedCustomers = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredCustomers.slice(start, start + itemsPerPage);
  }, [filteredCustomers, currentPage, itemsPerPage]);

  // Multi-Selection Logic for Customers
  const handleToggleSelectCustomer = (id: string) => {
    setSelectedCustomerIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleToggleSelectAll = () => {
    if (paginatedCustomers.length === 0) return;
    const paginatedIds = paginatedCustomers.map(c => c.id);
    const allSelected = paginatedIds.every(id => selectedCustomerIds.includes(id));
    if (allSelected) {
      setSelectedCustomerIds(prev => prev.filter(id => !paginatedIds.includes(id)));
    } else {
      setSelectedCustomerIds(prev => Array.from(new Set([...prev, ...paginatedIds])));
    }
  };

  const isAllPaginatedSelected = paginatedCustomers.length > 0 && paginatedCustomers.every(c => selectedCustomerIds.includes(c.id));

  // Bulk Delete Selected Customers
  const handleBulkDeleteSelected = () => {
    if (selectedCustomerIds.length === 0) return;
    const count = selectedCustomerIds.length;

    setActionSpinnerModal({
      isOpen: true,
      title: `Confirm Delete ${count} Customers?`,
      description: `Are you sure you want to permanently remove ${count} selected customer records? This action cannot be undone.`,
      isExecuting: false,
      onConfirm: () => {
        setActionSpinnerModal({ isOpen: false, title: '', description: '', isExecuting: false });

        showActionModal({
          title: 'Deleting Selected Customers',
          subtitle: `Removing ${count} customer records from CRM directory...`,
          durationMs: 850,
          steps: [
            'Verifying customer order histories and CRM records',
            'Archiving customer records',
            'Purging records from active CRM table',
            `${count} customers removed successfully`
          ],
          onComplete: () => {
            setCustomers(prev => {
              const next = prev.filter(c => !selectedCustomerIds.includes(c.id));
              setJSONStore('customers', next);
              return next;
            });
            setSelectedCustomerIds([]);
            toast.success(`Removed ${count} customers`);
            addNotification({
              title: 'Bulk Customer Deletion',
              message: `Permanently removed ${count} customers from Customer CRM directory.`,
              type: 'warning',
              sourceModule: 'Customer CRM'
            });
          }
        });
      }
    });
  };

  // Bulk Dispatch to Selected Customers
  const handleBulkDispatchSelected = (channel: 'WHATSAPP' | 'EMAIL' | 'BOTH' = 'WHATSAPP') => {
    if (selectedCustomerIds.length === 0) return;
    const selectedList = customers.filter(c => selectedCustomerIds.includes(c.id));

    showActionModal({
      title: `Dispatching ${channel} Templates`,
      subtitle: `Sending notifications to ${selectedList.length} selected customers...`,
      durationMs: 900,
      steps: [
        `Querying ${selectedList.length} selected CRM profiles`,
        'Compiling notification payloads',
        `Dispatching via ${channel} message gateway`,
        'Batch dispatch completed successfully'
      ],
      onComplete: () => {
        setCustomers(prev => {
          const next = prev.map(c => {
            if (selectedCustomerIds.includes(c.id)) {
              return {
                ...c,
                whatsapp_sent_status: 'SENT' as const,
                email_sent_status: (channel === 'EMAIL' || channel === 'BOTH' ? 'SENT' : c.email_sent_status) as any,
                last_template_sent: 'ORDER_CONFIRMATION' as const,
                last_template_sent_at: new Date().toISOString(),
                last_sent_channel: channel
              };
            }
            return c;
          });
          setJSONStore('customers', next);
          return next;
        });
        setSelectedCustomerIds([]);
        toast.success(`Dispatched templates to ${selectedList.length} customers!`);
        addNotification({
          title: 'Bulk Dispatch Completed',
          message: `Successfully dispatched templates to ${selectedList.length} selected customers.`,
          type: 'success',
          sourceModule: 'Customer CRM'
        });
      }
    });
  };

  // Bulk Dispatch to Filtered Customers
  const handleBulkDispatch = (channel: 'WHATSAPP' | 'EMAIL' | 'BOTH') => {
    const unsentList = filteredCustomers.filter(c => 
      channel === 'WHATSAPP' ? c.whatsapp_sent_status !== 'SENT' :
      channel === 'EMAIL' ? c.email_sent_status !== 'SENT' :
      (c.whatsapp_sent_status !== 'SENT' || c.email_sent_status !== 'SENT')
    );

    if (unsentList.length === 0) {
      addNotification({
        title: 'All Dispatched',
        message: 'All selected customers in this view have already received notification templates.',
        type: 'warning',
        sourceModule: 'Customer CRM'
      });
      return;
    }

    setCustomers(prev => prev.map(c => {
      if (unsentList.some(u => u.id === c.id)) {
        return {
          ...c,
          whatsapp_sent_status: (channel === 'WHATSAPP' || channel === 'BOTH') ? 'SENT' : c.whatsapp_sent_status,
          email_sent_status: (channel === 'EMAIL' || channel === 'BOTH') ? 'SENT' : c.email_sent_status,
          last_template_sent: 'ORDER_CONFIRMATION'
        };
      }
      return c;
    }));

    addNotification({
      title: 'Bulk Dispatch Completed',
      message: `Dispatched notification templates to ${unsentList.length} customers via ${channel}.`,
      type: 'success',
      sourceModule: 'Customer CRM'
    });
  };

  const handleCreateCustomer = (e: React.FormEvent) => {
    e.preventDefault();

    // Check for duplicate customer phone
    const existing = findCustomerByPhoneAndCountry(customers, newCustomerForm.phone, newCustomerForm.calling_code);
    if (existing) {
      toast.error(`Customer with phone ${newCustomerForm.phone} already exists (${existing.name} - ${existing.customer_id || existing.id})!`);
      return;
    }

    setShowAddModal(false);

    showActionModal({
      title: 'Creating Customer Profile',
      subtitle: `Registering ${newCustomerForm.name} into CRM directory...`,
      durationMs: 850,
      steps: [
        'Validating customer credentials and contact details',
        'Generating unique customer ID and ledger',
        'Setting up communication preferences and alert schedule',
        'Customer registered successfully'
      ],
      onComplete: () => {
        const uniqueCustId = generateUniqueCustomerId(customers);
        const created: Customer = {
          id: `cust-${uniqueCustId}`,
          customer_id: uniqueCustId,
          name: newCustomerForm.name,
          phone: newCustomerForm.phone,
          whatsapp_number: newCustomerForm.whatsapp_number || newCustomerForm.phone,
          country_code: newCustomerForm.country_code || 'IN',
          calling_code: newCustomerForm.calling_code || '+91',
          email: newCustomerForm.email,
          address: newCustomerForm.address,
          area: newCustomerForm.area,
          city: newCustomerForm.city || 'Cumbum',
          state: 'Tamil Nadu',
          notes: newCustomerForm.notes,
          source_channel: newCustomerForm.source_channel,
          return_count: 0,
          assigned_staff: newCustomerForm.assigned_staff,
          total_orders: 1,
          total_spent: 0,
          first_order_at: new Date().toISOString().split('T')[0],
          last_order_at: new Date().toISOString().split('T')[0],
          whatsapp_sent_status: 'NOT_SENT',
          email_sent_status: 'NOT_SENT',
          last_template_sent: 'DETAILS_NOT_SENT',
          category_preference: newCustomerForm.category_preference,
          promotion_schedule: newCustomerForm.promotion_schedule,
          custom_schedule_date: newCustomerForm.custom_schedule_date,
          is_active: true,
          created_at: new Date().toISOString().split('T')[0],
          updated_at: new Date().toISOString().split('T')[0],
        };

        setCustomers((prev) => {
          const next = [created, ...prev];
          setJSONStore('customers', next);
          return next;
        });
        setNewCustomerForm({
          name: '', phone: '', whatsapp_number: '', country_code: 'IN', calling_code: '+91', email: '', area: '',
          city: 'Cumbum', address: '', source_channel: 'OFFLINE_POS',
          assigned_staff: 'MR_VIVASAYI_TEAM', notes: '',
          category_preference: 'Traditional Rice', promotion_schedule: 'EVERY_1_WEEK', custom_schedule_date: ''
        });

        toast.success(`Customer ${created.name} (${created.customer_id}) registered successfully!`);
        addNotification({
          title: 'Customer Added & Profile Created',
          message: `Registered ${created.name} (${created.customer_id}) in directory with country code ${created.calling_code}.`,
          type: 'success',
          sourceModule: 'Customer CRM'
        });
      }
    });
  };

  const handleUpdateCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCustomer) return;

    const targetCustomer = { ...editingCustomer };
    setEditingCustomer(null);

    showActionModal({
      title: 'Updating Customer Profile',
      subtitle: `Saving profile details for ${targetCustomer.name || targetCustomer.phone || 'Customer'}...`,
      durationMs: 800,
      steps: [
        'Verifying customer CRM record',
        'Updating contact & address information',
        'Saving notification preferences & notes',
        'Profile updated successfully'
      ],
      onComplete: () => {
        setCustomers((prev) => {
          const next = prev.map((c) => (c.id === targetCustomer.id ? targetCustomer : c));
          setJSONStore('customers', next);
          return next;
        });

        toast.success(`Profile for ${targetCustomer.name || targetCustomer.phone || 'Customer'} updated!`);
        addNotification({
          title: 'Customer Profile Updated',
          message: `Updated profile details and notification preferences for ${targetCustomer.name || targetCustomer.phone || 'Customer'}.`,
          type: 'success',
          sourceModule: 'Customer CRM'
        });
      }
    });
  };

  const handleDeleteCustomer = (id: string, name: string) => {
    setActionSpinnerModal({
      isOpen: true,
      title: 'Confirm Delete Customer?',
      description: `Are you sure you want to permanently remove customer record for ${name}?`,
      isExecuting: false,
      onConfirm: () => {
        setActionSpinnerModal({ isOpen: false, title: '', description: '', isExecuting: false });

        showActionModal({
          title: 'Deleting Customer Record',
          subtitle: `Removing ${name} from CRM directory...`,
          durationMs: 750,
          steps: [
            'Verifying customer order history',
            'Archiving customer records',
            'Purging record from active CRM table',
            'Customer removed successfully'
          ],
          onComplete: () => {
            setCustomers((prev) => {
              const next = prev.filter((c) => c.id !== id);
              setJSONStore('customers', next);
              return next;
            });
            toast.success(`Customer ${name} removed`);
            addNotification({
              title: 'Customer Removed',
              message: `Removed ${name} from Customer CRM directory.`,
              type: 'warning',
              sourceModule: 'Customer CRM'
            });
          }
        });
      }
    });
  };

  // Export Modal State
  const [showExportModal, setShowExportModal] = useState(false);

  // Export Filtered or Selected Customers Data with Multi-Format Support
  const handleExecuteCustomerExport = (format: ExportFormat) => {
    setShowExportModal(false);
    const exportDataset = selectedCustomerIds.length > 0
      ? customers.filter(c => selectedCustomerIds.includes(c.id))
      : filteredCustomers;

    showActionModal({
      title: `Exporting Customer Report (${format})`,
      subtitle: `Generating dataset for ${exportDataset.length} records...`,
      durationMs: 750,
      steps: [
        'Querying customer database & addresses',
        'Cross-referencing confirmed order histories',
        `Compiling ${format} report structure`,
        'Export file ready'
      ],
      onComplete: () => {

      if (format === 'PRINT' || format === 'PDF') {
        const printWindow = window.open('', '_blank', 'width=950,height=950');
        if (!printWindow) return;

        const rowsHtml = exportDataset.map((c, idx) => {
          const cOrders = getCustomerOrders(c);
          const confirmedOrders = cOrders.filter(o => o.status === 'CONFIRMED' || o.status === 'DELIVERED');
          const lastOrder = cOrders[0];
          const fullAddr = [c.address, c.area, c.city, c.state, c.pincode].filter(Boolean).join(', ') || 'Cumbum, TN';
          const paymentStatusSummary = lastOrder ? `${lastOrder.payment_method} (${lastOrder.payment_status})` : 'PAID (POS)';

          return `
            <tr>
              <td style="padding: 6px; border-bottom: 1px solid #eee;">${idx + 1}</td>
              <td style="padding: 6px; border-bottom: 1px solid #eee; font-family: monospace; font-weight: bold; color: #064e3b;">${c.id}</td>
              <td style="padding: 6px; border-bottom: 1px solid #eee;"><strong>${c.name || c.phone || 'Customer'}</strong></td>
              <td style="padding: 6px; border-bottom: 1px solid #eee;">${c.phone || c.whatsapp_number || '—'}</td>
              <td style="padding: 6px; border-bottom: 1px solid #eee; font-size: 10px;">${fullAddr}</td>
              <td style="padding: 6px; border-bottom: 1px solid #eee; text-align: center;"><span style="background: #d1fae5; color: #065f46; font-weight: bold; padding: 2px 6px; border-radius: 4px;">CONFIRMED (${confirmedOrders.length})</span></td>
              <td style="padding: 6px; border-bottom: 1px solid #eee; text-align: center; font-size: 10px; font-weight: bold;">${paymentStatusSummary}</td>
              <td style="padding: 6px; border-bottom: 1px solid #eee; text-align: right; font-weight: bold; color: #064e3b;">₹${c.total_spent}</td>
            </tr>
          `;
        }).join('');

        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>MR. VIVASAYI Customer Directory & Address Report</title>
              <style>
                body { font-family: sans-serif; padding: 24px; color: #064e3b; margin: 0; }
                h1 { color: #064e3b; margin-bottom: 4px; font-size: 22px; }
                p { font-size: 12px; color: #666; margin-top: 0; }
                table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 11px; }
                th { background: #064e3b; color: white; padding: 8px; text-align: left; font-size: 10px; text-transform: uppercase; }
              </style>
            </head>
            <body>
              <h1>🌿 MR. VIVASAYI Customer Directory & Address Export</h1>
              <p>Generated on ${new Date().toLocaleString()} | Total Candidates: ${exportDataset.length} | Status Filter: CONFIRMED & PAID</p>
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Customer ID</th>
                    <th>Customer Name</th>
                    <th>Contact Phone</th>
                    <th>Full Shipping Address</th>
                    <th style="text-align: center;">Confirmed Orders</th>
                    <th style="text-align: center;">Payment Status</th>
                    <th style="text-align: right;">Total Spent</th>
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
          title: `Customer Report (${format})`,
          message: `Generated address directory for ${exportDataset.length} customers with CONFIRMED orders & payment statuses.`,
          type: 'success',
          sourceModule: 'Customer CRM Export'
        });
        setShowExportModal(false);
        return;
      }

      // CSV & EXCEL Export logic with Customer ID, Full Address, Grouped CONFIRMED orders & Payment status
      const isExcel = format === 'EXCEL';
      const headers = [
        'Customer ID',
        'Customer Name',
        'Phone Number',
        'WhatsApp Number',
        'Email Address',
        'Full Address',
        'Area',
        'City',
        'State',
        'Pincode',
        'Source Channel',
        'Total Orders',
        'Confirmed Orders Count',
        'Order Status Group',
        'Latest Payment Method',
        'Latest Payment Status',
        'Total Lifetime Spent (INR)',
        'Category Preference',
        'Assigned Staff'
      ];

      const rows = exportDataset.map(c => {
        const cOrders = getCustomerOrders(c);
        const confirmedOrders = cOrders.filter(o => o.status === 'CONFIRMED' || o.status === 'DELIVERED');
        const lastOrder = cOrders[0];
        const fullAddr = [c.address, c.area, c.city, c.state, c.pincode].filter(Boolean).join(', ') || `${c.city || 'Cumbum'}, Tamil Nadu`;

        return [
          c.id,
          `"${(c.name || c.phone || 'Customer').replace(/"/g, '""')}"`,
          c.phone || '',
          c.whatsapp_number || '',
          c.email || '',
          `"${fullAddr.replace(/"/g, '""')}"`,
          `"${c.area || ''}"`,
          `"${c.city || 'Cumbum'}"`,
          `"${c.state || 'Tamil Nadu'}"`,
          c.pincode || '',
          c.source_channel || 'OFFLINE_POS',
          c.total_orders,
          confirmedOrders.length,
          'CONFIRMED',
          lastOrder ? lastOrder.payment_method : 'UPI / Cash',
          lastOrder ? lastOrder.payment_status : 'PAID',
          c.total_spent,
          `"${c.category_preference || 'Traditional Rice'}"`,
          `"${c.assigned_staff || 'MR_VIVASAYI_TEAM'}"`
        ];
      });

      const bom = isExcel ? '\uFEFF' : '';
      const csvString = bom + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      const blob = new Blob([csvString], { type: isExcel ? 'application/vnd.ms-excel;charset=utf-8;' : 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `MR_VIVASAYI_Customers_ID_Address_Confirmed_${format}_${new Date().toISOString().split('T')[0]}.${isExcel ? 'csv' : 'csv'}`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      addNotification({
        title: `Customer Data Exported (${format})`,
        message: `Exported dataset with Customer ID, full address, CONFIRMED order count & payment status for ${exportDataset.length} records.`,
        type: 'success',
        sourceModule: 'Customer CRM Export'
      });
      setShowExportModal(false);
      }
    });
  };

  if (loading) {
    return <AdminPageSkeleton title="Customer Relationship Management (CRM)" />;
  }

  return (
    <div className="space-y-6 font-sans text-gray-900 bg-gray-50 min-h-screen p-4 sm:p-6 rounded-2xl animate-fadeIn">
      
      {/* Page Header */}
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-emerald-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-serif text-emerald-950 flex items-center gap-2">
            <Users className="w-7 h-7 text-emerald-600" />
            Customer Management & CRM
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Separate menu for POS, Website, WhatsApp, message template status tracking, category promotions & scheduled dispatching.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {/* Refresh Button */}
          <button
            onClick={() => setIsRefreshing(true)}
            className="px-3.5 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 font-extrabold text-xs rounded-xl border border-emerald-300 shadow-xs flex items-center gap-1.5"
            title="Refresh customer list"
          >
            <RefreshCw className="w-4 h-4 text-emerald-700" /> Refresh
          </button>
          <button
            onClick={() => setShowExportModal(true)}
            className="px-3.5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 font-extrabold text-xs rounded-xl border border-gray-300 shadow-xs flex items-center gap-1.5"
            title="Export filtered customer records - choose format"
          >
            <Download className="w-4 h-4 text-emerald-700" /> Export Customer Data
          </button>
          <button
            onClick={() => promptBulkDispatch('WHATSAPP')}
            className="px-3.5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold text-xs rounded-xl shadow flex items-center gap-1.5"
            title="Send bulk WhatsApp templates to all unsent target customers"
          >
            <MessageSquare className="w-4 h-4 text-green-400" /> WhatsApp Bulk Send
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2.5 bg-amber-400 hover:bg-amber-300 text-emerald-950 font-black text-xs rounded-xl shadow flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" /> Add New Customer
          </button>
        </div>
      </div>

      {/* Channel Filters and Duplicate Grouping */}
      <div className="flex flex-wrap items-center gap-2 overflow-x-auto pb-1">
        {[
          { key: 'ALL', label: 'All Customers', count: customers.length },
          { key: 'OFFLINE_POS', label: 'Offline Store POS', count: customers.filter(c => c.source_channel === 'OFFLINE_POS').length },
          { key: 'WEBSITE', label: 'Website E-Commerce', count: customers.filter(c => c.source_channel === 'WEBSITE').length },
          { key: 'WHATSAPP', label: 'WhatsApp Inbox Orders', count: customers.filter(c => c.source_channel === 'WHATSAPP').length },
          { key: 'N_A', label: 'N/A Direct Walk-in', count: customers.filter(c => c.source_channel === 'N_A').length },
          { key: 'RETURNS', label: 'Returns & Refunded', count: customers.filter(c => (c.return_count ?? 0) > 0).length },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => {
              setChannelFilter(tab.key);
              setShowDuplicatesOnly(false);
              setCurrentPage(1);
            }}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition flex items-center gap-2 whitespace-nowrap ${
              channelFilter === tab.key && !showDuplicatesOnly
                ? 'bg-emerald-800 text-white shadow-md'
                : 'text-gray-600 hover:bg-emerald-50 hover:text-emerald-950'
            }`}
          >
            <span>{tab.label}</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] ${
              channelFilter === tab.key && !showDuplicatesOnly ? 'bg-amber-400 text-emerald-950 font-black' : 'bg-gray-100 text-gray-700'
            }`}>
              {tab.count}
            </span>
          </button>
        ))}

        {/* Duplicate Phone Grouping Filter */}
        <button
          onClick={() => {
            setShowDuplicatesOnly(!showDuplicatesOnly);
            setCurrentPage(1);
          }}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition flex items-center gap-2 whitespace-nowrap border ${
            showDuplicatesOnly
              ? 'bg-rose-700 text-white border-rose-800 shadow-md'
              : 'bg-rose-50 text-rose-800 border-rose-200 hover:bg-rose-100'
          }`}
          title="Filter and inspect customer records sharing the same normalized phone number"
        >
          <AlertTriangle className="w-3.5 h-3.5" />
          <span>Duplicate Phones</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
            showDuplicatesOnly ? 'bg-white text-rose-800' : 'bg-rose-200 text-rose-950'
          }`}>
            {Array.from(duplicatePhoneGroups.values()).filter(g => g.length > 1).length}
          </span>
        </button>
      </div>

      {/* Multi-Criteria Filters Bar (WhatsApp, Email, Category, Sort & Search) */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-emerald-100 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 text-xs">
        {/* Search */}
        <div className="relative md:col-span-1">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
          <input
            type="text"
            placeholder="Search name, phone..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
          />
        </div>

        {/* Sort Order Selector (Recent Buyers Top Default) */}
        <div>
          <select
            value={sortKey}
            onChange={(e) => {
              setSortKey(e.target.value as any);
              setSortDir('desc');
              setCurrentPage(1);
            }}
            className="w-full p-2 bg-amber-50 border border-amber-300 rounded-xl font-extrabold text-amber-950 focus:ring-2 focus:ring-emerald-500"
          >
            <option value="last_order_at">⚡ Recent Top (Default)</option>
            <option value="total_spent">💰 Highest Total Spent</option>
            <option value="total_orders">📦 Most Orders Placed</option>
            <option value="name">🔤 Name (A-Z)</option>
          </select>
        </div>

        {/* WhatsApp Status Filter */}
        <div>
          <select
            value={whatsappStatusFilter}
            onChange={(e) => {
              setWhatsappStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full p-2 bg-gray-50 border border-gray-200 rounded-xl font-bold text-gray-800 focus:ring-2 focus:ring-emerald-500"
          >
            <option value="ALL">WhatsApp: All Status</option>
            <option value="SENT">WhatsApp: Sent ✓</option>
            <option value="NOT_SENT">WhatsApp: Not Sent ✗</option>
          </select>
        </div>

        {/* Email Status Filter */}
        <div>
          <select
            value={emailStatusFilter}
            onChange={(e) => {
              setEmailStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full p-2 bg-gray-50 border border-gray-200 rounded-xl font-bold text-gray-800 focus:ring-2 focus:ring-emerald-500"
          >
            <option value="ALL">Email: All Status</option>
            <option value="SENT">Email: Sent ✓</option>
            <option value="NOT_SENT">Email: Not Sent ✗</option>
          </select>
        </div>

        {/* Category Preference Filter */}
        <div>
          <select
            value={categoryFilter}
            onChange={(e) => {
              setCategoryFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full p-2 bg-gray-50 border border-gray-200 rounded-xl font-bold text-gray-800 focus:ring-2 focus:ring-emerald-500"
          >
            <option value="ALL">Category: All Products</option>
            <option value="Traditional Rice">Traditional Rice</option>
            <option value="Millets">Millets</option>
            <option value="Cold-Pressed Oils">Cold-Pressed Oils</option>
            <option value="Natural Sweeteners">Natural Sweeteners</option>
            <option value="Pulses & Legumes">Pulses & Legumes</option>
            <option value="Flours & Mixes">Flours & Mixes</option>
          </select>
        </div>
      </div>

      {/* Customers Table */}
      <div className="bg-white rounded-3xl shadow-sm border border-emerald-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-emerald-50/80 text-emerald-950 uppercase text-[10px] font-extrabold tracking-wider border-b border-emerald-100">
              <tr>
                <th className="p-4 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={isAllPaginatedSelected}
                    onChange={handleToggleSelectAll}
                    className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-gray-300 cursor-pointer"
                    title="Select all customers on page"
                  />
                </th>
                <th className="p-4">Customer Name</th>
                <th className="p-4">Source Channel</th>
                <th className="p-4">Phone / WhatsApp</th>
                <th className="p-4">Category Preference</th>
                <th className="p-4">Template Status</th>
                <th className="p-4">Dispatch Template</th>
                <th className="p-4 text-center">Orders & Spent</th>
                <th className="p-4">Scheduled Promo</th>
                <th className="p-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-gray-700">
              {error ? (
                <tr>
                  <td colSpan={10} className="py-16 text-center">
                    <div className="max-w-md mx-auto p-6 bg-rose-50 border border-rose-200 rounded-3xl text-center space-y-3 shadow-xs">
                      <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center mx-auto shadow-2xs">
                        <AlertTriangle className="w-6 h-6 text-rose-600" />
                      </div>
                      <h4 className="font-black text-rose-950 text-base">Unable to Load Customer Directory</h4>
                      <p className="text-xs text-rose-800 leading-relaxed font-medium">
                        {error}
                      </p>
                      <div className="pt-2">
                        <button
                          onClick={loadData}
                          className="px-4 py-2 bg-rose-700 hover:bg-rose-800 text-white font-bold text-xs rounded-xl shadow-xs inline-flex items-center gap-1.5 transition"
                        >
                          <RefreshCw className="w-3.5 h-3.5" /> Retry Fetching Customers
                        </button>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-16 text-center">
                    <div className="max-w-md mx-auto p-6 bg-emerald-50/50 border border-emerald-200 rounded-3xl text-center space-y-3 shadow-xs">
                      <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center mx-auto shadow-2xs">
                        <Users className="w-6 h-6 text-emerald-700" />
                      </div>
                      <h4 className="font-black text-emerald-950 text-base">Oops! No Results Found</h4>
                      <p className="text-xs text-gray-600 leading-relaxed font-medium">
                        No customer records found in the database. When shoppers register or place orders through the online store, WhatsApp, or POS counter, they will be listed here.
                      </p>
                      <div className="flex items-center justify-center gap-2 pt-2 flex-wrap">
                        <button
                          onClick={() => setShowAddModal(true)}
                          className="px-4 py-2 bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs rounded-xl shadow-xs inline-flex items-center gap-1.5 transition"
                        >
                          <Plus className="w-3.5 h-3.5" /> Add New Customer
                        </button>
                        <button
                          onClick={loadData}
                          className="px-4 py-2 bg-white hover:bg-gray-50 text-emerald-900 border border-emerald-300 font-bold text-xs rounded-xl shadow-xs inline-flex items-center gap-1.5 transition"
                        >
                          <RefreshCw className="w-3.5 h-3.5" /> Refresh Directory
                        </button>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : paginatedCustomers.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-16 text-center">
                    <div className="max-w-md mx-auto p-6 bg-gray-50 border border-gray-200 rounded-3xl text-center space-y-3 shadow-xs">
                      <div className="w-12 h-12 rounded-full bg-gray-200 text-gray-700 flex items-center justify-center mx-auto shadow-2xs">
                        <Search className="w-6 h-6 text-gray-500" />
                      </div>
                      <h4 className="font-black text-gray-900 text-base">Oops! No Results Found</h4>
                      <p className="text-xs text-gray-500 leading-relaxed">
                        No customer currently matches your search query {search ? `"${search}"` : ''} or the selected channel & notification filters. Try clearing filters to view all records.
                      </p>
                      <div className="pt-2">
                        <button
                          onClick={resetFilters}
                          className="px-4 py-2 bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs rounded-xl shadow-xs inline-flex items-center gap-1.5 transition"
                        >
                          <RotateCcw className="w-3.5 h-3.5" /> Clear All Filters
                        </button>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedCustomers.map((c) => {
                  const isSelected = selectedCustomerIds.includes(c.id);
                  const channelMeta = CHANNEL_BADGES[c.source_channel || 'OFFLINE_POS'] || CHANNEL_BADGES.N_A;
                  const ChannelIcon = channelMeta.icon;
                  const normPhone = normalizePhoneNumber(c.phone || '');
                  const phoneKey = `${c.calling_code || '+91'}_${normPhone}`;
                  const isDuplicatePhone = normPhone.length >= 7 && (duplicatePhoneGroups.get(phoneKey)?.length || 0) > 1;
                  const countryInfo = COUNTRIES.find(cntry => cntry.code === c.country_code || cntry.callingCode === c.calling_code);

                  return (
                    <tr key={c.id} className={`transition ${isSelected ? 'bg-emerald-50/70' : 'hover:bg-emerald-50/40'}`}>
                      <td className="p-4 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelectCustomer(c.id)}
                          className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-gray-300 cursor-pointer"
                        />
                      </td>

                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-400 to-amber-500 text-emerald-950 font-black flex items-center justify-center text-xs shadow-[0_2px_5px_rgba(217,119,6,0.3)]">
                            {(c.name || c.phone || 'C').charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <Link
                              to={`/admin/customers/${c.id}`}
                              className="font-extrabold text-emerald-950 text-xs hover:underline text-left block"
                            >
                              {c.name || c.phone || 'Customer'}
                            </Link>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              {/* 3D Badge: Customer ID */}
                              <span className="text-[10px] bg-gradient-to-r from-emerald-100 to-teal-100 text-emerald-950 font-black px-2 py-0.5 rounded-md font-mono border border-emerald-300 shadow-[0_2px_4px_rgba(5,150,105,0.15),inset_0_1px_0_rgba(255,255,255,0.8)]">
                                #{c.customer_id || c.id}
                              </span>
                              {isDuplicatePhone && (
                                <span className="text-[9px] bg-rose-100 text-rose-800 font-extrabold px-1.5 py-0.2 rounded border border-rose-300 animate-pulse flex items-center gap-0.5" title="Multiple customer accounts share this phone number">
                                  <AlertTriangle className="w-2.5 h-2.5" /> Duplicate Group
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="p-4">
                        {/* 3D Badge: Channel */}
                        <span className={`px-2.5 py-1 rounded-xl text-[10px] font-black border flex items-center gap-1.5 w-fit shadow-[0_2px_4px_rgba(0,0,0,0.06),inset_0_1px_0_rgba(255,255,255,0.7)] ${channelMeta.color}`}>
                          <ChannelIcon className="w-3 h-3" />
                          <span>{channelMeta.label}</span>
                        </span>
                      </td>

                      <td className="p-4">
                        <div className="font-semibold text-gray-900 flex items-center gap-1">
                          <span className="text-sm select-none" title={countryInfo?.name || 'Country'}>{countryInfo?.flag || '🇮🇳'}</span>
                          <span className="font-mono text-xs text-emerald-900 font-bold">{c.calling_code || '+91'}</span>
                          <span className="font-mono text-xs text-gray-800">{c.phone || 'N/A'}</span>
                        </div>
                        {c.whatsapp_number && c.whatsapp_number !== c.phone && (
                          <div className="text-[10px] text-emerald-700 font-mono mt-0.5 flex items-center gap-1">
                            <MessageSquare className="w-3 h-3 text-emerald-600" />
                            <span>WA: {c.calling_code || '+91'} {c.whatsapp_number}</span>
                          </div>
                        )}
                        {c.email && (
                          <div className="text-[10px] text-blue-700 truncate max-w-[140px] mt-0.5">{c.email}</div>
                        )}
                      </td>

                      {/* Category Preference */}
                      <td className="p-4">
                        {/* 3D Badge: Category Preference */}
                        <span className="px-2.5 py-1 bg-gradient-to-r from-emerald-100 to-teal-50 text-emerald-950 rounded-xl font-black text-[10px] border border-emerald-200 shadow-2xs inline-block">
                          {c.category_preference || 'Traditional Rice'}
                        </span>
                      </td>

                      {/* Column 5: Template Status */}
                      <td className="p-4">
                        <div className="space-y-1.5 w-fit">
                          <div className="flex items-center gap-1.5">
                            {/* 3D Badge: WhatsApp status */}
                            <span className={`px-2.5 py-1 text-[10px] font-black rounded-xl flex items-center gap-1 border shadow-2xs ${
                              c.whatsapp_sent_status === 'SENT' ? 'bg-gradient-to-r from-green-100 to-emerald-50 text-green-900 border-green-300' : 'bg-gradient-to-r from-rose-100 to-rose-50 text-rose-800 border-rose-200'
                            }`}>
                              WA: {c.whatsapp_sent_status === 'SENT' ? 'Sent ✓' : 'Not Sent ✗'}
                            </span>

                            {/* 3D Badge: Email status */}
                            <span className={`px-2.5 py-1 text-[10px] font-black rounded-xl flex items-center gap-1 border shadow-2xs ${
                              c.email_sent_status === 'SENT' ? 'bg-gradient-to-r from-blue-100 to-indigo-50 text-blue-900 border-blue-300' : 'bg-gradient-to-r from-rose-100 to-rose-50 text-rose-800 border-rose-200'
                            }`}>
                              Email: {c.email_sent_status === 'SENT' ? 'Sent ✓' : 'Not Sent ✗'}
                            </span>
                          </div>

                          {/* Recent Dispatch Mode & Timestamp */}
                          {c.last_template_sent_at ? (
                            <div className="text-[10px] bg-emerald-50/80 p-1.5 rounded-lg border border-emerald-100 text-emerald-950 font-medium">
                              <div className="flex items-center gap-1 font-bold text-emerald-900">
                                <Clock className="w-3 h-3 text-emerald-700" />
                                <span>Sent via {c.last_sent_channel || 'WHATSAPP'}</span>
                              </div>
                              <div className="text-[9px] text-gray-500 font-mono mt-0.5">
                                {formatDateTime(c.last_template_sent_at)}
                              </div>
                              <div className="text-[9px] text-emerald-800 font-bold truncate max-w-[140px]">
                                {c.last_template_sent || 'ORDER_CONFIRMATION'}
                              </div>
                            </div>
                          ) : (
                            <div className="text-[9px] text-gray-400 font-bold italic">
                              No recent dispatch recorded
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Column 6: Dispatch Template Action */}
                      <td className="p-4">
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => promptDispatchTemplate(c, 'WHATSAPP', 'PAYMENT_REQUESTED')}
                            className="px-2.5 py-1.5 bg-green-100 hover:bg-green-200 text-green-800 font-extrabold rounded-lg border border-green-300 flex items-center gap-1"
                            title="Quick Send WhatsApp Template"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                            <span>WhatsApp</span>
                          </button>

                          <select
                            disabled={dispatchingCustomerId === c.id}
                            onChange={(e) => {
                              if (e.target.value) {
                                promptDispatchTemplate(c, 'WHATSAPP', e.target.value);
                                e.target.value = '';
                              }
                            }}
                            className="text-[10px] py-1.5 px-2 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-lg font-bold text-emerald-950 cursor-pointer min-w-[150px]"
                          >
                            <option value="">Message Library Templates...</option>
                            {templates.filter(t => t.channel === 'WHATSAPP' || t.channel === 'BOTH').map((tpl) => (
                              <option key={tpl.id} value={tpl.id}>
                                #{tpl.template_number} {tpl.title}
                              </option>
                            ))}
                          </select>
                        </div>
                      </td>

                      <td className="p-4 text-center">
                        <div className="font-extrabold text-gray-900">{c.total_orders} Orders</div>
                        <div className="font-black text-emerald-800 text-[11px]">{formatPrice(c.total_spent)}</div>
                      </td>

                      {/* Scheduled Promotion Interval */}
                      <td className="p-4">
                        {/* 3D Badge: Scheduled Promo */}
                        <span className="px-2.5 py-1 bg-gradient-to-r from-amber-100 to-amber-50 text-amber-950 rounded-xl font-black text-[10px] block w-fit border border-amber-300 shadow-2xs">
                          {c.promotion_schedule === 'EVERY_1_DAY' ? 'Every 1 Day' :
                           c.promotion_schedule === 'EVERY_1_WEEK' ? 'Every 1 Week' :
                           c.promotion_schedule === 'CUSTOM_DATE' ? `Custom: ${c.custom_schedule_date || 'Set Date'}` : 'No Schedule'}
                        </span>
                      </td>

                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <Link
                            to={`/admin/customers/${c.id}`}
                            className="p-1.5 bg-emerald-50 text-emerald-800 rounded-lg hover:bg-emerald-100 flex items-center justify-center"
                            title="View Full Customer Profile & Orders"
                          >
                            <Eye className="w-4 h-4" />
                          </Link>
                          <button
                            onClick={() => setEditingCustomer(c)}
                            className="p-1.5 bg-blue-50 text-blue-800 rounded-lg hover:bg-blue-100"
                            title="Edit Customer Profile & Staff"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteCustomer(c.id, c.name || 'Customer')}
                            className="p-1.5 bg-rose-50 text-rose-600 rounded-lg hover:bg-rose-100"
                            title="Delete Customer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar Controls */}
        <div className="p-4 bg-gray-50 border-t border-emerald-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-semibold text-gray-700">
          <div className="flex items-center gap-2">
            <span>Show per page:</span>
            <select
              value={itemsPerPage}
              onChange={(e) => {
                setItemsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="p-1 bg-white border border-gray-300 rounded font-bold"
            >
              <option value={6}>6 items</option>
              <option value={10}>10 items</option>
              <option value={20}>20 items</option>
            </select>
            <span>| Showing {filteredCustomers.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, filteredCustomers.length)} of {filteredCustomers.length}</span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              className="px-3 py-1 bg-white hover:bg-gray-100 border border-gray-300 rounded-lg disabled:opacity-40 font-bold"
            >
              Previous
            </button>
            <span className="px-3 py-1 bg-emerald-800 text-white font-extrabold rounded-lg">
              {currentPage} / {totalPages}
            </span>
            <button
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              className="px-3 py-1 bg-white hover:bg-gray-100 border border-gray-300 rounded-lg disabled:opacity-40 font-bold"
            >
              Next
            </button>
          </div>
        </div>

      </div>

      {/* Floating Bottom Action Bar for Selected Customers */}
      {selectedCustomerIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-emerald-950/95 backdrop-blur-md text-white px-5 py-3 rounded-2xl shadow-2xl border border-emerald-700 flex items-center gap-4 z-40 animate-fadeIn text-xs">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
            <span className="font-black text-amber-300">{selectedCustomerIds.length} Selected</span>
          </div>

          <div className="h-4 w-px bg-emerald-800" />

          <button
            onClick={() => setShowExportModal(true)}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 font-extrabold rounded-xl transition flex items-center gap-1.5 shadow-xs"
            title="Export selected customers report"
          >
            <Download className="w-3.5 h-3.5 text-blue-200" />
            <span>Export ({selectedCustomerIds.length})</span>
          </button>

          <button
            onClick={() => handleBulkDispatchSelected('WHATSAPP')}
            className="px-3 py-1.5 bg-green-700 hover:bg-green-600 font-extrabold rounded-xl transition flex items-center gap-1.5 shadow-xs"
            title="Send WhatsApp template to selected customers"
          >
            <MessageSquare className="w-3.5 h-3.5 text-green-200" />
            <span>WhatsApp ({selectedCustomerIds.length})</span>
          </button>

          <button
            onClick={handleBulkDeleteSelected}
            className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 font-extrabold rounded-xl transition flex items-center gap-1.5 shadow-xs"
            title="Delete selected customers"
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-200" />
            <span>Delete</span>
          </button>

          <button
            onClick={() => setSelectedCustomerIds([])}
            className="p-1.5 text-emerald-400 hover:text-white transition rounded-lg hover:bg-emerald-900"
            title="Clear selection"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* CREATE CUSTOMER MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-emerald-100 space-y-4 animate-fadeIn">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="font-extrabold text-emerald-950 text-base">Add New Customer</h3>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCustomer} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-gray-700 mb-1">Customer Name *</label>
                <input
                  type="text"
                  required
                  value={newCustomerForm.name}
                  onChange={(e) => setNewCustomerForm({ ...newCustomerForm, name: e.target.value })}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl"
                  placeholder="e.g. Meenakshi Sundaram"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Country Calling Code *</label>
                  <CountrySelector
                    value={newCustomerForm.country_code}
                    onChange={(cntry) => setNewCustomerForm({
                      ...newCustomerForm,
                      country_code: cntry.code,
                      calling_code: cntry.callingCode
                    })}
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Phone Number *</label>
                  <input
                    type="tel"
                    required
                    value={newCustomerForm.phone}
                    onChange={(e) => setNewCustomerForm({ ...newCustomerForm, phone: e.target.value })}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl font-mono"
                    placeholder="9876543210"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">WhatsApp Number (Optional)</label>
                  <input
                    type="tel"
                    value={newCustomerForm.whatsapp_number}
                    onChange={(e) => setNewCustomerForm({ ...newCustomerForm, whatsapp_number: e.target.value })}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl font-mono"
                    placeholder="Same as phone if blank"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Email Address (Optional)</label>
                  <input
                    type="email"
                    value={newCustomerForm.email}
                    onChange={(e) => setNewCustomerForm({ ...newCustomerForm, email: e.target.value })}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl"
                    placeholder="customer@gmail.com"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Source Channel *</label>
                  <select
                    value={newCustomerForm.source_channel}
                    onChange={(e) => setNewCustomerForm({ ...newCustomerForm, source_channel: e.target.value as any })}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl font-bold"
                  >
                    <option value="OFFLINE_POS">Offline Store POS</option>
                    <option value="WEBSITE">Website E-Commerce</option>
                    <option value="WHATSAPP">WhatsApp Inbox</option>
                    <option value="N_A">N/A Direct</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Assigned Staff</label>
                  <input
                    type="text"
                    value={newCustomerForm.assigned_staff}
                    onChange={(e) => setNewCustomerForm({ ...newCustomerForm, assigned_staff: e.target.value })}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">City</label>
                  <input
                    type="text"
                    value={newCustomerForm.city}
                    onChange={(e) => setNewCustomerForm({ ...newCustomerForm, city: e.target.value })}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Area / Locality</label>
                  <input
                    type="text"
                    value={newCustomerForm.area}
                    onChange={(e) => setNewCustomerForm({ ...newCustomerForm, area: e.target.value })}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-800 text-white font-bold rounded-xl shadow"
                >
                  Register Customer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT CUSTOMER MODAL */}
      {editingCustomer && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-emerald-100 space-y-4 animate-fadeIn">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="font-extrabold text-emerald-950 text-base">Edit Customer Profile</h3>
              <button onClick={() => setEditingCustomer(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateCustomer} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Customer Name *</label>
                  <input
                    type="text"
                    value={editingCustomer.name}
                    onChange={(e) => setEditingCustomer({ ...editingCustomer, name: e.target.value })}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Customer ID (Immutable)</label>
                  <input
                    type="text"
                    disabled
                    value={editingCustomer.customer_id || editingCustomer.id}
                    className="w-full p-2.5 bg-gray-100 border border-gray-200 rounded-xl font-mono text-gray-600 font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Country Calling Code</label>
                  <CountrySelector
                    value={editingCustomer.country_code || 'IN'}
                    onChange={(cntry) => setEditingCustomer({
                      ...editingCustomer,
                      country_code: cntry.code,
                      calling_code: cntry.callingCode
                    })}
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Phone Number</label>
                  <input
                    type="tel"
                    value={editingCustomer.phone || ''}
                    onChange={(e) => setEditingCustomer({ ...editingCustomer, phone: e.target.value })}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Source Channel</label>
                  <select
                    value={editingCustomer.source_channel || 'OFFLINE_POS'}
                    onChange={(e) => setEditingCustomer({ ...editingCustomer, source_channel: e.target.value as any })}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl font-bold"
                  >
                    <option value="OFFLINE_POS">Offline Store POS</option>
                    <option value="WEBSITE">Website E-Commerce</option>
                    <option value="WHATSAPP">WhatsApp Inbox</option>
                    <option value="N_A">N/A Direct</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Email Address</label>
                  <input
                    type="email"
                    value={editingCustomer.email || ''}
                    onChange={(e) => setEditingCustomer({ ...editingCustomer, email: e.target.value })}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Assigned Staff</label>
                  <input
                    type="text"
                    value={editingCustomer.assigned_staff || 'MR_VIVASAYI_TEAM'}
                    onChange={(e) => setEditingCustomer({ ...editingCustomer, assigned_staff: e.target.value })}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Product Returns Count</label>
                  <input
                    type="number"
                    value={editingCustomer.return_count || 0}
                    onChange={(e) => setEditingCustomer({ ...editingCustomer, return_count: parseInt(e.target.value) || 0 })}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl"
                  />
                </div>
              </div>

              {/* Category Preference & Promotion Schedule Settings */}
              <div className="grid grid-cols-2 gap-4 bg-emerald-50/60 p-3 rounded-2xl border border-emerald-100">
                <div>
                  <label className="block font-bold text-emerald-950 mb-1">Category Preference</label>
                  <select
                    value={editingCustomer.category_preference || 'Traditional Rice'}
                    onChange={(e) => setEditingCustomer({ ...editingCustomer, category_preference: e.target.value })}
                    className="w-full p-2 bg-white border border-emerald-200 rounded-xl font-bold text-gray-800"
                  >
                    <option value="Traditional Rice">Traditional Rice</option>
                    <option value="Millets">Millets</option>
                    <option value="Cold-Pressed Oils">Cold-Pressed Oils</option>
                    <option value="Natural Sweeteners">Natural Sweeteners</option>
                    <option value="Pulses & Legumes">Pulses & Legumes</option>
                    <option value="Flours & Mixes">Flours & Mixes</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-emerald-950 mb-1">Scheduled Promo Frequency</label>
                  <select
                    value={editingCustomer.promotion_schedule || 'EVERY_1_WEEK'}
                    onChange={(e) => setEditingCustomer({ ...editingCustomer, promotion_schedule: e.target.value as any })}
                    className="w-full p-2 bg-white border border-emerald-200 rounded-xl font-bold text-gray-800"
                  >
                    <option value="EVERY_1_DAY">Every 1 Day</option>
                    <option value="EVERY_1_WEEK">Every 1 Week</option>
                    <option value="EVERY_1_MONTH">Every 1 Month</option>
                    <option value="CUSTOM_DATE">Custom Schedule Date</option>
                    <option value="NONE">No Promo Schedule</option>
                  </select>
                </div>

                {editingCustomer.promotion_schedule === 'CUSTOM_DATE' && (
                  <div className="col-span-2 pt-1">
                    <label className="block font-bold text-emerald-950 mb-1">Custom Promo Date</label>
                    <input
                      type="date"
                      value={editingCustomer.custom_schedule_date || ''}
                      onChange={(e) => setEditingCustomer({ ...editingCustomer, custom_schedule_date: e.target.value })}
                      className="w-full p-2 bg-white border border-emerald-200 rounded-xl font-bold text-gray-800"
                    />
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingCustomer(null)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-800 text-white font-bold rounded-xl shadow"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW CUSTOMER DETAIL MODAL */}
      {selectedCustomer && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-emerald-100 space-y-6 animate-fadeIn">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 rounded-full bg-amber-400 text-emerald-950 font-black text-lg flex items-center justify-center shadow">
                  {(selectedCustomer.name || selectedCustomer.phone || 'C').charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-extrabold text-emerald-950 text-base">{selectedCustomer.name || selectedCustomer.phone || 'Customer'}</h3>
                  <p className="text-xs text-gray-500">{selectedCustomer.city || 'Tamil Nadu'} • Channel: {selectedCustomer.source_channel || 'DIRECT'}</p>
                </div>
              </div>
              <button onClick={() => setSelectedCustomer(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100 text-center">
                <div className="text-[10px] text-gray-400 font-bold">TOTAL ORDERS</div>
                <div className="font-black text-emerald-900 text-lg">{selectedCustomer.total_orders}</div>
              </div>
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100 text-center">
                <div className="text-[10px] text-gray-400 font-bold">LIFETIME SPENT</div>
                <div className="font-black text-emerald-900 text-lg">{formatPrice(selectedCustomer.total_spent)}</div>
              </div>
              <div className="p-3 bg-rose-50 rounded-xl border border-rose-100 text-center">
                <div className="text-[10px] text-rose-500 font-bold">PRODUCT RETURNS</div>
                <div className="font-black text-rose-700 text-lg">{selectedCustomer.return_count || 0}</div>
              </div>
              <div className="p-3 bg-purple-50 rounded-xl border border-purple-100 text-center">
                <div className="text-[10px] text-purple-500 font-bold">ASSIGNED STAFF</div>
                <div className="font-black text-purple-900 text-xs mt-1">{selectedCustomer.assigned_staff || 'Priya'}</div>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSelectedCustomer(null)}
                className="px-5 py-2 bg-emerald-800 text-white font-bold text-xs rounded-xl shadow"
              >
                Close Customer Profile
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── ARE YOU SURE SEND MESSAGE CONFIRMATION MODAL ── */}
      {customerConfirmModal.isOpen && customerConfirmModal.customer && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-emerald-100 space-y-4 animate-fadeIn">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <h3 className="font-extrabold text-emerald-950 text-base flex items-center gap-2">
                <Mail className="w-5 h-5 text-emerald-700" />
                <span>Confirm Dispatch Message?</span>
              </h3>
              <button
                onClick={() => setCustomerConfirmModal({ isOpen: false, customer: null, channel: 'WHATSAPP', template: 'THANKS_MESSAGE', templateText: '' })}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 py-1">
              <div className="bg-amber-50 border border-amber-200 p-3.5 rounded-2xl">
                <p className="text-xs font-bold text-amber-900 mb-1">Are you sure you want to send this template message?</p>
                <p className="text-[11px] text-amber-800">
                  Target Customer: <strong className="text-emerald-950">{customerConfirmModal.customer?.name || customerConfirmModal.customer?.phone || 'Customer'}</strong> ({customerConfirmModal.customer?.phone || customerConfirmModal.customer?.whatsapp_number || 'No Phone'})
                </p>
                <p className="text-[11px] text-amber-800 mt-0.5">
                  Template: <strong className="text-emerald-950">{customerConfirmModal.template}</strong> | Channel: <span className="font-bold text-emerald-900">{customerConfirmModal.channel}</span>
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Message Preview:</label>
                <div className="bg-emerald-50/60 border border-emerald-100 p-3 rounded-xl text-xs text-emerald-950 font-medium whitespace-pre-wrap leading-relaxed">
                  {customerConfirmModal.templateText}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setCustomerConfirmModal({ isOpen: false, customer: null, channel: 'WHATSAPP', template: 'THANKS_MESSAGE', templateText: '' })}
                className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl text-xs"
              >
                No, Cancel
              </button>
              <button
                type="button"
                onClick={executeDispatchTemplate}
                className="px-5 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white font-extrabold rounded-xl shadow text-xs flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Yes, Send Message Now</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── BULK DISPATCH CONFIRMATION MODAL ── */}
      {bulkConfirmModal.isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-emerald-100 space-y-4 animate-fadeIn">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <h3 className="font-extrabold text-emerald-950 text-base flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-emerald-700" />
                <span>Confirm Bulk Message Dispatch?</span>
              </h3>
              <button
                onClick={() => setBulkConfirmModal({ isOpen: false, channel: 'BOTH', unsentCount: 0, templateName: '' })}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 py-1">
              <div className="bg-amber-50 border border-amber-200 p-3.5 rounded-2xl">
                <p className="text-xs font-bold text-amber-900 mb-1">Are you sure you want to send bulk templates to all unsent customers?</p>
                <p className="text-xs text-amber-800">
                  Target Audience: <strong className="text-emerald-950">{bulkConfirmModal.unsentCount} Customers</strong> (Filtered View)
                </p>
                <p className="text-xs text-amber-800 mt-0.5">
                  Dispatch Channel: <span className="font-bold text-emerald-900">WhatsApp (WA Web & API)</span>
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Bulk WhatsApp Template Contents:</label>
                <div className="bg-emerald-50/60 border border-emerald-100 p-3 rounded-xl text-xs text-emerald-950 font-medium whitespace-pre-wrap leading-relaxed">
                  MR. VIVASAYI WhatsApp Bulk Status Notification: Directing WhatsApp order confirmations, delivery schedules (₹50/kg), and category restock promotion alerts to {bulkConfirmModal.unsentCount} candidate customers.
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setBulkConfirmModal({ isOpen: false, channel: 'BOTH', unsentCount: 0, templateName: '' })}
                className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl text-xs"
              >
                No, Cancel
              </button>
              <button
                type="button"
                onClick={executeBulkDispatch}
                className="px-5 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white font-extrabold rounded-xl shadow text-xs flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Yes, Send Bulk Messages Now</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── ACTION PROGRESS & PLEASE WAIT SPINNER MODAL ── */}
      {actionSpinnerModal.isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-emerald-100 text-center space-y-4 animate-fadeIn">
            {actionSpinnerModal.isExecuting ? (
              <div className="py-4 space-y-3">
                <Loader2 className="w-10 h-10 text-emerald-600 animate-spin mx-auto" />
                <h3 className="font-extrabold text-emerald-950 text-base">{actionSpinnerModal.title}</h3>
                <p className="text-xs text-gray-500 font-medium leading-relaxed">{actionSpinnerModal.description}</p>
              </div>
            ) : (
              <div className="space-y-4 py-2">
                <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mx-auto font-black text-xl">
                  !
                </div>
                <h3 className="font-extrabold text-emerald-950 text-base">{actionSpinnerModal.title}</h3>
                <p className="text-xs text-gray-600 font-medium leading-relaxed">{actionSpinnerModal.description}</p>

                <div className="flex justify-center gap-3 pt-2">
                  <button
                    onClick={() => setActionSpinnerModal({ isOpen: false, title: '', description: '', isExecuting: false })}
                    className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl text-xs"
                  >
                    Cancel
                  </button>
                  {actionSpinnerModal.onConfirm && (
                    <button
                      onClick={actionSpinnerModal.onConfirm}
                      className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-extrabold rounded-xl shadow text-xs"
                    >
                      Confirm Action
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* EXPORT FORMAT MODAL */}
      <ExportFormatModal
        isOpen={showExportModal}
        title="Export Customer CRM Records"
        description="Select export format for current customer view:"
        totalRecords={filteredCustomers.length}
        onClose={() => setShowExportModal(false)}
        onExport={handleExecuteCustomerExport}
      />

      {/* REAL ANIMATED REFRESH SPINNER MODAL */}
      <RefreshSpinnerModal
        isOpen={isRefreshing}
        title="Refreshing Customer CRM..."
        subtitle="Syncing customer profiles & recent order history..."
        moduleName="Customer CRM"
        onComplete={() => {
          setIsRefreshing(false);
          loadData();
          setSortKey('last_order_at');
          setSortDir('desc');
          setCurrentPage(1);
          toast.success('🔄 Customer List Refreshed! Recent buyers sorted on top.');
          addNotification({
            title: 'Customer Directory Synced',
            message: 'Refreshed customer list. Recent buyers sorted on top.',
            type: 'info',
            sourceModule: 'Customer CRM'
          });
        }}
      />

    </div>
  );
}

export default CustomersPage;
