import React, { useMemo } from 'react';
import { formatPrice } from '../../utils';
import { ApiOrder } from './AdminDashboard';

// 未設定品牌的商品歸到這一類
export const NO_BRAND_KEY = '__none__';
const NO_BRAND_NAME = '未設定品牌';

export interface BrandShare {
  name: string;
  amount: number;
  quantity: number;
}

/**
 * 單筆訂單依品牌拆分營業額：商品金額扣除「按比例分攤」的訂單折扣（運費不計入品牌），
 * 各品牌加總 + 運費 = 訂單總額。
 */
export const brandSharesOfOrder = (order: ApiOrder): Map<string, BrandShare> => {
  const shares = new Map<string, BrandShare>();
  const subtotal = order.items.reduce((s, i) => s + i.price * i.quantity, 0);
  const discount = Math.min(order.discount || 0, subtotal);
  for (const item of order.items) {
    const line = item.price * item.quantity;
    const net = subtotal > 0 ? line - discount * (line / subtotal) : 0;
    const key = item.product?.brand?.id || NO_BRAND_KEY;
    const name = item.product?.brand?.name || NO_BRAND_NAME;
    const cur = shares.get(key) || { name, amount: 0, quantity: 0 };
    cur.amount += net;
    cur.quantity += item.quantity;
    shares.set(key, cur);
  }
  return shares;
};

interface Props {
  orders: ApiOrder[];
  selectedBrand: string | null;
  onSelect: (brandKey: string | null) => void;
}

const BrandRevenue: React.FC<Props> = ({ orders, selectedBrand, onSelect }) => {
  const { rows, shipping, total } = useMemo(() => {
    const map = new Map<string, BrandShare & { key: string; orderCount: number }>();
    let shippingSum = 0;
    let totalSum = 0;
    for (const o of orders) {
      shippingSum += o.shipping_fee || 0;
      totalSum += o.total_amount;
      brandSharesOfOrder(o).forEach((s, key) => {
        const cur = map.get(key) || { key, name: s.name, amount: 0, quantity: 0, orderCount: 0 };
        cur.amount += s.amount;
        cur.quantity += s.quantity;
        cur.orderCount += 1;
        map.set(key, cur);
      });
    }
    return {
      rows: Array.from(map.values()).sort((a, b) => b.amount - a.amount),
      shipping: shippingSum,
      total: totalSum,
    };
  }, [orders]);

  const max = Math.max(0, ...rows.map(r => r.amount));
  const pct = (v: number) => (total > 0 ? `${((v / total) * 100).toFixed(1)}%` : '—');

  return (
    <div className="revenue-chart-card brand-revenue-card">
      <div className="revenue-chart-head">
        <div>
          <h4>品牌營業額</h4>
          <span className="revenue-chart-sub">
            點選品牌可篩選上方趨勢圖・訂單折扣按比例分攤、運費另計・依商品目前所屬品牌
          </span>
        </div>
        {selectedBrand && (
          <button className="revenue-chart-link" onClick={() => onSelect(null)}>顯示全部品牌</button>
        )}
      </div>

      {rows.length === 0 ? (
        <p className="revenue-chart-empty">此區間沒有已完成的訂單</p>
      ) : (
        <div className="brand-revenue-list">
          {rows.map(r => (
            <button
              key={r.key}
              className={`brand-revenue-row ${selectedBrand === r.key ? 'active' : ''} ${selectedBrand && selectedBrand !== r.key ? 'dim' : ''}`}
              onClick={() => onSelect(selectedBrand === r.key ? null : r.key)}
              aria-pressed={selectedBrand === r.key}
            >
              <span className="brand-revenue-name">{r.name}</span>
              <span className="brand-revenue-bar">
                <span style={{ width: max > 0 ? `${(r.amount / max) * 100}%` : 0 }} />
              </span>
              <span className="brand-revenue-amount">{formatPrice(Math.round(r.amount))}</span>
              <span className="brand-revenue-meta">{pct(r.amount)}・{r.quantity} 件・{r.orderCount} 筆</span>
            </button>
          ))}
          <div className="brand-revenue-row static">
            <span className="brand-revenue-name">運費</span>
            <span className="brand-revenue-bar" />
            <span className="brand-revenue-amount">{formatPrice(Math.round(shipping))}</span>
            <span className="brand-revenue-meta">{pct(shipping)}</span>
          </div>
          <div className="brand-revenue-row static total">
            <span className="brand-revenue-name">合計</span>
            <span className="brand-revenue-bar" />
            <span className="brand-revenue-amount">{formatPrice(Math.round(total))}</span>
            <span className="brand-revenue-meta" />
          </div>
        </div>
      )}
    </div>
  );
};

export default BrandRevenue;
