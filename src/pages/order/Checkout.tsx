import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { CartItem, OrderStatus } from '../../types';
import { formatPrice, calculateCartTotal, generateId } from '../../utils';
import { ordersAPI, authAPI } from '../../services/api';
import '../../styles/orders.css';

interface CheckoutData {
  name: string;
  phone: string;
  address: string;
  city: string;
  postalCode: string;
  notes?: string;
}

interface SavedAddress {
  id: string;
  label?: string;
  name: string;
  phone: string;
  postalCode: string;
  city: string;
  address: string;
}

const Checkout: React.FC = () => {
  const navigate = useNavigate();
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
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

    // 從 API 取得常用地址
    (async () => {
      try {
        const user = await authAPI.getMe();
        if (user.saved_address && Array.isArray(user.saved_address)) {
          setSavedAddresses(user.saved_address.map((a: any) => ({
            ...a,
            id: a.id || Math.random().toString(36).slice(2, 10),
          })));
        }
      } catch {
        // 無法取得，靜默略過
      }
    })();
  }, [navigate]);

  const applyAddress = (addr: SavedAddress) => {
    setValue('name', addr.name);
    setValue('phone', addr.phone);
    setValue('postalCode', addr.postalCode);
    setValue('city', addr.city);
    setValue('address', addr.address);
    setSelectedAddressId(addr.id);
  };

  const totalAmount = calculateCartTotal(cartItems);

  const onSubmit = async (data: CheckoutData) => {
    // 簡單驗證
    if (!data.name || !data.phone || !data.address || !data.city || !data.postalCode) {
      alert('請填寫所有必填欄位');
      return;
    }

    const currentUser = JSON.parse(localStorage.getItem('user') || 'null');

    try {
      let order;

      // 檢查是否有登入 token
      if (currentUser && currentUser.token) {
        // 有 token，透過 API 建立訂單
        try {
          const orderData = {
            items: cartItems.map(item => ({
              product_id: item.product.id,
              quantity: item.quantity
            })),
            shipping_info: {
              name: data.name,
              phone: data.phone,
              city: data.city,
              postalCode: data.postalCode,
              address: data.address
            },
            total_amount: totalAmount
          };

          const apiResponse = await ordersAPI.create(orderData);

          // 轉換 API 回應為前端格式
          order = {
            id: apiResponse.id,
            userId: apiResponse.user_id,
            items: cartItems,
            totalAmount: apiResponse.total_amount,
            status: apiResponse.status,
            createdAt: apiResponse.created_at,
            shippingInfo: {
              name: data.name,
              phone: data.phone,
              address: data.address,
              city: data.city,
              postalCode: data.postalCode
            },
            notes: data.notes
          };

          // 同步儲存到 localStorage
          const orders = JSON.parse(localStorage.getItem('orders') || '[]');
          orders.push(order);
          localStorage.setItem('orders', JSON.stringify(orders));
        } catch (apiError: any) {
          console.warn('API 建立訂單失敗，使用 localStorage 備援:', apiError);
          // API 失敗時使用 localStorage
          order = {
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

          const orders = JSON.parse(localStorage.getItem('orders') || '[]');
          orders.push(order);
          localStorage.setItem('orders', JSON.stringify(orders));
        }
      } else {
        // 沒有 token，直接使用 localStorage
        order = {
          id: generateId(),
          userId: currentUser?.id || 'guest',
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

        const orders = JSON.parse(localStorage.getItem('orders') || '[]');
        orders.push(order);
        localStorage.setItem('orders', JSON.stringify(orders));
      }

      // 清空購物車
      localStorage.removeItem('cart');

      // 跳轉到確認頁面
      navigate('/order-confirm', { state: { order } });
    } catch (error: any) {
      console.error('建立訂單失敗:', error);
      alert('建立訂單失敗，請稍後再試');
    }
  };

  return (
    <div className="checkout-page">
      <div className="container">
        <h1>結帳</h1>

        <div className="checkout-content">
          <div className="checkout-form">
            <h2>配送資訊</h2>

            {savedAddresses.length > 0 && (
              <div className="saved-addresses-section">
                <p className="saved-addresses-title">常用地址</p>
                <div className="saved-addresses-list">
                  {savedAddresses.map(addr => (
                    <button
                      key={addr.id}
                      type="button"
                      className={`saved-address-card ${selectedAddressId === addr.id ? 'selected' : ''}`}
                      onClick={() => applyAddress(addr)}
                    >
                      {addr.label && <span className="saved-addr-tag">{addr.label}</span>}
                      <span className="saved-addr-name">{addr.name}</span>
                      <span className="saved-addr-detail">{addr.postalCode} {addr.city} {addr.address}</span>
                      {selectedAddressId === addr.id && <span className="saved-addr-check">✓</span>}
                    </button>
                  ))}
                </div>
              </div>
            )}

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

          <div className="checkout-order-summary">
            <h2>訂單摘要</h2>

            <div className="checkout-order-items">
              {cartItems.map(item => (
                <div key={item.product.id} className="checkout-order-item">
                  <div className="checkout-item-info">
                    <span className="checkout-item-name">{item.product.name}</span>
                    <span className="checkout-item-quantity">x {item.quantity}</span>
                  </div>
                  <span className="checkout-item-price">
                    {formatPrice(item.product.price * item.quantity)}
                  </span>
                </div>
              ))}
            </div>

            <div className="checkout-order-total">
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