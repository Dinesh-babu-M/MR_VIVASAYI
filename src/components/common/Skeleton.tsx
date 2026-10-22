import React from 'react';

// Base Skeleton Primitive with animated shimmer gradient
export const Skeleton: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div
      className={`relative overflow-hidden bg-gray-200/80 dark:bg-emerald-900/40 rounded-xl before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_2s_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/40 dark:before:via-white/10 before:to-transparent ${className}`}
    />
  );
};

// 1. Table Skeleton (Used across CRM pages: Orders, Staff, Products, Customers, Inventory, Suppliers, Audit)
export const TableSkeleton: React.FC<{ rows?: number; cols?: number }> = ({ rows = 6, cols = 6 }) => {
  return (
    <div className="w-full bg-white dark:bg-emerald-950 rounded-2xl border border-gray-100 dark:border-emerald-800/80 overflow-hidden shadow-sm animate-fadeIn">
      {/* Table Top Controls Skeleton */}
      <div className="p-4 border-b border-gray-100 dark:border-emerald-800/80 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Skeleton className="w-48 sm:w-64 h-9 rounded-xl" />
          <Skeleton className="w-24 h-9 rounded-xl" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="w-24 h-9 rounded-xl" />
          <Skeleton className="w-32 h-9 rounded-xl" />
        </div>
      </div>

      {/* Table Header */}
      <div className="bg-emerald-50/60 dark:bg-emerald-900/40 p-3.5 border-b border-emerald-100/60 dark:border-emerald-800/80 flex items-center justify-between gap-4">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} className="h-4 flex-1 rounded-md" />
        ))}
      </div>

      {/* Table Rows */}
      <div className="divide-y divide-gray-100 dark:divide-emerald-900/60">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="p-4 flex items-center justify-between gap-4">
            {/* First col: Avatar / ID + Title */}
            <div className="flex items-center gap-3 flex-1">
              <Skeleton className="w-9 h-9 rounded-full shrink-0" />
              <div className="space-y-1.5 flex-1">
                <Skeleton className="h-4 w-3/4 rounded-md" />
                <Skeleton className="h-3 w-1/2 rounded-md" />
              </div>
            </div>
            {/* Middle cols */}
            {Array.from({ length: cols - 2 }).map((_, c) => (
              <div key={c} className="flex-1 hidden sm:block">
                <Skeleton className="h-4 w-4/5 rounded-md" />
              </div>
            ))}
            {/* Action buttons col */}
            <div className="flex items-center justify-end gap-1.5 shrink-0">
              <Skeleton className="w-8 h-8 rounded-lg" />
              <Skeleton className="w-8 h-8 rounded-lg" />
              <Skeleton className="w-8 h-8 rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// 2. Card Grid Skeleton (Used in Public Products, Featured Lists, Categories)
export const CardGridSkeleton: React.FC<{ count?: number }> = ({ count = 8 }) => {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6 animate-fadeIn">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="bg-white dark:bg-emerald-950/70 rounded-2xl border border-gray-100 dark:border-emerald-800/80 overflow-hidden p-3.5 space-y-3 shadow-xs"
        >
          {/* Product Image placeholder */}
          <Skeleton className="w-full h-40 sm:h-48 rounded-xl" />
          
          {/* Badge & Rating */}
          <div className="flex items-center justify-between">
            <Skeleton className="w-16 h-4 rounded-md" />
            <Skeleton className="w-12 h-4 rounded-md" />
          </div>

          {/* Titles */}
          <div className="space-y-1.5">
            <Skeleton className="w-full h-4 rounded-md" />
            <Skeleton className="w-2/3 h-3 rounded-md" />
          </div>

          {/* Price & Add to Cart button */}
          <div className="pt-2 flex items-center justify-between border-t border-gray-50 dark:border-emerald-900/60">
            <div className="space-y-1">
              <Skeleton className="w-16 h-5 rounded-md" />
              <Skeleton className="w-10 h-3 rounded-md" />
            </div>
            <Skeleton className="w-24 h-9 rounded-xl" />
          </div>
        </div>
      ))}
    </div>
  );
};

