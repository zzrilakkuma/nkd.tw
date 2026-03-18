import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../../services/api';
import '../../styles/profile.css';

interface SavedAddress {
  id: string;
  label?: string;
  name: string;
  phone: string;
  postalCode: string;
  city: string;
  address: string;
}

interface AddressForm {
  label: string;
  name: string;
  phone: string;
  postalCode: string;
  city: string;
  address: string;
}

const generateId = () => Math.random().toString(36).slice(2, 10);

const Profile: React.FC = () => {
  const navigate = useNavigate();
  const currentUser = JSON.parse(localStorage.getItem('user') || 'null');
  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState<SavedAddress | null>(null);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<AddressForm>();

  useEffect(() => {
    if (!currentUser) {
      navigate('/login');
      return;
    }
    (async () => {
      try {
        const user = await authAPI.getMe();
        if (user.saved_address && Array.isArray(user.saved_address)) {
          setAddresses(user.saved_address.map((a: any) => ({
            ...a,
            id: a.id || generateId(),
          })));
        }
      } catch {
        setLoadError('無法載入個人資料，請確認網路連線');
      }
    })();
  }, [navigate]); // eslint-disable-line

  const openAdd = () => {
    setEditingAddress(null);
    reset({ label: '', name: '', phone: '', postalCode: '', city: '', address: '' });
    setModalOpen(true);
  };

  const openEdit = (addr: SavedAddress) => {
    setEditingAddress(addr);
    reset({
      label: addr.label || '',
      name: addr.name,
      phone: addr.phone,
      postalCode: addr.postalCode,
      city: addr.city,
      address: addr.address,
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingAddress(null);
  };

  const saveAddresses = async (list: SavedAddress[]) => {
    await authAPI.updateProfile({ saved_address: list });
    setAddresses(list);
  };

  const onSubmit = async (data: AddressForm) => {
    setSaving(true);
    try {
      let updated: SavedAddress[];
      if (editingAddress) {
        updated = addresses.map(a =>
          a.id === editingAddress.id ? { ...a, ...data } : a
        );
      } else {
        updated = [...addresses, { id: generateId(), ...data }];
      }
      await saveAddresses(updated);
      closeModal();
    } catch {
      alert('儲存失敗，請再試一次');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      const updated = addresses.filter(a => a.id !== id);
      await saveAddresses(updated);
    } catch {
      alert('刪除失敗，請再試一次');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="profile-page">
      <div className="container">
        <div className="profile-card">
          <div className="profile-header">
            <div className="profile-avatar">
              {currentUser?.username?.[0]?.toUpperCase() ?? '?'}
            </div>
            <div>
              <h2 className="profile-username">{currentUser?.username}</h2>
              <p className="profile-email">{currentUser?.email}</p>
            </div>
          </div>

          <hr className="profile-divider" />

          <div className="profile-section-header">
            <div>
              <h3 className="profile-section-title">常用收件地址</h3>
              <p className="profile-section-desc">最多可儲存 5 組地址，結帳時一鍵帶入</p>
            </div>
            {addresses.length < 5 && (
              <button className="btn-add-address" onClick={openAdd}>+ 新增地址</button>
            )}
          </div>

          {loadError && <p style={{ color: '#f87171', fontSize: '13px', marginBottom: '16px' }}>{loadError}</p>}

          {addresses.length === 0 ? (
            <div className="address-empty">
              <p>尚未儲存任何地址</p>
              <button className="btn-add-address-lg" onClick={openAdd}>+ 新增第一組地址</button>
            </div>
          ) : (
            <div className="address-list">
              {addresses.map(addr => (
                <div key={addr.id} className="address-card">
                  <div className="address-card-body">
                    {addr.label && <span className="address-label-tag">{addr.label}</span>}
                    <p className="address-recipient">{addr.name} · {addr.phone}</p>
                    <p className="address-detail">{addr.postalCode} {addr.city} {addr.address}</p>
                  </div>
                  <div className="address-card-actions">
                    <button className="btn-addr-edit" onClick={() => openEdit(addr)}>編輯</button>
                    <button
                      className="btn-addr-delete"
                      onClick={() => handleDelete(addr.id)}
                      disabled={deletingId === addr.id}
                    >
                      {deletingId === addr.id ? '...' : '刪除'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="addr-modal-overlay" onClick={closeModal}>
          <div className="addr-modal" onClick={e => e.stopPropagation()}>
            <div className="addr-modal-header">
              <h3>{editingAddress ? '編輯地址' : '新增地址'}</h3>
              <button className="addr-modal-close" onClick={closeModal}>✕</button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="profile-form">
              <div className="form-group">
                <label>地址名稱（選填）</label>
                <input {...register('label')} placeholder="例：家、公司" />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>收件人姓名</label>
                  <input {...register('name', { required: '必填' })} placeholder="王小明" className={errors.name ? 'error' : ''} />
                  {errors.name && <span className="error-message">{errors.name.message}</span>}
                </div>
                <div className="form-group">
                  <label>聯絡電話</label>
                  <input {...register('phone', { required: '必填' })} placeholder="0912345678" className={errors.phone ? 'error' : ''} />
                  {errors.phone && <span className="error-message">{errors.phone.message}</span>}
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>郵遞區號</label>
                  <input {...register('postalCode', { required: '必填' })} placeholder="100" className={errors.postalCode ? 'error' : ''} />
                  {errors.postalCode && <span className="error-message">{errors.postalCode.message}</span>}
                </div>
                <div className="form-group">
                  <label>城市</label>
                  <input {...register('city', { required: '必填' })} placeholder="台北市" className={errors.city ? 'error' : ''} />
                  {errors.city && <span className="error-message">{errors.city.message}</span>}
                </div>
              </div>

              <div className="form-group">
                <label>詳細地址</label>
                <input {...register('address', { required: '必填' })} placeholder="中正區重慶南路一段122號" className={errors.address ? 'error' : ''} />
                {errors.address && <span className="error-message">{errors.address.message}</span>}
              </div>

              <div className="profile-actions">
                <button type="button" className="btn-cancel-addr" onClick={closeModal}>取消</button>
                <button type="submit" className="btn-save-profile" disabled={saving}>
                  {saving ? '儲存中...' : '儲存'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;
