import React from 'react';
import { Navigate } from 'react-router-dom';

/**
 * 路由守衛：未登入者一律導回首頁（首頁會顯示經銷商限定公告）。
 */
const RequireAuth: React.FC<{ children: React.ReactElement }> = ({ children }) => {
  const currentUser = JSON.parse(localStorage.getItem('user') || 'null');

  if (!currentUser) {
    return <Navigate to="/" replace />;
  }

  return children;
};

export default RequireAuth;
