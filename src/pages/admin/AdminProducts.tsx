import React, { useState, useEffect, useCallback } from 'react';
import { Product, Brand, Category, SKU } from '../../types';
import { productsAPI, brandsAPI, categoriesAPI, imagesAPI } from '../../services/api';
import { formatPrice } from '../../utils';

interface ProductForm {
  name: string;
  description: string;
  brand_id: string;
  category_id: string;
  main_image: string;
  is_published: boolean;
  // 建立時的初始 SKU
  flavor: string;
  spec: string;
  price: string;
  stock: string;
}

const EMPTY_FORM: ProductForm = {
  name: '',
  description: '',
  brand_id: '',
  category_id: '',
  main_image: '',
  is_published: true,
  flavor: '',
  spec: '',
  price: '',
  stock: '',
};

const priceRange = (skus: SKU[]) => {
  const active = skus.filter(s => s.is_active);
  if (active.length === 0) return '—';
  const prices = active.map(s => s.price);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  return min === max ? formatPrice(min) : `${formatPrice(min)} ~ ${formatPrice(max)}`;
};

const totalAvailable = (skus: SKU[]) =>
  skus.filter(s => s.is_active).reduce((sum, s) => sum + (s.available || 0), 0);

const AdminProducts: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 商品 Modal
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [form, setForm] = useState<ProductForm>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const handleImageUpload = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    setFormError(null);
    try {
      const res = await imagesAPI.upload(file);
      setForm(prev => ({ ...prev, main_image: res.absoluteUrl }));
    } catch (err: any) {
      setFormError(err.response?.data?.detail || '圖片上傳失敗，請確認格式與大小（3MB 內）');
    } finally {
      setUploading(false);
    }
  };

  // SKU 管理 Modal
  const [skuProduct, setSkuProduct] = useState<Product | null>(null);

  // 品牌/類別管理 Modal
  const [showTaxonomy, setShowTaxonomy] = useState(false);

  // 篩選 / 搜尋 / 分頁
  const [search, setSearch] = useState('');
  const [brandFilter, setBrandFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'unpublished'>('all');
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;

  useEffect(() => {
    setPage(1);
  }, [search, brandFilter, categoryFilter, statusFilter]);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [p, b, c] = await Promise.all([
        productsAPI.getAllAdmin(),
        brandsAPI.list(),
        categoriesAPI.list(),
      ]);
      setProducts(p);
      setBrands(b);
      setCategories(c);
    } catch (err: any) {
      setError(err.response?.data?.detail || '無法載入資料');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const openAddModal = () => {
    setEditingProduct(null);
    setForm({ ...EMPTY_FORM, brand_id: brands[0]?.id || '', category_id: categories[0]?.id || '' });
    setFormError(null);
    setShowModal(true);
  };

  const openEditModal = (product: Product) => {
    setEditingProduct(product);
    setForm({
      name: product.name,
      description: product.description || '',
      brand_id: product.brand_id || '',
      category_id: product.category_id || '',
      main_image: product.main_image || '',
      is_published: product.is_published ?? true,
      flavor: '',
      spec: '',
      price: '',
      stock: '',
    });
    setFormError(null);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingProduct(null);
    setFormError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!form.name.trim()) { setFormError('商品名稱為必填'); return; }

    setSubmitting(true);
    try {
      if (editingProduct) {
        const payload = {
          name: form.name.trim(),
          description: form.description.trim(),
          brand_id: form.brand_id || null,
          category_id: form.category_id || null,
          main_image: form.main_image.trim(),
          is_published: form.is_published,
        };
        await productsAPI.update(editingProduct.id, payload);
      } else {
        const price = parseFloat(form.price);
        const stock = parseInt(form.stock, 10);
        if (isNaN(price) || price <= 0) { setFormError('初始 SKU 售價請填入有效數字'); setSubmitting(false); return; }
        if (isNaN(stock) || stock < 0) { setFormError('初始 SKU 庫存請填入有效數字'); setSubmitting(false); return; }
        const payload = {
          name: form.name.trim(),
          description: form.description.trim(),
          brand_id: form.brand_id || null,
          category_id: form.category_id || null,
          main_image: form.main_image.trim(),
          is_published: form.is_published,
          images: [],
          skus: [{ flavor: form.flavor.trim(), spec: form.spec.trim(), unit: '件', price, stock, is_active: true }],
        };
        await productsAPI.create(payload);
      }
      await fetchAll();
      closeModal();
    } catch (err: any) {
      setFormError(err.response?.data?.detail || '儲存失敗，請再試一次');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('確定要刪除此商品（含其所有 SKU）？')) return;
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

  const togglePublish = async (product: Product) => {
    try {
      await productsAPI.update(product.id, { is_published: !product.is_published });
      await fetchAll();
    } catch (err: any) {
      alert(err.response?.data?.detail || '操作失敗');
    }
  };

  const LOW_STOCK = 5;

  // 統計
  const publishedCount = products.filter(p => p.is_published).length;
  const lowStockCount = products.filter(p => totalAvailable(p.skus || []) <= LOW_STOCK).length;

  // 篩選 + 搜尋
  const q = search.trim().toLowerCase();
  const filtered = products.filter(p => {
    if (brandFilter !== 'all' && p.brand_id !== brandFilter) return false;
    if (categoryFilter !== 'all' && p.category_id !== categoryFilter) return false;
    if (statusFilter === 'published' && !p.is_published) return false;
    if (statusFilter === 'unpublished' && p.is_published) return false;
    if (!q) return true;
    return (
      p.name.toLowerCase().includes(q) ||
      (p.brand?.name || '').toLowerCase().includes(q) ||
      (p.category?.name || '').toLowerCase().includes(q)
    );
  });

  // 分頁
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paged = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const rangeStart = filtered.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(currentPage * PAGE_SIZE, filtered.length);

  return (
    <div className="admin-products">
      <div className="products-header">
        <h2>商品管理</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn-edit" onClick={() => setShowTaxonomy(true)}>品牌／類別</button>
          <button className="btn-add" onClick={openAddModal}>+ 新增商品</button>
        </div>
      </div>

      {!loading && !error && (
        <div className="admin-stats admin-stats-compact">
          <div className="stat-card">
            <h3>商品總數</h3>
            <div className="stat-number">{products.length}</div>
          </div>
          <div className="stat-card">
            <h3>上架中</h3>
            <div className="stat-number">{publishedCount}</div>
          </div>
          <div className={`stat-card ${lowStockCount > 0 ? 'stat-card-alert clickable' : ''}`}
               onClick={() => lowStockCount > 0 && setStatusFilter('all')}>
            <h3>低庫存</h3>
            <div className="stat-number">{lowStockCount}</div>
            <span className="stat-sub">可售 ≤ {LOW_STOCK}</span>
          </div>
        </div>
      )}

      {loading ? (
        <div className="empty-orders"><p>載入中...</p></div>
      ) : error ? (
        <div className="empty-orders">
          <p style={{ color: '#e74c3c' }}>{error}</p>
          <button onClick={fetchAll} style={{ marginTop: 12, padding: '8px 16px', cursor: 'pointer' }}>重新載入</button>
        </div>
      ) : (
        <>
        <div className="orders-toolbar">
          <div className="status-filter-chips">
            {(['all', 'published', 'unpublished'] as const).map(s => (
              <button
                key={s}
                className={`filter-chip ${statusFilter === s ? 'active' : ''}`}
                onClick={() => setStatusFilter(s)}
              >
                {s === 'all' ? '全部' : s === 'published' ? '上架中' : '已下架'}
              </button>
            ))}
            <select className="orders-search" style={{ minWidth: 120, maxWidth: 160 }} value={brandFilter} onChange={e => setBrandFilter(e.target.value)}>
              <option value="all">全部品牌</option>
              {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
            <select className="orders-search" style={{ minWidth: 120, maxWidth: 160 }} value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}>
              <option value="all">全部類別</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <input
            className="orders-search"
            type="text"
            placeholder="搜尋商品名稱 / 品牌 / 類別"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {filtered.length === 0 ? (
          <div className="empty-orders">
            <p>沒有符合條件的商品</p>
            <button
              onClick={() => { setSearch(''); setBrandFilter('all'); setCategoryFilter('all'); setStatusFilter('all'); }}
              style={{ marginTop: 12, padding: '8px 16px', cursor: 'pointer' }}
            >
              清除篩選
            </button>
          </div>
        ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>圖片</th>
                <th>商品名稱</th>
                <th>品牌</th>
                <th>類別</th>
                <th>SKU</th>
                <th>售價</th>
                <th>可售庫存</th>
                <th>狀態</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {paged.map(product => {
                const avail = totalAvailable(product.skus || []);
                return (
                  <tr key={product.id} className={avail <= LOW_STOCK ? 'needs-action' : ''}>
                    <td>
                      <img
                        src={product.main_image || '/images/placeholder.svg'}
                        alt={product.name}
                        className="product-thumb"
                        onError={(e) => { (e.target as HTMLImageElement).src = '/images/placeholder.svg'; }}
                      />
                    </td>
                    <td>
                      <div className="product-name">{product.name}</div>
                      <div className="product-desc-preview">{product.description}</div>
                    </td>
                    <td>{product.brand?.name || '—'}</td>
                    <td><span className="category-badge">{product.category?.name || '—'}</span></td>
                    <td>
                      <button className="btn-edit" onClick={() => setSkuProduct(product)}>
                        {(product.skus || []).length} 個
                      </button>
                    </td>
                    <td className="amount">{priceRange(product.skus || [])}</td>
                    <td>
                      <span className={`stock-badge ${avail === 0 ? 'out-of-stock' : avail <= 5 ? 'low-stock' : ''}`}>
                        {avail === 0 ? '缺貨' : `${avail} 件`}
                      </span>
                    </td>
                    <td>
                      <button
                        className={`status ${product.is_published ? 'status-confirmed' : 'status-cancelled'}`}
                        onClick={() => togglePublish(product)}
                        style={{ cursor: 'pointer', border: 'none' }}
                      >
                        {product.is_published ? '上架中' : '已下架'}
                      </button>
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
                );
              })}
            </tbody>
          </table>
        </div>
        )}

        {/* 分頁 */}
        {filtered.length > 0 && (
          <div className="orders-pagination">
            <span className="pagination-summary">顯示 {rangeStart}–{rangeEnd}，共 {filtered.length} 筆</span>
            {totalPages > 1 && (
              <div className="pagination-controls">
                <button className="page-btn" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}>上一頁</button>
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                  .reduce<(number | string)[]>((acc, p, idx, arr) => {
                    if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push('…');
                    acc.push(p);
                    return acc;
                  }, [])
                  .map((p, i) =>
                    typeof p === 'number' ? (
                      <button key={i} className={`page-btn ${p === currentPage ? 'active' : ''}`} onClick={() => setPage(p)}>{p}</button>
                    ) : (
                      <span key={i} className="page-ellipsis">…</span>
                    )
                  )}
                <button className="page-btn" disabled={currentPage === totalPages} onClick={() => setPage(currentPage + 1)}>下一頁</button>
              </div>
            )}
          </div>
        )}
        </>
      )}

      {/* 商品 Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingProduct ? '編輯商品' : '新增商品'}</h3>
              <button className="modal-close" onClick={closeModal}>✕</button>
            </div>

            <form onSubmit={handleSubmit} className="modal-form">
              <div className="form-group">
                <label>商品名稱 *</label>
                <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required placeholder="例：DarkSide Blackcurrant" />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>品牌</label>
                  <select value={form.brand_id} onChange={e => setForm({ ...form, brand_id: e.target.value })}>
                    <option value="">未指定</option>
                    {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>類別</label>
                  <select value={form.category_id} onChange={e => setForm({ ...form, category_id: e.target.value })}>
                    <option value="">未指定</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>商品描述</label>
                <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={3} placeholder="商品描述..." />
              </div>

              <div className="form-group">
                <label>主要圖片</label>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <label className="btn-edit" style={{ cursor: 'pointer', margin: 0 }}>
                    {uploading ? '上傳中...' : '📁 上傳圖片'}
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      style={{ display: 'none' }}
                      disabled={uploading}
                      onChange={e => { handleImageUpload(e.target.files?.[0]); e.target.value = ''; }}
                    />
                  </label>
                  <span style={{ fontSize: 12, color: '#9a9aa5' }}>JPG / PNG / WebP，3MB 內；或直接貼圖片網址：</span>
                </div>
                <input
                  style={{ marginTop: 8 }}
                  value={form.main_image}
                  onChange={e => setForm({ ...form, main_image: e.target.value })}
                  placeholder="/images/... 或 https://..."
                />
                {form.main_image && (
                  <img src={form.main_image} alt="預覽" className="image-preview" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                )}
              </div>

              {!editingProduct && (
                <div className="initial-sku-block">
                  <div className="initial-sku-title">初始規格（SKU）*　<span>每個商品至少需要一個規格；建立後可在「SKU 管理」新增更多</span></div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>口味（選填）</label>
                      <input value={form.flavor} onChange={e => setForm({ ...form, flavor: e.target.value })} placeholder="例：佛手柑" />
                    </div>
                    <div className="form-group">
                      <label>規格（選填）</label>
                      <input value={form.spec} onChange={e => setForm({ ...form, spec: e.target.value })} placeholder="例：100g" />
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>售價（TWD）*</label>
                      <input type="number" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} min="0" placeholder="760" />
                    </div>
                    <div className="form-group">
                      <label>庫存 *</label>
                      <input type="number" value={form.stock} onChange={e => setForm({ ...form, stock: e.target.value })} min="0" placeholder="100" />
                    </div>
                  </div>
                </div>
              )}

              <div className="form-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input type="checkbox" checked={form.is_published} onChange={e => setForm({ ...form, is_published: e.target.checked })} style={{ width: 'auto' }} />
                  上架（顯示於商店）
                </label>
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

      {/* SKU 管理 Modal */}
      {skuProduct && (
        <SkuManager
          product={skuProduct}
          onClose={() => setSkuProduct(null)}
          onChanged={fetchAll}
        />
      )}

      {/* 品牌／類別管理 Modal */}
      {showTaxonomy && (
        <TaxonomyManager
          brands={brands}
          categories={categories}
          onClose={() => setShowTaxonomy(false)}
          onChanged={fetchAll}
        />
      )}
    </div>
  );
};

