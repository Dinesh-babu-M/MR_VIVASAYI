// ============================================================
// MR. VIVASAYI - Hierarchical Roles & Permission Matrix System
// ============================================================

export type PermissionAction = 'view' | 'create' | 'edit' | 'delete' | 'approve' | 'export';

export const ALL_PERMISSION_ACTIONS: PermissionAction[] = ['view', 'create', 'edit', 'delete', 'approve', 'export'];

export interface PermissionSubmenu {
  id: string;
  label: string;
  description: string;
  availableActions: PermissionAction[];
}

export interface PermissionMenuModule {
  id: string;
  title: string;
  description: string;
  iconName: string;
  submenus: PermissionSubmenu[];
}

/**
 * 10 Comprehensive Hierarchical Modules with Submenus
 */
export const HIERARCHICAL_PERMISSION_TREE: PermissionMenuModule[] = [
  {
    id: 'dashboard',
    title: 'Dashboard & Analytics',
    description: 'Executive overview, real-time sales KPIs & analytical reports',
    iconName: 'LayoutDashboard',
    submenus: [
      {
        id: 'dashboard_overview',
        label: 'Store KPIs & Live Overview',
        description: 'View sales figures, order counters and revenue metrics',
        availableActions: ['view', 'export']
      },
      {
        id: 'dashboard_analytics',
        label: 'Financial Analytics & Trends',
        description: 'Analyze weekly, monthly and yearly growth charts',
        availableActions: ['view', 'export']
      }
    ]
  },
  {
    id: 'pos',
    title: 'POS & Counter Sales',
    description: 'Direct in-store sales counter, billing, receipts & invoices',
    iconName: 'ShoppingCart',
    submenus: [
      {
        id: 'pos_terminal',
        label: 'Counter POS Billing Terminal',
        description: 'Execute counter sales, add cart items, scan products and print receipts',
        availableActions: ['view', 'create', 'edit', 'approve', 'export']
      },
      {
        id: 'pos_billing_details',
        label: 'POS Sales Ledger & History',
        description: 'Review counter receipts, reprint thermal bills and edit bills',
        availableActions: ['view', 'edit', 'delete', 'export']
      },
      {
        id: 'pos_void_return',
        label: 'Void Bills & Counter Returns',
        description: 'Authorize voided sales, reverse customer bills and process counter refunds',
        availableActions: ['create', 'approve', 'delete']
      }
    ]
  },
  {
    id: 'orders',
    title: 'Orders Hub & Delivery',
    description: 'Central orders hub for Website, WhatsApp and counter delivery orders',
    iconName: 'Package',
    submenus: [
      {
        id: 'orders_all',
        label: 'Store & Website Orders List',
        description: 'Manage incoming customer orders across all sales channels',
        availableActions: ['view', 'create', 'edit', 'delete', 'export']
      },
      {
        id: 'orders_whatsapp',
        label: 'Direct WhatsApp Orders',
        description: 'Create direct phone/WhatsApp orders, link customers and track message statuses',
        availableActions: ['view', 'create', 'edit', 'approve', 'export']
      },
      {
        id: 'orders_dispatch',
        label: 'Order Packing & Delivery Dispatch',
        description: 'Transition status to Packing, Ready, Out for Delivery, and Delivered',
        availableActions: ['view', 'edit', 'approve']
      },
      {
        id: 'orders_cod_confirm',
        label: 'COD Payment Confirmations',
        description: 'Approve and confirm cash-on-delivery settlements & payment proofs',
        availableActions: ['view', 'edit', 'approve']
      }
    ]
  },
  {
    id: 'products',
    title: 'Product Catalog & Pricing',
    description: 'Traditional organic produce, grain varieties, SKUs and prices',
    iconName: 'Boxes',
    submenus: [
      {
        id: 'products_catalog',
        label: 'Product Catalog Management',
        description: 'Add new traditional produce, edit Tamil names, pack sizes and descriptions',
        availableActions: ['view', 'create', 'edit', 'delete', 'export']
      },
      {
        id: 'products_pricing',
        label: 'Selling Price & MRP Control',
        description: 'Modify purchase prices, selling prices, offer discounts and pricing history',
        availableActions: ['view', 'edit', 'approve', 'export']
      }
    ]
  },
  {
    id: 'inventory',
    title: 'Stock Control & Batches',
    description: 'Inventory levels, harvest batches, reorder thresholds and adjustments',
    iconName: 'Layers',
    submenus: [
      {
        id: 'inventory_stock',
        label: 'Stock Levels & Reorder Alerts',
        description: 'Monitor on-hand inventory, low stock warnings and out-of-stock items',
        availableActions: ['view', 'edit', 'export']
      },
      {
        id: 'inventory_adjustments',
        label: 'Stock Adjustments & Damage Audits',
        description: 'Record harvest batch arrivals, spoilage, shrinkage or physical count discrepancies',
        availableActions: ['view', 'create', 'approve', 'delete', 'export']
      }
    ]
  },
  {
    id: 'suppliers',
    title: 'Farmer Procurement Hub',
    description: 'Direct producer cooperatives, farmer partners & purchase orders',
    iconName: 'Truck',
    submenus: [
      {
        id: 'suppliers_directory',
        label: 'Producer & Farmer Directory',
        description: 'Register organic producers, bank accounts, districts and payment terms',
        availableActions: ['view', 'create', 'edit', 'delete', 'export']
      },
      {
        id: 'procurement_po',
        label: 'Purchase Orders (PO) Stack',
        description: 'Issue procurement purchase orders, bulk discount tiers and stock reception',
        availableActions: ['view', 'create', 'edit', 'approve', 'delete', 'export']
      }
    ]
  },
  {
    id: 'customers',
    title: 'Customer Relationship CRM',
    description: 'Customer profiles, duplicate phone grouping, preferences & dispatching',
    iconName: 'Users',
    submenus: [
      {
        id: 'customers_directory',
        label: 'Customer Directory & Profiles',
        description: 'Search customers by ID, normalized phone, country, channel and view order history',
        availableActions: ['view', 'create', 'edit', 'delete', 'export']
      },
      {
        id: 'customers_campaigns',
        label: 'WhatsApp Message Templates & Dispatches',
        description: 'Send itemized receipts, order confirmations and personalized restock alerts',
        availableActions: ['view', 'create', 'edit', 'approve', 'export']
      }
    ]
  },
  {
    id: 'marketing',
    title: 'Marketing & Discount Engine',
    description: 'Promotional discount coupons, seasonal campaigns & customer reviews',
    iconName: 'Sparkles',
    submenus: [
      {
        id: 'marketing_coupons',
        label: 'Coupons & Promo Codes',
        description: 'Create discount codes, percentage vouchers, minimum cart thresholds and usage caps',
        availableActions: ['view', 'create', 'edit', 'delete', 'export']
      },
      {
        id: 'marketing_reviews',
        label: 'Customer Reviews Moderation',
        description: 'Approve, feature or reject public customer feedback and product ratings',
        availableActions: ['view', 'edit', 'approve', 'delete', 'export']
      }
    ]
  },
  {
    id: 'cms',
    title: 'Website Content & CMS',
    description: 'Storefront banners, announcements, about story and SEO meta',
    iconName: 'Globe',
    submenus: [
      {
        id: 'cms_content',
        label: 'Homepage Banners & Announcements',
        description: 'Customize hero slides, seasonal marquee banners, and about section story',
        availableActions: ['view', 'create', 'edit', 'delete', 'export']
      },
      {
        id: 'cms_seo',
        label: 'SEO Meta & Search Rankings',
        description: 'Configure OpenGraph tags, schema markup and meta descriptions',
        availableActions: ['view', 'edit', 'approve']
      }
    ]
  },
  {
    id: 'user_roles',
    title: 'Staff & Role Management',
    description: 'Staff member directory, custom role creator, groups and permission matrix',
    iconName: 'Shield',
    submenus: [
      {
        id: 'staff_users',
        label: 'Staff Accounts & Departments',
        description: 'Create, update, deactivate staff accounts and assign user groups/departments',
        availableActions: ['view', 'create', 'edit', 'delete', 'export']
      },
      {
        id: 'roles_permissions',
        label: 'Custom Role & Permission Editor',
        description: 'Create, edit, duplicate roles and configure granular View/Create/Edit/Delete/Approve/Export matrix',
        availableActions: ['view', 'create', 'edit', 'delete', 'approve', 'export']
      }
    ]
  },
  {
    id: 'audit_logs',
    title: 'Audit Logs & System Security',
    description: 'Trace operational changes, catalog edits, counter sales and security access',
    iconName: 'ShieldAlert',
    submenus: [
      {
        id: 'audit_trails',
        label: 'Activity & Compliance Audit Trails',
        description: 'Inspect user logins, transaction void events, permission changes and export logs',
        availableActions: ['view', 'export']
      },
      {
        id: 'system_settings',
        label: 'System & Database Configuration',
        description: 'Store credentials, database performance, delivery rules and backup sync',
        availableActions: ['view', 'edit', 'approve', 'export']
      }
    ]
  }
];

