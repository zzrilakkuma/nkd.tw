import React, { useState, useEffect } from 'react';
import Slider from 'react-slick';
import { Product } from '../../types';
import { productsAPI } from '../../services/api';
import { formatPrice } from '../../utils';
import '../../styles/products.css';
import 'slick-carousel/slick/slick.css';
import 'slick-carousel/slick/slick-theme.css';

const Products: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cart, setCart] = useState<any[]>(() => {
    return JSON.parse(localStorage.getItem('cart') || '[]');
  });
  const [showModal, setShowModal] = useState(false);
  const [modalMessage, setModalMessage] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('全部');

  // 從 API 獲取商品
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setError(null);
        const data = await productsAPI.getAll();
        setProducts(data);
      } catch (error: any) {
        console.error('Failed to fetch products:', error);
        setError(error.message || '無法載入商品資料，請確認後端 API 是否正常運作');
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  // 取得所有分類
  const categories = ['全部', ...Array.from(new Set(products.map(p => p.category)))];

  // 根據分類篩選商品
  const filteredProducts = selectedCategory === '全部'
    ? products
    : products.filter(p => p.category === selectedCategory);

  useEffect(() => {
    if (showModal) {
      const timer = setTimeout(() => {
        setShowModal(false);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [showModal]);

  const addToCart = (product: Product) => {
    const currentUser = JSON.parse(localStorage.getItem('user') || 'null');

    if (!currentUser) {
      setModalMessage('請先登入會員');
      setShowModal(true);
      return;
    }

    const existingItem = cart.find(item => item.product.id === product.id);
    let newCart;

    if (existingItem) {
      newCart = cart.map(item =>
        item.product.id === product.id
          ? { ...item, quantity: item.quantity + 1 }
          : item
      );
    } else {
      newCart = [...cart, { product, quantity: 1 }];
    }

    setCart(newCart);
    localStorage.setItem('cart', JSON.stringify(newCart));

    // Dispatch custom event to update cart count in header
    window.dispatchEvent(new Event('cartUpdated'));

    setModalMessage('商品已加入購物車！');
    setShowModal(true);
  };

  const carouselSettings = {
    dots: true,
    infinite: true,
    speed: 500,
    slidesToShow: 1,
    slidesToScroll: 1,
    autoplay: true,
    autoplaySpeed: 3000,
    pauseOnHover: true,
    arrows: true,
  };

  const bannerImages = [
    '/banner/8b1b9fd1-dd43-40bf-a045-410bb78248ea.png',
  ];

  return (
    <div className="products-page">
      {/* Scrolling Banner */}
      <div className="banner-wrapper">
        <div className="scrolling-banner">
          <div className="banner-content">
            <span>🔥 全館商品免運優惠中</span>
            <span>⭐ 新會員首購再享9折</span>
            <span>🎁 滿千送百折價券</span>
            <span>💎 頂級水煙品牌正品保證</span>
            <span>🚀 24小時快速出貨</span>
            <span>🔥 全館商品免運優惠中</span>
            <span>⭐ 新會員首購再享9折</span>
            <span>🎁 滿千送百折價券</span>
            <span>💎 頂級水煙品牌正品保證</span>
            <span>🚀 24小時快速出貨</span>
          </div>
        </div>
      </div>

      {/* Carousel Banner */}
      <div className="carousel-wrapper">
        <Slider {...carouselSettings}>
          {bannerImages.map((image, index) => (
            <div key={index} className="carousel-slide">
              <img src={image} alt={`Banner ${index + 1}`} />
            </div>
          ))}
        </Slider>
      </div>

      <div className="container">
        {/* 分類選單 */}
        <div className="category-tabs">
          {categories.map(category => (
            <button
              key={category}
              className={`category-tab ${selectedCategory === category ? 'active' : ''}`}
              onClick={() => setSelectedCategory(category)}
            >
              {category}
            </button>
          ))}
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', fontSize: '18px', color: '#e5e5e5' }}>
            載入商品中...
          </div>
        ) : error ? (
          <div style={{
            textAlign: 'center',
            padding: '60px 20px',
            maxWidth: '600px',
            margin: '0 auto',
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '16px',
            color: '#e5e5e5'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '20px' }}>⚠️</div>
            <h3 style={{ color: '#ef4444', marginBottom: '15px' }}>無法載入商品</h3>
            <p style={{ marginBottom: '20px', color: '#a1a1a1' }}>{error}</p>
            <p style={{ fontSize: '14px', color: '#888', marginBottom: '20px' }}>
              可能原因：<br/>
              1. 後端 API 尚未部署或啟動失敗<br/>
              2. 環境變數 REACT_APP_API_URL 未設置<br/>
              3. CORS 配置問題
            </p>
            <button
              onClick={() => window.location.reload()}
              style={{
                padding: '12px 24px',
                background: 'linear-gradient(135deg, #8b5cf6, #6366f1)',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                cursor: 'pointer',
                fontWeight: '600'
              }}
            >
              重新載入
            </button>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', fontSize: '18px', color: '#e5e5e5' }}>
            目前沒有商品
          </div>
        ) : (
          <div className="products-grid">
            {filteredProducts.map(product => (
            <div key={product.id} className="product-card">
              <div className="product-image">
                <img src={product.image} alt={product.name} onError={(e) => {
                  (e.target as HTMLImageElement).src = '/images/placeholder.svg';
                }} />
              </div>

              <div className="product-info">
                <h3>{product.name}</h3>
                <p className="product-description">{product.description}</p>
                <div className="product-details">
                  <span className="product-category">{product.category}</span>
                  <span className="product-availability">
                    {product.stock > 0 ? '現貨供應' : '暫時缺貨'}
                  </span>
                </div>
                <div className="product-price">
                  {formatPrice(product.price)}
                </div>

                <button
                  onClick={() => addToCart(product)}
                  className="add-to-cart-btn"
                  disabled={product.stock === 0}
                >
                  {product.stock === 0 ? '缺貨' : '加入購物車'}
                </button>
              </div>
            </div>
          ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="cart-modal-overlay">
          <div className="cart-modal">
            <div className="cart-modal-icon">✓</div>
            <p className="cart-modal-message">{modalMessage}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Products;