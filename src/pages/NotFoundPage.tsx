import React from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import PublicNotFoundPage from './public/PublicNotFoundPage';
import AdminNotFoundPage from './admin/AdminNotFoundPage';

export const NotFoundPage: React.FC = () => {
  const location = useLocation();
  const { user } = useAuth();

  // If path starts with /admin, or if a staff/admin user is logged in (role !== 'CUSTOMER'),
  // render the dedicated Admin Dashboard 404 page with 15-second auto-redirect.
  const isAdminRoute = location.pathname.startsWith('/admin');
  const isStaffOrAdminUser = Boolean(user && user.role && user.role !== 'CUSTOMER');

  if (isAdminRoute || isStaffOrAdminUser) {
    return <AdminNotFoundPage />;
  }

  // Otherwise, render the Public Storefront 404 page
  return <PublicNotFoundPage />;
};

export default NotFoundPage;