export interface RolePermissionsMap {
  [submenuId: string]: {
    view: boolean;
    create: boolean;
    edit: boolean;
    delete: boolean;
    approve: boolean;
    export: boolean;
  };
}

export interface RoleDefinition {
  role: string;
  title: string;
  level: number;
  desc: string;
  badgeColor: string;
  isCustom?: boolean;
  department?: string;
  permissions?: RolePermissionsMap;
}

/**
 * Standard System Default Roles
 */
export const DEFAULT_SYSTEM_ROLES: RoleDefinition[] = [
  {
    role: 'SUPER_ADMIN',
    title: 'Super Administrator',
    level: 1,
    desc: 'Full unrestricted access to all store operations, system controls, security and roles.',
    badgeColor: 'bg-rose-100 text-rose-800 border-rose-200'
  },
  {
    role: 'OWNER',
    title: 'Business Owner',
    level: 1,
    desc: 'Complete business ownership privileges with executive analytics and financial approvals.',
    badgeColor: 'bg-amber-100 text-amber-900 border-amber-300'
  },
  {
    role: 'ADMIN',
    title: 'Store Administrator',
    level: 2,
    desc: 'High-level operational management across orders, catalog, stock, CRM and staff.',
    badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200'
  },
  {
    role: 'STORE_MANAGER',
    title: 'Store Operations Manager',
    level: 3,
    desc: 'Supervises store operations, counter billing, stock allocations and staff duties.',
    badgeColor: 'bg-teal-100 text-teal-800 border-teal-200',
    department: 'Store Operations'
  },
  {
    role: 'BILLING_MANAGER',
    title: 'Billing & POS Manager',
    level: 3,
    desc: 'Dedicated to POS billing, cash counter ledger, void bill approvals and daily receipts.',
    badgeColor: 'bg-blue-100 text-blue-800 border-blue-200',
    department: 'Billing & Accounts'
  },
  {
    role: 'PRODUCT_MANAGER',
    title: 'Product & Catalog Manager',
    level: 3,
    desc: 'Manages organic product SKUs, pricing updates, categories and supplier relationships.',
    badgeColor: 'bg-purple-100 text-purple-800 border-purple-200',
    department: 'Catalog & Procurement'
  },
  {
    role: 'INVENTORY_MANAGER',
    title: 'Inventory & Warehouse Lead',
    level: 3,
    desc: 'Oversees warehouse inventory batches, stock movements, damage audits and POs.',
    badgeColor: 'bg-orange-100 text-orange-800 border-orange-200',
    department: 'Warehouse & Logistics'
  },
  {
    role: 'SALES_STAFF',
    title: 'Sales & POS Cashier',
    level: 4,
    desc: 'Counter sales, barcode/name product search, cart operations and customer lookup.',
    badgeColor: 'bg-cyan-100 text-cyan-800 border-cyan-200',
    department: 'Store Operations'
  },
  {
    role: 'DELIVERY_STAFF',
    title: 'Field Delivery Agent',
    level: 4,
    desc: 'Assigned orders delivery tracking, customer phone lookups and delivery confirmation.',
    badgeColor: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    department: 'Field Logistics'
  },
  {
    role: 'STAFF',
    title: 'General Store Staff',
    level: 4,
    desc: 'Standard store duty operations, order preparation and general assistance.',
    badgeColor: 'bg-gray-100 text-gray-800 border-gray-200',
    department: 'Store Operations'
  },
  {
    role: 'VIEWER',
    title: 'Read-Only Auditor',
    level: 5,
    desc: 'Auditor access with read-only view permission across metrics and order records.',
    badgeColor: 'bg-slate-100 text-slate-700 border-slate-200'
  }
];

