import React, { useEffect, useState } from 'react';
import { adminUsersAPI } from '../../services/api';

interface ApiUser {
  id: string;
  email: string;
  username: string;
  is_admin: boolean;
  is_active: boolean;
  must_change_password: boolean;
  company_name?: string;
  contact_name?: string;
  contact_phone?: string;
  tax_id?: string;
  created_at: string;
}

interface CreateForm {
  email: string;
  username: string;
  company_name: string;
  contact_name: string;
  contact_phone: string;
  tax_id: string;
}

const emptyForm: CreateForm = {
  email: '',
  username: '',
  company_name: '',
  contact_name: '',
  contact_phone: '',
  tax_id: '',
};

const AdminUsers: React.FC = () => {
  const [users, setUsers] = useState<ApiUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<CreateForm>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // 顯示一次性臨時密碼
  const [tempCredential, setTempCredential] = useState<{ email: string; password: string } | null>(null);

  const currentUser = JSON.parse(localStorage.getItem('user') || 'null');

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      setUsers(await adminUsersAPI.list());
    } catch (err: any) {
      setError(err.response?.data?.detail || '無法載入帳號列表');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const openCreate = () => {
    setForm(emptyForm);
    setFormError(null);
    setModalOpen(true);
  };

  const submitCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.email || !form.username) {
      setFormError('Email 與帳號名稱為必填');
      return;
    }
    setSubmitting(true);
    setFormError(null);
    try {
      const res = await adminUsersAPI.create(form);
      setModalOpen(false);
      setTempCredential({ email: res.user.email, password: res.temp_password });
      await fetchUsers();
    } catch (err: any) {
      setFormError(err.response?.data?.detail || '建立失敗');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = async (u: ApiUser) => {
    if (!window.confirm(`確定要重設「${u.username}」的臨時密碼？`)) return;
    setBusyId(u.id);
    try {
      const res = await adminUsersAPI.resetPassword(u.id);
      setTempCredential({ email: res.user.email, password: res.temp_password });
      await fetchUsers();
    } catch (err: any) {
      alert(err.response?.data?.detail || '重設失敗');
    } finally {
      setBusyId(null);
    }
  };

  const handleToggleActive = async (u: ApiUser) => {
    setBusyId(u.id);
    try {
      await adminUsersAPI.update(u.id, { is_active: !u.is_active });
      await fetchUsers();
    } catch (err: any) {
      alert(err.response?.data?.detail || '操作失敗');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="admin-users">
      <div className="profile-section-header" style={{ marginBottom: 16 }}>
        <div>
          <h2 style={{ margin: 0 }}>帳號管理</h2>
          <p className="profile-section-desc">建立客戶帳號並取得臨時密碼，透過 LINE 等方式轉交客戶</p>
        </div>
        <button className="btn-save-profile" onClick={openCreate}>+ 建立帳號</button>
      </div>

      {loading ? (
        <div className="empty-orders"><p>載入中...</p></div>
      ) : error ? (
        <div className="empty-orders">
          <p style={{ color: '#e74c3c' }}>{error}</p>
          <button onClick={fetchUsers} style={{ marginTop: 12, padding: '8px 16px', cursor: 'pointer' }}>重新載入</button>
        </div>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>帳號 / Email</th>
                <th>公司</th>
                <th>聯絡人</th>
                <th>角色</th>
                <th>狀態</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id}>
                  <td>
                    <div>{u.username}</div>
                    <div className="phone" style={{ fontSize: 12, opacity: 0.7 }}>{u.email}</div>
                  </td>
                  <td>{u.company_name || '—'}</td>
                  <td>
                    {u.contact_name || '—'}
                    {u.contact_phone && <div className="phone" style={{ fontSize: 12, opacity: 0.7 }}>{u.contact_phone}</div>}
                  </td>
                  <td>{u.is_admin ? '管理員' : '客戶'}</td>
                  <td>
                    <span className={`status ${u.is_active ? 'status-confirmed' : 'status-cancelled'}`}>
                      {u.is_active ? '啟用' : '停用'}
                    </span>
                    {u.must_change_password && (
                      <div style={{ fontSize: 12, color: '#f6ad55', marginTop: 4 }}>待改密</div>
                    )}
                  </td>
                  <td onClick={e => e.stopPropagation()}>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <button
                        className="btn-addr-edit"
                        disabled={busyId === u.id}
                        onClick={() => handleReset(u)}
                      >
                        重設密碼
                      </button>
                      <button
                        className={u.is_active ? 'btn-addr-delete' : 'btn-addr-edit'}
                        disabled={busyId === u.id || u.id === currentUser?.id}
                        onClick={() => handleToggleActive(u)}
                        title={u.id === currentUser?.id ? '無法停用自己的帳號' : ''}
                      >
                        {u.is_active ? '停用' : '啟用'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 建立帳號 Modal */}
      {modalOpen && (
        <div className="addr-modal-overlay" onClick={() => setModalOpen(false)}>
          <div className="addr-modal" onClick={e => e.stopPropagation()}>
            <div className="addr-modal-header">
              <h3>建立客戶帳號</h3>
              <button className="addr-modal-close" onClick={() => setModalOpen(false)}>✕</button>
            </div>
            <form onSubmit={submitCreate} className="profile-form">
              <div className="form-row">
                <div className="form-group">
                  <label>Email *</label>
                  <input value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="client@corp.com" />
                </div>
                <div className="form-group">
                  <label>帳號名稱 *</label>
                  <input value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} placeholder="corp01" />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>公司名稱</label>
                  <input value={form.company_name} onChange={e => setForm({ ...form, company_name: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>統一編號</label>
                  <input value={form.tax_id} onChange={e => setForm({ ...form, tax_id: e.target.value })} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>聯絡人</label>
                  <input value={form.contact_name} onChange={e => setForm({ ...form, contact_name: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>聯絡電話</label>
                  <input value={form.contact_phone} onChange={e => setForm({ ...form, contact_phone: e.target.value })} />
                </div>
              </div>
              {formError && <div className="error-message">{formError}</div>}
              <div className="profile-actions">
                <button type="button" className="btn-cancel-addr" onClick={() => setModalOpen(false)}>取消</button>
                <button type="submit" className="btn-save-profile" disabled={submitting}>
                  {submitting ? '建立中...' : '建立並產生臨時密碼'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 顯示一次性臨時密碼 */}
      {tempCredential && (
        <div className="addr-modal-overlay" onClick={() => setTempCredential(null)}>
          <div className="addr-modal" onClick={e => e.stopPropagation()}>
            <div className="addr-modal-header">
              <h3>臨時密碼已產生</h3>
              <button className="addr-modal-close" onClick={() => setTempCredential(null)}>✕</button>
            </div>
            <div style={{ padding: '8px 0' }}>
              <p className="profile-section-desc" style={{ marginBottom: 12 }}>
                請立即複製並轉交客戶。此密碼僅顯示一次，客戶首次登入後須自行修改。
              </p>
              <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 8, padding: 16, lineHeight: 2 }}>
                <div>帳號（Email）：<strong>{tempCredential.email}</strong></div>
                <div>臨時密碼：<strong style={{ fontSize: 18, letterSpacing: 1 }}>{tempCredential.password}</strong></div>
              </div>
              <div className="profile-actions">
                <button
                  type="button"
                  className="btn-save-profile"
                  onClick={() => {
                    navigator.clipboard?.writeText(
                      `帳號：${tempCredential.email}\n臨時密碼：${tempCredential.password}`
                    );
                  }}
                >
                  複製帳密
                </button>
                <button type="button" className="btn-cancel-addr" onClick={() => setTempCredential(null)}>關閉</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminUsers;
