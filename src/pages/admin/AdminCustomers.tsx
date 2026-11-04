import React, { useEffect, useState } from 'react';
import { adminUsersAPI } from '../../services/api';
import { formatPrice, formatDate, generateId } from '../../utils';
import { statusText, statusClass } from '../../utils/orderStatus';
import { deliveryLabel } from '../../utils/delivery';

interface CustomerAddress {
  id: string;
  label: string;
  name: string;
  phone: string;
  postalCode: string;
  city: string;
  address: string;
}

interface Customer {
  id: string;
  email: string;
  username: string;
  is_active: boolean;
  must_change_password: boolean;
  company_name?: string;
  contact_name?: string;
  contact_phone?: string;
  tax_id?: string;
  saved_address?: Partial<CustomerAddress>[] | null;
  created_at: string;
  order_count: number;
  completed_count: number;
  completed_total: number;
  last_order_at?: string | null;
}

interface CustomerOrder {
  id: string;
  status: string;
  payment_type: string;
  delivery_method?: string;
  total_amount: number;
  created_at: string;
  completed_at?: string | null;
}

interface CustomerDetail extends Customer {
  orders: CustomerOrder[];
}

interface ProfileForm {
  email: string;
  username: string;
  company_name: string;
  tax_id: string;
  contact_name: string;
  contact_phone: string;
}

const emptyAddress = (): CustomerAddress => ({
  id: generateId(), label: '', name: '', phone: '', postalCode: '', city: '', address: '',
});

const toForm = (c: Customer): ProfileForm => ({
  email: c.email,
  username: c.username,
  company_name: c.company_name || '',
  tax_id: c.tax_id || '',
  contact_name: c.contact_name || '',
  contact_phone: c.contact_phone || '',
});

const toAddresses = (c: Customer): CustomerAddress[] =>
  (c.saved_address || []).map(a => ({ ...emptyAddress(), ...a, id: a.id || generateId(), label: a.label || '' }));

