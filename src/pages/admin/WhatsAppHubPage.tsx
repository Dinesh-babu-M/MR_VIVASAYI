import React, { useState, useRef, useEffect } from 'react';
import {
  MessageSquare,
  Send,
  Phone,
  CheckCheck,
  Clock,
  Inbox,
  Bell,
  RefreshCw,
  Search,
  ChevronRight,
  ArrowDownLeft,
  ArrowUpRight,
  User,
  Zap,
  FileText,
  Truck,
  AlertCircle,
  Check,
} from 'lucide-react';
import { formatDateTime, formatTimeAgo } from '../../lib/utils';
import type { WhatsappMessage, NotificationQueue, MessageStatus, Customer } from '../../types';
import { getJSONStore } from '../../lib/dbManager';
import { RefreshSpinnerModal } from '../../components/common/RefreshSpinnerModal';
import { AdminPageSkeleton } from '../../components/common/Skeleton';
import { useActionModal } from '../../contexts/ActionModalContext';

// ─── Helpers ────────────────────────────────────────────────────────────────

function buildThreads(messages: WhatsappMessage[]) {
  const map = new Map<string, WhatsappMessage[]>();
  for (const msg of messages) {
    const key = msg.phone_number ?? 'unknown';
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(msg);
  }
  for (const [key, msgs] of map.entries()) {
    map.set(
      key,
      [...msgs].sort(
        (a, b) =>
          new Date(a.received_at ?? a.sent_at ?? a.created_at).getTime() -
          new Date(b.received_at ?? b.sent_at ?? b.created_at).getTime()
      )
    );
  }
  return map;
}

function resolveCustomerName(phone: string, customers: Customer[]): string {
  if (!customers || !Array.isArray(customers)) return phone ? `+91 ${phone}` : 'Walk-in Customer';
  const c = customers.find(
    (cu: Customer) => cu && (cu.phone === phone || cu.whatsapp_number === phone)
  );
  return (c && c.name && c.name.trim()) ? c.name : (phone ? `+91 ${phone}` : 'Customer');
}

function countUnread(msgs: WhatsappMessage[]): number {
  return msgs.filter(
    (m) => m.direction === 'inbound' && m.status !== 'READ'
  ).length;
}

function msgTime(msg: WhatsappMessage): string {
  const ts = msg.received_at ?? msg.sent_at ?? msg.created_at;
  return formatTimeAgo(ts);
}

function msgStatusClass(status: MessageStatus): string {
  switch (status) {
    case 'READ':
      return 'text-emerald-500 dark:text-emerald-400';
    case 'DELIVERED':
      return 'text-blue-500 dark:text-blue-400';
    case 'SENT':
      return 'text-gray-400 dark:text-emerald-500';
    case 'FAILED':
      return 'text-red-500';
    default:
      return 'text-gray-400';
  }
}

function notifStatusBadge(status: MessageStatus): string {
  switch (status) {
    case 'SENT':
    case 'DELIVERED':
    case 'READ':
      return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300';
    case 'PENDING':
    case 'PROCESSING':
      return 'bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-300';
    case 'FAILED':
      return 'bg-red-100 text-red-700 dark:bg-red-900/60 dark:text-red-300';
    case 'RETRY':
      return 'bg-orange-100 text-orange-700 dark:bg-orange-900/60 dark:text-orange-300';
    default:
      return 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400';
  }
}

function channelBadge(channel: string): string {
  switch (channel) {
    case 'WHATSAPP':
      return 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300';
    case 'EMAIL':
      return 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300';
    case 'SMS':
      return 'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300';
    default:
      return 'bg-gray-100 text-gray-600';
  }
}

// ─── Quick Reply Presets ─────────────────────────────────────────────────────

