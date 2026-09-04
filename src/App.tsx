import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import ErrorBoundary from './components/ErrorBoundary';
import Layout from './components/layout/Layout';
import AgeVerification from './components/AgeVerification';
import RequireAuth from './components/RequireAuth';
import Home from './pages/Home';
import RestrictedLanding from './pages/RestrictedLanding';
import Contact from './pages/Contact';
import Login from './pages/auth/Login';
import ChangePassword from './pages/auth/ChangePassword';
import Products from './pages/product/Products';
import Cart from './pages/cart/Cart';
import Checkout from './pages/order/Checkout';
import OrderConfirm from './pages/order/OrderConfirm';
import Payment from './pages/order/Payment';
import MyOrders from './pages/order/MyOrders';
import AdminDashboard from './pages/admin/AdminDashboard';
import Profile from './pages/profile/Profile';
import './App.css';

/**
 * 首頁閘門：未登入顯示經銷商限定公告頁，已登入顯示商品頁。
 * 需在路由渲染時讀取登入狀態，故獨立為元件（避免 App 掛載時的狀態被固定）。
 */
const HomeGate: React.FC = () => {
  const currentUser = JSON.parse(localStorage.getItem('user') || 'null');
  return currentUser ? <Products /> : <RestrictedLanding />;
};

function App() {
  return (
    <ErrorBoundary>
      <AgeVerification />
      <Router>
        <Layout>
          <Routes>
            <Route path="/" element={<HomeGate />} />
            <Route path="/login" element={<Login />} />
            <Route path="/home" element={<RequireAuth><Home /></RequireAuth>} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/change-password" element={<RequireAuth><ChangePassword /></RequireAuth>} />
            <Route path="/cart" element={<RequireAuth><Cart /></RequireAuth>} />
            <Route path="/checkout" element={<RequireAuth><Checkout /></RequireAuth>} />
            <Route path="/order-confirm" element={<RequireAuth><OrderConfirm /></RequireAuth>} />
            <Route path="/payment" element={<RequireAuth><Payment /></RequireAuth>} />
            <Route path="/my-orders" element={<RequireAuth><MyOrders /></RequireAuth>} />
            <Route path="/admin" element={<RequireAuth><AdminDashboard /></RequireAuth>} />
            <Route path="/profile" element={<RequireAuth><Profile /></RequireAuth>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Layout>
      </Router>
    </ErrorBoundary>
  );
}

export default App;