const AdminCustomers: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<CustomerDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [form, setForm] = useState<ProfileForm | null>(null);
  const [addresses, setAddresses] = useState<CustomerAddress[]>([]);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const fetchCustomers = async (q = search) => {
    setLoading(true);
    setError(null);
    try {
      setCustomers(await adminUsersAPI.listCustomers(q.trim() || undefined));
    } catch (err: any) {
      setError(err.response?.data?.detail || '無法載入客戶列表');
    } finally {
      setLoading(false);
    }
  };

  // 搜尋輸入停頓 300ms 後才查詢
  useEffect(() => {
    const t = setTimeout(() => fetchCustomers(search), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const openCustomer = async (id: string) => {
    setSelectedId(id);
    setDetail(null);
    setSaveMsg(null);
    setDetailLoading(true);
    try {
      const d: CustomerDetail = await adminUsersAPI.getCustomer(id);
      setDetail(d);
      setForm(toForm(d));
      setAddresses(toAddresses(d));
    } catch (err: any) {
      setSaveMsg({ ok: false, text: err.response?.data?.detail || '無法載入客戶檔案' });
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDrawer = () => {
    setSelectedId(null);
    setDetail(null);
    setForm(null);
  };

  const updateAddress = (id: string, field: keyof CustomerAddress, value: string) => {
    setAddresses(prev => prev.map(a => (a.id === id ? { ...a, [field]: value } : a)));
  };

  const handleSave = async () => {
    if (!detail || !form) return;
    if (!form.email.trim() || !form.username.trim()) {
      setSaveMsg({ ok: false, text: 'Email 與帳號名稱為必填' });
      return;
    }
    const incomplete = addresses.find(a => !a.name.trim() || !a.phone.trim() || !a.city.trim() || !a.address.trim());
    if (incomplete) {
      setSaveMsg({ ok: false, text: '常用地址的收件人、電話、城市與地址為必填' });
      return;
    }
    setSaving(true);
    setSaveMsg(null);
    try {
      await adminUsersAPI.update(detail.id, {
        ...form,
        email: form.email.trim(),
        username: form.username.trim(),
        saved_address: addresses,
      });
      await Promise.all([openCustomer(detail.id), fetchCustomers()]);
      setSaveMsg({ ok: true, text: '已儲存' });
    } catch (err: any) {
      const detailMsg = err.response?.data?.detail;
      setSaveMsg({ ok: false, text: typeof detailMsg === 'string' ? detailMsg : '儲存失敗，請檢查欄位格式' });
    } finally {
      setSaving(false);
    }
  };

  const field = (key: keyof ProfileForm, label: string, placeholder?: string) => (
    <div className="form-group">
      <label>{label}</label>
      <input
        value={form?.[key] ?? ''}
        placeholder={placeholder}
        onChange={e => form && setForm({ ...form, [key]: e.target.value })}
      />
    </div>
  );

  return (
    <div className="admin-customers">
      <div className="profile-section-header" style={{ marginBottom: 16 }}>
        <div>
          <h2 style={{ margin: 0 }}>客戶檔案</h2>
          <p className="profile-section-desc">查看所有客戶的公司資料、常用地址與訂單紀錄，點擊列可編輯</p>
        </div>
        <input
          className="orders-search"
          type="text"
          placeholder="搜尋帳號 / Email / 公司 / 統編 / 電話"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {loading && customers.length === 0 ? (
        <div className="empty-orders"><p>載入中...</p></div>
      ) : error ? (
        <div className="empty-orders">
          <p style={{ color: '#e74c3c' }}>{error}</p>
          <button onClick={() => fetchCustomers()} style={{ marginTop: 12, padding: '8px 16px', cursor: 'pointer' }}>重新載入</button>
        </div>
      ) : customers.length === 0 ? (
        <div className="empty-orders"><p>{search ? '找不到符合的客戶' : '目前沒有客戶'}</p></div>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>帳號 / Email</th>
                <th>公司 / 統編</th>
                <th>聯絡人</th>
                <th>訂單數</th>
                <th>已完成金額</th>
                <th>最近下單</th>
                <th>狀態</th>
              </tr>
            </thead>
            <tbody>
              {customers.map(c => (
                <tr key={c.id} className="clickable-row" onClick={() => openCustomer(c.id)}>
                  <td>
                    <div>{c.username}</div>
                    <div style={{ fontSize: 12, opacity: 0.7 }}>{c.email}</div>
                  </td>
                  <td>
                    {c.company_name || '—'}
                    {c.tax_id && <div style={{ fontSize: 12, opacity: 0.7 }}>{c.tax_id}</div>}
                  </td>
                  <td>
                    {c.contact_name || '—'}
                    {c.contact_phone && <div style={{ fontSize: 12, opacity: 0.7 }}>{c.contact_phone}</div>}
                  </td>
                  <td>{c.order_count}</td>
                  <td>{formatPrice(c.completed_total)}</td>
                  <td>{c.last_order_at ? formatDate(c.last_order_at) : '—'}</td>
                  <td>
                    <span className={`status ${c.is_active ? 'status-confirmed' : 'status-cancelled'}`}>
                      {c.is_active ? '啟用' : '停用'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selectedId && (
        <>
          <div className="drawer-backdrop" onClick={closeDrawer} />
          <div className="order-drawer">
            <div className="drawer-header">
              <div className="drawer-title">
                <span className="drawer-order-id">{detail?.username || '客戶檔案'}</span>
                {detail && (
                  <span className={`status ${detail.is_active ? 'status-confirmed' : 'status-cancelled'}`}>
                    {detail.is_active ? '啟用' : '停用'}
                  </span>
                )}
              </div>
              <button className="drawer-close" onClick={closeDrawer}>✕</button>
            </div>

            <div className="drawer-body">
              {detailLoading && !detail ? (
                <p>載入中...</p>
              ) : !detail || !form ? (
                <p style={{ color: '#e74c3c' }}>{saveMsg?.text || '無法載入客戶檔案'}</p>
              ) : (
                <>
                  <div className="drawer-meta">
                    <span>建立於 {formatDate(detail.created_at)}</span>
                    <span>
                      訂單 {detail.order_count} 筆・已完成 {detail.completed_count} 筆・
                      已完成金額 {formatPrice(detail.completed_total)}
                    </span>
                    {detail.must_change_password && <span style={{ color: '#f6ad55' }}>尚未修改臨時密碼</span>}
                  </div>

                  <div className="drawer-section">
                    <h4>帳號與公司資料</h4>
                    <div className="profile-form">
                      <div className="form-row">
                        {field('email', 'Email *')}
                        {field('username', '帳號名稱 *')}
                      </div>
                      <div className="form-row">
                        {field('company_name', '公司名稱')}
                        {field('tax_id', '統一編號')}
                      </div>
                      <div className="form-row">
                        {field('contact_name', '聯絡人')}
                        {field('contact_phone', '聯絡電話')}
                      </div>
                    </div>
                  </div>

                  <div className="drawer-section">
                    <h4>常用地址（{addresses.length}）</h4>
                    <div className="profile-form">
                      {addresses.map((a, i) => (
                        <div
                          key={a.id}
                          style={{ border: '1px solid rgba(201,169,97,0.15)', borderRadius: 10, padding: 12, marginBottom: 12 }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                            <strong style={{ fontSize: 13 }}>地址 {i + 1}</strong>
                            <button
                              type="button"
                              className="btn-addr-delete"
                              onClick={() => setAddresses(prev => prev.filter(x => x.id !== a.id))}
                            >
                              刪除
                            </button>
                          </div>
                          <div className="form-group">
                            <label>地址名稱（選填）</label>
                            <input value={a.label} placeholder="例：公司、倉庫" onChange={e => updateAddress(a.id, 'label', e.target.value)} />
                          </div>
                          <div className="form-row">
                            <div className="form-group">
                              <label>收件人 *</label>
                              <input value={a.name} onChange={e => updateAddress(a.id, 'name', e.target.value)} />
                            </div>
                            <div className="form-group">
                              <label>電話 *</label>
                              <input value={a.phone} onChange={e => updateAddress(a.id, 'phone', e.target.value)} />
                            </div>
                          </div>
                          <div className="form-row">
                            <div className="form-group">
                              <label>郵遞區號</label>
                              <input value={a.postalCode} onChange={e => updateAddress(a.id, 'postalCode', e.target.value)} />
                            </div>
                            <div className="form-group">
                              <label>城市 *</label>
                              <input value={a.city} onChange={e => updateAddress(a.id, 'city', e.target.value)} />
                            </div>
                          </div>
                          <div className="form-group">
                            <label>地址 *</label>
                            <input value={a.address} onChange={e => updateAddress(a.id, 'address', e.target.value)} />
                          </div>
                        </div>
                      ))}
                      <button
                        type="button"
                        className="btn-addr-edit"
                        onClick={() => setAddresses(prev => [...prev, emptyAddress()])}
                      >
                        + 新增地址
                      </button>
                    </div>
                  </div>

                  {saveMsg && (
                    <div className={saveMsg.ok ? 'success-message' : 'error-message'} style={saveMsg.ok ? { color: '#68d391' } : undefined}>
                      {saveMsg.text}
                    </div>
                  )}
                  <div className="profile-actions">
                    <button
                      type="button"
                      className="btn-cancel-addr"
                      onClick={() => { setForm(toForm(detail)); setAddresses(toAddresses(detail)); setSaveMsg(null); }}
                    >
                      還原
                    </button>
                    <button type="button" className="btn-save-profile" disabled={saving} onClick={handleSave}>
                      {saving ? '儲存中...' : '儲存變更'}
                    </button>
                  </div>

                  <div className="drawer-section">
                    <h4>訂單紀錄（{detail.orders.length}）</h4>
                    {detail.orders.length === 0 ? (
                      <p className="profile-section-desc">尚無訂單</p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {detail.orders.map(o => (
                          <div
                            key={o.id}
                            style={{
                              display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8,
                              padding: '10px 12px', borderRadius: 8, background: 'rgba(255,255,255,0.04)',
                            }}
                          >
                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontFamily: 'monospace', fontSize: 13 }}>#{o.id.slice(0, 8)}</div>
                              <div style={{ fontSize: 12, opacity: 0.7 }}>
                                {formatDate(o.created_at)}・{deliveryLabel(o.delivery_method)}
                                {o.payment_type === 'monthly' && '・月結'}
                              </div>
                            </div>
                            <div style={{ textAlign: 'right', flexShrink: 0 }}>
                              <div>{formatPrice(o.total_amount)}</div>
                              <span className={`status ${statusClass(o.status)}`}>{statusText(o.status)}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default AdminCustomers;
