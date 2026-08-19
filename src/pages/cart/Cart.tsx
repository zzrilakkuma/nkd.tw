import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { CartItem } from '../../types';
import { formatPrice, calculateCartTotal } from '../../utils';
import '../../styles/cart.css';

const Cart: React.FC = () => {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);

  useEffect(() => {
    const savedCart = JSON.parse(localStorage.getItem('cart') || '[]');
    setCartItems(savedCart);
  }, []);

  const persist = (updatedCart: CartItem[]) => {
    setCartItems(updatedCart);
    localStorage.setItem('cart', JSON.stringify(updatedCart));
    window.dispatchEvent(new Event('cartUpdated'));
  };

  const updateQuantity = (skuId: string, newQuantity: number) => {
    if (newQuantity === 0) {
      removeItem(skuId);
      return;
    }
    persist(cartItems.map(item =>
      item.sku?.id === skuId ? { ...item, quantity: newQuantity } : item
    ));
  };

  const removeItem = (skuId: string) => {
    persist(cartItems.filter(item => item.sku?.id !== skuId));
  };

  const clearCart = () => {
    setCartItems([]);
    localStorage.removeItem('cart');
    window.dispatchEvent(new Event('cartUpdated'));
  };

  const skuLabel = (item: CartItem) =>
    [item.sku?.flavor, item.sku?.spec].filter(Boolean).join(' / ');

  const totalAmount = calculateCartTotal(cartItems);

  if (cartItems.length === 0) {
    return (
      <div className="cart-page">
        <div className="container">
          <h1>購物車</h1>
          <div className="empty-cart">
            <p>您的購物車是空的</p>
            <Link to="/products" className="continue-shopping-btn">
              繼續購物
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="cart-page">
      <div className="container">
        <h1>購物車</h1>

        <div className="cart-content">
          <div className="cart-items">
            {cartItems.map(item => (
              <div key={item.sku?.id || item.product.id} className="cart-item">
                <div className="item-image">
                  <img src={item.product.image} alt={item.product.name} onError={(e) => {
                    (e.target as HTMLImageElement).src = '/images/placeholder.svg';
                  }} />
                </div>

                <div className="item-details">
                  <h3>{item.product.name}</h3>
                  {skuLabel(item) && <p className="cart-sku-label">{skuLabel(item)}</p>}
                  <div className="item-price">{formatPrice(item.sku.price)}</div>
                </div>

                <div className="item-controls">
                  <div className="quantity-controls">
                    <button
                      onClick={() => updateQuantity(item.sku.id, item.quantity - 1)}
                      className="quantity-btn"
                    >
                      -
                    </button>
                    <span className="quantity">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.sku.id, item.quantity + 1)}
                      className="quantity-btn"
                    >
                      +
                    </button>
                  </div>

                  <div className="item-total">
                    {formatPrice(item.sku.price * item.quantity)}
                  </div>

                  <button
                    onClick={() => removeItem(item.sku.id)}
                    className="remove-btn"
                  >
                    移除
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="cart-summary">
            <h3>訂單摘要</h3>

            {cartItems.map(item => (
              <div key={item.sku?.id || item.product.id} className="summary-row">
                <span>{item.product.name}{skuLabel(item) ? `（${skuLabel(item)}）` : ''} x {item.quantity}</span>
                <span>{formatPrice(item.sku.price * item.quantity)}</span>
              </div>
            ))}

            <div className="summary-row total">
              <span>總計:</span>
              <span>{formatPrice(totalAmount)}</span>
            </div>

            <div className="cart-actions">
              <button onClick={clearCart} className="clear-cart-btn">
                清空購物車
              </button>
              <Link to="/checkout" className="checkout-btn">
                結帳
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Cart;