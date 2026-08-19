import React, { useEffect, useState, useCallback } from 'react';
import { formatDate } from '../../utils';
import api from '../../services/api';

interface AuditLog {
  id: number;
  actor_id?: string | null;
  actor_name?: string | null;
  action: string;
  target_type: string;
  target_id?: string | null;
  summary?: string | null;
  before?: Record<string, any> | null;
  after?: Record<string, any> | null;
  created_at: string;
}

const ACTION_TEXT: Record<string, string> = {
  USER_CREATE: '建立帳號',
  USER_RESET_PASSWORD: '重設密碼',
  USER_UPDATE: '帳號異動',
  PRODUCT_CREATE: '新增商品',
  PRODUCT_UPDATE: '商品異動',
  PRODUCT_DELETE: '刪除商品',
  SKU_CREATE: '新增規格',
  SKU_UPDATE: '價格/庫存異動',
  SKU_DELETE: '刪除規格',
  ORDER_VERIFY: '訂單核對',
  ORDER_STATUS_CHANGE: '訂單狀態',
  ORDER_CANCEL: '取消訂單',
};

const TARGET_FILTERS = [
  { key: '', label: '全部' },
  { key: 'order', label: '訂單' },
  { key: 'product', label: '商品' },
  { key: 'sku', label: '規格/庫存' },
  { key: 'user', label: '帳號' },
];

const PAGE_SIZE = 30;

const AdminAuditLogs: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [targetType, setTargetType] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: any = { limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE };
      if (targetType) params.target_type = targetType;
      if (search.trim()) params.q = search.trim();
      const res = await api.get('/admin/audit-logs', { params });
      setLogs(res.data.items);
      setTotal(res.data.total);
    } catch (err: any) {
      setError(err.response?.data?.detail || '無法載入操作紀錄');
    } finally {
      setLoading(false);
    }
  }, [targetType, search, page]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);
  useEffect(() => { setPage(1); }, [targetType, search]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const hasDiff = (log: AuditLog) =>
    (log.before && Object.keys(log.before).length > 0) ||
    (log.after && Object.keys(log.after).length > 0);

  return (
    <div className="admin-products">
      <div className="products-header">
        <h2>操作紀錄</h2>
        <span className="profile-section-desc">重要操作留存 3 個月，逾期自動清理</span>
      </div>

      <div className="orders-toolbar">
        <div className="status-filter-chips">
          {TARGET_FILTERS.map(f => (
            <button
              key={f.key}
              className={`filter-chip ${targetType === f.key ? 'active' : ''}`}
              onClick={() => setTargetType(f.key)}
            >
              {f.label}
            </button>
          ))}
        </div>
        <input
          className="orders-search"
          type="text"
          placeholder="搜尋摘要 / 對象編號 / 操作者"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="empty-orders"><p>載入中...</p></div>
      ) : error ? (
        <div className="empty-orders">
          <p style={{ color: '#e74c3c' }}>{error}</p>
          <button onClick={fetchLogs} style={{ marginTop: 12, padding: '8px 16px', cursor: 'pointer' }}>重新載入</button>
        </div>
      ) : logs.length === 0 ? (
        <div className="empty-orders"><p>沒有符合條件的紀錄</p></div>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th style={{ width: 150 }}>時間</th>
                <th style={{ width: 90 }}>操作者</th>
                <th style={{ width: 130 }}>動作</th>
                <th>內容</th>
                <th style={{ width: 80 }}></th>
              </tr>
            </thead>
            <tbody>
              {logs.map(log => (
                <React.Fragment key={log.id}>
                  <tr>
                    <td style={{ whiteSpace: 'nowrap', fontSize: 13 }}>{formatDate(log.created_at)}</td>
                    <td>{log.actor_name || '—'}</td>
                    <td><span className="category-badge">{ACTION_TEXT[log.action] || log.action}</span></td>
                    <td style={{ fontSize: 13 }}>{log.summary || '—'}</td>
                    <td>
                      {hasDiff(log) && (
                        <button
                          className="btn-edit"
                          onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}
                        >
                          {expandedId === log.id ? '收合' : '差異'}
                        </button>
                      )}
                    </td>
                  </tr>
                  {expandedId === log.id && hasDiff(log) && (
                    <tr className="audit-diff-row">
                      <td colSpan={5}>
                        <div className="audit-diff">
                          {log.before && Object.keys(log.before).length > 0 && (
                            <div className="audit-diff-col audit-diff-before">
                              <h5>異動前</h5>
                              <pre>{JSON.stringify(log.before, null, 2)}</pre>
                            </div>
                          )}
                          {log.after && Object.keys(log.after).length > 0 && (
                            <div className="audit-diff-col audit-diff-after">
                              <h5>異動後</h5>
                              <pre>{JSON.stringify(log.after, null, 2)}</pre>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {total > 0 && (
        <div className="orders-pagination">
          <span className="pagination-summary">
            共 {total} 筆 · 第 {page} / {totalPages} 頁
          </span>
          {totalPages > 1 && (
            <div className="pagination-controls">
              <button className="page-btn" disabled={page === 1} onClick={() => setPage(page - 1)}>上一頁</button>
              <button className="page-btn" disabled={page === totalPages} onClick={() => setPage(page + 1)}>下一頁</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminAuditLogs;
