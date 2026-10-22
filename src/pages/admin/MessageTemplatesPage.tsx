import React, { useState, useEffect } from 'react';
import {
  MessageSquare, Mail, Plus, Edit3, Trash2, Copy, Search, CheckCircle2,
  AlertTriangle, Filter, Sparkles, Send, RefreshCw, X, FileText, Check, ArrowRight,
  QrCode, Download, ZoomIn, Image as ImageIcon, ExternalLink, HelpCircle, AlertCircle,
  UploadCloud, Upload
} from 'lucide-react';
import { useNotifications } from '../../contexts/NotificationContext';
import { RefreshSpinnerModal } from '../../components/common/RefreshSpinnerModal';
import { AdminPageSkeleton } from '../../components/common/Skeleton';
import { useActionModal } from '../../contexts/ActionModalContext';
import { getJSONStore, setJSONStore } from '../../lib/dbManager';
import { QRCodeType, DEFAULT_QR_CODES, generateSvgQrDataUrl } from '../../lib/qrCodeHelper';
import toast from 'react-hot-toast';

export interface MessageTemplate {
  id: string;
  template_number: number;
  title: string;
  category: 'PAYMENT' | 'CANCELLATION' | 'REFUND' | 'RETURN' | 'GENERAL';
  channel: 'WHATSAPP' | 'EMAIL' | 'BOTH';
  backend_status_code: string;
  content: string;
  variables: string[];
  has_qr_code?: boolean;
  qr_code_type?: QRCodeType;
  qr_image_url?: string;
  qr_label?: string;
  include_qr_message?: boolean;
  qr_message_snippet?: string;
}

interface MessageTemplatesPageProps {
  initialChannel?: 'WHATSAPP' | 'EMAIL';
}

// Generate default QR scanning prompt instructions
export function buildDefaultQrSnippet(type: QRCodeType, label?: string): string {
  switch (type) {
    case 'UPI_PAYMENT':
      return '📲 [SCAN TO PAY]: Please scan the attached UPI QR Code using Google Pay, PhonePe, Paytm or BHIM to complete your payment of ₹[Amount].';
    case 'STORE_CATALOG':
      return '🌾 [BROWSE CATALOG]: Scan the attached QR code to browse all traditional cold-pressed oils, native rice varieties and millets.';
    case 'LOCATION_MAP':
      return '📍 [STORE LOCATION]: Scan the attached QR code to open Google Maps navigation to MR. VIVASAYI Mart, Cumbum Valley, Theni.';
    case 'WHATSAPP_ORDER':
      return '💬 [WHATSAPP SUPPORT]: Scan the attached QR code to start a direct WhatsApp chat with our harvest orders desk.';
    case 'CUSTOM':
    default:
      return `📌 [SCAN ATTACHED QR CODE]: Please scan the attached QR code image (${label || 'Scan with Camera / App'}) to proceed.`;
  }
}

