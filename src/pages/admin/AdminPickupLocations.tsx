import React, { useEffect, useState, useCallback } from 'react';
import { PickupLocation } from '../../types';
import { pickupLocationsAPI } from '../../services/api';

interface LocForm {
  name: string;
  address: string;
  contact: string;
  note: string;
}

const EMPTY: LocForm = { name: '', address: '', contact: '', note: '' };

const AdminPickupLocations: React.FC = () => {
  const [locations, setLocations] = useState<PickupLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<PickupLocation | null>(null);
  const [form, setForm] = useState<LocForm>(EMPTY);
  const [submitting, setSubmitting] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setLocations(await pickupLocationsAPI.list());
    } catch (err: any) {
      setError(err.response?.data?.detail || '無法載入自取地點');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const openAdd = () => { setEditing(null); setForm(EMPTY); setModalOpen(true); };
  const openEdit = (loc: PickupLocation) => {
    setEditing(loc);
    setForm({ name: loc.name, address: loc.address || '', contact: loc.contact || '', note: loc.note || '' });
    setModalOpen(true);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { alert('地點名稱為必填'); return; }
    setSubmitting(true);
    try {
      if (editing) await pickupLocationsAPI.update(editing.id, form);
      else await pickupLocationsAPI.create(form);
      setModalOpen(false);
      await fetchAll();
    } catch (err: any) {
      alert(err.response?.data?.detail || '儲存失敗');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleActive = async (loc: PickupLocation) => {
    setBusyId(loc.id);
    try { await pickupLocationsAPI.update(loc.id, { is_active: !loc.is_active }); await fetchAll(); }
    catch (err: any) { alert(err.response?.data?.detail || '操作失敗'); }
    finally { setBusyId(null); }
  };

  const remove = async (loc: PickupLocation) => {
    if (!window.confirm(`確定刪除自取地點「${loc.name}」？`)) return;
    setBusyId(loc.id);
    try { await pickupLocationsAPI.delete(loc.id); await fetchAll(); }
    catch (err: any) { alert(err.response?.data?.detail || '刪除失敗'); }
    finally { setBusyId(null); }
  };

  return (
    <div className="admin-products">
      <div className="products-header">
        <h2>自取地點管理</h2>
        <button className="btn-add" onClick={openAdd}>+ 新增自取地點</button>
      </div>

      {loading ? (
        <div className="empty-orders"><p>載入中...</p></div>
      ) : error ? (
        <div className="empty-orders">
          <p style={{ color: '#e74c3c' }}>{error}</p>
          <button onClick={fetchAll} style={{ marginTop: 12, padding: '8px 16px', cursor: 'pointer' }}>重新載入</button>
        </div>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr><th>名稱</th><th>地址</th><th>聯絡方式</th><th>備註</th><th>狀態</th><th>操作</th></tr>
            </thead>
            <tbody>
              {locations.map(loc => (
                <tr key={loc.id}>
                  <td>{loc.name}</td>
                  <td>{loc.address || '—'}</td>
                  <td>{loc.contact || '—'}</td>
                  <td>{loc.note || '—'}</td>
                  <td>
                    <span className={`status ${loc.is_active ? 'status-confirmed' : 'status-cancelled'}`}>
                      {loc.is_active ? '啟用' : '停用'}
                    </span>
                  </td>
                  <td>
                    <div className="action-buttons">
                      <button className="btn-edit" onClick={() => openEdit(loc)}>編輯</button>
                      <button className="btn-edit" disabled={busyId === loc.id} onClick={() => toggleActive(loc)}>
                        {loc.is_active ? '停用' : '啟用'}
                      </button>
                      <button className="btn-delete" disabled={busyId === loc.id} onClick={() => remove(loc)}>刪除</button>
                    </div>
                  </td>
                </tr>
              ))}
              {locations.length === 0 && (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: 20, opacity: 0.7 }}>尚無自取地點</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {modalOpen && (
        <div className="modal-overlay" onClick={() => setModalOpen(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editing ? '編輯自取地點' : '新增自取地點'}</h3>
              <button className="modal-close" onClick={() => setModalOpen(false)}>✕</button>
            </div>
            <form onSubmit={submit} className="modal-form">
              <div className="form-group">
                <label>地點名稱 *</label>
                <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="例：台北信義門市" />
              </div>
              <div className="form-group">
                <label>地址</label>
                <input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>聯絡方式</label>
                  <input value={form.contact} onChange={e => setForm({ ...form, contact: e.target.value })} placeholder="電話 / LINE" />
                </div>
                <div className="form-group">
                  <label>備註</label>
                  <input value={form.note} onChange={e => setForm({ ...form, note: e.target.value })} placeholder="營業時間等" />
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={() => setModalOpen(false)}>取消</button>
                <button type="submit" className="btn-save" disabled={submitting}>
                  {submitting ? '儲存中...' : editing ? '儲存變更' : '新增'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPickupLocations;
