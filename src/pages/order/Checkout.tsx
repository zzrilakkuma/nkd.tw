import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { CartItem, DeliveryMethod, PickupLocation } from '../../types';
import { formatPrice, calculateCartTotal } from '../../utils';
import { DELIVERY_OPTIONS, DEFAULT_SHIPPING_FEE } from '../../utils/delivery';
import { ordersAPI, authAPI, pickupLocationsAPI } from '../../services/api';
import '../../styles/orders.css';

interface CheckoutData {
  name: string;
  phone: string;
  address: string;
  city: string;
  postalCode: string;
  store_name: string;
  store_code: string;
  invoice_tax_id: string;
  invoice_company: string;
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
  const [method, setMethod] = useState<DeliveryMethod>(DeliveryMethod.HOME_DELIVERY);
  const [pickupLocations, setPickupLocations] = useState<PickupLocation[]>([]);
  const [pickupId, setPickupId] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [needInvoice, setNeedInvoice] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
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

    (async () => {
      try {
        const user = await authAPI.getMe();
        if (user.saved_address && Array.isArray(user.saved_address)) {
          setSavedAddresses(user.saved_address.map((a: any) => ({
            ...a,
            id: a.id || Math.random().toString(36).slice(2, 10),
          })));
        }
      } catch { /* 靜默略過 */ }

      try {
        const locs = await pickupLocationsAPI.list(true);
        setPickupLocations(locs);
      } catch { /* 靜默略過 */ }
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

  const subtotal = calculateCartTotal(cartItems);
  const shippingFee = DEFAULT_SHIPPING_FEE[method] ?? 0;
  const estimatedTotal = subtotal + shippingFee;

  const onSubmit = async (data: CheckoutData) => {
    // 依配送方式驗證必填
    if (method === DeliveryMethod.HOME_DELIVERY) {
      if (!data.name || !data.phone || !data.city || !data.postalCode || !data.address) {
        alert('請填寫完整宅配收件資訊'); return;
      }
    } else if (method === DeliveryMethod.CVS_711) {
      if (!data.name || !data.phone || !data.store_name || !data.store_code) {
        alert('請填寫完整 7-11 取貨資訊'); return;
      }
    } else if (method === DeliveryMethod.SELF_PICKUP) {
      if (!pickupId) { alert('請選擇自取地點'); return; }
      if (!data.name || !data.phone) { alert('請填寫取件人姓名與電話'); return; }
    }

    // 組配送資訊
    let shipping_info: any = { note: data.notes || '' };
    if (method === DeliveryMethod.HOME_DELIVERY) {
      shipping_info = { ...shipping_info, name: data.name, phone: data.phone, city: data.city, postalCode: data.postalCode, address: data.address };
    } else if (method === DeliveryMethod.CVS_711) {
      shipping_info = { ...shipping_info, name: data.name, phone: data.phone, store_name: data.store_name, store_code: data.store_code };
    } else {
      shipping_info = { ...shipping_info, name: data.name, phone: data.phone, pickup_location_id: pickupId };
    }

    // 發票（選填）：勾選後必填統編與公司名稱
    let invoice: { tax_id: string; company_name: string } | undefined;
    if (needInvoice) {
      const taxId = (data.invoice_tax_id || '').trim();
      const company = (data.invoice_company || '').trim();
      if (!/^\d{8}$/.test(taxId)) { alert('統一編號需為 8 碼數字'); return; }
      if (!company) { alert('請填寫發票抬頭（公司名稱）'); return; }
      invoice = { tax_id: taxId, company_name: company };
    }

    setSubmitting(true);
    try {
      // 訂單一律由後端建立；失敗就明確報錯，絕不在本地假造訂單
      const apiResponse = await ordersAPI.create({
        items: cartItems.map(item => ({ sku_id: item.sku.id, quantity: item.quantity })),
        delivery_method: method,
        shipping_info,
        invoice,
      });

      const order = {
        id: apiResponse.id,
        userId: apiResponse.user_id,
        items: cartItems,
        subtotal: apiResponse.subtotal,
        shippingFee: apiResponse.shipping_fee,
        totalAmount: apiResponse.total_amount,
        status: apiResponse.status,
        deliveryMethod: apiResponse.delivery_method,
        createdAt: apiResponse.created_at,
        shippingInfo: apiResponse.shipping_info,
        notes: data.notes,
      };

      localStorage.removeItem('cart');
      window.dispatchEvent(new Event('cartUpdated'));
      navigate('/order-confirm', { state: { order } });
    } catch (error: any) {
      const detail = error.response?.data?.detail;
      alert(typeof detail === 'string' ? detail : '訂單送出失敗，請確認網路後再試一次；若持續失敗請聯絡客服。');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="checkout-page">
      <div className="container">
        <h1>結帳</h1>

        <div className="checkout-content">
          <div className="checkout-form">
            <h2>配送方式</h2>
            <div className="delivery-method-tabs">
              {DELIVERY_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  className={`delivery-method-tab ${method === opt.value ? 'active' : ''}`}
                  onClick={() => setMethod(opt.value)}
                >
                  {opt.label}
                  <span className="delivery-fee-hint">
                    {DEFAULT_SHIPPING_FEE[opt.value] === 0 ? '免運' : `運費 ${formatPrice(DEFAULT_SHIPPING_FEE[opt.value])}`}
                  </span>
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmit(onSubmit)}>
              {/* 宅配 */}
              {method === DeliveryMethod.HOME_DELIVERY && (
                <>
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
                  <div className="form-row">
                    <div className="form-group">
                      <label>收件人姓名</label>
                      <input {...register('name', { required: true })} className={errors.name ? 'error' : ''} />
                    </div>
                    <div className="form-group">
                      <label>聯絡電話</label>
                      <input {...register('phone', { required: true })} className={errors.phone ? 'error' : ''} />
                    </div>
                  </div>
                  <div className="form-group">
                    <label>配送地址</label>
                    <input {...register('address', { required: true })} className={errors.address ? 'error' : ''} />
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>城市</label>
                      <input {...register('city', { required: true })} className={errors.city ? 'error' : ''} />
                    </div>
                    <div className="form-group">
                      <label>郵遞區號</label>
                      <input {...register('postalCode', { required: true })} className={errors.postalCode ? 'error' : ''} />
                    </div>
                  </div>
                </>
              )}

              {/* 7-11 */}
              {method === DeliveryMethod.CVS_711 && (
                <>
                  <p className="delivery-note-hint">請至 7-ELEVEN 官網查詢門市名稱與店號後手動填寫。</p>
                  <div className="form-row">
                    <div className="form-group">
                      <label>取件人姓名</label>
                      <input {...register('name', { required: true })} className={errors.name ? 'error' : ''} />
                    </div>
                    <div className="form-group">
                      <label>手機號碼</label>
                      <input {...register('phone', { required: true })} className={errors.phone ? 'error' : ''} />
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>門市名稱</label>
                      <input {...register('store_name', { required: true })} className={errors.store_name ? 'error' : ''} placeholder="例：幸福門市" />
                    </div>
                    <div className="form-group">
                      <label>門市店號</label>
                      <input {...register('store_code', { required: true })} className={errors.store_code ? 'error' : ''} placeholder="例：123456" />
                    </div>
                  </div>
                </>
              )}

              {/* 自取 */}
              {method === DeliveryMethod.SELF_PICKUP && (
                <>
                  <div className="form-group">
                    <label>自取地點</label>
                    {pickupLocations.length === 0 ? (
                      <p className="delivery-note-hint">目前尚無可用的自取地點，請改用其他配送方式或聯絡管理員。</p>
                    ) : (
                      <select value={pickupId} onChange={e => setPickupId(e.target.value)}>
                        <option value="">請選擇自取地點</option>
                        {pickupLocations.map(loc => (
                          <option key={loc.id} value={loc.id}>
                            {loc.name}{loc.address ? `（${loc.address}）` : ''}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>取件人姓名</label>
                      <input {...register('name', { required: true })} className={errors.name ? 'error' : ''} />
                    </div>
                    <div className="form-group">
                      <label>聯絡電話</label>
                      <input {...register('phone', { required: true })} className={errors.phone ? 'error' : ''} />
                    </div>
                  </div>
                </>
              )}

              {/* 發票資訊（選填） */}
              <div className="invoice-section">
                <label className="invoice-toggle">
                  <input
                    type="checkbox"
                    checked={needInvoice}
                    onChange={e => setNeedInvoice(e.target.checked)}
                  />
                  需要開立發票（統編）
                </label>
                {needInvoice && (
                  <div className="form-row">
                    <div className="form-group">
                      <label>統一編號</label>
                      <input {...register('invoice_tax_id')} placeholder="8 碼數字" maxLength={8} inputMode="numeric" />
                    </div>
                    <div className="form-group">
                      <label>公司名稱（發票抬頭）</label>
                      <input {...register('invoice_company')} placeholder="例：星辰貿易有限公司" />
                    </div>
                  </div>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="notes">配送備註 (選填)</label>
                <textarea id="notes" {...register('notes')} rows={3} />
              </div>

              <button type="submit" className="place-order-btn" disabled={submitting}>
                {submitting ? '送出中...' : '確認訂單'}
              </button>
            </form>
          </div>

          <div className="checkout-order-summary">
            <h2>訂單摘要</h2>

            <div className="checkout-order-items">
              {cartItems.map(item => (
                <div key={item.sku?.id || item.product.id} className="checkout-order-item">
                  <div className="checkout-item-info">
                    <span className="checkout-item-name">
                      {item.product.name}
                      {[item.sku?.flavor, item.sku?.spec].filter(Boolean).length > 0
                        ? `（${[item.sku?.flavor, item.sku?.spec].filter(Boolean).join(' / ')}）`
                        : ''}
                    </span>
                    <span className="checkout-item-quantity">x {item.quantity}</span>
                  </div>
                  <span className="checkout-item-price">{formatPrice(item.sku.price * item.quantity)}</span>
                </div>
              ))}
            </div>

            <div className="checkout-order-total">
              <div className="total-row">
                <span>商品小計:</span>
                <span>{formatPrice(subtotal)}</span>
              </div>
              <div className="total-row">
                <span>運費 (預估):</span>
                <span>{shippingFee === 0 ? '免運' : formatPrice(shippingFee)}</span>
              </div>
              <div className="total-row final">
                <span>預估總計:</span>
                <span>{formatPrice(estimatedTotal)}</span>
              </div>
              <p className="checkout-fee-note">
                實際運費將由店家核對商品內容後確認，核對完成後才會進入付款。
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;
