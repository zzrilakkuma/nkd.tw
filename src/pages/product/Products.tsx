import React, { useState } from 'react';
import { Product } from '../../types';
import { mockProducts } from '../../services/mockData';
import { formatPrice } from '../../utils';
import '../../styles/products.css';

const Products: React.FC = () => {
  const [products] = useState<Product[]>(mockProducts);
  const [cart, setCart] = useState<any[]>(() => {
    return JSON.parse(localStorage.getItem('cart') || '[]');
  });

  const addToCart = (product: Product) => {
    const currentUser = JSON.parse(localStorage.getItem('user') || 'null');

    if (!currentUser) {
      alert('請先登入會員');
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
    alert('商品已加入購物車！');
  };

  return (
    <div className="products-page">
      <div className="container">
        <h1>商品目錄</h1>

        <div className="products-grid">
          {products.map(product => (
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
    </div>
  );
};

export default Products;