// Canvas-based image compression ensuring image is under 100 KB
async function compressImageToMax100KB(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (file.type.includes('svg')) {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const maxDimension = 640;

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(e.target?.result as string);
          return;
        }

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        let quality = 0.85;
        let dataUrl = canvas.toDataURL('image/jpeg', quality);

        while (dataUrl.length * 0.75 > 98 * 1024 && quality > 0.25) {
          quality -= 0.1;
          dataUrl = canvas.toDataURL('image/jpeg', quality);
        }

        resolve(dataUrl);
      };
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function MessageTemplatesPage({ initialChannel = 'WHATSAPP' }: MessageTemplatesPageProps) {
  const { addNotification } = useNotifications();
  const { showActionModal } = useActionModal();
  const [channelTab, setChannelTab] = useState<'WHATSAPP' | 'EMAIL'>(initialChannel);
  const [loading, setLoading] = useState(true);
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);

  useEffect(() => {
    setChannelTab(initialChannel);
  }, [initialChannel]);

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const stored = await getJSONStore<MessageTemplate>('message_templates');
      if (stored && stored.length > 0) {
        setTemplates(stored);
      }
    } catch (err) {
      console.error('Failed to load message templates:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTemplates();
  }, []);

  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [qrFilter, setQrFilter] = useState<'ALL' | 'WITH_QR' | 'NO_QR'>('ALL');
  const [search, setSearch] = useState<string>('');

  const [editingTemplate, setEditingTemplate] = useState<MessageTemplate | null>(null);
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [previewTemplate, setPreviewTemplate] = useState<MessageTemplate | null>(null);

  // QR Mode State: 'PRESET' or 'MANUAL_UPLOAD'
  const [addQrMode, setAddQrMode] = useState<'PRESET' | 'MANUAL_UPLOAD'>('PRESET');
  const [editQrMode, setEditQrMode] = useState<'PRESET' | 'MANUAL_UPLOAD'>('PRESET');

  // 3D Delete Confirmation Modal State
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    template: MessageTemplate | null;
  }>({
    isOpen: false,
    template: null
  });

  // QR Lightbox / Zoom Modal State
  const [zoomQrModal, setZoomQrModal] = useState<{
    isOpen: boolean;
    title: string;
    label?: string;
    imageUrl?: string;
    type?: QRCodeType;
  }>({
    isOpen: false,
    title: '',
    label: '',
    imageUrl: '',
    type: 'UPI_PAYMENT'
  });

  // Add Form State
  const [formState, setFormState] = useState<{
    title: string;
    category: MessageTemplate['category'];
    channel: MessageTemplate['channel'];
    backend_status_code: string;
    content: string;
    has_qr_code: boolean;
    qr_code_type: QRCodeType;
    qr_image_url: string;
    qr_label: string;
    include_qr_message: boolean;
    qr_message_snippet: string;
    qr_file_size_kb?: number;
  }>({
    title: '',
    category: 'PAYMENT',
    channel: 'WHATSAPP',
    backend_status_code: '',
    content: '',
    has_qr_code: true,
    qr_code_type: 'UPI_PAYMENT',
    qr_image_url: DEFAULT_QR_CODES.UPI_PAYMENT.url,
    qr_label: 'Scan with UPI (GPay / PhonePe / Paytm)',
    include_qr_message: true,
    qr_message_snippet: buildDefaultQrSnippet('UPI_PAYMENT'),
    qr_file_size_kb: 14
  });

  const startEditing = (tpl: MessageTemplate) => {
    const isCustom = tpl.qr_code_type === 'CUSTOM';
    const hasQrMsg = Boolean(
      tpl.include_qr_message ??
      (tpl.content.includes('[QR') || tpl.content.toLowerCase().includes('qr') || tpl.content.toLowerCase().includes('scan the attached'))
    );
    setEditingTemplate({
      ...tpl,
      has_qr_code: Boolean(tpl.has_qr_code),
      qr_code_type: tpl.qr_code_type || 'UPI_PAYMENT',
      qr_image_url: tpl.qr_image_url || DEFAULT_QR_CODES.UPI_PAYMENT.url,
      qr_label: tpl.qr_label || 'Scan to Pay',
      include_qr_message: hasQrMsg,
      qr_message_snippet: tpl.qr_message_snippet || buildDefaultQrSnippet(tpl.qr_code_type || 'UPI_PAYMENT', tpl.qr_label)
    });
    setEditQrMode(isCustom ? 'MANUAL_UPLOAD' : 'PRESET');
  };

  const filteredTemplates = templates.filter(t => {
    const matchesChannel = t.channel === channelTab || t.channel === 'BOTH';
    const matchesCategory = categoryFilter === 'ALL' || t.category === categoryFilter;
    const matchesQr = 
      qrFilter === 'ALL' ? true :
      qrFilter === 'WITH_QR' ? Boolean(t.has_qr_code && t.qr_image_url) :
      !t.has_qr_code;
    const matchesSearch = !search.trim() || 
      t.title.toLowerCase().includes(search.toLowerCase()) || 
      t.backend_status_code.toLowerCase().includes(search.toLowerCase()) ||
      t.content.toLowerCase().includes(search.toLowerCase()) ||
      (t.qr_label && t.qr_label.toLowerCase().includes(search.toLowerCase()));
    return matchesChannel && matchesCategory && matchesQr && matchesSearch;
  });

  // Handle Custom QR Upload with < 100KB validation & automatic compression
  const handleCustomQrUpload = async (file: File, isEditing: boolean) => {
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/svg+xml'];
    if (!validTypes.some(t => file.type.includes(t.split('/')[1]) || file.name.toLowerCase().endsWith('.svg'))) {
      toast.error('Please upload a valid image (PNG, JPG, WEBP, or SVG).');
      return;
    }

    let finalDataUrl = '';
    let finalSizeKb = file.size / 1024;

    if (file.size <= 100 * 1024) {
      const reader = new FileReader();
      finalDataUrl = await new Promise((res, rej) => {
        reader.onload = () => res(reader.result as string);
        reader.onerror = rej;
        reader.readAsDataURL(file);
      });
      toast.success(`Custom QR image attached (${finalSizeKb.toFixed(1)} KB < 100 KB) ✓`);
    } else {
      try {
        toast.loading('Compressing QR image to <= 100 KB...', { id: 'qr-compress' });
        finalDataUrl = await compressImageToMax100KB(file);
        finalSizeKb = (finalDataUrl.length * 0.75) / 1024;
        toast.dismiss('qr-compress');
        if (finalSizeKb > 100) {
          toast.error(`Image is ${finalSizeKb.toFixed(1)} KB after compression. Please upload a smaller image under 100 KB.`);
          return;
        }
        toast.success(`Compressed from ${(file.size / 1024).toFixed(1)} KB to ${finalSizeKb.toFixed(1)} KB (< 100 KB) ✓`);
      } catch (err) {
        toast.dismiss('qr-compress');
        toast.error('Could not compress image. Please provide an image under 100 KB.');
        return;
      }
    }

    const customLabel = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ') || 'Custom Uploaded QR';
    const defaultSnippet = `📲 [SCAN ATTACHED QR]: Please scan the attached QR code (${customLabel}) using your mobile camera or payment app.`;

    if (isEditing && editingTemplate) {
      const shouldAppend = editingTemplate.include_qr_message && !editingTemplate.content.includes(customLabel) && !editingTemplate.content.includes('[SCAN ATTACHED QR]');
      setEditingTemplate(prev => prev ? ({
        ...prev,
        has_qr_code: true,
        qr_code_type: 'CUSTOM',
        qr_image_url: finalDataUrl,
        qr_label: prev.qr_label && prev.qr_label !== 'Scan to Pay' ? prev.qr_label : customLabel,
        qr_message_snippet: prev.qr_message_snippet || defaultSnippet,
        content: shouldAppend ? `${prev.content.trim()}\n\n${defaultSnippet}` : prev.content
      }) : null);
      setEditQrMode('MANUAL_UPLOAD');
    } else {
      const shouldAppend = formState.include_qr_message && !formState.content.includes(customLabel) && !formState.content.includes('[SCAN ATTACHED QR]');
      setFormState(prev => ({
        ...prev,
        has_qr_code: true,
        qr_code_type: 'CUSTOM',
        qr_image_url: finalDataUrl,
        qr_label: prev.qr_label && !prev.qr_label.includes('UPI') ? prev.qr_label : customLabel,
        qr_message_snippet: prev.qr_message_snippet || defaultSnippet,
        qr_file_size_kb: finalSizeKb,
        content: shouldAppend && prev.content ? `${prev.content.trim()}\n\n${defaultSnippet}` : (prev.content || defaultSnippet)
      }));
      setAddQrMode('MANUAL_UPLOAD');
    }
  };

  const handleClearCustomQr = (isEditing: boolean) => {
    if (isEditing && editingTemplate) {
      setEditingTemplate(prev => prev ? ({
        ...prev,
        qr_code_type: 'UPI_PAYMENT',
        qr_image_url: DEFAULT_QR_CODES.UPI_PAYMENT.url,
        qr_label: DEFAULT_QR_CODES.UPI_PAYMENT.title
      }) : null);
      setEditQrMode('PRESET');
    } else {
      setFormState(prev => ({
        ...prev,
        qr_code_type: 'UPI_PAYMENT',
        qr_image_url: DEFAULT_QR_CODES.UPI_PAYMENT.url,
        qr_label: DEFAULT_QR_CODES.UPI_PAYMENT.title,
        qr_file_size_kb: undefined
      }));
      setAddQrMode('PRESET');
    }
    toast.success('Custom QR cleared. Restored UPI preset.');
  };

  const handleSelectQrPreset = (type: QRCodeType, isEditing: boolean) => {
    const preset = DEFAULT_QR_CODES[type];
    const snippet = buildDefaultQrSnippet(type, preset.title);
    if (isEditing && editingTemplate) {
      setEditingTemplate(prev => prev ? ({
        ...prev,
        has_qr_code: true,
        qr_code_type: type,
        qr_image_url: preset.url,
        qr_label: preset.title,
        qr_message_snippet: snippet
      }) : null);
      setEditQrMode('PRESET');
    } else {
      setFormState(prev => ({
        ...prev,
        has_qr_code: true,
        qr_code_type: type,
        qr_image_url: preset.url,
        qr_label: preset.title,
        qr_message_snippet: snippet
      }));
      setAddQrMode('PRESET');
    }
  };

  const insertVariableIntoContent = (variable: string, isEditing: boolean) => {
    const token = `[${variable}]`;
    if (isEditing && editingTemplate) {
      setEditingTemplate(prev => prev ? ({
        ...prev,
        content: `${prev.content} ${token}`
      }) : null);
    } else {
      setFormState(prev => ({
        ...prev,
        content: `${prev.content} ${token}`
      }));
    }
    toast.success(`Inserted ${token} into message body`);
  };

  const insertQrSnippetIntoContent = (snippet: string, isEditing: boolean) => {
    if (isEditing && editingTemplate) {
      const cur = editingTemplate.content.trim();
      const updated = cur ? `${cur}\n\n${snippet}` : snippet;
      setEditingTemplate(prev => prev ? ({ ...prev, content: updated, include_qr_message: true }) : null);
    } else {
      const cur = formState.content.trim();
      const updated = cur ? `${cur}\n\n${snippet}` : snippet;
      setFormState(prev => ({ ...prev, content: updated, include_qr_message: true }));
    }
    toast.success('Inserted QR scan instructions into message body ✓');
  };

  // Download QR Code
  const handleDownloadQr = (url: string, title: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = `mrvivasayi-qr-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('QR Code image downloaded ✓');
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formState.title.trim() || !formState.content.trim()) {
      toast.error('Title and message content are required');
      return;
    }

    const newTpl: MessageTemplate = {
      id: `tpl-${Date.now()}`,
      template_number: templates.length + 1,
      title: formState.title,
      category: formState.category,
      channel: formState.channel,
      backend_status_code: formState.backend_status_code || formState.title.toUpperCase().replace(/\s+/g, '_'),
      content: formState.content,
      variables: ['Customer Name', 'Amount', 'Order ID', 'Date', 'Company Name'],
      has_qr_code: formState.has_qr_code,
      qr_code_type: formState.has_qr_code ? formState.qr_code_type : undefined,
      qr_image_url: formState.has_qr_code ? formState.qr_image_url : undefined,
      qr_label: formState.has_qr_code ? formState.qr_label : undefined,
      include_qr_message: formState.has_qr_code ? formState.include_qr_message : false,
      qr_message_snippet: formState.has_qr_code ? formState.qr_message_snippet : undefined
    };

    setShowAddModal(false);

    showActionModal({
      title: 'Creating Message Template',
      subtitle: `Registering ${newTpl.title} with QR attachment...`,
      badge: 'Templates Live',
      duration: 800,
      steps: [
        'Validating variables & status code mapping...',
        'Attaching branded QR code payload...',
        'Saving notification payload to database...',
        'Template registered successfully!'
      ],
      onComplete: async () => {
        const updated = [newTpl, ...templates];
        setTemplates(updated);
        await setJSONStore('message_templates', updated);
        setFormState({
          title: '',
          category: 'PAYMENT',
          channel: 'WHATSAPP',
          backend_status_code: '',
          content: '',
          has_qr_code: true,
          qr_code_type: 'UPI_PAYMENT',
          qr_image_url: DEFAULT_QR_CODES.UPI_PAYMENT.url,
          qr_label: 'Scan with UPI (GPay / PhonePe / Paytm)',
          include_qr_message: true,
          qr_message_snippet: buildDefaultQrSnippet('UPI_PAYMENT')
        });

        addNotification({
          title: 'Message Template Created',
          message: `Added new ${newTpl.channel} message template: ${newTpl.title}${newTpl.has_qr_code ? ' with QR code' : ''}`,
          type: 'success',
          sourceModule: 'Message Templates'
        });
      }
    });
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTemplate) return;
    const target: MessageTemplate = {
      ...editingTemplate,
      has_qr_code: editingTemplate.has_qr_code,
      qr_code_type: editingTemplate.has_qr_code ? editingTemplate.qr_code_type : undefined,
      qr_image_url: editingTemplate.has_qr_code ? editingTemplate.qr_image_url : undefined,
      qr_label: editingTemplate.has_qr_code ? editingTemplate.qr_label : undefined,
      include_qr_message: editingTemplate.has_qr_code ? editingTemplate.include_qr_message : false,
      qr_message_snippet: editingTemplate.has_qr_code ? editingTemplate.qr_message_snippet : undefined
    };
    setEditingTemplate(null);

    showActionModal({
      title: 'Updating Message Template',
      subtitle: `Saving modifications for ${target.title}...`,
      badge: 'Templates Live',
      duration: 800,
      steps: [
        'Verifying template parameters & QR code image...',
        'Updating template cache in system...',
        'Template updated successfully!'
      ],
      onComplete: async () => {
        const updated = templates.map(t => t.id === target.id ? target : t);
        setTemplates(updated);
        await setJSONStore('message_templates', updated);

        addNotification({
          title: 'Template Updated',
          message: `Updated content and QR code for message template '${target.title}'`,
          type: 'success',
          sourceModule: 'Message Templates'
        });
      }
    });
  };

  const handleConfirmDelete = () => {
    if (!deleteModal.template) return;
    const target = deleteModal.template;
    setDeleteModal({ isOpen: false, template: null });

    showActionModal({
      title: 'Deleting Message Template',
      subtitle: `Removing ${target.title} from message registry...`,
      badge: 'Templates Live',
      duration: 750,
      steps: [
        'Checking notification queue bindings...',
        'Removing template and attached QR image...',
        'Template deleted successfully!'
      ],
      onComplete: async () => {
        const updated = templates.filter(t => t.id !== target.id);
        setTemplates(updated);
        await setJSONStore('message_templates', updated);

        addNotification({
          title: 'Template Deleted',
          message: `Removed template '${target.title}' from system library.`,
          type: 'warning',
          sourceModule: 'Message Templates'
        });
      }
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    addNotification({
      title: 'Copied to Clipboard',
      message: 'Template snippet copied successfully.',
      type: 'success',
      sourceModule: 'Message Templates'
    });
    toast.success('Template text copied to clipboard ✓');
  };

  const [isRefreshing, setIsRefreshing] = useState(false);

  if (loading) {
    return <AdminPageSkeleton title="Message Templates Library" />;
  }

  const qrAttachedCount = templates.filter(t => t.has_qr_code && t.qr_image_url).length;

  return (
    <div className="space-y-6 font-sans text-gray-900 bg-gray-50 min-h-screen p-4 sm:p-6 rounded-2xl animate-fadeIn">
      <RefreshSpinnerModal
        isOpen={isRefreshing}
        moduleName="Message Templates"
        title="Syncing Notification Templates..."
        subtitle="Updating WhatsApp & Email template library from backend..."
        onComplete={() => setIsRefreshing(false)}
      />
      
      {/* Header */}
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-emerald-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold font-serif text-emerald-950 flex items-center gap-2">
              <MessageSquare className="w-7 h-7 text-emerald-600" />
              Message Templates Library
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-emerald-100 text-emerald-900 border border-emerald-200">
              {templates.length} Templates Live
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-amber-100 text-amber-900 border border-amber-200 flex items-center gap-1">
              <QrCode className="w-3.5 h-3.5 text-amber-700" />
              {qrAttachedCount} With QR Codes
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            22+ Standardized WhatsApp & Email Notification Templates with attached QR codes (UPI, Catalog, Location, WhatsApp) and backend status mappings.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setIsRefreshing(true);
              loadTemplates();
            }}
            className="px-3.5 py-2.5 bg-white border border-emerald-200 text-emerald-900 hover:bg-emerald-50 font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 transition-all"
          >
            <RefreshCw className={`w-4 h-4 text-emerald-600 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          <button
            onClick={() => {
              setFormState({
                title: '',
                category: 'PAYMENT',
                channel: channelTab,
                backend_status_code: '',
                content: '',
                has_qr_code: true,
                qr_code_type: 'UPI_PAYMENT',
                qr_image_url: DEFAULT_QR_CODES.UPI_PAYMENT.url,
                qr_label: 'Scan with UPI (GPay / PhonePe / Paytm)',
                include_qr_message: true,
                qr_message_snippet: buildDefaultQrSnippet('UPI_PAYMENT'),
                qr_file_size_kb: 14
              });
              setShowAddModal(true);
            }}
            className="px-4 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white font-extrabold text-xs rounded-xl shadow flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Add New Template
          </button>
        </div>
      </div>

      {/* Main Channel Tabs: WhatsApp vs Email */}
      <div className="flex bg-white p-1.5 rounded-2xl border border-emerald-100 shadow-sm max-w-md">
        <button
          onClick={() => setChannelTab('WHATSAPP')}
          className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all ${
            channelTab === 'WHATSAPP'
              ? 'bg-emerald-800 text-amber-300 shadow-md'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <MessageSquare className="w-4 h-4 text-emerald-400" />
          <span>WhatsApp Submenu ({templates.filter(t => t.channel === 'WHATSAPP' || t.channel === 'BOTH').length})</span>
        </button>

        <button
          onClick={() => setChannelTab('EMAIL')}
          className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all ${
            channelTab === 'EMAIL'
              ? 'bg-emerald-800 text-amber-300 shadow-md'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <Mail className="w-4 h-4 text-blue-400" />
          <span>Email Submenu ({templates.filter(t => t.channel === 'EMAIL' || t.channel === 'BOTH').length})</span>
        </button>
      </div>

      {/* Recommended Backend App Status Mapping Banner */}
      <div className="bg-gradient-to-r from-emerald-900 to-teal-950 text-white p-4 rounded-2xl shadow border border-emerald-800 space-y-2">
        <div className="flex items-center gap-2 text-amber-300 font-serif font-extrabold text-xs uppercase tracking-wider">
          <Sparkles className="w-4 h-4" />
          <span>Recommended Backend App Status Pipeline Flow & QR Attachment Engine</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 text-[11px] font-mono">
          <div className="bg-emerald-950/70 p-2.5 rounded-xl border border-emerald-800">
            <span className="text-amber-400 font-bold block mb-1">Payment Status Flow:</span>
            <span className="text-emerald-200">PAYMENT_REQUESTED → PAYMENT_CONFIRMED → PAYMENT_SUCCESSFUL</span>
          </div>
          <div className="bg-emerald-950/70 p-2.5 rounded-xl border border-emerald-800">
            <span className="text-amber-400 font-bold block mb-1">Order & Delivery Flow:</span>
            <span className="text-emerald-200">POS_RECEIPT → ORDER_DISPATCHED → OUT_FOR_DELIVERY → DELIVERED</span>
          </div>
          <div className="bg-emerald-950/70 p-2.5 rounded-xl border border-emerald-800">
            <span className="text-amber-400 font-bold block mb-1">Refund & Return Flow:</span>
            <span className="text-emerald-200">RETURN_REQUESTED → APPROVED → RECEIVED → REFUND_COMPLETED</span>
          </div>
        </div>
      </div>

      {/* Filters & Search bar */}
      <div className="bg-white p-4 rounded-2xl border border-emerald-100 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search templates by title, code, text or QR..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* QR Attachment Filter */}
          <div className="flex items-center gap-1.5">
            <QrCode className="w-4 h-4 text-amber-600" />
            <select
              value={qrFilter}
              onChange={(e) => setQrFilter(e.target.value as any)}
              className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-1.5 text-xs font-bold text-gray-800"
            >
              <option value="ALL">All QR Status ({templates.length})</option>
              <option value="WITH_QR">With Attached QR ({qrAttachedCount})</option>
              <option value="NO_QR">Without QR ({templates.length - qrAttachedCount})</option>
            </select>
          </div>

          {/* Category Filter */}
          <div className="flex items-center gap-1.5">
            <Filter className="w-4 h-4 text-emerald-700" />
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-1.5 text-xs font-bold text-gray-800"
            >
              <option value="ALL">All Categories ({templates.length})</option>
              <option value="PAYMENT">Payment ({templates.filter(t => t.category === 'PAYMENT').length})</option>
              <option value="CANCELLATION">Cancellation ({templates.filter(t => t.category === 'CANCELLATION').length})</option>
              <option value="REFUND">Refund ({templates.filter(t => t.category === 'REFUND').length})</option>
              <option value="RETURN">Return ({templates.filter(t => t.category === 'RETURN').length})</option>
              <option value="GENERAL">General ({templates.filter(t => t.category === 'GENERAL').length})</option>
            </select>
          </div>
        </div>
      </div>

      {/* Templates Grid Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredTemplates.map((tpl) => (
          <div
            key={tpl.id}
            className="bg-white rounded-2xl p-5 border border-emerald-100 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-3 group relative"
          >
            <div>
              {/* Card Header */}
              <div className="flex items-start justify-between gap-2 border-b border-gray-100 pb-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-900 font-extrabold text-[11px] flex items-center justify-center shrink-0">
                      #{tpl.template_number}
                    </span>
                    <h3 className="font-extrabold text-emerald-950 text-sm truncate" title={tpl.title}>
                      {tpl.title}
                    </h3>
                  </div>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-900">
                      {tpl.backend_status_code}
                    </span>
                    <span className="text-[10px] text-gray-400 font-medium">
                      {tpl.channel}
                    </span>
                  </div>
                </div>

                <span className={`px-2 py-0.5 rounded text-[10px] font-bold shrink-0 ${
                  tpl.category === 'PAYMENT' ? 'bg-emerald-100 text-emerald-800' :
                  tpl.category === 'CANCELLATION' ? 'bg-rose-100 text-rose-800' :
                  tpl.category === 'REFUND' ? 'bg-purple-100 text-purple-800' :
                  tpl.category === 'RETURN' ? 'bg-amber-100 text-amber-900' : 'bg-gray-100 text-gray-700'
                }`}>
                  {tpl.category}
                </span>
              </div>

              {/* Attached QR Code Strip */}
              {tpl.has_qr_code && tpl.qr_image_url ? (
                <div className="mt-3 p-2 bg-gradient-to-r from-emerald-50 to-amber-50 rounded-xl border border-emerald-200/80 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <div 
                      onClick={() => setZoomQrModal({
                        isOpen: true,
                        title: tpl.title,
                        label: tpl.qr_label,
                        imageUrl: tpl.qr_image_url,
                        type: tpl.qr_code_type
                      })}
                      className="w-12 h-12 bg-white rounded-lg border border-emerald-300 p-0.5 shrink-0 shadow-xs cursor-pointer hover:ring-2 hover:ring-emerald-500 transition-all flex items-center justify-center overflow-hidden group/qr"
                      title="Click to Zoom QR Code"
                    >
                      <img
                        src={tpl.qr_image_url}
                        alt="QR Code"
                        className="w-full h-full object-contain group-hover/qr:scale-105 transition-transform"
                      />
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1">
                        <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-emerald-700 text-amber-200">
                          {tpl.qr_code_type === 'CUSTOM' ? 'MANUAL QR' : (tpl.qr_code_type || 'QR ATTACHED')}
                        </span>
                        {(tpl.include_qr_message || tpl.content.includes('[QR') || tpl.content.toLowerCase().includes('qr') || tpl.content.toLowerCase().includes('scan the attached')) && (
                          <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-900 border border-emerald-300 flex items-center gap-0.5">
                            <Check className="w-2.5 h-2.5 text-emerald-700 shrink-0" />
                            <span>In-Text QR</span>
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] font-bold text-emerald-950 truncate mt-0.5">
                        {tpl.qr_label || 'Scan with Camera / App'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => setZoomQrModal({
                        isOpen: true,
                        title: tpl.title,
                        label: tpl.qr_label,
                        imageUrl: tpl.qr_image_url,
                        type: tpl.qr_code_type
                      })}
                      className="p-1.5 text-emerald-800 hover:bg-emerald-100 rounded-lg transition-colors cursor-pointer"
                      title="Enlarge QR Code"
                    >
                      <ZoomIn className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDownloadQr(tpl.qr_image_url!, tpl.title)}
                      className="p-1.5 text-emerald-800 hover:bg-emerald-100 rounded-lg transition-colors cursor-pointer"
                      title="Download QR Image"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="mt-3 px-2 py-1 bg-gray-50 rounded-lg border border-gray-100 text-[10px] text-gray-400 font-medium flex items-center gap-1">
                  <span>No QR Code attached</span>
                </div>
              )}

              {/* Template Content Preview Box */}
              <div className="mt-3 bg-emerald-50/40 border border-emerald-100/80 p-3 rounded-xl text-xs text-gray-800 font-sans whitespace-pre-wrap leading-relaxed max-h-36 overflow-y-auto">
                {tpl.content}
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
              <button
                type="button"
                onClick={() => copyToClipboard(tpl.content)}
                className="px-2.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-lg text-[11px] flex items-center gap-1 cursor-pointer transition-colors"
                title="Copy snippet"
              >
                <Copy className="w-3.5 h-3.5 text-emerald-700" /> Copy Text
              </button>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setPreviewTemplate(tpl)}
                  className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-lg text-xs cursor-pointer transition-colors"
                  title="Preview Message & QR"
                >
                  <FileText className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => startEditing(tpl)}
                  className="p-1.5 bg-blue-50 hover:bg-blue-100 text-blue-800 rounded-lg text-xs cursor-pointer transition-colors"
                  title="Edit Template & QR Code"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setDeleteModal({ isOpen: true, template: tpl })}
                  className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-xs cursor-pointer transition-colors"
                  title="Delete Template"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* QR ZOOM / LIGHTBOX MODAL */}
      {zoomQrModal.isOpen && zoomQrModal.imageUrl && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-emerald-200 space-y-4 text-center">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <div className="text-left">
                <h3 className="font-extrabold text-emerald-950 text-sm">
                  {zoomQrModal.title}
                </h3>
                <span className="text-[10px] text-emerald-700 font-bold uppercase">
                  {zoomQrModal.type || 'BRANDEd QR CODE'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setZoomQrModal({ isOpen: false, title: '', imageUrl: '' })}
                className="text-gray-400 hover:text-gray-600 cursor-pointer p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* High-Res QR Display Frame */}
            <div className="p-3 bg-emerald-50/50 rounded-2xl border border-emerald-100 flex flex-col items-center">
              <img
                src={zoomQrModal.imageUrl}
                alt={zoomQrModal.title}
                className="w-56 h-68 object-contain rounded-xl shadow-md bg-white border border-emerald-200"
              />
              <p className="mt-3 text-xs font-bold text-emerald-950">
                {zoomQrModal.label || 'Scan with GPay / PhonePe / Paytm / Camera'}
              </p>
              <p className="text-[10px] text-gray-500 font-medium">
                MR. VIVASAYI Mart • #Cumbum Valley, Theni - 625516
              </p>
            </div>

            <div className="flex gap-2 pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setZoomQrModal({ isOpen: false, title: '', imageUrl: '' })}
                className="flex-1 py-2 rounded-xl border border-gray-300 text-gray-700 font-bold text-xs hover:bg-gray-50 cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => handleDownloadQr(zoomQrModal.imageUrl!, zoomQrModal.title)}
                className="flex-1 py-2 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white font-black text-xs shadow flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download QR</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3D YES / NO POP-UP CONFIRMATION MODAL FOR DELETE */}
      {deleteModal.isOpen && deleteModal.template && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div 
            className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border-2 border-rose-200 text-center space-y-4"
            style={{
              transform: 'perspective(1000px) rotateX(2deg)',
              boxShadow: '0 25px 50px -12px rgba(225, 29, 72, 0.25), 0 0 0 1px rgba(244, 63, 94, 0.2)'
            }}
          >
            <div className="w-14 h-14 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto shadow-inner border border-rose-200">
              <Trash2 className="w-7 h-7" />
            </div>

            <div className="space-y-1">
              <h3 className="text-lg font-black text-emerald-950 font-serif">
                Delete Message Template?
              </h3>
              <p className="text-xs text-gray-600">
                Are you sure you want to remove <strong className="text-emerald-900">"{deleteModal.template.title}"</strong> (#{deleteModal.template.template_number})?
              </p>
              <p className="text-[11px] text-rose-600 font-bold pt-1">
                This action is immediate and will update all automated message queues.
              </p>
            </div>

            <div className="flex gap-3 pt-3 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setDeleteModal({ isOpen: false, template: null })}
                className="flex-1 py-2.5 rounded-xl border border-gray-300 hover:bg-gray-50 text-gray-700 font-extrabold text-xs cursor-pointer"
              >
                No, Keep Template
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-red-700 hover:from-rose-700 hover:to-red-800 text-white font-black text-xs shadow-lg hover:shadow-xl cursor-pointer"
              >
                Yes, Delete Template
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT TEMPLATE MODAL */}
      {editingTemplate && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-emerald-100 space-y-4 my-8 animate-fadeIn max-h-[92vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <h3 className="font-extrabold text-emerald-950 text-base flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-emerald-700" />
                <span>Edit Template: #{editingTemplate.template_number} - {editingTemplate.title}</span>
              </h3>
              <button onClick={() => setEditingTemplate(null)} className="text-gray-400 hover:text-gray-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdate} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-gray-700 mb-1">Template Title *</label>
                <input
                  type="text"
                  required
                  value={editingTemplate.title}
                  onChange={(e) => setEditingTemplate({ ...editingTemplate, title: e.target.value })}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl font-bold text-gray-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Backend Status Code *</label>
                  <input
                    type="text"
                    required
                    value={editingTemplate.backend_status_code}
                    onChange={(e) => setEditingTemplate({ ...editingTemplate, backend_status_code: e.target.value })}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl font-mono text-[11px]"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Category *</label>
                  <select
                    value={editingTemplate.category}
                    onChange={(e) => setEditingTemplate({ ...editingTemplate, category: e.target.value as any })}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl font-bold"
                  >
                    <option value="PAYMENT">PAYMENT</option>
                    <option value="CANCELLATION">CANCELLATION</option>
                    <option value="REFUND">REFUND</option>
                    <option value="RETURN">RETURN</option>
                    <option value="GENERAL">GENERAL</option>
                  </select>
                </div>
              </div>

              {/* Message Body with Variable Chips */}
              <div>
                <div className="flex flex-wrap items-center justify-between gap-1 mb-1.5">
                  <label className="block font-bold text-gray-700">Template Message Body *</label>
                  <div className="flex flex-wrap items-center gap-1">
                    <span className="text-[10px] text-gray-400 font-bold">Quick Variables:</span>
                    {['Customer Name', 'Order ID', 'Amount', 'Date', 'Payment Method', 'QR_CODE_ATTACHED'].map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => insertVariableIntoContent(tag, true)}
                        className="px-1.5 py-0.5 rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-[10px] font-mono font-bold border border-emerald-200 transition-colors cursor-pointer"
                        title={`Insert [${tag}] into message`}
                      >
                        +{tag}
                      </button>
                    ))}
                  </div>
                </div>
                <textarea
                  rows={6}
                  required
                  value={editingTemplate.content}
                  onChange={(e) => setEditingTemplate({ ...editingTemplate, content: e.target.value })}
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl font-sans text-xs text-gray-900 leading-relaxed focus:bg-white transition-all"
                />
              </div>

              {/* QR Code Attachment Section */}
              <div className="p-4 bg-emerald-50/70 rounded-2xl border border-emerald-200 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={Boolean(editingTemplate.has_qr_code)}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        const snippet = editingTemplate.qr_message_snippet || buildDefaultQrSnippet(editingTemplate.qr_code_type || 'UPI_PAYMENT', editingTemplate.qr_label);
                        const shouldAppend = checked && !editingTemplate.content.includes('[SCAN') && !editingTemplate.content.includes('[QR');
                        setEditingTemplate({
                          ...editingTemplate,
                          has_qr_code: checked,
                          qr_image_url: checked ? (editingTemplate.qr_image_url || DEFAULT_QR_CODES.UPI_PAYMENT.url) : undefined,
                          qr_code_type: checked ? (editingTemplate.qr_code_type || 'UPI_PAYMENT') : undefined,
                          qr_label: checked ? (editingTemplate.qr_label || 'Scan with UPI (GPay / PhonePe / Paytm)') : undefined,
                          include_qr_message: checked,
                          qr_message_snippet: snippet,
                          content: shouldAppend ? `${editingTemplate.content.trim()}\n\n${snippet}` : editingTemplate.content
                        });
                      }}
                      className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                    />
                    <span className="font-extrabold text-emerald-950 text-xs flex items-center gap-1.5">
                      <QrCode className="w-4 h-4 text-emerald-700" />
                      Attach Branded / Custom QR Code Image to this Message
                    </span>
                  </label>
                </div>

                {editingTemplate.has_qr_code && (
                  <div className="space-y-3 pt-2 border-t border-emerald-200/60 animate-fadeIn">
                    {/* QR Source Switcher: Preset Library vs Manual Upload */}
                    <div className="flex items-center bg-white p-1 rounded-xl border border-emerald-200 shadow-xs gap-1">
                      <button
                        type="button"
                        onClick={() => setEditQrMode('PRESET')}
                        className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                          editQrMode === 'PRESET'
                            ? 'bg-emerald-800 text-amber-200 shadow-xs'
                            : 'text-gray-600 hover:bg-gray-100'
                        }`}
                      >
                        <QrCode className="w-3.5 h-3.5" />
                        <span>Preset QR Library (4 Types)</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditQrMode('MANUAL_UPLOAD')}
                        className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                          editQrMode === 'MANUAL_UPLOAD'
                            ? 'bg-emerald-800 text-amber-200 shadow-xs'
                            : 'text-gray-600 hover:bg-gray-100'
                        }`}
                      >
                        <UploadCloud className="w-3.5 h-3.5" />
                        <span>Manual QR Image Upload (&le; 100 KB)</span>
                      </button>
                    </div>

                    {/* Mode 1: Preset Library */}
                    {editQrMode === 'PRESET' && (
                      <div className="space-y-2 animate-fadeIn">
                        <span className="block font-bold text-gray-700 text-[11px]">Select Preset QR Type:</span>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          {(['UPI_PAYMENT', 'STORE_CATALOG', 'LOCATION_MAP', 'WHATSAPP_ORDER'] as QRCodeType[]).map((type) => {
                            const preset = DEFAULT_QR_CODES[type];
                            const isSelected = editingTemplate.qr_code_type === type;
                            return (
                              <button
                                key={type}
                                type="button"
                                onClick={() => handleSelectQrPreset(type, true)}
                                className={`p-2 rounded-xl text-left border transition-all cursor-pointer ${
                                  isSelected
                                    ? 'bg-emerald-800 text-white border-emerald-800 shadow-sm'
                                    : 'bg-white hover:bg-emerald-50 border-gray-200 text-gray-700'
                                }`}
                              >
                                <div className="font-black text-[10px] uppercase truncate">
                                  {type.replace('_', ' ')}
                                </div>
                                <div className={`text-[9px] truncate ${isSelected ? 'text-amber-200' : 'text-gray-500'}`}>
                                  {preset.title}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Mode 2: Manual Upload Dropzone */}
                    {editQrMode === 'MANUAL_UPLOAD' && (
                      <div className="space-y-2 animate-fadeIn">
                        <span className="block font-bold text-gray-700 text-[11px]">
                          Manual QR Image File Upload (&le; 100 KB):
                        </span>
                        <div
                          onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                          onDrop={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            const file = e.dataTransfer.files?.[0];
                            if (file) handleCustomQrUpload(file, true);
                          }}
                          className="border-2 border-dashed border-emerald-400 bg-white hover:bg-emerald-50/50 rounded-2xl p-4 text-center cursor-pointer transition-all"
                        >
                          <label className="flex flex-col items-center justify-center cursor-pointer">
                            <UploadCloud className="w-8 h-8 text-emerald-600 mb-1" />
                            <span className="text-xs font-bold text-emerald-950">
                              Drag & Drop your QR image here, or <span className="text-emerald-700 underline">Browse</span>
                            </span>
                            <span className="text-[10px] text-gray-400 mt-1">
                              Max allowed: 100 KB • PNG, JPG, SVG, WebP (Images &gt; 100 KB are auto-compressed)
                            </span>
                            <input
                              type="file"
                              accept="image/png, image/jpeg, image/jpg, image/webp, image/svg+xml"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleCustomQrUpload(file, true);
                              }}
                            />
                          </label>
                        </div>
                      </div>
                    )}

                    {/* QR Code Details & Preview Strip */}
                    {editingTemplate.qr_image_url && (
                      <div className="flex items-center gap-3 p-3 bg-white rounded-2xl border border-emerald-200 shadow-xs">
                        <img
                          src={editingTemplate.qr_image_url}
                          alt="QR Preview"
                          className="w-14 h-16 object-contain rounded-xl border border-gray-200 bg-white shrink-0 p-0.5"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-emerald-800 text-amber-200">
                              {editingTemplate.qr_code_type === 'CUSTOM' ? 'MANUAL QR IMAGE' : editingTemplate.qr_code_type}
                            </span>
                            <span className="text-[10px] text-emerald-800 font-bold">
                              &le; 100 KB Validated ✓
                            </span>
                          </div>
                          <span className="text-xs font-bold text-emerald-950 block truncate mt-1">
                            {editingTemplate.qr_label || editingTemplate.qr_code_type}
                          </span>
                          <span className="text-[10px] text-gray-400 block truncate">
                            Branded QR code attached to notification payload
                          </span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => setZoomQrModal({
                              isOpen: true,
                              title: editingTemplate.title,
                              label: editingTemplate.qr_label,
                              imageUrl: editingTemplate.qr_image_url,
                              type: editingTemplate.qr_code_type
                            })}
                            className="p-1.5 text-emerald-800 hover:bg-emerald-50 rounded-lg text-xs font-bold flex items-center gap-1 border border-emerald-200 cursor-pointer"
                            title="Zoom QR"
                          >
                            <ZoomIn className="w-3.5 h-3.5" />
                          </button>
                          {editingTemplate.qr_code_type === 'CUSTOM' && (
                            <button
                              type="button"
                              onClick={() => handleClearCustomQr(true)}
                              className="p-1.5 text-rose-700 hover:bg-rose-50 rounded-lg text-xs font-bold flex items-center gap-1 border border-rose-200 cursor-pointer"
                              title="Reset to Default Preset"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    )}

                    {/* QR Label Input */}
                    <div>
                      <label className="block font-bold text-gray-700 mb-1">
                        QR Code Label / Caption (Displayed on thumbnail & preview)
                      </label>
                      <input
                        type="text"
                        value={editingTemplate.qr_label || ''}
                        onChange={(e) => setEditingTemplate({ ...editingTemplate, qr_label: e.target.value })}
                        placeholder="e.g. Scan with UPI (GPay / PhonePe / Paytm)"
                        className="w-full p-2.5 bg-white border border-gray-200 rounded-xl text-xs font-medium"
                      />
                    </div>

                    {/* In-Message QR Inclusion Box */}
                    <div className="p-3 bg-white rounded-xl border border-emerald-200 space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={Boolean(editingTemplate.include_qr_message)}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              const snippet = editingTemplate.qr_message_snippet || buildDefaultQrSnippet(editingTemplate.qr_code_type || 'UPI_PAYMENT', editingTemplate.qr_label);
                              let updatedContent = editingTemplate.content;
                              if (checked && !updatedContent.includes(snippet.trim()) && !updatedContent.includes('[SCAN')) {
                                updatedContent = `${updatedContent.trim()}\n\n${snippet}`;
                              }
                              setEditingTemplate({
                                ...editingTemplate,
                                include_qr_message: checked,
                                content: updatedContent
                              });
                            }}
                            className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                          />
                          <span className="font-extrabold text-emerald-950 text-xs flex items-center gap-1">
                            <span>Include QR Instructions in Message Body</span>
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 font-bold">Auto-Sync</span>
                          </span>
                        </label>

                        <button
                          type="button"
                          onClick={() => insertQrSnippetIntoContent(editingTemplate.qr_message_snippet || buildDefaultQrSnippet(editingTemplate.qr_code_type || 'UPI_PAYMENT', editingTemplate.qr_label), true)}
                          className="text-[10px] font-black px-2.5 py-1 bg-emerald-800 hover:bg-emerald-900 text-white rounded-lg shadow-xs flex items-center gap-1 cursor-pointer"
                        >
                          <Plus className="w-3 h-3" />
                          <span>Insert QR Text into Message ↵</span>
                        </button>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-gray-600 mb-1">
                          QR Scanning Instructions to include:
                        </label>
                        <textarea
                          rows={2}
                          value={editingTemplate.qr_message_snippet || ''}
                          onChange={(e) => setEditingTemplate({ ...editingTemplate, qr_message_snippet: e.target.value })}
                          placeholder="e.g. 📲 [SCAN TO PAY]: Please scan the attached QR code image with any UPI app..."
                          className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-sans text-gray-800"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Live Card Simulator Preview */}
              <div className="p-3.5 bg-gray-50 rounded-2xl border border-gray-200 space-y-2">
                <span className="text-[11px] font-extrabold text-gray-700 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                  <span>Customer Message Preview Simulator:</span>
                </span>
                <div className="bg-white p-3.5 rounded-xl border border-emerald-100 shadow-xs space-y-2">
                  <div className="text-xs text-gray-800 whitespace-pre-wrap leading-relaxed">
                    {editingTemplate.content}
                  </div>
                  {editingTemplate.has_qr_code && editingTemplate.qr_image_url && (
                    <div className="pt-2 border-t border-dashed border-emerald-200 flex items-center gap-2.5">
                      <img
                        src={editingTemplate.qr_image_url}
                        alt="QR Attachment Preview"
                        className="w-12 h-14 object-contain rounded-lg border border-emerald-300 bg-white shrink-0 p-0.5"
                      />
                      <div className="min-w-0">
                        <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-emerald-800 text-amber-200 uppercase">
                          Attached QR
                        </span>
                        <p className="text-[11px] font-bold text-emerald-950 truncate mt-0.5">
                          {editingTemplate.qr_label || 'Scan with Camera / App'}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setEditingTemplate(null)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 font-bold rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-800 hover:bg-emerald-900 text-white font-extrabold rounded-xl shadow cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE TEMPLATE MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-emerald-100 space-y-4 my-8 animate-fadeIn max-h-[92vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <h3 className="font-extrabold text-emerald-950 text-base flex items-center gap-2">
                <Plus className="w-5 h-5 text-emerald-700" />
                <span>Create Message Template with Attached QR</span>
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-gray-700 mb-1">Template Title *</label>
                <input
                  type="text"
                  required
                  value={formState.title}
                  onChange={(e) => setFormState({ ...formState, title: e.target.value })}
                  placeholder="e.g. Delivery Tracking Link & Catalog QR"
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Category *</label>
                  <select
                    value={formState.category}
                    onChange={(e) => setFormState({ ...formState, category: e.target.value as any })}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl font-bold"
                  >
                    <option value="PAYMENT">PAYMENT</option>
                    <option value="CANCELLATION">CANCELLATION</option>
                    <option value="REFUND">REFUND</option>
                    <option value="RETURN">RETURN</option>
                    <option value="GENERAL">GENERAL</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Channel *</label>
                  <select
                    value={formState.channel}
                    onChange={(e) => setFormState({ ...formState, channel: e.target.value as any })}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl font-bold"
                  >
                    <option value="WHATSAPP">WhatsApp</option>
                    <option value="EMAIL">Email</option>
                    <option value="BOTH">Both (WhatsApp & Email)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Backend Status Code (Optional)</label>
                <input
                  type="text"
                  value={formState.backend_status_code}
                  onChange={(e) => setFormState({ ...formState, backend_status_code: e.target.value })}
                  placeholder="Auto-generated if blank (e.g. DELIVERY_TRACKING)"
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl font-mono text-[11px]"
                />
              </div>

              {/* Message Body with Variable Chips */}
              <div>
                <div className="flex flex-wrap items-center justify-between gap-1 mb-1.5">
                  <label className="block font-bold text-gray-700">Message Body *</label>
                  <div className="flex flex-wrap items-center gap-1">
                    <span className="text-[10px] text-gray-400 font-bold">Quick Variables:</span>
                    {['Customer Name', 'Order ID', 'Amount', 'Date', 'Payment Method', 'QR_CODE_ATTACHED'].map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => insertVariableIntoContent(tag, false)}
                        className="px-1.5 py-0.5 rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-[10px] font-mono font-bold border border-emerald-200 transition-colors cursor-pointer"
                        title={`Insert [${tag}] into message`}
                      >
                        +{tag}
                      </button>
                    ))}
                  </div>
                </div>
                <textarea
                  rows={5}
                  required
                  value={formState.content}
                  onChange={(e) => setFormState({ ...formState, content: e.target.value })}
                  placeholder="Hi [Customer Name], ..."
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl font-sans text-xs text-gray-900 leading-relaxed focus:bg-white transition-all"
                />
              </div>

              {/* QR Code Attachment Section */}
              <div className="p-4 bg-emerald-50/70 rounded-2xl border border-emerald-200 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formState.has_qr_code}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        const snippet = formState.qr_message_snippet || buildDefaultQrSnippet(formState.qr_code_type, formState.qr_label);
                        const shouldAppend = checked && !formState.content.includes('[SCAN') && !formState.content.includes('[QR');
                        setFormState({
                          ...formState,
                          has_qr_code: checked,
                          include_qr_message: checked,
                          content: shouldAppend ? `${formState.content.trim()}\n\n${snippet}` : formState.content
                        });
                      }}
                      className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                    />
                    <span className="font-extrabold text-emerald-950 text-xs flex items-center gap-1.5">
                      <QrCode className="w-4 h-4 text-emerald-700" />
                      Attach Branded / Custom QR Code Image to this Message
                    </span>
                  </label>
                </div>

                {formState.has_qr_code && (
                  <div className="space-y-3 pt-2 border-t border-emerald-200/60 animate-fadeIn">
                    {/* QR Source Switcher: Preset Library vs Manual Upload */}
                    <div className="flex items-center bg-white p-1 rounded-xl border border-emerald-200 shadow-xs gap-1">
                      <button
                        type="button"
                        onClick={() => setAddQrMode('PRESET')}
                        className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                          addQrMode === 'PRESET'
                            ? 'bg-emerald-800 text-amber-200 shadow-xs'
                            : 'text-gray-600 hover:bg-gray-100'
                        }`}
                      >
                        <QrCode className="w-3.5 h-3.5" />
                        <span>Preset QR Library (4 Types)</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setAddQrMode('MANUAL_UPLOAD')}
                        className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                          addQrMode === 'MANUAL_UPLOAD'
                            ? 'bg-emerald-800 text-amber-200 shadow-xs'
                            : 'text-gray-600 hover:bg-gray-100'
                        }`}
                      >
                        <UploadCloud className="w-3.5 h-3.5" />
                        <span>Manual QR Image Upload (&le; 100 KB)</span>
                      </button>
                    </div>

                    {/* Mode 1: Preset Library */}
                    {addQrMode === 'PRESET' && (
                      <div className="space-y-2 animate-fadeIn">
                        <span className="block font-bold text-gray-700 text-[11px]">Select Preset QR Type:</span>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          {(['UPI_PAYMENT', 'STORE_CATALOG', 'LOCATION_MAP', 'WHATSAPP_ORDER'] as QRCodeType[]).map((type) => {
                            const preset = DEFAULT_QR_CODES[type];
                            const isSelected = formState.qr_code_type === type;
                            return (
                              <button
                                key={type}
                                type="button"
                                onClick={() => handleSelectQrPreset(type, false)}
                                className={`p-2 rounded-xl text-left border transition-all cursor-pointer ${
                                  isSelected
                                    ? 'bg-emerald-800 text-white border-emerald-800 shadow-sm'
                                    : 'bg-white hover:bg-emerald-50 border-gray-200 text-gray-700'
                                }`}
                              >
                                <div className="font-black text-[10px] uppercase truncate">
                                  {type.replace('_', ' ')}
                                </div>
                                <div className={`text-[9px] truncate ${isSelected ? 'text-amber-200' : 'text-gray-500'}`}>
                                  {preset.title}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Mode 2: Manual Upload Dropzone */}
                    {addQrMode === 'MANUAL_UPLOAD' && (
                      <div className="space-y-2 animate-fadeIn">
                        <span className="block font-bold text-gray-700 text-[11px]">
                          Manual QR Image File Upload (&le; 100 KB):
                        </span>
                        <div
                          onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                          onDrop={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            const file = e.dataTransfer.files?.[0];
                            if (file) handleCustomQrUpload(file, false);
                          }}
                          className="border-2 border-dashed border-emerald-400 bg-white hover:bg-emerald-50/50 rounded-2xl p-4 text-center cursor-pointer transition-all"
                        >
                          <label className="flex flex-col items-center justify-center cursor-pointer">
                            <UploadCloud className="w-8 h-8 text-emerald-600 mb-1" />
                            <span className="text-xs font-bold text-emerald-950">
                              Drag & Drop your QR image here, or <span className="text-emerald-700 underline">Browse</span>
                            </span>
                            <span className="text-[10px] text-gray-400 mt-1">
                              Max allowed: 100 KB • PNG, JPG, SVG, WebP (Images &gt; 100 KB are auto-compressed)
                            </span>
                            <input
                              type="file"
                              accept="image/png, image/jpeg, image/jpg, image/webp, image/svg+xml"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleCustomQrUpload(file, false);
                              }}
                            />
                          </label>
                        </div>
                      </div>
                    )}

                    {/* QR Code Details & Preview Strip */}
                    {formState.qr_image_url && (
                      <div className="flex items-center gap-3 p-3 bg-white rounded-2xl border border-emerald-200 shadow-xs">
                        <img
                          src={formState.qr_image_url}
                          alt="QR Preview"
                          className="w-14 h-16 object-contain rounded-xl border border-gray-200 bg-white shrink-0 p-0.5"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-emerald-800 text-amber-200">
                              {formState.qr_code_type === 'CUSTOM' ? 'MANUAL QR IMAGE' : formState.qr_code_type}
                            </span>
                            <span className="text-[10px] text-emerald-800 font-bold">
                              &le; 100 KB Validated ✓
                            </span>
                          </div>
                          <span className="text-xs font-bold text-emerald-950 block truncate mt-1">
                            {formState.qr_label || formState.qr_code_type}
                          </span>
                          <span className="text-[10px] text-gray-400 block truncate">
                            Branded QR code attached to notification payload
                          </span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => setZoomQrModal({
                              isOpen: true,
                              title: formState.title || 'Attached QR Code',
                              label: formState.qr_label,
                              imageUrl: formState.qr_image_url,
                              type: formState.qr_code_type
                            })}
                            className="p-1.5 text-emerald-800 hover:bg-emerald-50 rounded-lg text-xs font-bold flex items-center gap-1 border border-emerald-200 cursor-pointer"
                            title="Zoom QR"
                          >
                            <ZoomIn className="w-3.5 h-3.5" />
                          </button>
                          {formState.qr_code_type === 'CUSTOM' && (
                            <button
                              type="button"
                              onClick={() => handleClearCustomQr(false)}
                              className="p-1.5 text-rose-700 hover:bg-rose-50 rounded-lg text-xs font-bold flex items-center gap-1 border border-rose-200 cursor-pointer"
                              title="Reset to Default Preset"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    )}

                    {/* QR Label Input */}
                    <div>
                      <label className="block font-bold text-gray-700 mb-1">
                        QR Code Label / Caption (Displayed on thumbnail & preview)
                      </label>
                      <input
                        type="text"
                        value={formState.qr_label}
                        onChange={(e) => setFormState({ ...formState, qr_label: e.target.value })}
                        placeholder="e.g. Scan with UPI / PhonePe / GPay"
                        className="w-full p-2.5 bg-white border border-gray-200 rounded-xl text-xs font-medium"
                      />
                    </div>

                    {/* In-Message QR Inclusion Box */}
                    <div className="p-3 bg-white rounded-xl border border-emerald-200 space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formState.include_qr_message}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              const snippet = formState.qr_message_snippet || buildDefaultQrSnippet(formState.qr_code_type, formState.qr_label);
                              let updatedContent = formState.content;
                              if (checked && !updatedContent.includes(snippet.trim()) && !updatedContent.includes('[SCAN')) {
                                updatedContent = `${updatedContent.trim()}\n\n${snippet}`;
                              }
                              setFormState({
                                ...formState,
                                include_qr_message: checked,
                                content: updatedContent
                              });
                            }}
                            className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                          />
                          <span className="font-extrabold text-emerald-950 text-xs flex items-center gap-1">
                            <span>Include QR Instructions in Message Body</span>
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 font-bold">Auto-Sync</span>
                          </span>
                        </label>

                        <button
                          type="button"
                          onClick={() => insertQrSnippetIntoContent(formState.qr_message_snippet || buildDefaultQrSnippet(formState.qr_code_type, formState.qr_label), false)}
                          className="text-[10px] font-black px-2.5 py-1 bg-emerald-800 hover:bg-emerald-900 text-white rounded-lg shadow-xs flex items-center gap-1 cursor-pointer"
                        >
                          <Plus className="w-3 h-3" />
                          <span>Insert QR Text into Message ↵</span>
                        </button>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-gray-600 mb-1">
                          QR Scanning Instructions to include:
                        </label>
                        <textarea
                          rows={2}
                          value={formState.qr_message_snippet || ''}
                          onChange={(e) => setFormState({ ...formState, qr_message_snippet: e.target.value })}
                          placeholder="e.g. 📲 [SCAN TO PAY]: Please scan the attached QR code image with any UPI app..."
                          className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-sans text-gray-800"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Live Card Simulator Preview */}
              <div className="p-3.5 bg-gray-50 rounded-2xl border border-gray-200 space-y-2">
                <span className="text-[11px] font-extrabold text-gray-700 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                  <span>Customer Message Preview Simulator:</span>
                </span>
                <div className="bg-white p-3.5 rounded-xl border border-emerald-100 shadow-xs space-y-2">
                  <div className="text-xs text-gray-800 whitespace-pre-wrap leading-relaxed">
                    {formState.content || 'Hi [Customer Name], your template preview will appear here.'}
                  </div>
                  {formState.has_qr_code && formState.qr_image_url && (
                    <div className="pt-2 border-t border-dashed border-emerald-200 flex items-center gap-2.5">
                      <img
                        src={formState.qr_image_url}
                        alt="QR Attachment Preview"
                        className="w-12 h-14 object-contain rounded-lg border border-emerald-300 bg-white shrink-0 p-0.5"
                      />
                      <div className="min-w-0">
                        <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-emerald-800 text-amber-200 uppercase">
                          Attached QR
                        </span>
                        <p className="text-[11px] font-bold text-emerald-950 truncate mt-0.5">
                          {formState.qr_label || 'Scan with Camera / App'}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 font-bold rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-800 hover:bg-emerald-900 text-white font-extrabold rounded-xl shadow cursor-pointer"
                >
                  Create Template
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PREVIEW TEMPLATE MODAL */}
      {previewTemplate && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-emerald-100 space-y-4 animate-fadeIn">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <h3 className="font-extrabold text-emerald-950 text-base flex items-center gap-2">
                <FileText className="w-5 h-5 text-emerald-700" />
                <span>{previewTemplate.title}</span>
              </h3>
              <button onClick={() => setPreviewTemplate(null)} className="text-gray-400 hover:text-gray-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 p-3 rounded-2xl">
                <div>
                  <p className="text-[10px] text-gray-600 font-medium">Backend Status Code</p>
                  <p className="text-sm font-extrabold text-emerald-950 font-mono">{previewTemplate.backend_status_code}</p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-black uppercase px-2 py-1 rounded bg-emerald-200 text-emerald-900 block">
                    {previewTemplate.category} • {previewTemplate.channel}
                  </span>
                  {(previewTemplate.include_qr_message || previewTemplate.content.includes('[QR') || previewTemplate.content.toLowerCase().includes('qr') || previewTemplate.content.toLowerCase().includes('scan the attached')) && (
                    <span className="text-[9px] font-bold text-emerald-800 mt-1 inline-flex items-center gap-0.5">
                      <Check className="w-3 h-3 text-emerald-700" /> In-Message QR Included
                    </span>
                  )}
                </div>
              </div>

              {/* QR Preview if attached */}
              {previewTemplate.has_qr_code && previewTemplate.qr_image_url && (
                <div className="p-3 bg-gradient-to-r from-emerald-50 to-amber-50 rounded-2xl border border-emerald-200 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={previewTemplate.qr_image_url}
                      alt="QR Code"
                      className="w-16 h-20 object-contain rounded-xl border border-emerald-300 bg-white shrink-0 shadow-xs p-1"
                    />
                    <div className="min-w-0">
                      <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-emerald-800 text-amber-200">
                        {previewTemplate.qr_code_type === 'CUSTOM' ? 'MANUAL QR IMAGE' : (previewTemplate.qr_code_type || 'ATTACHED QR')}
                      </span>
                      <p className="text-xs font-extrabold text-emerald-950 mt-1 truncate">
                        {previewTemplate.qr_label || 'Scan with Camera / Payment App'}
                      </p>
                      <p className="text-[10px] text-gray-500 font-medium">
                        Branded payload image attached
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => setZoomQrModal({
                        isOpen: true,
                        title: previewTemplate.title,
                        label: previewTemplate.qr_label,
                        imageUrl: previewTemplate.qr_image_url,
                        type: previewTemplate.qr_code_type
                      })}
                      className="px-2.5 py-1 text-[11px] font-bold bg-white text-emerald-800 hover:bg-emerald-100 rounded-lg border border-emerald-300 flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <ZoomIn className="w-3 h-3" />
                      <span>Enlarge</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDownloadQr(previewTemplate.qr_image_url!, previewTemplate.title)}
                      className="px-2.5 py-1 text-[11px] font-bold bg-emerald-800 text-white hover:bg-emerald-900 rounded-lg shadow-xs flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Download className="w-3 h-3" />
                      <span>Download</span>
                    </button>
                  </div>
                </div>
              )}

              <div className="bg-gray-50 border border-gray-200 p-4 rounded-2xl text-xs text-gray-900 font-sans whitespace-pre-wrap leading-relaxed max-h-56 overflow-y-auto">
                {previewTemplate.content}
              </div>
            </div>

            <div className="flex justify-between items-center pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={() => copyToClipboard(previewTemplate.content)}
                className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs rounded-xl flex items-center gap-1 cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5 text-emerald-700" />
                <span>Copy Message Body</span>
              </button>
              <button
                onClick={() => setPreviewTemplate(null)}
                className="px-5 py-2 bg-emerald-800 text-white font-bold text-xs rounded-xl shadow cursor-pointer"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default MessageTemplatesPage;