// 3. Stat Cards Skeleton (KPI widgets for CRM)
export const StatCardsSkeleton: React.FC<{ count?: number }> = ({ count = 4 }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-fadeIn">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="bg-white dark:bg-emerald-950 p-4 rounded-2xl border border-gray-100 dark:border-emerald-800/80 shadow-xs flex items-center justify-between gap-4"
        >
          <div className="space-y-2 flex-1">
            <Skeleton className="h-3 w-20 rounded-md" />
            <Skeleton className="h-6 w-28 rounded-md" />
            <Skeleton className="h-3 w-32 rounded-md" />
          </div>
          <Skeleton className="w-12 h-12 rounded-2xl shrink-0" />
        </div>
      ))}
    </div>
  );
};

// 4. CRM Dashboard Skeleton (Full CRM Overview page)
export const DashboardSkeleton: React.FC = () => {
  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Top Banner / Welcome skeleton */}
      <div className="bg-white dark:bg-emerald-950 p-6 rounded-3xl border border-emerald-100 dark:border-emerald-800/80 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-7 w-64 rounded-xl" />
          <Skeleton className="h-4 w-96 rounded-md" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-10 w-28 rounded-xl" />
          <Skeleton className="h-10 w-32 rounded-xl" />
        </div>
      </div>

      {/* 4 Stat KPI cards */}
      <StatCardsSkeleton count={4} />

      {/* Analytics Charts Grid Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-emerald-950 p-5 rounded-3xl border border-gray-100 dark:border-emerald-800/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-40 rounded-md" />
            <Skeleton className="h-7 w-24 rounded-lg" />
          </div>
          <Skeleton className="w-full h-64 rounded-2xl" />
        </div>

        <div className="bg-white dark:bg-emerald-950 p-5 rounded-3xl border border-gray-100 dark:border-emerald-800/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-40 rounded-md" />
            <Skeleton className="h-7 w-24 rounded-lg" />
          </div>
          <Skeleton className="w-full h-64 rounded-2xl" />
        </div>
      </div>

      {/* Recent Orders Table Skeleton */}
      <TableSkeleton rows={5} cols={6} />
    </div>
  );
};

// 5. Public Website Page Skeleton (Home, Catalog, About, Contact fallback)
export const PublicPageSkeleton: React.FC = () => {
  return (
    <div className="min-h-screen space-y-8 animate-fadeIn pb-16">
      {/* Hero Banner Skeleton */}
      <div className="w-full h-80 sm:h-96 bg-gradient-to-br from-emerald-900 to-emerald-950 relative overflow-hidden flex items-center justify-center p-6">
        <div className="text-center space-y-4 max-w-xl w-full">
          <Skeleton className="h-4 w-32 mx-auto rounded-full bg-white/20" />
          <Skeleton className="h-10 sm:h-12 w-3/4 mx-auto rounded-2xl bg-white/20" />
          <Skeleton className="h-4 w-5/6 mx-auto rounded-md bg-white/20" />
          <div className="pt-2 flex justify-center gap-3">
            <Skeleton className="h-11 w-36 rounded-xl bg-amber-400/40" />
            <Skeleton className="h-11 w-36 rounded-xl bg-white/20" />
          </div>
        </div>
      </div>

      {/* Category Pills Bar Skeleton */}
      <div className="max-w-7xl mx-auto px-4 flex items-center gap-3 overflow-x-hidden">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-28 sm:w-36 rounded-full shrink-0" />
        ))}
      </div>

      {/* Products Grid Skeleton */}
      <div className="max-w-7xl mx-auto px-4 space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-48 rounded-lg" />
          <Skeleton className="h-4 w-24 rounded-md" />
        </div>
        <CardGridSkeleton count={8} />
      </div>
    </div>
  );
};

// 6. Generic Admin CRM Page Skeleton (Breadcrumbs, Filters, Stat cards, Data table)
export const AdminPageSkeleton: React.FC<{ title?: string }> = ({ title = 'Loading Module Data...' }) => {
  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Page Title & Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Skeleton className="h-7 w-48 rounded-xl" />
            <Skeleton className="h-5 w-20 rounded-full" />
          </div>
          <Skeleton className="h-4 w-72 rounded-md" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-10 w-24 rounded-xl" />
          <Skeleton className="h-10 w-36 rounded-xl" />
        </div>
      </div>

      {/* KPI Cards */}
      <StatCardsSkeleton count={3} />

      {/* Main Table */}
      <TableSkeleton rows={7} cols={6} />
    </div>
  );
};