const QUICK_REPLIES = [
  {
    label: 'Confirm Order',
    icon: Check,
    color: 'bg-emerald-600 hover:bg-emerald-700 text-white',
    text: 'Your order has been confirmed! We will prepare it shortly and notify you when it is ready for delivery.',
  },
  {
    label: 'Send Invoice',
    icon: FileText,
    color: 'bg-amber-500 hover:bg-amber-600 text-white',
    text: 'Please find your invoice details below. You can pay via UPI or Cash on Delivery. Thank you for ordering from MR. VIVASAYI!',
  },
  {
    label: 'Out for Delivery',
    icon: Truck,
    color: 'bg-blue-600 hover:bg-blue-700 text-white',
    text: 'Your order is now Out for Delivery! Our delivery partner will reach you within the next 1-2 hours. Thank you for choosing MR. VIVASAYI!',
  },
];

// ─── Main Component ──────────────────────────────────────────────────────────

export const WhatsAppHubPage: React.FC = () => {
  const { showActionModal } = useActionModal();
  const [localMessages, setLocalMessages] = useState<WhatsappMessage[]>([]);
  const [notifQueue, setNotifQueue] = useState<NotificationQueue[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const [m, nq, c] = await Promise.all([
        getJSONStore<WhatsappMessage>('whatsapp_messages'),
        getJSONStore<NotificationQueue>('notification_queue'),
        getJSONStore<Customer>('customers'),
      ]);
      setLocalMessages(m);
      setNotifQueue(nq);
      setCustomers(c);
      setLoading(false);
    }
    load();
  }, []);

  const threads = buildThreads(localMessages);
  const threadList = Array.from(threads.entries());

  const [selectedPhone, setSelectedPhone] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedPhone && threadList.length > 0) {
      setSelectedPhone(threadList[0][0]);
    }
  }, [threadList, selectedPhone]);

  const [searchQuery, setSearchQuery] = useState('');
  const [composeText, setComposeText] = useState('');

  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [selectedPhone, localMessages]);

  const totalMessages = localMessages.length;
  const inbound = localMessages.filter((m) => m.direction === 'inbound').length;
  const outbound = localMessages.filter((m) => m.direction === 'outbound').length;

  const filteredThreads = threadList.filter(([phone]) => {
    const name = resolveCustomerName(phone, customers).toLowerCase();
    const q = searchQuery.toLowerCase();
    return name.includes(q) || phone.includes(q);
  });

  const currentMessages = selectedPhone
    ? (buildThreads(localMessages).get(selectedPhone) ?? [])
    : [];

  const handleSend = (text: string) => {
    if (!selectedPhone || !text.trim()) return;
    const trimmed = text.trim();
    showActionModal({
      title: 'Dispatching WhatsApp Message',
      subtitle: `Transmitting via Meta Cloud API to +91 ${selectedPhone}...`,
      badge: 'WhatsApp Live API',
      duration: 800,
      steps: [
        'Formatting message payload & checking rate limits...',
        'Connecting to Meta WhatsApp Business API...',
        'Delivering message to recipient device...',
        'Chat thread synchronized!'
      ],
      onComplete: () => {
        const newMsg: WhatsappMessage = {
          id: `wa-local-${Date.now()}`,
          phone_number: selectedPhone,
          message_text: trimmed,
          message_type: 'text',
          direction: 'outbound',
          status: 'SENT',
          sent_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
        };
        setLocalMessages((prev) => [...prev, newMsg]);
        setComposeText('');
      }
    });
  };

  const handleRetry = (id: string) => {
    showActionModal({
      title: 'Retrying Message Dispatch',
      subtitle: 'Re-queueing failed message payload for transmission...',
      badge: 'Queue Retry',
      duration: 750,
      steps: [
        'Verifying carrier network & API gateway...',
        'Re-submitting notification to dispatch queue...',
        'Queue worker received task successfully!'
      ],
      onComplete: () => {
        setNotifQueue((prev) =>
          prev.map((n) =>
            n.id === id
              ? { ...n, status: 'PENDING', updated_at: new Date().toISOString() }
              : n
          )
        );
      }
    });
  };

  const [isRefreshing, setIsRefreshing] = useState(false);

  if (loading) {
    return <AdminPageSkeleton title="WhatsApp Business Hub" />;
  }

  return (
    <div className="space-y-8">
      <RefreshSpinnerModal
        isOpen={isRefreshing}
        moduleName="WhatsApp Inbox"
        title="Syncing WhatsApp Messages..."
        subtitle="Retrieving latest customer messages & dispatch queue status..."
        onComplete={() => setIsRefreshing(false)}
      />

      {/* Page Header */}
      <div className="bg-gradient-to-r from-emerald-900 to-emerald-950 text-white p-6 sm:p-8 rounded-3xl shadow-xl border border-emerald-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 text-amber-300 text-xs font-bold uppercase tracking-wider mb-1">
            <MessageSquare className="w-4 h-4" />
            <span>WhatsApp Business Integration</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold">
            WhatsApp Order Inbox &amp; Message Hub
          </h1>
          <p className="text-emerald-200 text-xs sm:text-sm mt-1">
            Monitor inbound customer orders, send confirmations, and manage your notification queue from one place.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500/20 border border-green-400/30 rounded-xl text-green-300 text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse inline-block" />
            Business API Connected
          </div>

          <button
            onClick={() => setIsRefreshing(true)}
            className="px-4 py-2.5 bg-emerald-800 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow border border-emerald-700 flex items-center gap-2 transition-all"
          >
            <RefreshCw className={`w-4 h-4 text-amber-300 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>Refresh Inbox</span>
          </button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">

        <div className="bg-white dark:bg-emerald-900/40 rounded-2xl border border-emerald-100 dark:border-emerald-800 shadow-sm p-6 flex items-center gap-5">
          <div className="p-3 bg-emerald-100 dark:bg-emerald-800 text-emerald-700 dark:text-amber-300 rounded-2xl shrink-0">
            <Inbox className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-500 dark:text-emerald-300 uppercase tracking-wider">Total Messages</p>
            <p className="text-3xl font-black text-gray-900 dark:text-emerald-100">{totalMessages}</p>
            <p className="text-xs text-gray-400 dark:text-emerald-400 mt-0.5">Across all threads</p>
          </div>
        </div>

        <div className="bg-white dark:bg-emerald-900/40 rounded-2xl border border-emerald-100 dark:border-emerald-800 shadow-sm p-6 flex items-center gap-5">
          <div className="p-3 bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-300 rounded-2xl shrink-0">
            <ArrowDownLeft className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-500 dark:text-emerald-300 uppercase tracking-wider">Inbound</p>
            <p className="text-3xl font-black text-gray-900 dark:text-emerald-100">{inbound}</p>
            <p className="text-xs text-gray-400 dark:text-emerald-400 mt-0.5">Customer orders &amp; queries</p>
          </div>
        </div>

        <div className="bg-white dark:bg-emerald-900/40 rounded-2xl border border-emerald-100 dark:border-emerald-800 shadow-sm p-6 flex items-center gap-5">
          <div className="p-3 bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300 rounded-2xl shrink-0">
            <ArrowUpRight className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-500 dark:text-emerald-300 uppercase tracking-wider">Outbound</p>
            <p className="text-3xl font-black text-gray-900 dark:text-emerald-100">{outbound}</p>
            <p className="text-xs text-gray-400 dark:text-emerald-400 mt-0.5">Confirmations &amp; promos</p>
          </div>
        </div>
      </div>

      {/* Two-Panel Inbox */}
      <div className="flex rounded-3xl overflow-hidden border border-emerald-100 dark:border-emerald-800 shadow-md min-h-[560px]">

        {/* LEFT: Thread List */}
        <div className="w-1/3 min-w-0 bg-white dark:bg-emerald-950/60 border-r border-emerald-100 dark:border-emerald-800 flex flex-col">

          <div className="p-4 border-b border-emerald-100 dark:border-emerald-800">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-emerald-500" />
              <input
                type="text"
                placeholder="Search threads..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm rounded-xl bg-emerald-50 dark:bg-emerald-900/50 border border-emerald-100 dark:border-emerald-800 text-gray-800 dark:text-emerald-100 placeholder-gray-400 dark:placeholder-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-400"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-emerald-50 dark:divide-emerald-900">
            {filteredThreads.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-gray-400 dark:text-emerald-600 text-sm gap-2">
                <MessageSquare className="w-8 h-8 opacity-40" />
                <span>No threads found</span>
              </div>
            )}

            {filteredThreads.map(([phone, msgs]) => {
              const name = resolveCustomerName(phone, customers);
              const lastMsg = msgs[msgs.length - 1];
              const unread = countUnread(msgs);
              const isSelected = selectedPhone === phone;

              return (
                <button
                  key={phone}
                  onClick={() => setSelectedPhone(phone)}
                  className={`w-full text-left px-4 py-3.5 flex items-start gap-3 transition-colors ${
                    isSelected
                      ? 'bg-emerald-50 dark:bg-emerald-900/60'
                      : 'hover:bg-gray-50 dark:hover:bg-emerald-900/30'
                  }`}
                >
                  <div className="w-10 h-10 rounded-full bg-emerald-700 dark:bg-emerald-800 text-white flex items-center justify-center text-sm font-bold shrink-0">
                    {String(name || 'C').charAt(0).toUpperCase()}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      <span className={`text-sm font-semibold truncate ${isSelected ? 'text-emerald-800 dark:text-emerald-100' : 'text-gray-800 dark:text-emerald-200'}`}>
                        {name}
                      </span>
                      <span className="text-[10px] text-gray-400 dark:text-emerald-500 shrink-0">
                        {msgTime(lastMsg)}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${
                        lastMsg.direction === 'inbound'
                          ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300'
                          : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300'
                      }`}>
                        {lastMsg.direction === 'inbound' ? 'IN' : 'OUT'}
                      </span>
                      <p className="text-xs text-gray-500 dark:text-emerald-400 truncate flex-1">
                        {lastMsg.message_text ?? '—'}
                      </p>
                      {unread > 0 && (
                        <span className="ml-1 w-5 h-5 rounded-full bg-emerald-600 text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                          {unread}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1 mt-0.5">
                      <Phone className="w-3 h-3 text-gray-300 dark:text-emerald-700" />
                      <span className="text-[10px] text-gray-400 dark:text-emerald-600">{phone}</span>
                    </div>
                  </div>

                  {isSelected && (
                    <ChevronRight className="w-4 h-4 text-emerald-500 shrink-0 mt-1" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* RIGHT: Conversation View */}
        <div className="flex-1 min-w-0 bg-gray-50 dark:bg-emerald-950/30 flex flex-col">

          {selectedPhone ? (
            <>
              {/* Chat Header */}
              <div className="px-5 py-3.5 bg-white dark:bg-emerald-900/50 border-b border-emerald-100 dark:border-emerald-800 flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-emerald-700 text-white flex items-center justify-center text-sm font-bold shrink-0">
                  {resolveCustomerName(selectedPhone, customers).charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-gray-900 dark:text-emerald-100">
                    {resolveCustomerName(selectedPhone, customers)}
                  </p>
                  <div className="flex items-center gap-1 text-[11px] text-gray-500 dark:text-emerald-400">
                    <Phone className="w-3 h-3" />
                    <span>+91 {selectedPhone}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-green-600 dark:text-green-400 font-semibold">
                  <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
                  WhatsApp
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
                {currentMessages.map((msg) => {
                  const isOut = msg.direction === 'outbound';
                  const ts = msg.received_at ?? msg.sent_at ?? msg.created_at;

                  return (
                    <div
                      key={msg.id}
                      className={`flex ${isOut ? 'justify-end' : 'justify-start'}`}
                    >
                      {!isOut && (
                        <div className="w-7 h-7 rounded-full bg-amber-400 dark:bg-amber-500 text-white flex items-center justify-center text-xs font-bold shrink-0 mr-2 mt-1">
                          <User className="w-3.5 h-3.5" />
                        </div>
                      )}

                      <div className={`max-w-[72%] ${isOut ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
                        <div
                          className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed shadow-sm ${
                            isOut
                              ? 'bg-emerald-700 dark:bg-emerald-700 text-white rounded-br-sm'
                              : 'bg-white dark:bg-emerald-900/80 text-gray-800 dark:text-emerald-100 rounded-bl-sm border border-emerald-100 dark:border-emerald-800'
                          }`}
                        >
                          {msg.message_text ?? <span className="italic opacity-60">Media / unsupported type</span>}
                        </div>

                        <div className={`flex items-center gap-1.5 px-1 ${isOut ? 'flex-row-reverse' : 'flex-row'}`}>
                          <span className="text-[10px] text-gray-400 dark:text-emerald-600">
                            {formatDateTime(ts)}
                          </span>

                          {isOut && (
                            <span className={`flex items-center gap-0.5 text-[10px] font-semibold ${msgStatusClass(msg.status)}`}>
                              {msg.status === 'READ' ? (
                                <CheckCheck className="w-3 h-3" />
                              ) : msg.status === 'DELIVERED' ? (
                                <CheckCheck className="w-3 h-3 opacity-60" />
                              ) : msg.status === 'SENT' ? (
                                <Check className="w-3 h-3" />
                              ) : msg.status === 'FAILED' ? (
                                <AlertCircle className="w-3 h-3" />
                              ) : (
                                <Clock className="w-3 h-3" />
                              )}
                              {msg.status}
                            </span>
                          )}
                        </div>
                      </div>

                      {isOut && (
                        <div className="w-7 h-7 rounded-full bg-emerald-600 dark:bg-emerald-700 text-white flex items-center justify-center text-xs font-bold shrink-0 ml-2 mt-1">
                          <Zap className="w-3.5 h-3.5" />
                        </div>
                      )}
                    </div>
                  );
                })}
                <div ref={chatEndRef} />
              </div>

              {/* Quick Reply Actions */}
              <div className="px-5 py-2.5 bg-white dark:bg-emerald-900/40 border-t border-emerald-100 dark:border-emerald-800 flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-bold text-gray-400 dark:text-emerald-500 uppercase tracking-wider mr-1">
                  Quick:
                </span>
                {QUICK_REPLIES.map((qr) => (
                  <button
                    key={qr.label}
                    onClick={() => handleSend(qr.text)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shadow-sm ${qr.color}`}
                  >
                    <qr.icon className="w-3.5 h-3.5" />
                    {qr.label}
                  </button>
                ))}
              </div>

              {/* Compose Bar */}
              <div className="px-5 py-3 bg-white dark:bg-emerald-900/50 border-t border-emerald-100 dark:border-emerald-800 flex items-center gap-3">
                <input
                  type="text"
                  placeholder="Type a message..."
                  value={composeText}
                  onChange={(e) => setComposeText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSend(composeText);
                    }
                  }}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-900/60 border border-emerald-100 dark:border-emerald-800 text-sm text-gray-800 dark:text-emerald-100 placeholder-gray-400 dark:placeholder-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                />
                <button
                  onClick={() => handleSend(composeText)}
                  disabled={!composeText.trim()}
                  className="p-2.5 bg-emerald-700 hover:bg-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl transition-all shadow-sm"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center gap-4 text-gray-400 dark:text-emerald-600 p-10">
              <MessageSquare className="w-14 h-14 opacity-30" />
              <p className="text-base font-semibold">Select a conversation</p>
              <p className="text-sm">Choose a thread from the left panel to view the chat.</p>
            </div>
          )}
        </div>
      </div>

      {/* Notification Queue */}
      <div className="bg-white dark:bg-emerald-900/40 rounded-3xl border border-emerald-100 dark:border-emerald-800 shadow-sm overflow-hidden">

        <div className="px-6 py-4 border-b border-emerald-100 dark:border-emerald-800 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <Bell className="w-5 h-5 text-emerald-700 dark:text-amber-300" />
            <h2 className="text-base font-bold text-gray-900 dark:text-emerald-100">
              Notification Queue
            </h2>
            <span className="text-xs font-semibold bg-emerald-100 dark:bg-emerald-800 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-full">
              {notifQueue.length} items
            </span>
          </div>
          <button className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300 hover:underline">
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-emerald-50 dark:bg-emerald-950 text-left">
                <th className="px-5 py-3 text-xs font-bold text-gray-500 dark:text-emerald-400 uppercase tracking-wider whitespace-nowrap">Channel</th>
                <th className="px-5 py-3 text-xs font-bold text-gray-500 dark:text-emerald-400 uppercase tracking-wider whitespace-nowrap">Recipient</th>
                <th className="px-5 py-3 text-xs font-bold text-gray-500 dark:text-emerald-400 uppercase tracking-wider whitespace-nowrap">Template</th>
                <th className="px-5 py-3 text-xs font-bold text-gray-500 dark:text-emerald-400 uppercase tracking-wider whitespace-nowrap">Status</th>
                <th className="px-5 py-3 text-xs font-bold text-gray-500 dark:text-emerald-400 uppercase tracking-wider whitespace-nowrap text-center">Attempts</th>
                <th className="px-5 py-3 text-xs font-bold text-gray-500 dark:text-emerald-400 uppercase tracking-wider whitespace-nowrap">Scheduled</th>
                <th className="px-5 py-3 text-xs font-bold text-gray-500 dark:text-emerald-400 uppercase tracking-wider whitespace-nowrap">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-emerald-50 dark:divide-emerald-900/60">
              {notifQueue.map((item) => (
                <tr
                  key={item.id}
                  className="hover:bg-emerald-50/60 dark:hover:bg-emerald-900/20 transition-colors"
                >
                  <td className="px-5 py-3.5 whitespace-nowrap">
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${channelBadge(item.channel)}`}>
                      {item.channel}
                    </span>
                  </td>

                  <td className="px-5 py-3.5 whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-gray-400 dark:text-emerald-600" />
                      <span className="text-gray-700 dark:text-emerald-200 font-mono text-xs">
                        +{item.recipient}
                      </span>
                    </div>
                  </td>

                  <td className="px-5 py-3.5 whitespace-nowrap">
                    <span className="text-gray-600 dark:text-emerald-300 text-xs font-medium bg-gray-100 dark:bg-emerald-900/60 px-2 py-0.5 rounded">
                      {item.template_key ?? '—'}
                    </span>
                  </td>

                  <td className="px-5 py-3.5 whitespace-nowrap">
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${notifStatusBadge(item.status)}`}>
                      {item.status}
                    </span>
                    {item.error && (
                      <p className="text-[10px] text-red-500 mt-0.5 max-w-[180px] truncate" title={item.error}>
                        {item.error}
                      </p>
                    )}
                  </td>

                  <td className="px-5 py-3.5 whitespace-nowrap text-center">
                    <span className={`text-xs font-bold ${item.attempts >= item.max_attempts ? 'text-red-500' : 'text-gray-600 dark:text-emerald-300'}`}>
                      {item.attempts}
                      <span className="text-gray-400 dark:text-emerald-600 font-normal"> / {item.max_attempts}</span>
                    </span>
                  </td>

                  <td className="px-5 py-3.5 whitespace-nowrap">
                    <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-emerald-400">
                      <Clock className="w-3.5 h-3.5" />
                      {item.scheduled_at ? formatDateTime(item.scheduled_at) : '—'}
                    </div>
                  </td>

                  <td className="px-5 py-3.5 whitespace-nowrap">
                    {(item.status === 'FAILED' || item.status === 'PENDING') ? (
                      <button
                        onClick={() => handleRetry(item.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-semibold rounded-xl transition-all shadow-sm"
                      >
                        <RefreshCw className="w-3 h-3" />
                        {item.status === 'FAILED' ? 'Retry' : 'Resend'}
                      </button>
                    ) : (item.status === 'SENT' || item.status === 'DELIVERED' || item.status === 'READ') ? (
                      <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 text-xs font-semibold">
                        <CheckCheck className="w-4 h-4" />
                        Delivered
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 text-amber-500 dark:text-amber-400 text-xs font-semibold">
                        <Clock className="w-3.5 h-3.5" />
                        Queued
                      </div>
                    )}
                  </td>
                </tr>
              ))}

              {notifQueue.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-sm text-gray-400 dark:text-emerald-600">
                    No items in the notification queue.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default WhatsAppHubPage;
