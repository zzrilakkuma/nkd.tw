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

  const updateQuantity = (productId: string, newQuantity: number) => {
    if (newQuantity === 0) {
      removeItem(productId);
      return;
    }

    const updatedCart = cartItems.map(item =>
      item.product.id === productId
        ? { ...item, quantity: newQuantity }
        : item
    );

    setCartItems(updatedCart);
    localStorage.setItem('cart', JSON.stringify(updatedCart));
  };

  const removeItem = (productId: string) => {
    const updatedCart = cartItems.filter(item => item.product.id !== productId);
    setCartItems(updatedCart);
    localStorage.setItem('cart', JSON.stringify(updatedCart));
  };

  const clearCart = () => {
    setCartItems([]);
    localStorage.removeItem('cart');
  };

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
              <div key={item.product.id} className="cart-item">
                <div className="item-image">
                  <img src={item.product.image} alt={item.product.name} onError={(e) => {
                    (e.target as HTMLImageElement).src = '/images/placeholder.svg';
                  }} />
                </div>

                <div className="item-details">
                  <h3>{item.product.name}</h3>
                  <p>{item.product.description}</p>
                  <div className="item-price">{formatPrice(item.product.price)}</div>
                </div>

                <div className="item-controls">
                  <div className="quantity-controls">
                    <button
                      onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                      className="quantity-btn"
                    >
                      -
                    </button>
                    <span className="quantity">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                      className="quantity-btn"
                    >
                      +
                    </button>
                  </div>

                  <div className="item-total">
                    {formatPrice(item.product.price * item.quantity)}
                  </div>

                  <button
                    onClick={() => removeItem(item.product.id)}
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
              <div key={item.product.id} className="summary-row">
                <span>{item.product.name} x {item.quantity}</span>
                <span>{formatPrice(item.product.price * item.quantity)}</span>
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