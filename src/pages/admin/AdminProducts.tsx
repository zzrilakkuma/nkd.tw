import React, { useState, useEffect } from 'react';
import { Product } from '../../types';
import { productsAPI } from '../../services/api';
import { formatPrice } from '../../utils';

interface ProductForm {
  name: string;
  description: string;
  price: string;
  stock: string;
  category: string;
  image: string;
}

const EMPTY_FORM: ProductForm = {
  name: '',
  description: '',
  price: '',
  stock: '',
  category: '水煙草',
  image: '',
};

const AdminProducts: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [form, setForm] = useState<ProductForm>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Delete confirmation
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await productsAPI.getAll();
      setProducts(data);
    } catch (err: any) {
      setError(err.response?.data?.detail || '無法載入商品');
    } finally {
      setLoading(false);
    }
  };

  const openAddModal = () => {
    setEditingProduct(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    setShowModal(true);
  };

  const openEditModal = (product: Product) => {
    setEditingProduct(product);
    setForm({
      name: product.name,
      description: product.description,
      price: String(product.price),
      stock: String(product.stock),
      category: product.category,
      image: product.image,
    });
    setFormError(null);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingProduct(null);
    setFormError(null);
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const price = parseFloat(form.price);
    const stock = parseInt(form.stock, 10);
    if (isNaN(price) || price <= 0) { setFormError('售價請填入有效數字'); return; }
    if (isNaN(stock) || stock < 0) { setFormError('庫存請填入有效數字'); return; }

    const payload = {
      name: form.name.trim(),
      description: form.description.trim(),
      price,
      stock,
      category: form.category,
      image: form.image.trim(),
    };

    setSubmitting(true);
    try {
      if (editingProduct) {
        const updated = await productsAPI.update(editingProduct.id, payload);
        setProducts(prev => prev.map(p => p.id === editingProduct.id ? updated : p));
      } else {
        const created = await productsAPI.create(payload);
        setProducts(prev => [...prev, created]);
      }
      closeModal();
    } catch (err: any) {
      setFormError(err.response?.data?.detail || '儲存失敗，請再試一次');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await productsAPI.delete(id);
      setProducts(prev => prev.filter(p => p.id !== id));
    } catch (err: any) {
      alert(err.response?.data?.detail || '刪除失敗，請再試一次');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="admin-products">
      <div className="products-header">
        <h2>商品管理</h2>
        <button className="btn-add" onClick={openAddModal}>+ 新增商品</button>
      </div>

      {loading ? (
        <div className="empty-orders"><p>載入中...</p></div>
      ) : error ? (
        <div className="empty-orders">
          <p style={{ color: '#e74c3c' }}>{error}</p>
          <button onClick={fetchProducts} style={{ marginTop: '12px', padding: '8px 16px', cursor: 'pointer' }}>重新載入</button>
        </div>
      ) : (
        <>
          {/* 桌面版表格 */}
          <div className="table-container desktop-only">
            <table>
              <thead>
                <tr>
                  <th>圖片</th>
                  <th>商品名稱</th>
                  <th>分類</th>
                  <th>售價</th>
                  <th>庫存</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {products.map(product => (
                  <tr key={product.id}>
                    <td>
                      <img
                        src={product.image}
                        alt={product.name}
                        className="product-thumb"
                        onError={(e) => { (e.target as HTMLImageElement).src = '/images/placeholder.svg'; }}
                      />
                    </td>
                    <td>
                      <div className="product-name">{product.name}</div>
                      <div className="product-desc-preview">{product.description}</div>
                    </td>
                    <td><span className="category-badge">{product.category}</span></td>
                    <td className="amount">{formatPrice(product.price)}</td>
                    <td>
                      <span className={`stock-badge ${product.stock === 0 ? 'out-of-stock' : product.stock <= 5 ? 'low-stock' : ''}`}>
                        {product.stock === 0 ? '缺貨' : `${product.stock} 件`}
                      </span>
                    </td>
                    <td>
                      <div className="action-buttons">
                        <button className="btn-edit" onClick={() => openEditModal(product)}>編輯</button>
                        <button
                          className="btn-delete"
                          onClick={() => handleDelete(product.id)}
                          disabled={deletingId === product.id}
                        >
                          {deletingId === product.id ? '刪除中...' : '刪除'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 手機版卡片列表 */}
          <div className="mobile-product-list mobile-only">
            {products.map(product => (
              <div key={product.id} className="mobile-product-card">
                <img
                  src={product.image}
                  alt={product.name}
                  className="mpc-thumb"
                  onError={(e) => { (e.target as HTMLImageElement).src = '/images/placeholder.svg'; }}
                />
                <div className="mpc-info">
                  <div className="mpc-top">
                    <span className="product-name">{product.name}</span>
                    <span className="category-badge">{product.category}</span>
                  </div>
                  <div className="mpc-mid">
                    <span className="amount">{formatPrice(product.price)}</span>
                    <span className={`stock-badge ${product.stock === 0 ? 'out-of-stock' : product.stock <= 5 ? 'low-stock' : ''}`}>
                      {product.stock === 0 ? '缺貨' : `${product.stock} 件`}
                    </span>
                  </div>
                  <div className="action-buttons">
                    <button className="btn-edit" onClick={() => openEditModal(product)}>編輯</button>
                    <button
                      className="btn-delete"
                      onClick={() => handleDelete(product.id)}
                      disabled={deletingId === product.id}
                    >
                      {deletingId === product.id ? '刪除中...' : '刪除'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingProduct ? '編輯商品' : '新增商品'}</h3>
              <button className="modal-close" onClick={closeModal}>✕</button>
            </div>

            <form onSubmit={handleSubmit} className="modal-form">
              <div className="form-row">
                <div className="form-group">
                  <label>商品名稱 *</label>
                  <input name="name" value={form.name} onChange={handleFormChange} required placeholder="例：DarkSide Blackcurrant" />
                </div>
                <div className="form-group">
                  <label>分類 *</label>
                  <select name="category" value={form.category} onChange={handleFormChange}>
                    <option value="水煙草">水煙草</option>
                    <option value="配件">配件</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>商品描述 *</label>
                <textarea name="description" value={form.description} onChange={handleFormChange} required rows={3} placeholder="商品描述..." />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>售價（TWD）*</label>
                  <input name="price" type="number" value={form.price} onChange={handleFormChange} required min="0" placeholder="760" />
                </div>
                <div className="form-group">
                  <label>庫存數量 *</label>
                  <input name="stock" type="number" value={form.stock} onChange={handleFormChange} required min="0" placeholder="100" />
                </div>
              </div>

              <div className="form-group">
                <label>圖片 URL</label>
                <input name="image" value={form.image} onChange={handleFormChange} placeholder="https://..." />
                {form.image && (
                  <img src={form.image} alt="預覽" className="image-preview" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                )}
              </div>

              {formError && <div className="form-error">{formError}</div>}

              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={closeModal}>取消</button>
                <button type="submit" className="btn-save" disabled={submitting}>
                  {submitting ? '儲存中...' : editingProduct ? '儲存變更' : '新增商品'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminProducts;
