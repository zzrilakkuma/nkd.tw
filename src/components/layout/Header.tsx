import React from 'react';
import { Link, useNavigate } from 'react-router-dom';

const Header: React.FC = () => {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('user');
    navigate('/');
  };

  const currentUser = JSON.parse(localStorage.getItem('user') || 'null');

  return (
    <header className="header">
      <div className="container">
        <Link to="/" className="logo">
          <h1>水煙商城</h1>
        </Link>

        <nav className="navigation">
          <Link to="/" className="nav-link">首頁</Link>
          <Link to="/products" className="nav-link">商品</Link>
          <Link to="/cart" className="nav-link">購物車</Link>

          {currentUser ? (
            <div className="user-menu">
              <span>歡迎, {currentUser.username}</span>
              <Link to="/my-orders" className="nav-link">我的訂單</Link>
              {currentUser.isAdmin && (
                <Link to="/admin" className="nav-link">後台管理</Link>
              )}
              <button onClick={handleLogout} className="logout-btn">登出</button>
            </div>
          ) : (
            <div className="auth-links">
              <Link to="/login" className="nav-link">登入</Link>
              <Link to="/register" className="nav-link">註冊</Link>
            </div>
          )}
        </nav>
      </div>
    </header>
  );
};

export default Header;