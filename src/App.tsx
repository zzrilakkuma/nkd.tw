import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import ErrorBoundary from './components/ErrorBoundary';
import Layout from './components/layout/Layout';
import AgeVerification from './components/AgeVerification';
import Home from './pages/Home';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import Products from './pages/product/Products';
import Cart from './pages/cart/Cart';
import Checkout from './pages/order/Checkout';
import OrderConfirm from './pages/order/OrderConfirm';
import Payment from './pages/order/Payment';
import MyOrders from './pages/order/MyOrders';
import AdminDashboard from './pages/admin/AdminDashboard';
import Profile from './pages/profile/Profile';
import './App.css';

function App() {
  return (
    <ErrorBoundary>
      <AgeVerification />
      <Router>
        <Layout>
          <Routes>
            <Route path="/" element={<Products />} />
            <Route path="/home" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/cart" element={<Cart />} />
            <Route path="/checkout" element={<Checkout />} />
            <Route path="/order-confirm" element={<OrderConfirm />} />
            <Route path="/payment" element={<Payment />} />
            <Route path="/my-orders" element={<MyOrders />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/profile" element={<Profile />} />
          </Routes>
        </Layout>
      </Router>
    </ErrorBoundary>
  );
}

export default App;
