import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { CartItem, OrderStatus } from '../../types';
import { formatPrice, calculateCartTotal, generateId } from '../../utils';
import '../../styles/orders.css';

interface CheckoutData {
  name: string;
  phone: string;
  address: string;
  city: string;
  postalCode: string;
  notes?: string;
}

const Checkout: React.FC = () => {
  const navigate = useNavigate();
  const [cartItems, setCartItems] = useState<CartItem[]>([]);

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<CheckoutData>();

  useEffect(() => {
    const currentUser = JSON.parse(localStorage.getItem('user') || 'null');
    if (!currentUser) {
      navigate('/login');
      return;
    }

    const savedCart = JSON.parse(localStorage.getItem('cart') || '[]');
    if (savedCart.length === 0) {
      navigate('/cart');
      return;
    }

    setCartItems(savedCart);
  }, [navigate]);

  const totalAmount = calculateCartTotal(cartItems);

  const onSubmit = (data: CheckoutData) => {
    // 簡單驗證
    if (!data.name || !data.phone || !data.address || !data.city || !data.postalCode) {
      alert('請填寫所有必填欄位');
      return;
    }

    const currentUser = JSON.parse(localStorage.getItem('user') || 'null');

    const order = {
      id: generateId(),
      userId: currentUser.id,
      items: cartItems,
      totalAmount,
      status: OrderStatus.PENDING,
      createdAt: new Date().toISOString(),
      shippingInfo: {
        name: data.name,
        phone: data.phone,
        address: data.address,
        city: data.city,
        postalCode: data.postalCode
      },
      notes: data.notes
    };

    // 儲存訂單
    const orders = JSON.parse(localStorage.getItem('orders') || '[]');
    orders.push(order);
    localStorage.setItem('orders', JSON.stringify(orders));

    // 清空購物車
    localStorage.removeItem('cart');

    // 跳轉到確認頁面
    navigate('/order-confirm', { state: { order } });
  };

  return (
    <div className="checkout-page">
      <div className="container">
        <h1>結帳</h1>

        <div className="checkout-content">
          <div className="checkout-form">
            <h2>配送資訊</h2>

            <form onSubmit={handleSubmit(onSubmit)}>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="name">收件人姓名</label>
                  <input
                    type="text"
                    id="name"
                    {...register('name', { required: '收件人姓名為必填' })}
                    className={errors.name ? 'error' : ''}
                  />
                  {errors.name && <span className="error-message">{errors.name.message}</span>}
                </div>

                <div className="form-group">
                  <label htmlFor="phone">聯絡電話</label>
                  <input
                    type="tel"
                    id="phone"
                    {...register('phone', { required: '聯絡電話為必填' })}
                    className={errors.phone ? 'error' : ''}
                  />
                  {errors.phone && <span className="error-message">{errors.phone.message}</span>}
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="address">配送地址</label>
                <input
                  type="text"
                  id="address"
                  {...register('address', { required: '配送地址為必填' })}
                  className={errors.address ? 'error' : ''}
                />
                {errors.address && <span className="error-message">{errors.address.message}</span>}
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="city">城市</label>
                  <input
                    type="text"
                    id="city"
                    {...register('city', { required: '城市為必填' })}
                    className={errors.city ? 'error' : ''}
                  />
                  {errors.city && <span className="error-message">{errors.city.message}</span>}
                </div>

                <div className="form-group">
                  <label htmlFor="postalCode">郵遞區號</label>
                  <input
                    type="text"
                    id="postalCode"
                    {...register('postalCode', { required: '郵遞區號為必填' })}
                    className={errors.postalCode ? 'error' : ''}
                  />
                  {errors.postalCode && <span className="error-message">{errors.postalCode.message}</span>}
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="notes">備註 (選填)</label>
                <textarea
                  id="notes"
                  {...register('notes')}
                  rows={3}
                />
              </div>

              <button type="submit" className="place-order-btn">
                確認訂單
              </button>
            </form>
          </div>

          <div className="order-summary">
            <h2>訂單摘要</h2>

            <div className="order-items">
              {cartItems.map(item => (
                <div key={item.product.id} className="order-item">
                  <span className="item-name">
                    {item.product.name} x {item.quantity}
                  </span>
                  <span className="item-price">
                    {formatPrice(item.product.price * item.quantity)}
                  </span>
                </div>
              ))}
            </div>

            <div className="order-total">
              <div className="total-row">
                <span>商品總計:</span>
                <span>{formatPrice(totalAmount)}</span>
              </div>
              <div className="total-row">
                <span>運費:</span>
                <span>免費</span>
              </div>
              <div className="total-row final">
                <span>總計:</span>
                <span>{formatPrice(totalAmount)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;