// ---------------- SKU 管理 ----------------
interface SkuManagerProps {
  product: Product;
  onClose: () => void;
  onChanged: () => Promise<void> | void;
}

// 單一 SKU 列（本地編輯 + 明確儲存）
const SkuRow: React.FC<{
  sku: SKU;
  busy: boolean;
  onSave: (patch: Partial<SKU>) => void;
  onDelete: () => void;
}> = ({ sku, busy, onSave, onDelete }) => {
  const [f, setF] = useState({
    flavor: sku.flavor || '',
    spec: sku.spec || '',
    unit: sku.unit || '件',
    price: String(sku.price),
    stock: String(sku.stock),
  });

  useEffect(() => {
    setF({
      flavor: sku.flavor || '', spec: sku.spec || '', unit: sku.unit || '件',
      price: String(sku.price), stock: String(sku.stock),
    });
  }, [sku.id, sku.flavor, sku.spec, sku.unit, sku.price, sku.stock]);

  const dirty =
    f.flavor !== (sku.flavor || '') || f.spec !== (sku.spec || '') ||
    f.unit !== (sku.unit || '') || Number(f.price) !== sku.price ||
    Number(f.stock) !== sku.stock;

  const save = () => {
    const price = parseFloat(f.price);
    const stock = parseInt(f.stock, 10);
    if (isNaN(price) || price <= 0) { alert('售價請填入有效數字'); return; }
    if (isNaN(stock) || stock < 0) { alert('庫存請填入有效數字'); return; }
    onSave({ flavor: f.flavor, spec: f.spec, unit: f.unit, price, stock });
  };

  return (
    <div className={`sku-card ${sku.is_active ? '' : 'inactive'}`}>
      <div className="sku-card-grid">
        <label className="sku-field"><span>口味</span>
          <input value={f.flavor} placeholder="—" onChange={e => setF({ ...f, flavor: e.target.value })} />
        </label>
        <label className="sku-field"><span>規格</span>
          <input value={f.spec} placeholder="—" onChange={e => setF({ ...f, spec: e.target.value })} />
        </label>
        <label className="sku-field sku-field-sm"><span>單位</span>
          <input value={f.unit} onChange={e => setF({ ...f, unit: e.target.value })} />
        </label>
        <label className="sku-field sku-field-sm"><span>售價</span>
          <input type="number" value={f.price} onChange={e => setF({ ...f, price: e.target.value })} />
        </label>
        <label className="sku-field sku-field-sm"><span>庫存</span>
          <input type="number" value={f.stock} onChange={e => setF({ ...f, stock: e.target.value })} />
        </label>
      </div>
      <div className="sku-card-foot">
        <span className="sku-available">
          可售 <strong>{sku.available}</strong>
          {sku.reserved > 0 && <em>（保留 {sku.reserved}）</em>}
        </span>
        <label className="sku-toggle">
          <input type="checkbox" checked={sku.is_active} disabled={busy}
            onChange={e => onSave({ is_active: e.target.checked })} />
          上架
        </label>
        <div className="sku-card-actions">
          <button className="btn-save" disabled={!dirty || busy} onClick={save}>
            {dirty ? '儲存' : '已儲存'}
          </button>
          <button className="btn-delete" disabled={busy} onClick={onDelete}>刪除</button>
        </div>
      </div>
    </div>
  );
};