// 7. Product Detail Page Skeleton
export const ProductDetailSkeleton: React.FC = () => {
  return (
    <div className="max-w-6xl mx-auto px-4 py-8 animate-fadeIn space-y-8">
      {/* Breadcrumb skeleton */}
      <div className="flex items-center gap-2">
        <Skeleton className="h-4 w-16 rounded-md" />
        <Skeleton className="h-4 w-4 rounded-md" />
        <Skeleton className="h-4 w-24 rounded-md" />
        <Skeleton className="h-4 w-4 rounded-md" />
        <Skeleton className="h-4 w-32 rounded-md" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
        {/* Left: Product Image Gallery */}
        <div className="space-y-4">
          <Skeleton className="w-full h-80 sm:h-96 rounded-3xl" />
          <div className="flex gap-3">
            <Skeleton className="w-20 h-20 rounded-2xl" />
            <Skeleton className="w-20 h-20 rounded-2xl" />
            <Skeleton className="w-20 h-20 rounded-2xl" />
          </div>
        </div>

        {/* Right: Product Details & Purchase Form */}
        <div className="space-y-5">
          <div className="space-y-2">
            <Skeleton className="h-5 w-28 rounded-full" />
            <Skeleton className="h-8 w-4/5 rounded-xl" />
            <Skeleton className="h-5 w-1/2 rounded-md" />
          </div>

          <div className="flex items-baseline gap-3">
            <Skeleton className="h-9 w-28 rounded-xl" />
            <Skeleton className="h-6 w-20 rounded-md" />
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>

          <Skeleton className="h-16 w-full rounded-2xl" />

          {/* Pack sizes pills */}
          <div className="space-y-2">
            <Skeleton className="h-4 w-24 rounded-md" />
            <div className="flex gap-2">
              <Skeleton className="h-9 w-20 rounded-xl" />
              <Skeleton className="h-9 w-20 rounded-xl" />
              <Skeleton className="h-9 w-20 rounded-xl" />
            </div>
          </div>

          {/* Quantity & CTA button */}
          <div className="flex gap-4 pt-4 border-t border-gray-100 dark:border-emerald-900">
            <Skeleton className="h-12 w-32 rounded-2xl" />
            <Skeleton className="h-12 flex-1 rounded-2xl" />
          </div>

          {/* Features Accordion */}
          <div className="space-y-2 pt-2">
            <Skeleton className="h-12 w-full rounded-2xl" />
            <Skeleton className="h-12 w-full rounded-2xl" />
          </div>
        </div>
      </div>
    </div>
  );
};

// 8. POS Terminal Skeleton
export const POSSkeleton: React.FC = () => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fadeIn pb-12">
      {/* Left 2 Cols: Category Selector & Product Catalog Grid */}
      <div className="lg:col-span-2 space-y-4">
        {/* Category selector */}
        <div className="flex items-center gap-2 overflow-x-hidden">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-24 rounded-xl shrink-0" />
          ))}
        </div>
        {/* Search & scan input */}
        <Skeleton className="h-11 w-full rounded-2xl" />
        {/* Product item tiles */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="bg-white dark:bg-emerald-950 p-3 rounded-2xl border border-gray-100 dark:border-emerald-800 space-y-2">
              <Skeleton className="w-full h-24 rounded-xl" />
              <Skeleton className="h-4 w-3/4 rounded-md" />
              <Skeleton className="h-4 w-1/2 rounded-md" />
            </div>
          ))}
        </div>
      </div>

      {/* Right Col: Bill & Checkout Register */}
      <div className="bg-white dark:bg-emerald-950 p-5 rounded-3xl border border-gray-100 dark:border-emerald-800 space-y-4 shadow-sm">
        <Skeleton className="h-6 w-36 rounded-md" />
        <Skeleton className="h-10 w-full rounded-xl" />
        <div className="space-y-2 border-y border-gray-100 dark:border-emerald-900 py-4">
          <Skeleton className="h-12 w-full rounded-xl" />
          <Skeleton className="h-12 w-full rounded-xl" />
          <Skeleton className="h-12 w-full rounded-xl" />
        </div>
        <div className="space-y-2 pt-2">
          <div className="flex justify-between">
            <Skeleton className="h-4 w-20 rounded-md" />
            <Skeleton className="h-4 w-16 rounded-md" />
          </div>
          <div className="flex justify-between">
            <Skeleton className="h-6 w-24 rounded-md" />
            <Skeleton className="h-6 w-24 rounded-md" />
          </div>
        </div>
        <Skeleton className="h-12 w-full rounded-2xl" />
      </div>
    </div>
  );
};