export const USER_GROUPS = [
  'Store Operations',
  'Warehouse & Logistics',
  'Executive & Finance',
  'Sales & Marketing',
  'Field Delivery',
  'IT & System Administration'
];

export const DEPARTMENTS = [
  'Store Management',
  'Counter Billing & Cash',
  'Inventory & Stock Control',
  'Farmer Procurement & Sourcing',
  'Customer Care & CRM',
  'Marketing & Promotions',
  'Field Logistics & Dispatch',
  'General Operations'
];

/**
 * Builds default permissions for a role based on its role code and level
 */
export function buildDefaultRolePermissions(roleCode: string): RolePermissionsMap {
  const map: RolePermissionsMap = {};
  const isSuper = roleCode === 'SUPER_ADMIN' || roleCode === 'OWNER';
  const isAdmin = roleCode === 'ADMIN';
  const isViewer = roleCode === 'VIEWER';
  const isBilling = roleCode === 'BILLING_MANAGER' || roleCode === 'SALES_STAFF';
  const isInventory = roleCode === 'INVENTORY_MANAGER' || roleCode === 'PRODUCT_MANAGER';
  const isDelivery = roleCode === 'DELIVERY_STAFF';

  HIERARCHICAL_PERMISSION_TREE.forEach(module => {
    module.submenus.forEach(sub => {
      let canView = isSuper || isAdmin;
      let canCreate = isSuper || isAdmin;
      let canEdit = isSuper || isAdmin;
      let canDelete = isSuper;
      let canApprove = isSuper || isAdmin;
      let canExport = isSuper || isAdmin;

      if (isViewer) {
        canView = true;
        canCreate = false;
        canEdit = false;
        canDelete = false;
        canApprove = false;
        canExport = false;
      } else if (isBilling) {
        if (module.id === 'pos' || module.id === 'orders' || module.id === 'customers') {
          canView = true;
          canCreate = true;
          canEdit = true;
          canApprove = roleCode === 'BILLING_MANAGER';
          canExport = true;
        } else if (module.id === 'dashboard' || module.id === 'products') {
          canView = true;
          canCreate = false;
          canEdit = false;
        } else {
          canView = false;
          canCreate = false;
          canEdit = false;
        }
      } else if (isInventory) {
        if (module.id === 'products' || module.id === 'inventory' || module.id === 'suppliers') {
          canView = true;
          canCreate = true;
          canEdit = true;
          canApprove = true;
          canExport = true;
        } else if (module.id === 'dashboard' || module.id === 'orders') {
          canView = true;
        } else {
          canView = false;
        }
      } else if (isDelivery) {
        if (sub.id === 'orders_dispatch' || sub.id === 'orders_all') {
          canView = true;
          canEdit = true;
          canApprove = true;
        } else {
          canView = false;
        }
      }

      map[sub.id] = {
        view: sub.availableActions.includes('view') ? canView : false,
        create: sub.availableActions.includes('create') ? canCreate : false,
        edit: sub.availableActions.includes('edit') ? canEdit : false,
        delete: sub.availableActions.includes('delete') ? canDelete : false,
        approve: sub.availableActions.includes('approve') ? canApprove : false,
        export: sub.availableActions.includes('export') ? canExport : false,
      };
    });
  });

  return map;
}

/**
 * Duplicates a role with all permissions copied and new title / code
 */
export function duplicateRole(sourceRole: RoleDefinition, newTitle: string, newCode: string): RoleDefinition {
  const cleanCode = newCode.toUpperCase().replace(/\s+/g, '_');
  return {
    role: cleanCode,
    title: newTitle,
    level: Math.max(3, sourceRole.level),
    desc: `Custom role duplicated from ${sourceRole.title}.`,
    badgeColor: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    isCustom: true,
    department: sourceRole.department || 'Store Operations',
    permissions: JSON.parse(JSON.stringify(sourceRole.permissions || buildDefaultRolePermissions(sourceRole.role)))
  };
}
