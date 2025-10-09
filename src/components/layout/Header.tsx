import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';

const Header: React.FC = () => {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const [cartBounce, setCartBounce] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem('user');
    navigate('/');
    setMobileMenuOpen(false);
  };

  const updateCartCount = () => {
    const cart = JSON.parse(localStorage.getItem('cart') || '[]');
    const totalCount = cart.reduce((sum: number, item: any) => sum + item.quantity, 0);
    const previousCount = cartCount;
    setCartCount(totalCount);

    if (totalCount > previousCount) {
      setCartBounce(true);
      setTimeout(() => setCartBounce(false), 500);
    }
  };

  useEffect(() => {
    updateCartCount();

    // Listen for storage changes
    const handleStorageChange = () => {
      updateCartCount();
    };

    window.addEventListener('storage', handleStorageChange);

    // Custom event for cart updates in the same window
    const handleCartUpdate = () => {
      updateCartCount();
    };
    window.addEventListener('cartUpdated', handleCartUpdate);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('cartUpdated', handleCartUpdate);
    };
  }, [cartCount]);

  const currentUser = JSON.parse(localStorage.getItem('user') || 'null');

  return (
    <header className="header">
      <div className="container">
        <div className="header-left">
          <Link to="/" className="logo">
            <h1>NKD.tw</h1>
          </Link>

          <nav className="nav-left desktop-nav">
            <Link to="/" className="nav-link">首頁</Link>
            <Link to="/products" className="nav-link">商品</Link>
          </nav>
        </div>

        <nav className="nav-right desktop-nav">
          {currentUser ? (
            <div className="user-dropdown">
              <button className="user-dropdown-toggle">
                歡迎, {currentUser.username}
              </button>
              <div className="dropdown-menu">
                <Link to="/my-orders" className="dropdown-item">
                  我的訂單
                </Link>
                {currentUser.isAdmin && (
                  <Link to="/admin" className="dropdown-item">
                    後台管理
                  </Link>
                )}
                <button onClick={handleLogout} className="dropdown-item">
                  登出
                </button>
              </div>
            </div>
          ) : (
            <>
              <Link to="/login" className="nav-link">登入</Link>
              <Link to="/register" className="nav-link">註冊</Link>
            </>
          )}
          <Link to="/cart" className="nav-link cart-link">
            購物車
            {cartCount > 0 && (
              <span className={`cart-badge ${cartBounce ? 'bounce' : ''}`}>
                {cartCount}
              </span>
            )}
          </Link>
        </nav>

        {/* Mobile Navigation */}
        <div className="mobile-nav">
          <Link to="/cart" className="nav-link cart-link">
            購物車
            {cartCount > 0 && (
              <span className={`cart-badge ${cartBounce ? 'bounce' : ''}`}>
                {cartCount}
              </span>
            )}
          </Link>
          <button
            className={`hamburger-btn ${mobileMenuOpen ? 'active' : ''}`}
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            <span></span>
            <span></span>
            <span></span>
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="mobile-menu">
            <Link to="/" className="mobile-menu-item" onClick={() => setMobileMenuOpen(false)}>
              首頁
            </Link>
            <Link to="/products" className="mobile-menu-item" onClick={() => setMobileMenuOpen(false)}>
              商品
            </Link>
            {currentUser ? (
              <>
                <Link to="/my-orders" className="mobile-menu-item" onClick={() => setMobileMenuOpen(false)}>
                  我的訂單
                </Link>
                {currentUser.isAdmin && (
                  <Link to="/admin" className="mobile-menu-item" onClick={() => setMobileMenuOpen(false)}>
                    後台管理
                  </Link>
                )}
                <button onClick={handleLogout} className="mobile-menu-item">
                  登出
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="mobile-menu-item" onClick={() => setMobileMenuOpen(false)}>
                  登入
                </Link>
                <Link to="/register" className="mobile-menu-item" onClick={() => setMobileMenuOpen(false)}>
                  註冊
                </Link>
              </>
            )}
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;