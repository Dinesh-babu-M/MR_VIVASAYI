import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Star, CheckCircle2, X, Plus, Edit2, Trash2, Search, Filter,
  RefreshCw, ShieldAlert, MessageSquare, Globe, ThumbsUp, ThumbsDown,
  UserCheck, Check, Building2, Package, Layers, Sparkles, RotateCcw,
  Eye, EyeOff, CheckSquare, Square, Image as ImageIcon, ExternalLink,
  Calendar, Clock, Phone, Hash, ChevronLeft, ChevronRight,
  SlidersHorizontal, Table, LayoutGrid, Upload, ArrowUpDown, Send
} from 'lucide-react';
import { formatDate, compressImageToMax100KB } from '../../lib/utils';
import { Review, ReviewStatus, Product } from '../../types';
import { useNotifications } from '../../contexts/NotificationContext';
import { getJSONStore, setJSONStore } from '../../lib/dbManager';
import { RefreshSpinnerModal } from '../../components/common/RefreshSpinnerModal';
import { AdminPageSkeleton } from '../../components/common/Skeleton';
import { useActionModal } from '../../contexts/ActionModalContext';
import toast from 'react-hot-toast';

// Smart Auto Title Generator based on Product and Star Rating
function generateSmartTitle(productName?: string, rating: number = 5): string {
  const pLower = (productName || '').toLowerCase();
  const isOil = pLower.includes('oil') || pLower.includes('marachekku') || pLower.includes('chekku');
  const isRice = pLower.includes('rice') || pLower.includes('samba') || pLower.includes('kavuni') || pLower.includes('arisi');
  const isMillet = pLower.includes('millet') || pLower.includes('varagu') || pLower.includes('thinai') || pLower.includes('kuthiraivali');

  if (rating === 5) {
    if (isOil) return 'Pure Marachekku Cold-Pressed Aroma & Outstanding Taste!';
    if (isRice) return 'Authentic Native Heirloom Rice - Wholesome Family Health!';
    if (isMillet) return 'Clean, Stone-Free & Highly Nutritious Traditional Millets!';
    return 'Exceptional Organic Freshness & Superior Traditional Quality!';
  } else if (rating === 4) {
    if (isOil) return 'Very Good Cold-Pressed Oil with Natural Nutty Aroma';
    if (isRice) return 'Great Unpolished Traditional Grain Quality';
    return 'Very Satisfied with Fresh Quality & Fast Home Delivery';
  } else if (rating === 3) {
    return 'Good Traditional Product & Honest Chemical-Free Sourcing';
  } else if (rating === 2) {
    return 'Fair Product Quality - Packaging Needs Improvement';
  } else {
    return 'Product or Delivery Did Not Meet Expectations';
  }
}

