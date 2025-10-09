import React, { useState, useEffect } from 'react';
import Slider from 'react-slick';
import { Product } from '../../types';
import { mockProducts } from '../../services/mockData';
import { formatPrice } from '../../utils';
import '../../styles/products.css';
import 'slick-carousel/slick/slick.css';
import 'slick-carousel/slick/slick-theme.css';

const Products: React.FC = () => {
  const [products] = useState<Product[]>(mockProducts);
  const [cart, setCart] = useState<any[]>(() => {
    return JSON.parse(localStorage.getItem('cart') || '[]');
  });
  const [showModal, setShowModal] = useState(false);
  const [modalMessage, setModalMessage] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('全部');

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