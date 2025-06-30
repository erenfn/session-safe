import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../services/authProvider';
import LoadingPage from '../LoadingPage/LoadingPage';
import { renderIfAuthorized } from '../../utils/generalHelper';

const AdminRoute = ({ Component }) => {
  const { userInfo, isFetching } = useAuth();

  if (isFetching) {
    return <LoadingPage />;
  }

  // Use renderIfAuthorized to check admin access
  const adminContent = renderIfAuthorized(userInfo?.role, 'admin', <Component />);
  
  // If not admin, redirect to homepage
  if (!adminContent) {
    return <Navigate to="/" replace />;
  }

  // Render the protected component if user is admin
  return adminContent;
};

export default AdminRoute; 