// Format relative time helper
function formatTimeBadge(dateString?: string): { relative: string; full: string } {
  if (!dateString) return { relative: 'Recently', full: 'No date' };
  try {
    const d = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    let relative = '';
    if (diffMins < 5) relative = '⚡ Just now';
    else if (diffMins < 60) relative = `${diffMins}m ago`;
    else if (diffHours < 24) relative = `${diffHours}h ago`;
    else if (diffDays === 1) relative = 'Yesterday';
    else if (diffDays < 7) relative = `${diffDays}d ago`;
    else relative = d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' });

    const full = d.toLocaleString('en-IN', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    return { relative, full };
  } catch {
    return { relative: 'Recently', full: dateString };
  }
}

export default function ReviewsPage() {
  const { addNotification } = useNotifications();
  const { showActionModal } = useActionModal();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  // View Mode: 'table' (scrolling table) or 'grid' (3D cards)
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');

  // Filter & Search States
  const [activeTab, setActiveTab] = useState<'ALL' | 'APPROVED' | 'PENDING' | 'REJECTED'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [ratingFilter, setRatingFilter] = useState<'ALL' | number>('ALL');
  const [productFilter, setProductFilter] = useState<'ALL' | string>('ALL');
  const [autoApproveEnabled, setAutoApproveEnabled] = useState(true);

  // Multiple Select State
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Add / Edit Modal State
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [editingReview, setEditingReview] = useState<Review | null>(null);
  const [reviewFormData, setReviewFormData] = useState({
    customer_name: '',
    customer_phone: '',
    customer_location: 'Cumbum, Tamil Nadu',
    order_id: '',
    product_id: '',
    rating: 5,
    title: '',
    body: '',
    image_url: '',
    is_verified_purchase: true,
    is_featured: true,
    status: 'APPROVED' as ReviewStatus,
    admin_reply: ''
  });

  // Image Upload & Strict <= 100 KB Client Compression State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isCompressingImage, setIsCompressingImage] = useState(false);
  const [imageSizeKB, setImageSizeKB] = useState<number | null>(null);

  // Yes / No Confirmation Popup Modal State for EVERY action in CRM
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    details?: string;
    confirmText?: string;
    cancelText?: string;
    type?: 'danger' | 'warning' | 'success' | 'info';
    onConfirm: () => void | Promise<void>;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });

  const openConfirmModal = (cfg: {
    title: string;
    message: string;
    details?: string;
    confirmText?: string;
    cancelText?: string;
    type?: 'danger' | 'warning' | 'success' | 'info';
    onConfirm: () => void | Promise<void>;
  }) => {
    setConfirmModal({
      isOpen: true,
      ...cfg
    });
  };

  const closeConfirmModal = () => {
    setConfirmModal(prev => ({ ...prev, isOpen: false }));
  };

  // Delete Modal State
  const [deletingReview, setDeletingReview] = useState<Review | null>(null);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  // Lightbox Image Preview Modal
  const [lightboxImg, setLightboxImg] = useState<string | null>(null);

  // Admin Quick Reply Modal
  const [replyingReview, setReplyingReview] = useState<Review | null>(null);
  const [quickReplyText, setQuickReplyText] = useState('');

  // Refresh spinner
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Load reviews and products from live database
  const loadData = async () => {
    try {
      setLoading(true);
      const [r, p] = await Promise.all([
        getJSONStore<Review>('reviews'),
        getJSONStore<Product>('products')
      ]);
      setReviews(r || []);
      setProducts(p || []);
    } catch (err) {
      console.error('Error loading reviews:', err);
      toast.error('Failed to load reviews data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Synchronize state with store
  const persistReviews = async (updated: Review[]) => {
    setReviews(updated);
    await setJSONStore('reviews', updated);
  };

  // Metrics calculation
  const metrics = useMemo(() => {
    const totalCount = reviews.length;
    const approvedCount = reviews.filter(r => r.status === 'APPROVED').length;
    const pendingCount = reviews.filter(r => r.status === 'PENDING').length;
    const rejectedCount = reviews.filter(r => r.status === 'REJECTED' || r.status === 'HIDDEN').length;
    const totalRatingSum = reviews.reduce((sum, r) => sum + (Number(r.rating) || 5), 0);
    const avgRating = totalCount > 0 ? (totalRatingSum / totalCount).toFixed(1) : '5.0';

    return { totalCount, approvedCount, pendingCount, rejectedCount, avgRating };
  }, [reviews]);

  // Filtered reviews
  const filteredReviews = useMemo(() => {
    return reviews.filter(r => {
      // Tab filter
      if (activeTab === 'APPROVED' && r.status !== 'APPROVED') return false;
      if (activeTab === 'PENDING' && r.status !== 'PENDING') return false;
      if (activeTab === 'REJECTED' && r.status !== 'REJECTED' && r.status !== 'HIDDEN') return false;

      // Rating filter
      if (ratingFilter !== 'ALL' && r.rating !== Number(ratingFilter)) return false;

      // Product filter
      if (productFilter !== 'ALL' && r.product_id !== productFilter) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const name = String(r.customer_name || '').toLowerCase();
        const phone = String(r.customer_phone || '').toLowerCase();
        const orderId = String(r.order_id || '').toLowerCase();
        const body = String(r.body || '').toLowerCase();
        const title = String(r.title || '').toLowerCase();
        const loc = String(r.customer_location || '').toLowerCase();
        if (
          !name.includes(q) &&
          !phone.includes(q) &&
          !orderId.includes(q) &&
          !body.includes(q) &&
          !title.includes(q) &&
          !loc.includes(q)
        ) {
          return false;
        }
      }
      return true;
    });
  }, [reviews, activeTab, ratingFilter, productFilter, searchQuery]);

  // Pagination calculation
  const totalPages = Math.ceil(filteredReviews.length / itemsPerPage) || 1;
  const paginatedReviews = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredReviews.slice(start, start + itemsPerPage);
  }, [filteredReviews, currentPage, itemsPerPage]);

  // Multiple selection helpers
  const isAllPaginatedSelected =
    paginatedReviews.length > 0 && paginatedReviews.every(r => selectedIds.has(r.id));

  const toggleSelectAll = () => {
    if (isAllPaginatedSelected) {
      setSelectedIds(prev => {
        const next = new Set(prev);
        paginatedReviews.forEach(r => next.delete(r.id));
        return next;
      });
    } else {
      setSelectedIds(prev => {
        const next = new Set(prev);
        paginatedReviews.forEach(r => next.add(r.id));
        return next;
      });
    }
  };

  const toggleSelectOne = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Reset Filters Handler
  const handleResetFilters = () => {
    setActiveTab('ALL');
    setSearchQuery('');
    setRatingFilter('ALL');
    setProductFilter('ALL');
    setCurrentPage(1);
    toast.success('All filters reset to default');
  };

  const hasActiveFilters =
    activeTab !== 'ALL' ||
    searchQuery.trim() !== '' ||
    ratingFilter !== 'ALL' ||
    productFilter !== 'ALL';

  // Client-side image upload with automatic <= 100 KB compression
  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsCompressingImage(true);
      toast.loading('Compressing image to ≤ 100 KB...', { id: 'crm-img-compress' });
      const { dataUrl, sizeKB } = await compressImageToMax100KB(file);
      setReviewFormData(prev => ({
        ...prev,
        image_url: dataUrl
      }));
      setImageSizeKB(sizeKB);
      toast.success(`Image compressed to ${sizeKB} KB (Strictly ≤ 100 KB limit)!`, { id: 'crm-img-compress' });
    } catch (err: any) {
      console.error('Image compression error:', err);
      toast.error(err?.message || 'Failed to compress image', { id: 'crm-img-compress' });
    } finally {
      setIsCompressingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // 1-Click Alive / Unlive Toggle with Yes/No Confirmation Modal
  const executeToggleAlive = async (review: Review) => {
    const isCurrentlyAlive = review.status === 'APPROVED';
    const newStatus: ReviewStatus = isCurrentlyAlive ? 'HIDDEN' : 'APPROVED';

    const updated = reviews.map(r =>
      r.id === review.id ? { ...r, status: newStatus, updated_at: new Date().toISOString() } : r
    );
    await persistReviews(updated);

    toast.success(
      isCurrentlyAlive
        ? `Review by "${review.customer_name}" is now UNLIVE (Hidden from website)`
        : `Review by "${review.customer_name}" is now ALIVE (Published to website)!`
    );

    addNotification({
      title: isCurrentlyAlive ? 'Review Set to Unlive' : 'Review Set to Alive',
      message: `Review by "${review.customer_name}" status changed to ${newStatus}.`,
      type: isCurrentlyAlive ? 'warning' : 'success',
      sourceModule: 'Reviews CRM'
    });
  };

  const handleToggleAlive = (review: Review) => {
    const isCurrentlyAlive = review.status === 'APPROVED';
    openConfirmModal({
      title: isCurrentlyAlive ? 'Set Review to UNLIVE (Hide)?' : 'Set Review to ALIVE (Publish)?',
      message: isCurrentlyAlive
        ? `Are you sure you want to hide the review by "${review.customer_name}" from the public storefront?`
        : `Are you sure you want to publish the review by "${review.customer_name}" live to the public website?`,
      details: isCurrentlyAlive
        ? 'Shoppers will not see this review until you set it to Alive again.'
        : 'The review, customer rating, and any attached photos will be visible to all visitors immediately.',
      confirmText: isCurrentlyAlive ? 'Yes, Set Unlive' : 'Yes, Make Alive',
      cancelText: 'No, Cancel',
      type: isCurrentlyAlive ? 'warning' : 'success',
      onConfirm: async () => {
        closeConfirmModal();
        await executeToggleAlive(review);
      }
    });
  };

  // Bulk Alive (Bulk Approve) with Yes/No Confirmation Modal
  const executeBulkAlive = async () => {
    if (selectedIds.size === 0) return;
    showActionModal({
      title: 'Bulk Publishing Reviews (Set Alive)',
      subtitle: `Making ${selectedIds.size} customer reviews live on website...`,
      badge: 'Bulk Actions',
      duration: 650,
      steps: [
        'Updating review approval flags...',
        'Syncing rating aggregates with storefront...',
        'Reviews published live!'
      ],
      onComplete: async () => {
        const updated = reviews.map(r =>
          selectedIds.has(r.id) ? { ...r, status: 'APPROVED' as ReviewStatus, updated_at: new Date().toISOString() } : r
        );
        await persistReviews(updated);
        toast.success(`Published ${selectedIds.size} reviews live to website!`);
        setSelectedIds(new Set());
      }
    });
  };

  const handleBulkAlive = () => {
    if (selectedIds.size === 0) return;
    openConfirmModal({
      title: `Publish ${selectedIds.size} Selected Reviews?`,
      message: `Are you sure you want to set all ${selectedIds.size} selected reviews to ALIVE on the public website?`,
      details: 'All selected customer feedback and star ratings will become visible to online visitors.',
      confirmText: `Yes, Publish All (${selectedIds.size})`,
      cancelText: 'No, Cancel',
      type: 'success',
      onConfirm: async () => {
        closeConfirmModal();
        await executeBulkAlive();
      }
    });
  };

  // Bulk Unlive (Bulk Hide) with Yes/No Confirmation Modal
  const executeBulkUnlive = async () => {
    if (selectedIds.size === 0) return;
    showActionModal({
      title: 'Bulk Unpublishing Reviews (Set Unlive)',
      subtitle: `Hiding ${selectedIds.size} customer reviews from storefront...`,
      badge: 'Bulk Actions',
      duration: 650,
      steps: [
        'Updating review status to HIDDEN...',
        'Recalculating public average scores...',
        'Reviews removed from public storefront!'
      ],
      onComplete: async () => {
        const updated = reviews.map(r =>
          selectedIds.has(r.id) ? { ...r, status: 'HIDDEN' as ReviewStatus, updated_at: new Date().toISOString() } : r
        );
        await persistReviews(updated);
        toast.success(`Set ${selectedIds.size} reviews to UNLIVE (hidden from public)!`);
        setSelectedIds(new Set());
      }
    });
  };

  const handleBulkUnlive = () => {
    if (selectedIds.size === 0) return;
    openConfirmModal({
      title: `Hide ${selectedIds.size} Selected Reviews?`,
      message: `Are you sure you want to set all ${selectedIds.size} selected reviews to UNLIVE (Hidden)?`,
      details: 'They will be safely hidden from the storefront while remaining in your database.',
      confirmText: `Yes, Hide All (${selectedIds.size})`,
      cancelText: 'No, Cancel',
      type: 'warning',
      onConfirm: async () => {
        closeConfirmModal();
        await executeBulkUnlive();
      }
    });
  };

  // Bulk Set 5-Star with Yes/No Confirmation Modal
  const executeBulkSet5Star = async () => {
    if (selectedIds.size === 0) return;
    const updated = reviews.map(r =>
      selectedIds.has(r.id) ? { ...r, rating: 5, updated_at: new Date().toISOString() } : r
    );
    await persistReviews(updated);
    toast.success(`Set ${selectedIds.size} reviews to 5 Stars!`);
    setSelectedIds(new Set());
  };

  const handleBulkSet5Star = () => {
    if (selectedIds.size === 0) return;
    openConfirmModal({
      title: `Set ${selectedIds.size} Reviews to 5 Stars?`,
      message: `Are you sure you want to update all ${selectedIds.size} selected customer reviews to 5 Stars?`,
      details: 'Rating calculations and storefront score badges will update instantly.',
      confirmText: `Yes, Set 5 Stars (${selectedIds.size})`,
      cancelText: 'No, Cancel',
      type: 'info',
      onConfirm: async () => {
        closeConfirmModal();
        await executeBulkSet5Star();
      }
    });
  };

  // Bulk Delete with Yes/No Confirmation Modal
  const handleBulkDelete = () => {
    if (selectedIds.size === 0) return;
    openConfirmModal({
      title: `Permanently Delete ${selectedIds.size} Reviews?`,
      message: `Are you sure you want to permanently delete all ${selectedIds.size} selected reviews?`,
      details: 'This will permanently erase these reviews from the database. This action cannot be undone.',
      confirmText: `Yes, Delete All (${selectedIds.size})`,
      cancelText: 'No, Keep Them',
      type: 'danger',
      onConfirm: async () => {
        closeConfirmModal();
        await confirmBulkDelete();
      }
    });
  };

  const confirmBulkDelete = async () => {
    setBulkDeleting(false);
    const count = selectedIds.size;
    showActionModal({
      title: 'Deleting Selected Reviews',
      subtitle: `Permanently removing ${count} reviews from database...`,
      badge: 'Review Cleanup',
      duration: 700,
      steps: [
        'Purging review records from storage...',
        'Recalculating store feedback scores...',
        'Reviews deleted successfully!'
      ],
      onComplete: async () => {
        const updated = reviews.filter(r => !selectedIds.has(r.id));
        await persistReviews(updated);
        toast.success(`Deleted ${count} reviews permanently.`);
        setSelectedIds(new Set());
      }
    });
  };

  // Open Add Review Modal
  const handleOpenAddReview = () => {
    setEditingReview(null);
    setImageSizeKB(null);
    const initialProduct = products[0]?.id || '';
    const initialProdObj = products.find(p => p.id === initialProduct);
    const initialTitle = generateSmartTitle(initialProdObj?.name, 5);

    setReviewFormData({
      customer_name: '',
      customer_phone: '',
      customer_location: 'Cumbum, Tamil Nadu',
      order_id: `ORD-${Math.floor(1000 + Math.random() * 9000)}`,
      product_id: initialProduct,
      rating: 5,
      title: initialTitle,
      body: '',
      image_url: '',
      is_verified_purchase: true,
      is_featured: true,
      status: 'APPROVED',
      admin_reply: 'Thank you for supporting MR. VIVASAYI native organic farmers!'
    });
    setShowReviewModal(true);
  };

  // Open Edit Review Modal
  const handleOpenEditReview = (review: Review) => {
    setEditingReview(review);
    setImageSizeKB(null);
    setReviewFormData({
      customer_name: review.customer_name,
      customer_phone: review.customer_phone || '',
      customer_location: review.customer_location || 'Tamil Nadu',
      order_id: review.order_id || '',
      product_id: review.product_id || products[0]?.id || '',
      rating: review.rating,
      title: review.title || '',
      body: review.body,
      image_url: review.image_url || review.images?.[0] || '',
      is_verified_purchase: review.is_verified_purchase,
      is_featured: review.is_featured,
      status: review.status,
      admin_reply: review.admin_reply || ''
    });
    setShowReviewModal(true);
  };

  // Save (Add or Edit) Review with Yes/No Confirmation Modal
  const handleSaveReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewFormData.customer_name.trim() || !reviewFormData.body.trim()) {
      toast.error('Customer name and review text are required');
      return;
    }

    const isEdit = Boolean(editingReview);
    openConfirmModal({
      title: isEdit ? 'Update Customer Review?' : 'Publish New Customer Review?',
      message: isEdit
        ? `Are you sure you want to save changes to the review for "${reviewFormData.customer_name}"?`
        : `Are you sure you want to add and publish this new review for "${reviewFormData.customer_name}"?`,
      details: `Visibility: ${reviewFormData.status === 'APPROVED' ? 'ALIVE (Live on Public Store)' : 'UNLIVE (Hidden)'}.`,
      confirmText: isEdit ? 'Yes, Update Review' : 'Yes, Publish Review',
      cancelText: 'No, Keep Editing',
      type: 'success',
      onConfirm: async () => {
        closeConfirmModal();
        await executeSaveReview();
      }
    });
  };

  const executeSaveReview = async () => {
    const isEdit = Boolean(editingReview);
    setShowReviewModal(false);

    showActionModal({
      title: isEdit ? 'Updating Customer Review' : 'Publishing Customer Review',
      subtitle: `Saving feedback for "${reviewFormData.customer_name}"...`,
      badge: 'Reviews Live Engine',
      duration: 650,
      steps: [
        'Validating review content and star rating...',
        'Persisting to customer reviews repository...',
        'Storefront reviews synced live!'
      ],
      onComplete: async () => {
        let updated: Review[];
        if (isEdit && editingReview) {
          updated = reviews.map(r =>
            r.id === editingReview.id
              ? {
                  ...r,
                  ...reviewFormData,
                  image_url: reviewFormData.image_url.trim() || undefined,
                  images: reviewFormData.image_url.trim() ? [reviewFormData.image_url.trim()] : undefined,
                  updated_at: new Date().toISOString()
                }
              : r
          );
          toast.success(`Review for "${reviewFormData.customer_name}" updated!`);
        } else {
          const newReview: Review = {
            id: `rev-${Date.now()}`,
            ...reviewFormData,
            image_url: reviewFormData.image_url.trim() || undefined,
            images: reviewFormData.image_url.trim() ? [reviewFormData.image_url.trim()] : undefined,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
          updated = [newReview, ...reviews];
          toast.success(`New review added & LIVE on website!`);
        }

        await persistReviews(updated);
      }
    });
  };

  // Single Delete Review with Yes/No Confirmation Modal
  const handleDeleteReviewClick = (review: Review) => {
    openConfirmModal({
      title: `Delete Review by "${review.customer_name}"?`,
      message: `Are you sure you want to permanently delete this ${review.rating}-star review?`,
      details: 'This will permanently remove the review and any attached photos from both CRM and the public website.',
      confirmText: 'Yes, Delete Review',
      cancelText: 'No, Keep Review',
      type: 'danger',
      onConfirm: async () => {
        closeConfirmModal();
        await executeDeleteReview(review);
      }
    });
  };

  const executeDeleteReview = async (target: Review) => {
    setDeletingReview(null);

    showActionModal({
      title: 'Removing Customer Review',
      subtitle: `Deleting review from "${target.customer_name}"...`,
      badge: 'Review Cleanup',
      duration: 600,
      steps: [
        'Removing review from public store...',
        'Updating review aggregates...',
        'Review deleted successfully!'
      ],
      onComplete: async () => {
        const updated = reviews.filter(r => r.id !== target.id);
        await persistReviews(updated);
        toast.success(`Review by "${target.customer_name}" removed.`);
      }
    });
  };

  // Open Quick Reply Modal
  const handleOpenReplyModal = (review: Review) => {
    setReplyingReview(review);
    setQuickReplyText(review.admin_reply || '');
  };

  const handleSaveQuickReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyingReview) return;
    const targetName = replyingReview.customer_name;
    openConfirmModal({
      title: `Publish Reply to "${targetName}"?`,
      message: `Are you sure you want to publish this store reply live on the website?`,
      details: 'Your reply will be displayed publicly beneath this customer\'s review.',
      confirmText: 'Yes, Publish Reply',
      cancelText: 'No, Keep Editing',
      type: 'success',
      onConfirm: async () => {
        closeConfirmModal();
        await executeSaveQuickReply();
      }
    });
  };

  const executeSaveQuickReply = async () => {
    if (!replyingReview) return;

    const targetId = replyingReview.id;
    const replyText = quickReplyText.trim();
    setReplyingReview(null);

    const updated = reviews.map(r =>
      r.id === targetId
        ? {
            ...r,
            admin_reply: replyText || undefined,
            admin_reply_at: replyText ? new Date().toISOString() : undefined,
            updated_at: new Date().toISOString()
          }
        : r
    );
    await persistReviews(updated);
    toast.success('Admin reply saved & updated live on website!');
  };

  if (loading) {
    return <AdminPageSkeleton title="Customer Reviews & Ratings Manager" />;
  }

  return (
    <div className="space-y-6 font-sans pb-24">
      
      {/* Refresh Spinner Modal */}
      <RefreshSpinnerModal
        isOpen={isRefreshing}
        moduleName="Reviews CRM"
        title="Syncing Customer Reviews & Ratings..."
        subtitle="Refreshing 5-star testimonials, verified purchases & live approval flags..."
        onComplete={() => {
          setIsRefreshing(false);
          loadData();
        }}
      />

      {/* ================= HEADER BAR ================= */}
      <div className="bg-white dark:bg-emerald-950 p-6 sm:p-7 rounded-3xl shadow-sm border border-emerald-100 dark:border-emerald-800 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-bold font-serif text-gray-900 dark:text-emerald-100 flex items-center gap-2.5">
              <Star className="w-8 h-8 text-amber-500 fill-amber-400" />
              <span>Customer Reviews &amp; Ratings Manager</span>
            </h1>
            <span className="px-3 py-1 rounded-full text-xs font-black bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700 flex items-center gap-1">
              <Globe className="w-3.5 h-3.5 text-emerald-600 dark:text-amber-400" />
              <span>Live Website Sync</span>
            </span>
          </div>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-emerald-300">
            Moderate customer feedback, manage 1-5 star ratings, toggle live storefront visibility, and attach product photos.
          </p>

          {/* Auto-Approval Active Notice */}
          <div className="pt-1 flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-900/60 px-3 py-1 rounded-xl border border-emerald-200 dark:border-emerald-700">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Auto-Approval Active: New customer reviews appear <strong>LIVE</strong> automatically</span>
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* View Mode Toggle */}
          <div className="inline-flex rounded-2xl p-1 bg-emerald-50/70 dark:bg-emerald-900/60 border border-emerald-200 dark:border-emerald-700 shadow-2xs">
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                viewMode === 'table'
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'text-gray-600 dark:text-emerald-300 hover:text-emerald-900'
              }`}
              title="Scrolling Table View"
            >
              <Table className="w-4 h-4" />
              <span>Table</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                viewMode === 'grid'
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'text-gray-600 dark:text-emerald-300 hover:text-emerald-900'
              }`}
              title="3D Card Grid View"
            >
              <LayoutGrid className="w-4 h-4" />
              <span>3D Cards</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => setIsRefreshing(true)}
            className="px-3.5 py-2.5 bg-white dark:bg-emerald-900 border border-emerald-200 dark:border-emerald-700 hover:bg-emerald-50 text-emerald-900 dark:text-emerald-200 font-bold text-xs rounded-2xl shadow-xs flex items-center gap-1.5 transition cursor-pointer"
            title="Refresh database"
          >
            <RefreshCw className="w-4 h-4 text-emerald-600 dark:text-amber-400" />
            <span>Refresh</span>
          </button>

          <button
            type="button"
            onClick={handleOpenAddReview}
            className="px-5 py-2.5 bg-gradient-to-r from-emerald-700 to-emerald-800 hover:from-emerald-800 hover:to-emerald-900 text-white font-extrabold text-xs rounded-2xl shadow-md transition flex items-center gap-2 group cursor-pointer"
          >
            <Plus className="w-4 h-4 text-amber-300 group-hover:rotate-90 transition-transform duration-300" />
            <span>Add Review</span>
          </button>
        </div>
      </div>

      {/* ================= 4 OVERVIEW METRIC CARDS ================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1 */}
        <div className="bg-white dark:bg-emerald-900/40 p-5 rounded-3xl border border-emerald-100 dark:border-emerald-800 shadow-sm relative overflow-hidden group hover:shadow-md transition">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-bold text-gray-500 dark:text-emerald-400 uppercase tracking-wider">Average Rating</p>
              <h3 className="text-3xl font-black text-amber-600 dark:text-amber-400 mt-1 flex items-center gap-1.5">
                {metrics.avgRating} <Star className="w-6 h-6 fill-amber-400 text-amber-500" />
              </h3>
              <p className="text-[11px] text-emerald-700 dark:text-emerald-300 font-medium mt-1">Based on {metrics.totalCount} ratings</p>
            </div>
            <div className="p-3 rounded-2xl bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 group-hover:scale-110 transition-transform">
              <Star className="w-6 h-6 fill-amber-400" />
            </div>
          </div>
        </div>

        {/* Card 2 */}
        <div className="bg-white dark:bg-emerald-900/40 p-5 rounded-3xl border border-emerald-100 dark:border-emerald-800 shadow-sm relative overflow-hidden group hover:shadow-md transition">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-bold text-gray-500 dark:text-emerald-400 uppercase tracking-wider">Total Feedback</p>
              <h3 className="text-3xl font-black text-gray-900 dark:text-emerald-100 mt-1">{metrics.totalCount}</h3>
              <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold mt-1 flex items-center gap-1">
                <MessageSquare className="w-3.5 h-3.5" /> Direct Tamil Nadu customers
              </p>
            </div>
            <div className="p-3 rounded-2xl bg-emerald-100 dark:bg-emerald-800 text-emerald-700 dark:text-amber-300 group-hover:scale-110 transition-transform">
              <MessageSquare className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Card 3 */}
        <div className="bg-white dark:bg-emerald-900/40 p-5 rounded-3xl border border-emerald-100 dark:border-emerald-800 shadow-sm relative overflow-hidden group hover:shadow-md transition">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-bold text-gray-500 dark:text-emerald-400 uppercase tracking-wider">Alive / Published</p>
              <h3 className="text-3xl font-black text-emerald-700 dark:text-emerald-300 mt-1">{metrics.approvedCount} Live</h3>
              <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold mt-1 flex items-center gap-1">
                <Globe className="w-3.5 h-3.5" /> Visible on public storefront
              </p>
            </div>
            <div className="p-3 rounded-2xl bg-emerald-100 dark:bg-emerald-800 text-emerald-700 dark:text-emerald-300 group-hover:scale-110 transition-transform">
              <CheckCircle2 className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Card 4 */}
        <div className="bg-white dark:bg-emerald-900/40 p-5 rounded-3xl border border-amber-200 dark:border-amber-800/60 shadow-sm relative overflow-hidden group hover:shadow-md transition">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-bold text-amber-800 dark:text-amber-400 uppercase tracking-wider">Unlive / Hidden</p>
              <h3 className="text-3xl font-black text-amber-600 dark:text-amber-300 mt-1">{metrics.pendingCount + metrics.rejectedCount}</h3>
              <p className="text-[11px] text-amber-700 dark:text-amber-400 font-semibold mt-1 flex items-center gap-1">
                <EyeOff className="w-3.5 h-3.5" /> Hidden from public store
              </p>
            </div>
            <div className="p-3 rounded-2xl bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 group-hover:scale-110 transition-transform">
              <EyeOff className="w-6 h-6" />
            </div>
          </div>
        </div>
      </div>

      {/* ================= CONTROLS & FILTER BAR ================= */}
      <div className="bg-white dark:bg-emerald-950 p-5 rounded-3xl border border-emerald-100 dark:border-emerald-800 shadow-sm space-y-4">
        
        {/* Top Status Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-emerald-100 dark:border-emerald-800/80 pb-3">
          <div className="flex flex-wrap gap-2">
            {[
              { id: 'ALL', label: `All Reviews (${metrics.totalCount})` },
              { id: 'APPROVED', label: `🟢 Alive (${metrics.approvedCount})` },
              { id: 'PENDING', label: `🟡 Pending (${metrics.pendingCount})` },
              { id: 'REJECTED', label: `🔴 Unlive / Hidden (${metrics.rejectedCount})` }
            ].map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => { setActiveTab(tab.id as any); setCurrentPage(1); }}
                className={`px-4 py-2 text-xs font-extrabold rounded-xl transition cursor-pointer ${
                  activeTab === tab.id
                    ? 'bg-emerald-700 text-white shadow'
                    : 'bg-emerald-50/70 dark:bg-emerald-900/60 text-gray-700 dark:text-emerald-200 hover:bg-emerald-100'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Quick Select All Button */}
          <button
            type="button"
            onClick={toggleSelectAll}
            className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-emerald-900 text-slate-700 dark:text-emerald-200 border border-slate-200 dark:border-emerald-700 text-xs font-bold flex items-center gap-1.5 hover:bg-slate-200 transition cursor-pointer"
          >
            {isAllPaginatedSelected ? <CheckSquare className="w-4 h-4 text-emerald-600" /> : <Square className="w-4 h-4 text-slate-400" />}
            <span>{isAllPaginatedSelected ? 'Deselect Page' : 'Select Page'}</span>
          </button>
        </div>

        {/* Filter Inputs Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 text-xs items-center">
          
          {/* Search Input */}
          <div className="relative lg:col-span-5">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-gray-400" />
            <input
              type="text"
              placeholder="Search by customer name, mobile, order ID, location, or text..."
              value={searchQuery}
              onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              className="w-full pl-10 pr-8 py-2.5 bg-emerald-50/50 dark:bg-emerald-900/40 border border-emerald-200 dark:border-emerald-700 rounded-2xl font-medium text-gray-900 dark:text-emerald-100 focus:ring-2 focus:ring-emerald-500"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Rating Filter */}
          <div className="lg:col-span-3">
            <select
              value={ratingFilter}
              onChange={e => { setRatingFilter(e.target.value as any); setCurrentPage(1); }}
              className="w-full px-3.5 py-2.5 bg-emerald-50/50 dark:bg-emerald-900/40 border border-emerald-200 dark:border-emerald-700 rounded-2xl font-bold dark:text-emerald-100"
            >
              <option value="ALL">⭐ All Star Ratings</option>
              <option value="5">⭐⭐⭐⭐⭐ (5 Stars)</option>
              <option value="4">⭐⭐⭐⭐ (4 Stars)</option>
              <option value="3">⭐⭐⭐ (3 Stars)</option>
              <option value="2">⭐⭐ (2 Stars)</option>
              <option value="1">⭐ (1 Star)</option>
            </select>
          </div>

          {/* Product Filter */}
          <div className="lg:col-span-2">
            <select
              value={productFilter}
              onChange={e => { setProductFilter(e.target.value); setCurrentPage(1); }}
              className="w-full px-3.5 py-2.5 bg-emerald-50/50 dark:bg-emerald-900/40 border border-emerald-200 dark:border-emerald-700 rounded-2xl font-bold dark:text-emerald-100 truncate"
            >
              <option value="ALL">🌾 All Products</option>
              {products.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.pack_size})
                </option>
              ))}
            </select>
          </div>

          {/* Reset Filters Button */}
          <div className="lg:col-span-2">
            <button
              type="button"
              onClick={handleResetFilters}
              className={`w-full py-2.5 px-3.5 rounded-2xl font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer border shadow-2xs ${
                hasActiveFilters
                  ? 'bg-amber-100 hover:bg-amber-200 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200 border-amber-300 dark:border-amber-700 shadow-sm'
                  : 'bg-emerald-50/70 hover:bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-200 border-emerald-200 dark:border-emerald-700'
              }`}
              title="Reset all filters, tabs, search, and page"
            >
              <RotateCcw className="w-3.5 h-3.5 text-emerald-700 dark:text-amber-400" />
              <span>Reset Filters</span>
              {hasActiveFilters && (
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              )}
            </button>
          </div>

        </div>

      </div>

      {/* ================= EMPTY STATE ================= */}
      {filteredReviews.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-emerald-950 rounded-3xl border border-emerald-100 dark:border-emerald-800 p-8 space-y-3">
          <div className="w-14 h-14 rounded-full bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 flex items-center justify-center mx-auto shadow-2xs">
            <Star className="w-7 h-7 text-amber-500 fill-amber-400" />
          </div>
          <h4 className="font-black text-lg text-gray-800 dark:text-emerald-100">No Reviews Match Filters</h4>
          <p className="text-xs text-gray-500 dark:text-emerald-300 max-w-sm mx-auto">
            {searchQuery
              ? `No testimonials match "${searchQuery}".`
              : 'Try clearing your rating or product filter to see customer reviews.'}
          </p>
          <div className="pt-2">
            <button
              type="button"
              onClick={handleResetFilters}
              className="px-4 py-2 bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs rounded-xl shadow-xs inline-flex items-center gap-1.5 transition cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Reset All Filters
            </button>
          </div>
        </div>
      ) : viewMode === 'table' ? (
        /* ================= 1. SCROLLING DATA TABLE ================= */
        <div className="bg-white dark:bg-emerald-950 rounded-3xl border border-emerald-100 dark:border-emerald-800 shadow-sm overflow-hidden">
          <div className="overflow-x-auto max-h-[640px] overflow-y-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="sticky top-0 z-10 bg-emerald-50 dark:bg-emerald-900/90 backdrop-blur-md border-b border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-100 font-extrabold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="p-3.5 w-10 text-center">
                    <button
                      type="button"
                      onClick={toggleSelectAll}
                      className="cursor-pointer text-emerald-700 dark:text-emerald-300 hover:scale-110 transition"
                      title={isAllPaginatedSelected ? 'Deselect all' : 'Select all'}
                    >
                      {isAllPaginatedSelected ? <CheckSquare className="w-4 h-4 text-emerald-600" /> : <Square className="w-4 h-4 text-slate-400" />}
                    </button>
                  </th>
                  <th className="p-3.5 min-w-[200px]">Customer &amp; Contact</th>
                  <th className="p-3.5 min-w-[150px]">Rating &amp; Badges</th>
                  <th className="p-3.5 min-w-[260px]">Review Content &amp; Product</th>
                  <th className="p-3.5 min-w-[140px]">Time Badge</th>
                  <th className="p-3.5 min-w-[120px] text-center">Storefront Status</th>
                  <th className="p-3.5 min-w-[160px] text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-emerald-100 dark:divide-emerald-800/60">
                {paginatedReviews.map(review => {
                  const isSelected = selectedIds.has(review.id);
                  const productObj = products.find(p => p.id === review.product_id);
                  const isAlive = review.status === 'APPROVED';
                  const timeInfo = formatTimeBadge(review.created_at);
                  const updateInfo = review.updated_at && review.updated_at !== review.created_at ? formatTimeBadge(review.updated_at) : null;
                  const reviewImg = review.image_url || review.images?.[0];

                  return (
                    <tr
                      key={review.id}
                      className={`hover:bg-emerald-50/40 dark:hover:bg-emerald-900/30 transition-colors ${
                        isSelected ? 'bg-emerald-50/80 dark:bg-emerald-900/40' : ''
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="p-3.5 text-center">
                        <button
                          type="button"
                          onClick={() => toggleSelectOne(review.id)}
                          className="cursor-pointer text-emerald-700 dark:text-emerald-300"
                        >
                          {isSelected ? <CheckSquare className="w-4 h-4 text-emerald-600" /> : <Square className="w-4 h-4 text-slate-400" />}
                        </button>
                      </td>

                      {/* Customer Info */}
                      <td className="p-3.5">
                        <div className="space-y-0.5">
                          <div className="font-extrabold text-sm text-gray-900 dark:text-emerald-100">
                            {review.customer_name}
                          </div>
                          {review.customer_location && (
                            <div className="text-[11px] text-emerald-700 dark:text-emerald-300 font-medium">
                              📍 {review.customer_location}
                            </div>
                          )}
                          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                            {review.customer_phone && (
                              <span className="font-mono text-[10.5px] text-slate-600 dark:text-emerald-300 flex items-center gap-0.5">
                                <Phone className="w-3 h-3 text-emerald-600" />
                                <span>{review.customer_phone}</span>
                              </span>
                            )}
                            {review.order_id && (
                              <span className="px-1.5 py-0.2 rounded bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200 font-mono text-[10px] font-bold">
                                #{review.order_id}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Rating & Badges */}
                      <td className="p-3.5">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1 text-amber-400">
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                className={`w-3.5 h-3.5 ${
                                  i < review.rating ? 'fill-amber-400 text-amber-500' : 'text-gray-300'
                                }`}
                              />
                            ))}
                            <span className="ml-1 font-bold text-amber-700 dark:text-amber-300 text-xs">
                              {review.rating}.0
                            </span>
                          </div>

                          <div className="flex flex-wrap gap-1">
                            {review.is_verified_purchase && (
                              <span className="px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 text-[10px] font-extrabold flex items-center gap-0.5">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Verified
                              </span>
                            )}
                            {review.is_featured && (
                              <span className="px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200 text-[10px] font-extrabold flex items-center gap-0.5">
                                ⭐ Featured
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Review Content & Product */}
                      <td className="p-3.5">
                        <div className="space-y-1.5 max-w-sm">
                          {review.title && (
                            <div className="font-extrabold text-xs text-gray-900 dark:text-emerald-100 line-clamp-1">
                              &ldquo;{review.title}&rdquo;
                            </div>
                          )}
                          <p className="text-xs text-gray-600 dark:text-emerald-200/90 leading-relaxed italic line-clamp-2">
                            &ldquo;{review.body}&rdquo;
                          </p>

                          <div className="flex flex-wrap items-center gap-2 pt-1">
                            {productObj && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-50 dark:bg-emerald-900/50 text-emerald-900 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-700 text-[10px] font-bold">
                                <Package className="w-3 h-3 text-emerald-600" />
                                <span>{productObj.name}</span>
                              </span>
                            )}

                            {reviewImg && (
                              <button
                                type="button"
                                onClick={() => setLightboxImg(reviewImg)}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-50 dark:bg-amber-950 text-amber-800 dark:text-amber-200 border border-amber-300 dark:border-amber-700 text-[10px] font-bold hover:scale-105 transition cursor-pointer"
                                title="Click to view customer photo"
                              >
                                <ImageIcon className="w-3 h-3 text-amber-600" />
                                <span>Photo Attached</span>
                              </button>
                            )}
                          </div>

                          {review.admin_reply && (
                            <div className="p-2 rounded-xl bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-[10.5px]">
                              <strong className="text-amber-900 dark:text-amber-300 block font-bold">💬 Store Reply:</strong>
                              <span className="text-amber-950 dark:text-amber-200 italic line-clamp-1">{review.admin_reply}</span>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Time Badge */}
                      <td className="p-3.5">
                        <div className="space-y-0.5">
                          <span
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-emerald-900/50 text-slate-700 dark:text-emerald-200 font-bold text-[11px]"
                            title={timeInfo.full}
                          >
                            <Clock className="w-3 h-3 text-slate-500" />
                            <span>{timeInfo.relative}</span>
                          </span>
                          <div className="text-[10px] text-slate-400 dark:text-emerald-400 font-mono">
                            {timeInfo.full}
                          </div>
                          {updateInfo && (
                            <div className="text-[9.5px] text-emerald-600 dark:text-emerald-400 font-semibold" title={updateInfo.full}>
                              Updated: {updateInfo.relative}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Storefront Status (Alive vs Unlive) */}
                      <td className="p-3.5 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleAlive(review)}
                          className={`px-3 py-1 rounded-xl text-xs font-black transition shadow-2xs flex items-center justify-center gap-1 mx-auto cursor-pointer ${
                            isAlive
                              ? 'bg-emerald-100 hover:bg-emerald-200 text-emerald-900 border border-emerald-300 dark:bg-emerald-900 dark:text-emerald-200'
                              : 'bg-rose-100 hover:bg-rose-200 text-rose-900 border border-rose-300 dark:bg-rose-950 dark:text-rose-200'
                          }`}
                          title={isAlive ? 'Click to make UNLIVE (Hide from public)' : 'Click to make ALIVE (Publish to public)'}
                        >
                          {isAlive ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                          <span>{isAlive ? 'ALIVE (Live)' : 'UNLIVE (Hidden)'}</span>
                        </button>
                      </td>

                      {/* Action Buttons */}
                      <td className="p-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenReplyModal(review)}
                            className="p-2 rounded-xl text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/50 transition cursor-pointer"
                            title="Reply to Customer"
                          >
                            <MessageSquare className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenEditReview(review)}
                            className="p-2 rounded-xl text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900 transition cursor-pointer"
                            title="Edit Review Details"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteReviewClick(review)}
                            className="p-2 rounded-xl text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-950 transition cursor-pointer"
                            title="Delete Review"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* ================= 2. 3D CARD GRID VIEW ================= */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {paginatedReviews.map(review => {
            const isSelected = selectedIds.has(review.id);
            const productObj = products.find(p => p.id === review.product_id);
            const isAlive = review.status === 'APPROVED';
            const timeInfo = formatTimeBadge(review.created_at);
            const reviewImg = review.image_url || review.images?.[0];

            return (
              <div
                key={review.id}
                className={`bg-white dark:bg-emerald-950 rounded-3xl p-5 border-2 shadow-sm flex flex-col justify-between space-y-4 transition-all duration-300 hover:-translate-y-1.5 hover:shadow-2xl hover:border-amber-400 ${
                  isSelected ? 'border-emerald-500 ring-2 ring-emerald-400/40' : 'border-emerald-100 dark:border-emerald-800'
                }`}
              >
                <div className="space-y-3">
                  {/* Top Bar: Checkbox, Name, Alive Status */}
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => toggleSelectOne(review.id)}
                        className="cursor-pointer text-emerald-700 dark:text-emerald-300"
                      >
                        {isSelected ? <CheckSquare className="w-4 h-4 text-emerald-600" /> : <Square className="w-4 h-4 text-slate-400" />}
                      </button>
                      <div>
                        <h3 className="font-extrabold text-sm text-gray-900 dark:text-emerald-100 line-clamp-1">
                          {review.customer_name}
                        </h3>
                        <p className="text-[11px] text-emerald-700 dark:text-emerald-300 font-medium">
                          {review.customer_location || 'Tamil Nadu'}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleToggleAlive(review)}
                      className={`px-2.5 py-1 rounded-xl text-[10px] font-black transition cursor-pointer flex items-center gap-1 ${
                        isAlive
                          ? 'bg-emerald-100 text-emerald-900 border border-emerald-300 dark:bg-emerald-900 dark:text-emerald-200'
                          : 'bg-rose-100 text-rose-900 border border-rose-300 dark:bg-rose-950 dark:text-rose-200'
                      }`}
                    >
                      {isAlive ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                      <span>{isAlive ? 'ALIVE' : 'UNLIVE'}</span>
                    </button>
                  </div>

                  {/* Rating, Verified Badge & Time */}
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1 text-amber-400">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`w-3.5 h-3.5 ${
                            i < review.rating ? 'fill-amber-400 text-amber-500' : 'text-gray-300'
                          }`}
                        />
                      ))}
                      <span className="font-bold text-amber-700 dark:text-amber-300 text-xs ml-0.5">
                        {review.rating}.0
                      </span>
                    </div>

                    <span
                      className="inline-flex items-center gap-1 text-[10.5px] font-bold text-slate-500 dark:text-emerald-400 bg-slate-50 dark:bg-emerald-900/40 px-2 py-0.5 rounded-lg border border-slate-200 dark:border-emerald-800"
                      title={timeInfo.full}
                    >
                      <Clock className="w-3 h-3" />
                      <span>{timeInfo.relative}</span>
                    </span>
                  </div>

                  {/* Attached Customer Image (if present) */}
                  {reviewImg && (
                    <div
                      onClick={() => setLightboxImg(reviewImg)}
                      className="relative aspect-video rounded-2xl overflow-hidden border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900 cursor-pointer group"
                    >
                      <img
                        src={reviewImg}
                        alt="Customer review attachment"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <span className="absolute bottom-2 right-2 bg-black/70 backdrop-blur-xs text-white text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1">
                        <ImageIcon className="w-3 h-3 text-amber-400" /> Click to Zoom
                      </span>
                    </div>
                  )}

                  {/* Review Content */}
                  <div className="bg-emerald-50/40 dark:bg-emerald-950 p-3.5 rounded-2xl border border-emerald-100 dark:border-emerald-800 space-y-1">
                    {review.title && (
                      <h4 className="font-extrabold text-xs text-emerald-950 dark:text-emerald-100">
                        &ldquo;{review.title}&rdquo;
                      </h4>
                    )}
                    <p className="text-xs text-gray-700 dark:text-emerald-200 leading-relaxed italic">
                      &ldquo;{review.body}&rdquo;
                    </p>
                    {productObj && (
                      <div className="pt-2 text-[10px] font-bold text-emerald-800 dark:text-amber-300 flex items-center gap-1 border-t border-emerald-100 dark:border-emerald-800/60 mt-1.5">
                        <Package className="w-3 h-3 text-emerald-600" />
                        <span>Purchased: {productObj.name} ({productObj.pack_size})</span>
                      </div>
                    )}
                  </div>

                  {/* Admin Reply */}
                  {review.admin_reply && (
                    <div className="p-2.5 rounded-xl bg-amber-50/80 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 text-[11px] space-y-0.5">
                      <span className="font-bold text-amber-900 dark:text-amber-300 block text-[10px] flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-amber-500" /> MR. VIVASAYI Store Reply:
                      </span>
                      <p className="text-amber-950 dark:text-amber-200 italic">{review.admin_reply}</p>
                    </div>
                  )}
                </div>

                {/* Card Footer Actions */}
                <div className="pt-3 border-t border-emerald-100 dark:border-emerald-800 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    {review.order_id && (
                      <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-950/70 text-amber-900 dark:text-amber-200">
                        #{review.order_id}
                      </span>
                    )}
                    {review.is_verified_purchase && (
                      <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300">
                        ✓ Verified
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleOpenReplyModal(review)}
                      className="p-1.5 rounded-lg text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/50 cursor-pointer"
                      title="Reply"
                    >
                      <MessageSquare className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenEditReview(review)}
                      className="p-1.5 rounded-lg text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900 cursor-pointer"
                      title="Edit"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteReviewClick(review)}
                      className="p-1.5 rounded-lg text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-950 cursor-pointer"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ================= PAGINATION CONTROLS ================= */}
      {filteredReviews.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white dark:bg-emerald-950 p-4 rounded-3xl border border-emerald-100 dark:border-emerald-800 text-xs shadow-sm">
          <div className="flex items-center gap-3">
            <span className="text-gray-500 dark:text-emerald-300 font-bold">
              Showing {(currentPage - 1) * itemsPerPage + 1} -{' '}
              {Math.min(currentPage * itemsPerPage, filteredReviews.length)} of {filteredReviews.length} reviews
            </span>
            <div className="flex items-center gap-1.5">
              <span className="text-gray-400">Rows per page:</span>
              <select
                value={itemsPerPage}
                onChange={e => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                className="bg-emerald-50 dark:bg-emerald-900 border border-emerald-200 dark:border-emerald-700 rounded-lg px-2 py-1 font-bold dark:text-emerald-100 cursor-pointer"
              >
                <option value={6}>6</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1.5 bg-emerald-50 dark:bg-emerald-900 border border-emerald-200 dark:border-emerald-700 rounded-xl font-bold disabled:opacity-40 cursor-pointer flex items-center gap-1"
            >
              <ChevronLeft className="w-3.5 h-3.5" /> Previous
            </button>
            <span className="font-bold px-2 text-emerald-900 dark:text-emerald-100">
              Page {currentPage} of {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1.5 bg-emerald-50 dark:bg-emerald-900 border border-emerald-200 dark:border-emerald-700 rounded-xl font-bold disabled:opacity-40 cursor-pointer flex items-center gap-1"
            >
              Next <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* ================= FLOATING MULTIPLE SELECT BATCH ACTIONS BAR ================= */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-slate-900/95 dark:bg-emerald-950/95 backdrop-blur-xl text-white px-5 py-3.5 rounded-3xl shadow-2xl border-2 border-emerald-400 flex flex-wrap items-center justify-between gap-4 animate-in fade-in slide-in-from-bottom-4 duration-300 max-w-2xl w-full mx-auto">
          <div className="flex items-center gap-2.5">
            <span className="w-3 h-3 rounded-full bg-amber-400 animate-ping" />
            <span className="font-extrabold text-sm text-emerald-200">
              {selectedIds.size} Review{selectedIds.size > 1 ? 's' : ''} Selected
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
            <button
              type="button"
              onClick={handleBulkAlive}
              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white transition flex items-center gap-1 shadow cursor-pointer"
            >
              <Eye className="w-3.5 h-3.5" /> Set Alive (Approve)
            </button>
            <button
              type="button"
              onClick={handleBulkUnlive}
              className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white transition flex items-center gap-1 shadow cursor-pointer"
            >
              <EyeOff className="w-3.5 h-3.5" /> Set Unlive (Hide)
            </button>
            <button
              type="button"
              onClick={handleBulkSet5Star}
              className="px-3 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 transition flex items-center gap-1 shadow cursor-pointer"
            >
              <Star className="w-3.5 h-3.5 fill-slate-950" /> Set 5-Star
            </button>
            <button
              type="button"
              onClick={handleBulkDelete}
              className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white transition flex items-center gap-1 shadow cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" /> Delete
            </button>
            <button
              type="button"
              onClick={() => setSelectedIds(new Set())}
              className="px-2.5 py-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-white transition cursor-pointer"
              title="Clear selection"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* ================= ADD / EDIT REVIEW POPUP MODAL (WITH 3D ANIMATION) ================= */}
      {showReviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white dark:bg-emerald-950 rounded-3xl max-w-xl w-full p-6 sm:p-7 shadow-2xl border-2 border-emerald-300 dark:border-emerald-700 space-y-4 max-h-[92vh] overflow-y-auto transform animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center border-b border-emerald-100 dark:border-emerald-800 pb-3">
              <h3 className="font-extrabold text-lg text-gray-900 dark:text-emerald-100 flex items-center gap-2">
                <Star className="w-6 h-6 text-amber-500 fill-amber-400" />
                <span>{editingReview ? 'Edit Customer Review' : 'Add New Customer Review'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowReviewModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveReview} className="space-y-4 text-xs">
              
              {/* Customer Name & Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 dark:text-emerald-200 mb-1">
                    Customer Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Anand Kumar"
                    value={reviewFormData.customer_name}
                    onChange={e => setReviewFormData({ ...reviewFormData, customer_name: e.target.value })}
                    className="w-full p-2.5 bg-emerald-50/50 dark:bg-emerald-900/50 border border-emerald-200 dark:border-emerald-700 rounded-xl font-bold dark:text-emerald-100"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 dark:text-emerald-200 mb-1">
                    Customer Mobile / WhatsApp
                  </label>
                  <input
                    type="tel"
                    placeholder="e.g. +91 98421 56789"
                    value={reviewFormData.customer_phone}
                    onChange={e => setReviewFormData({ ...reviewFormData, customer_phone: e.target.value })}
                    className="w-full p-2.5 bg-emerald-50/50 dark:bg-emerald-900/50 border border-emerald-200 dark:border-emerald-700 rounded-xl font-mono dark:text-emerald-100"
                  />
                </div>
              </div>

              {/* City & Order ID */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 dark:text-emerald-200 mb-1">
                    City / Town (Location)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Cumbum, Theni, Tamil Nadu"
                    value={reviewFormData.customer_location}
                    onChange={e => setReviewFormData({ ...reviewFormData, customer_location: e.target.value })}
                    className="w-full p-2.5 bg-emerald-50/50 dark:bg-emerald-900/50 border border-emerald-200 dark:border-emerald-700 rounded-xl font-bold dark:text-emerald-100"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 dark:text-emerald-200 mb-1">
                    Order ID (Receipt / Bill #)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. ORD-1042"
                    value={reviewFormData.order_id}
                    onChange={e => setReviewFormData({ ...reviewFormData, order_id: e.target.value })}
                    className="w-full p-2.5 bg-emerald-50/50 dark:bg-emerald-900/50 border border-emerald-200 dark:border-emerald-700 rounded-xl font-mono font-bold dark:text-emerald-100"
                  />
                </div>
              </div>

              {/* Product Purchased Dropdown */}
              <div>
                <label className="block font-bold text-gray-700 dark:text-emerald-200 mb-1">
                  Product Purchased
                </label>
                <select
                  value={reviewFormData.product_id}
                  onChange={e => {
                    const newProdId = e.target.value;
                    const prodObj = products.find(p => p.id === newProdId);
                    const suggestedTitle = generateSmartTitle(prodObj?.name, reviewFormData.rating);
                    setReviewFormData({
                      ...reviewFormData,
                      product_id: newProdId,
                      title: suggestedTitle
                    });
                  }}
                  className="w-full p-2.5 bg-emerald-50/50 dark:bg-emerald-900/50 border border-emerald-200 dark:border-emerald-700 rounded-xl font-bold dark:text-emerald-100 text-xs"
                >
                  <option value="">🌾 Store Overall / General Feedback</option>
                  {products.map((p: Product) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.pack_size || `1 ${p.unit}`}) - ₹{p.selling_price}
                    </option>
                  ))}
                </select>
              </div>

              {/* Star Rating Interactive Selector */}
              <div>
                <label className="block font-bold text-gray-700 dark:text-emerald-200 mb-1">
                  Star Rating (1 to 5 Stars) *
                </label>
                <div className="flex items-center gap-2 p-2.5 bg-amber-50/70 dark:bg-amber-950/40 rounded-2xl border border-amber-200 dark:border-amber-800">
                  <div className="flex items-center gap-1.5">
                    {[1, 2, 3, 4, 5].map(starNum => (
                      <button
                        key={starNum}
                        type="button"
                        onClick={() => {
                          const prodObj = products.find(p => p.id === reviewFormData.product_id);
                          const suggestedTitle = generateSmartTitle(prodObj?.name, starNum);
                          setReviewFormData({
                            ...reviewFormData,
                            rating: starNum,
                            title: suggestedTitle
                          });
                        }}
                        className="p-1 text-amber-400 hover:scale-125 transition-transform cursor-pointer"
                        title={`${starNum} Stars`}
                      >
                        <Star
                          className={`w-6 h-6 ${
                            starNum <= reviewFormData.rating ? 'fill-amber-400 text-amber-500' : 'text-gray-300'
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                  <span className="font-extrabold text-amber-800 dark:text-amber-200 text-xs ml-2">
                    {reviewFormData.rating === 5
                      ? '5 Stars (Outstanding Organic Taste!)'
                      : reviewFormData.rating === 4
                      ? '4 Stars (Great Quality & Fresh)'
                      : reviewFormData.rating === 3
                      ? '3 Stars (Good Quality)'
                      : reviewFormData.rating === 2
                      ? '2 Stars (Fair Experience)'
                      : '1 Star (Needs Improvement)'}
                  </span>
                </div>
              </div>

              {/* Review Title & Magic Suggestion */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-bold text-gray-700 dark:text-emerald-200">
                    Review Headline / Title
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      const prodObj = products.find(p => p.id === reviewFormData.product_id);
                      setReviewFormData({
                        ...reviewFormData,
                        title: generateSmartTitle(prodObj?.name, reviewFormData.rating)
                      });
                      toast.success('Auto-generated review title!');
                    }}
                    className="text-[11px] font-bold text-amber-700 dark:text-amber-300 flex items-center gap-1 hover:underline cursor-pointer"
                  >
                    <Sparkles className="w-3 h-3" /> Auto-Suggest Title
                  </button>
                </div>
                <input
                  type="text"
                  placeholder="e.g. Pure authentic cold-pressed aroma & fast home delivery!"
                  value={reviewFormData.title}
                  onChange={e => setReviewFormData({ ...reviewFormData, title: e.target.value })}
                  className="w-full p-2.5 bg-emerald-50/50 dark:bg-emerald-900/50 border border-emerald-200 dark:border-emerald-700 rounded-xl font-bold dark:text-emerald-100"
                />
              </div>

              {/* Review Body Text */}
              <div>
                <label className="block font-bold text-gray-700 dark:text-emerald-200 mb-1">
                  Review Feedback Text *
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="Customer's honest experience with MR. VIVASAYI products, traditional quality, or home delivery..."
                  value={reviewFormData.body}
                  onChange={e => setReviewFormData({ ...reviewFormData, body: e.target.value })}
                  className="w-full p-2.5 bg-emerald-50/50 dark:bg-emerald-900/50 border border-emerald-200 dark:border-emerald-700 rounded-xl font-medium dark:text-emerald-100"
                />
              </div>

              {/* Customer Photo / Image URL & File Upload with <= 100 KB Auto-Compression */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="font-bold text-gray-700 dark:text-emerald-200 flex items-center gap-1.5">
                    <ImageIcon className="w-4 h-4 text-emerald-600 dark:text-amber-400" />
                    <span>Customer Review Photo (Strictly &le; 100 KB)</span>
                  </label>
                  {imageSizeKB ? (
                    <span className="text-[10.5px] font-extrabold text-emerald-800 dark:text-emerald-200 bg-emerald-100 dark:bg-emerald-900/80 px-2 py-0.5 rounded-md border border-emerald-300 dark:border-emerald-700">
                      &check; {imageSizeKB} KB (Compressed &le; 100 KB)
                    </span>
                  ) : reviewFormData.image_url ? (
                    <span className="text-[10.5px] font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950 px-2 py-0.5 rounded-md border border-amber-300 dark:border-amber-800">
                      Photo Attached
                    </span>
                  ) : null}
                </div>

                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      type="file"
                      ref={fileInputRef}
                      accept="image/*"
                      className="hidden"
                      onChange={handleImageFileChange}
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isCompressingImage}
                      className="px-3.5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold text-xs flex items-center gap-2 transition cursor-pointer shadow-xs disabled:opacity-50"
                    >
                      <Upload className="w-3.5 h-3.5 text-amber-300" />
                      <span>{isCompressingImage ? 'Compressing to &le; 100 KB...' : 'Upload Image (Auto-Compress &le; 100 KB)'}</span>
                    </button>

                    <span className="text-gray-400 dark:text-emerald-400 text-xs font-bold">OR</span>

                    <input
                      type="url"
                      placeholder="Paste image URL (https://...)"
                      value={reviewFormData.image_url}
                      onChange={e => {
                        setReviewFormData({ ...reviewFormData, image_url: e.target.value });
                        setImageSizeKB(null);
                      }}
                      className="flex-1 min-w-[180px] p-2.5 bg-emerald-50/50 dark:bg-emerald-900/50 border border-emerald-200 dark:border-emerald-700 rounded-xl font-mono text-[11px] dark:text-emerald-100"
                    />

                    {reviewFormData.image_url && (
                      <button
                        type="button"
                        onClick={() => {
                          setReviewFormData({ ...reviewFormData, image_url: '' });
                          setImageSizeKB(null);
                        }}
                        className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950 rounded-lg cursor-pointer"
                        title="Remove photo"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {reviewFormData.image_url && (
                    <div className="flex items-center gap-3 p-2.5 bg-emerald-50/60 dark:bg-emerald-900/30 rounded-2xl border border-emerald-200 dark:border-emerald-800">
                      <div className="w-16 h-16 rounded-xl overflow-hidden border border-emerald-200 dark:border-emerald-700 shadow-xs shrink-0 bg-emerald-100">
                        <img
                          src={reviewFormData.image_url}
                          alt="Review preview"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="space-y-0.5 text-xs">
                        <span className="font-extrabold text-emerald-900 dark:text-emerald-100 block">
                          Customer Review Photo Attached
                        </span>
                        <p className="text-[11px] text-gray-500 dark:text-emerald-300">
                          {imageSizeKB
                            ? `Client compressed: ${imageSizeKB} KB (Strict limit: 100 KB max). Stored in live database.`
                            : 'Direct URL attached to review. Ready to sync live.'}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Admin Reply */}
              <div>
                <label className="block font-bold text-amber-700 dark:text-amber-300 mb-1">
                  Store Admin Reply (Visible on Storefront)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Thank you Anand avargal! Blessed to serve your family pure cold-pressed oils."
                  value={reviewFormData.admin_reply}
                  onChange={e => setReviewFormData({ ...reviewFormData, admin_reply: e.target.value })}
                  className="w-full p-2.5 bg-white dark:bg-emerald-950 border border-amber-300 dark:border-amber-700 rounded-xl font-medium text-amber-950 dark:text-amber-200"
                />
              </div>

              {/* Live Status & Flags */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-emerald-100 dark:border-emerald-800">
                <div>
                  <label className="block font-bold text-gray-700 dark:text-emerald-200 mb-1">
                    Storefront Approval Status
                  </label>
                  <select
                    value={reviewFormData.status}
                    onChange={e => setReviewFormData({ ...reviewFormData, status: e.target.value as ReviewStatus })}
                    className="w-full p-2.5 bg-emerald-50/50 dark:bg-emerald-900/50 border border-emerald-200 dark:border-emerald-700 rounded-xl font-bold"
                  >
                    <option value="APPROVED">🟢 APPROVED (ALIVE - Live on Public Website)</option>
                    <option value="HIDDEN">🔴 HIDDEN (UNLIVE - Moderated)</option>
                    <option value="PENDING">🟡 PENDING (Under Review)</option>
                  </select>
                </div>

                <div className="flex flex-col justify-center space-y-2 pt-2 sm:pt-0">
                  <label className="flex items-center gap-2 cursor-pointer font-bold text-gray-700 dark:text-emerald-200">
                    <input
                      type="checkbox"
                      checked={reviewFormData.is_verified_purchase}
                      onChange={e => setReviewFormData({ ...reviewFormData, is_verified_purchase: e.target.checked })}
                      className="w-4 h-4 rounded text-emerald-700 cursor-pointer"
                    />
                    <span>✓ Verified Purchase Badge</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer font-bold text-gray-700 dark:text-emerald-200">
                    <input
                      type="checkbox"
                      checked={reviewFormData.is_featured}
                      onChange={e => setReviewFormData({ ...reviewFormData, is_featured: e.target.checked })}
                      className="w-4 h-4 rounded text-emerald-700 cursor-pointer"
                    />
                    <span>⭐ Featured on Storefront Testimonials</span>
                  </label>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-3 pt-3 border-t border-emerald-100 dark:border-emerald-800">
                <button
                  type="button"
                  onClick={() => setShowReviewModal(false)}
                  className="px-5 py-2.5 bg-gray-100 dark:bg-emerald-900/60 hover:bg-gray-200 text-gray-700 dark:text-emerald-200 font-bold rounded-2xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-gradient-to-r from-emerald-700 to-emerald-800 hover:from-emerald-800 hover:to-emerald-900 text-white font-extrabold rounded-2xl shadow-md flex items-center gap-1.5 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4 text-amber-300" />
                  <span>{editingReview ? 'Save & Sync Live' : 'Publish & Make Live'}</span>
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* ================= ADMIN QUICK REPLY POPUP MODAL ================= */}
      {replyingReview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white dark:bg-emerald-950 rounded-3xl max-w-md w-full p-6 shadow-2xl border-2 border-amber-300 dark:border-amber-700 space-y-4">
            <div className="flex justify-between items-center border-b border-amber-100 dark:border-amber-800/60 pb-3">
              <h3 className="font-extrabold text-base text-gray-900 dark:text-emerald-100 flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-amber-500" />
                <span>Reply to {replyingReview.customer_name}</span>
              </h3>
              <button
                type="button"
                onClick={() => setReplyingReview(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-emerald-50/50 dark:bg-emerald-900/40 rounded-2xl text-xs space-y-1">
              <span className="font-bold text-emerald-900 dark:text-emerald-200 block">Customer Feedback:</span>
              <p className="italic text-gray-600 dark:text-emerald-300">&ldquo;{replyingReview.body}&rdquo;</p>
            </div>

            <form onSubmit={handleSaveQuickReply} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-amber-900 dark:text-amber-200 mb-1">
                  Your Store Owner Reply (Live on Website):
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="e.g. Vannakkam! Thank you for supporting native seeds and traditional cold-pressed oils."
                  value={quickReplyText}
                  onChange={e => setQuickReplyText(e.target.value)}
                  className="w-full p-2.5 bg-amber-50/50 dark:bg-emerald-900 border border-amber-300 dark:border-amber-700 rounded-xl font-medium dark:text-emerald-100 text-xs"
                />
              </div>

              {/* Quick Template Chips */}
              <div className="flex flex-wrap gap-1.5">
                {[
                  'Thank you for supporting organic farmers!',
                  'Glad you loved the authentic cold-pressed aroma!',
                  'Traditional heirloom health is our promise.',
                  'We appreciate your trust in MR. VIVASAYI!'
                ].map((tpl, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setQuickReplyText(tpl)}
                    className="px-2 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-700 text-[10px] font-bold hover:bg-emerald-100 cursor-pointer"
                  >
                    + {tpl}
                  </button>
                ))}
              </div>

              <div className="flex justify-end space-x-2.5 pt-2 border-t border-amber-100 dark:border-amber-800/60">
                <button
                  type="button"
                  onClick={() => setReplyingReview(null)}
                  className="px-4 py-2 bg-gray-100 dark:bg-emerald-900 text-gray-700 dark:text-emerald-200 font-bold rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl shadow flex items-center gap-1 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Send Reply</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= UNIVERSAL YES / NO CONFIRMATION POPUP MODAL (3D ANIMATED) ================= */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white dark:bg-emerald-950 max-w-sm sm:max-w-md w-full p-6 sm:p-7 rounded-3xl shadow-2xl border-2 border-emerald-300 dark:border-emerald-700 text-center space-y-4 animate-in zoom-in-95 duration-200">
            
            {/* Modal Icon Badge */}
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto shadow-md border-2 ${
              confirmModal.type === 'danger'
                ? 'bg-rose-100 text-rose-600 border-rose-300 dark:bg-rose-950/60 dark:text-rose-400 dark:border-rose-800'
                : confirmModal.type === 'warning'
                ? 'bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-950/60 dark:text-amber-400 dark:border-amber-800'
                : confirmModal.type === 'info'
                ? 'bg-blue-100 text-blue-600 border-blue-300 dark:bg-blue-950/60 dark:text-blue-400 dark:border-blue-800'
                : 'bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-900/60 dark:text-emerald-400 dark:border-emerald-700'
            }`}>
              {confirmModal.type === 'danger' ? (
                <Trash2 className="w-8 h-8" />
              ) : confirmModal.type === 'warning' ? (
                <EyeOff className="w-8 h-8" />
              ) : confirmModal.type === 'info' ? (
                <Star className="w-8 h-8 fill-amber-400 text-amber-500" />
              ) : (
                <CheckCircle2 className="w-8 h-8" />
              )}
            </div>

            {/* Modal Text Content */}
            <div className="space-y-1.5">
              <h3 className="font-black text-lg text-gray-900 dark:text-emerald-100">
                {confirmModal.title}
              </h3>
              <p className="text-xs text-gray-700 dark:text-emerald-200 font-medium leading-relaxed">
                {confirmModal.message}
              </p>
              {confirmModal.details && (
                <p className="text-[11px] text-gray-500 dark:text-emerald-400 pt-1 leading-normal">
                  {confirmModal.details}
                </p>
              )}
            </div>

            {/* YES / NO Action Buttons */}
            <div className="flex items-center justify-center gap-3 pt-3 border-t border-emerald-100 dark:border-emerald-800/80">
              <button
                type="button"
                onClick={closeConfirmModal}
                className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-emerald-900/60 dark:hover:bg-emerald-900 text-slate-700 dark:text-emerald-200 font-bold text-xs transition cursor-pointer"
              >
                {confirmModal.cancelText || 'No, Cancel'}
              </button>
              <button
                type="button"
                onClick={confirmModal.onConfirm}
                className={`px-6 py-2.5 rounded-xl text-white font-extrabold text-xs shadow-md transition cursor-pointer flex items-center gap-1.5 ${
                  confirmModal.type === 'danger'
                    ? 'bg-rose-600 hover:bg-rose-700'
                    : confirmModal.type === 'warning'
                    ? 'bg-amber-600 hover:bg-amber-700'
                    : confirmModal.type === 'info'
                    ? 'bg-blue-600 hover:bg-blue-700'
                    : 'bg-emerald-700 hover:bg-emerald-800'
                }`}
              >
                <Check className="w-4 h-4" />
                <span>{confirmModal.confirmText || 'Yes, Proceed'}</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ================= 3D LIGHTBOX IMAGE MODAL ================= */}
      {lightboxImg && (
        <div
          onClick={() => setLightboxImg(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md cursor-pointer animate-in fade-in duration-200"
        >
          <div
            onClick={e => e.stopPropagation()}
            className="relative max-w-3xl w-full bg-slate-900 rounded-3xl overflow-hidden shadow-2xl border-2 border-amber-400 animate-in zoom-in-95 duration-200"
          >
            <img
              src={lightboxImg}
              alt="Customer Attachment Zoom"
              className="w-full max-h-[80vh] object-contain"
            />
            <button
              type="button"
              onClick={() => setLightboxImg(null)}
              className="absolute top-4 right-4 bg-black/70 text-white p-2 rounded-full hover:bg-rose-600 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