const SkuManager: React.FC<SkuManagerProps> = ({ product, onClose, onChanged }) => {
  const [skus, setSkus] = useState<SKU[]>(product.skus || []);
  const [busy, setBusy] = useState(false);
  const [newSku, setNewSku] = useState({ flavor: '', spec: '', unit: '件', price: '', stock: '' });
  const [err, setErr] = useState<string | null>(null);

  const reload = async () => {
    const fresh = await productsAPI.getById(product.id);
    setSkus(fresh.skus || []);
    await onChanged();
  };

  const addSku = async () => {
    const price = parseFloat(newSku.price);
    const stock = parseInt(newSku.stock, 10);
    if (isNaN(price) || price <= 0) { setErr('售價請填入有效數字'); return; }
    if (isNaN(stock) || stock < 0) { setErr('庫存請填入有效數字'); return; }
    setBusy(true); setErr(null);
    try {
      await productsAPI.createSku(product.id, {
        flavor: newSku.flavor, spec: newSku.spec, unit: newSku.unit,
        price, stock, is_active: true,
      });
      setNewSku({ flavor: '', spec: '', unit: '件', price: '', stock: '' });
      await reload();
    } catch (e: any) {
      setErr(e.response?.data?.detail || '新增 SKU 失敗');
    } finally {
      setBusy(false);
    }
  };

  const saveSku = async (sku: SKU, patch: Partial<SKU>) => {
    setBusy(true); setErr(null);
    try {
      await productsAPI.updateSku(product.id, sku.id, patch);
      await reload();
    } catch (e: any) {
      setErr(e.response?.data?.detail || '更新 SKU 失敗');
    } finally {
      setBusy(false);
    }
  };

  const deleteSku = async (sku: SKU) => {
    if (skus.length <= 1) { alert('每個商品至少需保留一個規格'); return; }
    if (!window.confirm('確定刪除此規格？')) return;
    setBusy(true); setErr(null);
    try {
      await productsAPI.deleteSku(product.id, sku.id);
      await reload();
    } catch (e: any) {
      setErr(e.response?.data?.detail || '刪除 SKU 失敗');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal sku-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>規格管理</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="sku-modal-sub">
          <img
            className="sku-modal-thumb"
            src={product.main_image || '/images/placeholder.svg'}
            alt={product.name}
            onError={(e) => { (e.target as HTMLImageElement).src = '/images/placeholder.svg'; }}
          />
          <div>
            <div className="sku-modal-name">{product.name}</div>
            <div className="sku-modal-hint">此商品的可購買規格，每個規格各自有售價與庫存。</div>
          </div>
          <span className="sku-modal-count">{skus.length} 個規格</span>
        </div>

        {err && <div className="form-error" style={{ marginBottom: 12 }}>{err}</div>}

        <div className="sku-list">
          {skus.map(s => (
            <SkuRow
              key={s.id}
              sku={s}
              busy={busy}
              onSave={(patch) => saveSku(s, patch)}
              onDelete={() => deleteSku(s)}
            />
          ))}
        </div>

        <div className="sku-add-card">
          <div className="sku-add-title">＋ 新增規格</div>
          <div className="sku-card-grid">
            <label className="sku-field"><span>口味</span>
              <input placeholder="例：佛手柑" value={newSku.flavor} onChange={e => setNewSku({ ...newSku, flavor: e.target.value })} />
            </label>
            <label className="sku-field"><span>規格</span>
              <input placeholder="例：100g" value={newSku.spec} onChange={e => setNewSku({ ...newSku, spec: e.target.value })} />
            </label>
            <label className="sku-field sku-field-sm"><span>單位</span>
              <input value={newSku.unit} onChange={e => setNewSku({ ...newSku, unit: e.target.value })} />
            </label>
            <label className="sku-field sku-field-sm"><span>售價</span>
              <input type="number" placeholder="760" value={newSku.price} onChange={e => setNewSku({ ...newSku, price: e.target.value })} />
            </label>
            <label className="sku-field sku-field-sm"><span>庫存</span>
              <input type="number" placeholder="25" value={newSku.stock} onChange={e => setNewSku({ ...newSku, stock: e.target.value })} />
            </label>
          </div>
          <div className="sku-add-foot">
            <button className="btn-save" disabled={busy} onClick={addSku}>新增規格</button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ---------------- 品牌／類別管理 ----------------
interface TaxonomyProps {
  brands: Brand[];
  categories: Category[];
  onClose: () => void;
  onChanged: () => Promise<void> | void;
}

const TaxonomyManager: React.FC<TaxonomyProps> = ({ brands, categories, onClose, onChanged }) => {
  const [newBrand, setNewBrand] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [busy, setBusy] = useState(false);

  const addBrand = async () => {
    if (!newBrand.trim()) return;
    setBusy(true);
    try { await brandsAPI.create({ name: newBrand.trim() }); setNewBrand(''); await onChanged(); }
    finally { setBusy(false); }
  };
  const delBrand = async (id: string) => {
    if (!window.confirm('刪除此品牌？（商品的品牌欄位會變為未指定）')) return;
    setBusy(true);
    try { await brandsAPI.delete(id); await onChanged(); }
    catch (e: any) { alert(e.response?.data?.detail || '刪除失敗'); }
    finally { setBusy(false); }
  };
  const addCategory = async () => {
    if (!newCategory.trim()) return;
    setBusy(true);
    try { await categoriesAPI.create({ name: newCategory.trim() }); setNewCategory(''); await onChanged(); }
    finally { setBusy(false); }
  };
  const delCategory = async (id: string) => {
    if (!window.confirm('刪除此類別？')) return;
    setBusy(true);
    try { await categoriesAPI.delete(id); await onChanged(); }
    catch (e: any) { alert(e.response?.data?.detail || '刪除失敗'); }
    finally { setBusy(false); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>品牌／類別管理</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
          <div>
            <h4>品牌</h4>
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <input value={newBrand} onChange={e => setNewBrand(e.target.value)} placeholder="新品牌名稱" />
              <button className="btn-save" disabled={busy} onClick={addBrand}>新增</button>
            </div>
            <ul style={{ listStyle: 'none', padding: 0 }}>
              {brands.map(b => (
                <li key={b.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0' }}>
                  <span>{b.name}</span>
                  <button className="btn-delete" disabled={busy} onClick={() => delBrand(b.id)}>刪除</button>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4>類別</h4>
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <input value={newCategory} onChange={e => setNewCategory(e.target.value)} placeholder="新類別名稱" />
              <button className="btn-save" disabled={busy} onClick={addCategory}>新增</button>
            </div>
            <ul style={{ listStyle: 'none', padding: 0 }}>
              {categories.map(c => (
                <li key={c.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0' }}>
                  <span>{c.name}</span>
                  <button className="btn-delete" disabled={busy} onClick={() => delCategory(c.id)}>刪除</button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminProducts;
