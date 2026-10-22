import React, { useState, useEffect } from 'react';
import {
  MapPin, Phone, Plus, Edit3, Trash2, CheckCircle2, 
  Building2, Receipt, MessageSquare, ShieldCheck, 
  Sparkles, Check, X, AlertCircle, Save, Printer
} from 'lucide-react';
import {
  StoreAddress,
  StorePhone,
  StoreContactSettings,
  getStoreContactSettings,
  saveStoreContactSettings,
  getFormattedStoreAddress,
  getFormattedStorePhone
} from '../../../lib/storeSettings';
import { useActionModal } from '../../../contexts/ActionModalContext';
import { useNotifications } from '../../../contexts/NotificationContext';
import toast from 'react-hot-toast';

export const StoreAddressConfigTab: React.FC = () => {
  const { showActionModal } = useActionModal();
  const { addNotification } = useNotifications();

  const [settings, setSettings] = useState<StoreContactSettings>(getStoreContactSettings());
  
  // Modals state
  const [addressModal, setAddressModal] = useState<{
    isOpen: boolean;
    isEditing: boolean;
    data: Partial<StoreAddress>;
  }>({
    isOpen: false,
    isEditing: false,
    data: {}
  });

  const [phoneModal, setPhoneModal] = useState<{
    isOpen: boolean;
    isEditing: boolean;
    data: Partial<StorePhone>;
  }>({
    isOpen: false,
    isEditing: false,
    data: {}
  });

  // Listen for external updates
  useEffect(() => {
    const handleUpdate = (e: any) => {
      if (e.detail) setSettings(e.detail);
    };
    window.addEventListener('store_contact_updated', handleUpdate);
    return () => window.removeEventListener('store_contact_updated', handleUpdate);
  }, []);

  const primaryAddress = settings.addresses.find(a => a.is_primary) || settings.addresses[0];
  const primaryPhone = settings.phones.find(p => p.is_primary) || settings.phones[0];

  // ==========================================
  // ADDRESS HANDLERS
  // ==========================================
  const handleOpenAddAddress = () => {
    setAddressModal({
      isOpen: true,
      isEditing: false,
      data: {
        label: '',
        address_line: '#Cumbum Valley',
        area: 'Cumbum Valley',
        city: 'Theni',
        state: 'Tamil Nadu',
        pincode: '625516',
        country: 'India',
        gstin: '',
        fssai: '',
        is_primary: settings.addresses.length === 0
      }
    });
  };

  const handleOpenEditAddress = (addr: StoreAddress) => {
    setAddressModal({
      isOpen: true,
      isEditing: true,
      data: { ...addr }
    });
  };

  const handleSaveAddress = (e: React.FormEvent) => {
    e.preventDefault();
    const data = addressModal.data;
    if (!data.label?.trim() || !data.address_line?.trim() || !data.city?.trim()) {
      toast.error('Address Label, Line, and City are required');
      return;
    }

    const now = new Date().toISOString();
    let updatedAddresses = [...settings.addresses];

    if (addressModal.isEditing && data.id) {
      updatedAddresses = updatedAddresses.map(a => {
        if (a.id === data.id) {
          return {
            ...a,
            ...data,
            updated_at: now
          } as StoreAddress;
        }
        if (data.is_primary) {
          return { ...a, is_primary: false };
        }
        return a;
      });
    } else {
      const newAddress: StoreAddress = {
        id: `addr-${Date.now()}`,
        label: data.label.trim(),
        address_line: data.address_line.trim(),
        area: data.area || 'Cumbum Valley',
        city: data.city.trim(),
        state: data.state || 'Tamil Nadu',
        pincode: data.pincode || '625516',
        country: data.country || 'India',
        gstin: data.gstin?.trim() || '',
        fssai: data.fssai?.trim() || '',
        is_primary: Boolean(data.is_primary || updatedAddresses.length === 0),
        created_at: now,
        updated_at: now
      };

      if (newAddress.is_primary) {
        updatedAddresses = updatedAddresses.map(a => ({ ...a, is_primary: false }));
      }
      updatedAddresses.push(newAddress);
    }

    const newSettings: StoreContactSettings = {
      ...settings,
      addresses: updatedAddresses
    };

    saveStoreContactSettings(newSettings);
    setSettings(newSettings);
    setAddressModal({ isOpen: false, isEditing: false, data: {} });
    toast.success(addressModal.isEditing ? 'Store address updated!' : 'New store address added!');

    addNotification({
      title: 'Store Address Updated',
      message: `${data.label} saved as store address.`,
      type: 'success',
      sourceModule: 'Store Address & Contact'
    });
  };

  const handleSetPrimaryAddress = (addrId: string) => {
    const updated = settings.addresses.map(a => ({
      ...a,
      is_primary: a.id === addrId
    }));
    const newSettings = { ...settings, addresses: updated };
    saveStoreContactSettings(newSettings);
    setSettings(newSettings);
    toast.success('Primary store address updated! All receipts & bills now use this address.');
  };

  const handleDeleteAddress = (addr: StoreAddress) => {
    if (settings.addresses.length <= 1) {
      toast.error('Cannot delete the only store address. Add another address first.');
      return;
    }

    showActionModal({
      title: `Delete Address: ${addr.label}?`,
      subtitle: `Are you sure you want to delete this address? (${addr.address_line}, ${addr.city})`,
      badge: 'Address Management',
      duration: 600,
      steps: [
        'Checking active billing references...',
        'Removing store address record...',
        'Address removed successfully!'
      ],
      onComplete: () => {
        let updated = settings.addresses.filter(a => a.id !== addr.id);
        if (addr.is_primary && updated.length > 0) {
          updated[0].is_primary = true;
        }
        const newSettings = { ...settings, addresses: updated };
        saveStoreContactSettings(newSettings);
        setSettings(newSettings);
        toast.success(`Deleted address '${addr.label}'`);
      }
    });
  };

  // ==========================================
  // PHONE NUMBER HANDLERS
  // ==========================================
  const handleOpenAddPhone = () => {
    setPhoneModal({
      isOpen: true,
      isEditing: false,
      data: {
        label: '',
        calling_code: '+91',
        raw_number: '',
        type: 'BILLING',
        is_primary: settings.phones.length === 0,
        is_active: true
      }
    });
  };

  const handleOpenEditPhone = (phone: StorePhone) => {
    setPhoneModal({
      isOpen: true,
      isEditing: true,
      data: { ...phone }
    });
  };

  const handleSavePhone = (e: React.FormEvent) => {
    e.preventDefault();
    const data = phoneModal.data;
    const rawClean = (data.raw_number || '').replace(/\D/g, '');
    if (!data.label?.trim() || !rawClean) {
      toast.error('Phone Label and Number are required');
      return;
    }

    const now = new Date().toISOString();
    const formatted = `${data.calling_code || '+91'} ${rawClean}`;
    let updatedPhones = [...settings.phones];

    if (phoneModal.isEditing && data.id) {
      updatedPhones = updatedPhones.map(p => {
        if (p.id === data.id) {
          return {
            ...p,
            ...data,
            raw_number: rawClean,
            phone_number: formatted,
            updated_at: now
          } as StorePhone;
        }
        if (data.is_primary) {
          return { ...p, is_primary: false };
        }
        return p;
      });
    } else {
      const newPhone: StorePhone = {
        id: `phone-${Date.now()}`,
        label: data.label.trim(),
        calling_code: data.calling_code || '+91',
        raw_number: rawClean,
        phone_number: formatted,
        type: data.type || 'BILLING',
        is_primary: Boolean(data.is_primary || updatedPhones.length === 0),
        is_active: data.is_active !== false,
        created_at: now,
        updated_at: now
      };

      if (newPhone.is_primary) {
        updatedPhones = updatedPhones.map(p => ({ ...p, is_primary: false }));
      }
      updatedPhones.push(newPhone);
    }

    const newSettings: StoreContactSettings = {
      ...settings,
      phones: updatedPhones
    };

    saveStoreContactSettings(newSettings);
    setSettings(newSettings);
    setPhoneModal({ isOpen: false, isEditing: false, data: {} });
    toast.success(phoneModal.isEditing ? 'Phone number updated!' : 'New phone number registered!');

    addNotification({
      title: 'Store Phone Updated',
      message: `${data.label} (${formatted}) saved for store communications.`,
      type: 'success',
      sourceModule: 'Store Address & Contact'
    });
  };

  const handleSetPrimaryPhone = (phoneId: string) => {
    const updated = settings.phones.map(p => ({
      ...p,
      is_primary: p.id === phoneId
    }));
    const newSettings = { ...settings, phones: updated };
    saveStoreContactSettings(newSettings);
    setSettings(newSettings);
    toast.success('Primary contact phone updated! All bills & WhatsApp links will now use this number.');
  };

  const handleDeletePhone = (phone: StorePhone) => {
    if (settings.phones.length <= 1) {
      toast.error('Cannot delete the only store phone number. Register another number first.');
      return;
    }

    showActionModal({
      title: `Delete Phone: ${phone.label}?`,
      subtitle: `Are you sure you want to delete ${phone.phone_number}?`,
      badge: 'Phone Management',
      duration: 600,
      steps: [
        'Checking active order dispatch queues...',
        'Removing store contact number...',
        'Number removed successfully!'
      ],
      onComplete: () => {
        let updated = settings.phones.filter(p => p.id !== phone.id);
        if (phone.is_primary && updated.length > 0) {
          updated[0].is_primary = true;
        }
        const newSettings = { ...settings, phones: updated };
        saveStoreContactSettings(newSettings);
        setSettings(newSettings);
        toast.success(`Deleted contact number '${phone.label}'`);
      }
    });
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Top Banner Card */}
      <div className="bg-gradient-to-r from-emerald-900 via-emerald-950 to-emerald-900 rounded-3xl p-6 sm:p-8 text-white border border-emerald-800 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-amber-400/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-800/80 border border-emerald-600/50 text-amber-300 text-xs font-bold shadow-inner">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>CENTRAL STORE IDENTITY &amp; BILLING ADDRESS</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-serif font-black tracking-tight text-white">
              {settings.store_name}
            </h2>
            <div className="flex flex-wrap items-center gap-y-2 gap-x-4 text-xs text-emerald-200">
              <div className="flex items-center gap-1.5 font-medium">
                <MapPin className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Active Address: <strong className="text-white font-bold">{getFormattedStoreAddress()}</strong></span>
              </div>
              <div className="flex items-center gap-1.5 font-medium">
                <Phone className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Primary Phone: <strong className="text-white font-bold">{getFormattedStorePhone()}</strong></span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <span className="px-3.5 py-1.5 rounded-full text-xs font-black bg-emerald-700/80 text-emerald-100 border border-emerald-500/50 flex items-center gap-1.5 shadow-sm">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
              <span>Live on POS &amp; Invoices</span>
            </span>
          </div>
        </div>
      </div>

      {/* Grid: Left Column = Addresses & Phones, Right Column = Live Receipts Simulator */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left 7 Columns: Management Cards */}
        <div className="lg:col-span-7 space-y-8">
          
          {/* ========================================================= */}
          {/* Section 1: STORE ADDRESSES */}
          {/* ========================================================= */}
          <div className="bg-white dark:bg-emerald-950 p-6 sm:p-7 rounded-3xl border-2 border-emerald-100 dark:border-emerald-800/80 shadow-md space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-emerald-100 dark:border-emerald-800/60 pb-4">
              <div>
                <h3 className="font-serif font-bold text-lg text-gray-900 dark:text-emerald-100 flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-emerald-700 dark:text-amber-400" />
                  <span>Store Locations &amp; Billing Addresses</span>
                </h3>
                <p className="text-xs text-gray-500 dark:text-emerald-300/80 mt-0.5">
                  The primary address is automatically printed on all customer bills, receipts, and order stickers.
                </p>
              </div>

              <button
                type="button"
                onClick={handleOpenAddAddress}
                className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-md transition flex items-center gap-1.5 active:scale-95 shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>Add Address</span>
              </button>
            </div>

            <div className="space-y-4">
              {settings.addresses.map((addr) => (
                <div
                  key={addr.id}
                  className={`p-5 rounded-2xl border-2 transition-all duration-200 relative ${
                    addr.is_primary
                      ? 'border-amber-400 bg-amber-50/20 dark:bg-emerald-900/40 shadow-sm ring-1 ring-amber-400/30'
                      : 'border-emerald-100 dark:border-emerald-800/60 bg-gray-50/60 dark:bg-emerald-900/20 hover:border-emerald-300'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row justify-between items-start gap-3">
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-sm text-gray-900 dark:text-emerald-100">
                          {addr.label}
                        </span>
                        {addr.is_primary && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-400 text-emerald-950 flex items-center gap-1 shadow-xs">
                            <CheckCircle2 className="w-2.5 h-2.5" />
                            <span>PRIMARY BILLING ADDRESS</span>
                          </span>
                        )}
                      </div>

                      <p className="text-xs font-semibold text-emerald-800 dark:text-amber-300">
                        📍 {addr.address_line}, {addr.city}, {addr.state} - {addr.pincode}
                      </p>

                      {(addr.gstin || addr.fssai) && (
                        <div className="flex flex-wrap gap-2 text-[10px] text-gray-500 dark:text-emerald-300/70 pt-1">
                          {addr.gstin && <span><strong>GSTIN:</strong> {addr.gstin}</span>}
                          {addr.fssai && <span>• <strong>FSSAI:</strong> {addr.fssai}</span>}
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                      {!addr.is_primary && (
                        <button
                          type="button"
                          onClick={() => handleSetPrimaryAddress(addr.id)}
                          className="px-3 py-1.5 rounded-lg text-xs font-bold bg-white dark:bg-emerald-800 text-emerald-700 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-600 hover:bg-emerald-50 transition"
                        >
                          Make Primary
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => handleOpenEditAddress(addr)}
                        className="p-1.5 rounded-lg text-gray-600 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-800 transition"
                        title="Edit Address"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>

                      {settings.addresses.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleDeleteAddress(addr)}
                          className="p-1.5 rounded-lg text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition"
                          title="Delete Address"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ========================================================= */}
          {/* Section 2: STORE PHONE NUMBERS */}
          {/* ========================================================= */}
          <div className="bg-white dark:bg-emerald-950 p-6 sm:p-7 rounded-3xl border-2 border-emerald-100 dark:border-emerald-800/80 shadow-md space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-emerald-100 dark:border-emerald-800/60 pb-4">
              <div>
                <h3 className="font-serif font-bold text-lg text-gray-900 dark:text-emerald-100 flex items-center gap-2">
                  <Phone className="w-5 h-5 text-emerald-700 dark:text-amber-400" />
                  <span>Store Contact Numbers &amp; Hotlines</span>
                </h3>
                <p className="text-xs text-gray-500 dark:text-emerald-300/80 mt-0.5">
                  Used for WhatsApp billing receipts, direct hotline dials, and customer order alerts.
                </p>
              </div>

              <button
                type="button"
                onClick={handleOpenAddPhone}
                className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-md transition flex items-center gap-1.5 active:scale-95 shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>Add Phone</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {settings.phones.map((p) => {
                const typeColor = 
                  p.type === 'WHATSAPP' ? 'bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-300 border-emerald-300' :
                  p.type === 'BILLING' ? 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-300 border-blue-300' :
                  p.type === 'ORDERS' ? 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border-amber-300' :
                  'bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-300 border-purple-300';

                return (
                  <div
                    key={p.id}
                    className={`p-4 rounded-2xl border-2 transition-all duration-200 flex flex-col justify-between space-y-3 ${
                      p.is_primary
                        ? 'border-amber-400 bg-amber-50/20 dark:bg-emerald-900/40 shadow-sm ring-1 ring-amber-400/30'
                        : 'border-emerald-100 dark:border-emerald-800/60 bg-gray-50/60 dark:bg-emerald-900/20'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border shadow-2xs ${typeColor}`}>
                          {p.type}
                        </span>
                        {p.is_primary && (
                          <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-amber-400 text-emerald-950">
                            DEFAULT
                          </span>
                        )}
                      </div>
                      <div className="font-extrabold text-xs text-gray-900 dark:text-emerald-100 truncate">
                        {p.label}
                      </div>
                      <div className="font-mono text-sm font-black text-emerald-800 dark:text-amber-300 mt-1">
                        {p.phone_number}
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-emerald-100 dark:border-emerald-800/50 text-xs">
                      {!p.is_primary ? (
                        <button
                          type="button"
                          onClick={() => handleSetPrimaryPhone(p.id)}
                          className="text-[11px] font-bold text-emerald-700 dark:text-amber-300 hover:underline"
                        >
                          Make Primary
                        </button>
                      ) : (
                        <span className="text-[11px] font-bold text-gray-400">Primary Number</span>
                      )}

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleOpenEditPhone(p)}
                          className="p-1 text-gray-500 hover:text-emerald-700 dark:hover:text-emerald-300"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        {settings.phones.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleDeletePhone(p)}
                            className="p-1 text-rose-500 hover:text-rose-700"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

        {/* Right 5 Columns: Live Receipts Simulator */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white dark:bg-emerald-950 p-6 rounded-3xl border-2 border-emerald-100 dark:border-emerald-800 shadow-lg sticky top-24 space-y-4">
            <div className="flex items-center justify-between border-b border-emerald-100 dark:border-emerald-800 pb-3">
              <h3 className="font-serif font-black text-sm text-gray-900 dark:text-emerald-100 flex items-center gap-2">
                <Printer className="w-4 h-4 text-emerald-700 dark:text-amber-400" />
                <span>Live Receipt Header Simulator</span>
              </h3>
              <span className="text-[10px] font-black bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                Real-Time
              </span>
            </div>

            <p className="text-xs text-gray-500 dark:text-emerald-300">
              Any changes made to addresses or phone numbers above immediately update this receipt layout across POS, Invoices, and Delivery stickers:
            </p>

            {/* Simulated Paper Thermal Receipt */}
            <div className="bg-white text-gray-900 p-5 rounded-2xl border-2 border-dashed border-gray-300 font-mono text-xs space-y-3 shadow-inner">
              <div className="text-center space-y-1 border-b border-dashed border-gray-300 pb-3">
                <h4 className="text-base font-black tracking-wider text-emerald-950">{settings.store_name}</h4>
                <p className="text-[11px] font-bold text-gray-700">
                  {primaryAddress.address_line}, {primaryAddress.city}, {primaryAddress.state} - {primaryAddress.pincode}
                </p>
                <p className="text-[10px] text-gray-500">
                  Ph: {primaryPhone.phone_number} {primaryAddress.gstin ? `| GSTIN: ${primaryAddress.gstin}` : ''}
                </p>
                <div className="text-[10px] font-black text-emerald-800 bg-emerald-50 py-0.5 rounded">
                  OFFICIAL TAX INVOICE &amp; RECEIPT
                </div>
              </div>

              <div className="space-y-1 text-[10px] text-gray-600">
                <div className="flex justify-between">
                  <span>Bill #: POS-84920</span>
                  <span>Date: {new Date().toLocaleDateString('en-IN')}</span>
                </div>
                <div className="flex justify-between">
                  <span>Customer: Walk-in Customer</span>
                  <span>Mode: UPI (QR)</span>
                </div>
              </div>

              <table className="w-full text-left text-[10px] border-y border-dashed border-gray-300 py-1.5">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="py-1">Item</th>
                    <th className="py-1 text-center">Qty</th>
                    <th className="py-1 text-right">Amt</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="py-0.5">Marachekku Gingelly Oil (1L)</td>
                    <td className="py-0.5 text-center">1</td>
                    <td className="py-0.5 text-right">₹420</td>
                  </tr>
                  <tr>
                    <td className="py-0.5">Mappillai Samba Rice (1kg)</td>
                    <td className="py-0.5 text-center">2</td>
                    <td className="py-0.5 text-right">₹300</td>
                  </tr>
                </tbody>
              </table>

              <div className="text-right text-[11px] font-black text-gray-900 border-t border-dashed border-gray-300 pt-1">
                TOTAL PAID: ₹720.00
              </div>

              <div className="text-center text-[9px] text-gray-400 pt-1">
                Thank you for shopping traditional &amp; natural!
              </div>
            </div>

            <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-[11px] text-amber-900 dark:text-amber-200 flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <span>
                All <strong>POS Bill receipts</strong>, <strong>WhatsApp order bills</strong>, and <strong>order print windows</strong> now dynamically read from this active primary record.
              </span>
            </div>
          </div>
        </div>

      </div>

      {/* ========================================================= */}
      {/* MODAL: ADD / EDIT STORE ADDRESS */}
      {/* ========================================================= */}
      {addressModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-emerald-950 rounded-3xl max-w-lg w-full p-6 shadow-2xl border-2 border-emerald-400/30 space-y-4">
            <div className="flex justify-between items-center border-b border-gray-100 dark:border-emerald-800 pb-3">
              <h3 className="font-serif font-black text-base text-gray-900 dark:text-emerald-100 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-emerald-700 dark:text-amber-400" />
                <span>{addressModal.isEditing ? 'Edit Store Address' : 'Add New Store Address'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setAddressModal({ isOpen: false, isEditing: false, data: {} })}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-emerald-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAddress} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-gray-700 dark:text-emerald-200 mb-1">
                  Address Label / Identifier *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Main Flagship Store, Billing Counter, Chekku Mill"
                  value={addressModal.data.label || ''}
                  onChange={(e) => setAddressModal(prev => ({ ...prev, data: { ...prev.data, label: e.target.value } }))}
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-emerald-700 bg-white dark:bg-emerald-900/60 font-semibold text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 dark:text-emerald-200 mb-1">
                  Street / Landmark Address Line *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. #Cumbum Valley"
                  value={addressModal.data.address_line || ''}
                  onChange={(e) => setAddressModal(prev => ({ ...prev, data: { ...prev.data, address_line: e.target.value } }))}
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-emerald-700 bg-white dark:bg-emerald-900/60 font-semibold text-gray-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 dark:text-emerald-200 mb-1">
                    City / District *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Theni"
                    value={addressModal.data.city || ''}
                    onChange={(e) => setAddressModal(prev => ({ ...prev, data: { ...prev.data, city: e.target.value } }))}
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-emerald-700 bg-white dark:bg-emerald-900/60 font-semibold text-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 dark:text-emerald-200 mb-1">
                    State *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Tamil Nadu"
                    value={addressModal.data.state || ''}
                    onChange={(e) => setAddressModal(prev => ({ ...prev, data: { ...prev.data, state: e.target.value } }))}
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-emerald-700 bg-white dark:bg-emerald-900/60 font-semibold text-gray-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 dark:text-emerald-200 mb-1">
                    Pincode *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="625516"
                    value={addressModal.data.pincode || ''}
                    onChange={(e) => setAddressModal(prev => ({ ...prev, data: { ...prev.data, pincode: e.target.value } }))}
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-emerald-700 bg-white dark:bg-emerald-900/60 font-semibold text-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 dark:text-emerald-200 mb-1">
                    Country
                  </label>
                  <input
                    type="text"
                    value={addressModal.data.country || 'India'}
                    onChange={(e) => setAddressModal(prev => ({ ...prev, data: { ...prev.data, country: e.target.value } }))}
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-emerald-700 bg-white dark:bg-emerald-900/60 font-semibold text-gray-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 dark:text-emerald-200 mb-1">
                    GSTIN (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="33AABCM1234F1Z8"
                    value={addressModal.data.gstin || ''}
                    onChange={(e) => setAddressModal(prev => ({ ...prev, data: { ...prev.data, gstin: e.target.value } }))}
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-emerald-700 bg-white dark:bg-emerald-900/60 font-mono text-gray-900 dark:text-white uppercase"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 dark:text-emerald-200 mb-1">
                    FSSAI License (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="12423008000451"
                    value={addressModal.data.fssai || ''}
                    onChange={(e) => setAddressModal(prev => ({ ...prev, data: { ...prev.data, fssai: e.target.value } }))}
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-emerald-700 bg-white dark:bg-emerald-900/60 font-mono text-gray-900 dark:text-white"
                  />
                </div>
              </div>

              <label className="flex items-center gap-2 pt-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={Boolean(addressModal.data.is_primary)}
                  onChange={(e) => setAddressModal(prev => ({ ...prev, data: { ...prev.data, is_primary: e.target.checked } }))}
                  className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                />
                <span className="font-bold text-gray-800 dark:text-emerald-100">
                  Set as Primary Store Address for all receipts and bills
                </span>
              </label>

              <div className="flex justify-end gap-2.5 pt-4 border-t border-gray-100 dark:border-emerald-800">
                <button
                  type="button"
                  onClick={() => setAddressModal({ isOpen: false, isEditing: false, data: {} })}
                  className="px-4 py-2 rounded-xl border border-gray-300 dark:border-emerald-700 text-gray-700 dark:text-emerald-200 font-bold hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-black shadow-md flex items-center gap-1.5"
                >
                  <Save className="w-4 h-4" />
                  <span>Save Address</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: ADD / EDIT PHONE NUMBER */}
      {/* ========================================================= */}
      {phoneModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-emerald-950 rounded-3xl max-w-md w-full p-6 shadow-2xl border-2 border-emerald-400/30 space-y-4">
            <div className="flex justify-between items-center border-b border-gray-100 dark:border-emerald-800 pb-3">
              <h3 className="font-serif font-black text-base text-gray-900 dark:text-emerald-100 flex items-center gap-2">
                <Phone className="w-5 h-5 text-emerald-700 dark:text-amber-400" />
                <span>{phoneModal.isEditing ? 'Edit Contact Number' : 'Add Contact Number'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setPhoneModal({ isOpen: false, isEditing: false, data: {} })}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-emerald-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePhone} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-gray-700 dark:text-emerald-200 mb-1">
                  Department / Label *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Billing Counter Desk, WhatsApp Orders"
                  value={phoneModal.data.label || ''}
                  onChange={(e) => setPhoneModal(prev => ({ ...prev, data: { ...prev.data, label: e.target.value } }))}
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-emerald-700 bg-white dark:bg-emerald-900/60 font-semibold text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 dark:text-emerald-200 mb-1">
                  Communication Type
                </label>
                <select
                  value={phoneModal.data.type || 'BILLING'}
                  onChange={(e) => setPhoneModal(prev => ({ ...prev, data: { ...prev.data, type: e.target.value as any } }))}
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-emerald-700 bg-white dark:bg-emerald-900/60 font-semibold text-gray-900 dark:text-white"
                >
                  <option value="BILLING">Billing &amp; POS Counter</option>
                  <option value="WHATSAPP">WhatsApp Orders &amp; Catalog</option>
                  <option value="ORDERS">Dispatch &amp; Delivery</option>
                  <option value="SUPPORT">Customer Care &amp; Farmer Help</option>
                </select>
              </div>

              <div className="grid grid-cols-4 gap-2">
                <div className="col-span-1">
                  <label className="block font-bold text-gray-700 dark:text-emerald-200 mb-1">
                    Code
                  </label>
                  <input
                    type="text"
                    value={phoneModal.data.calling_code || '+91'}
                    onChange={(e) => setPhoneModal(prev => ({ ...prev, data: { ...prev.data, calling_code: e.target.value } }))}
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-emerald-700 bg-white dark:bg-emerald-900/60 font-mono font-bold text-gray-900 dark:text-white text-center"
                  />
                </div>

                <div className="col-span-3">
                  <label className="block font-bold text-gray-700 dark:text-emerald-200 mb-1">
                    Phone / Mobile Number *
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="9789325262"
                    value={phoneModal.data.raw_number || ''}
                    onChange={(e) => setPhoneModal(prev => ({ ...prev, data: { ...prev.data, raw_number: e.target.value } }))}
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-emerald-700 bg-white dark:bg-emerald-900/60 font-mono font-bold text-gray-900 dark:text-white"
                  />
                </div>
              </div>

              <label className="flex items-center gap-2 pt-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={Boolean(phoneModal.data.is_primary)}
                  onChange={(e) => setPhoneModal(prev => ({ ...prev, data: { ...prev.data, is_primary: e.target.checked } }))}
                  className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                />
                <span className="font-bold text-gray-800 dark:text-emerald-100">
                  Set as Primary Contact Number for bills and receipts
                </span>
              </label>

              <div className="flex justify-end gap-2.5 pt-4 border-t border-gray-100 dark:border-emerald-800">
                <button
                  type="button"
                  onClick={() => setPhoneModal({ isOpen: false, isEditing: false, data: {} })}
                  className="px-4 py-2 rounded-xl border border-gray-300 dark:border-emerald-700 text-gray-700 dark:text-emerald-200 font-bold hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-black shadow-md flex items-center gap-1.5"
                >
                  <Save className="w-4 h-4" />
                  <span>Save Phone</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default StoreAddressConfigTab;
