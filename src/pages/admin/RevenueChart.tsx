import React, { useMemo, useState } from 'react';
import { formatPrice } from '../../utils';

export interface RevenuePoint {
  /** ISO 時間（完成日期） */
  at: string;
  amount: number;
}

type Granularity = 'day' | 'week' | 'month';

interface Props {
  points: RevenuePoint[];
  /** YYYY-MM-DD，空字串代表不限 */
  dateFrom: string;
  dateTo: string;
  onClose: () => void;
}

const toYMD = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};
const parseYMD = (s: string) => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
};
const startOfWeek = (d: Date) => {
  // 週一為一週開始
  const r = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const dow = (r.getDay() + 6) % 7;
  r.setDate(r.getDate() - dow);
  return r;
};
const bucketStart = (d: Date, g: Granularity) => {
  if (g === 'day') return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  if (g === 'week') return startOfWeek(d);
  return new Date(d.getFullYear(), d.getMonth(), 1);
};
const nextBucket = (d: Date, g: Granularity) => {
  const r = new Date(d);
  if (g === 'day') r.setDate(r.getDate() + 1);
  else if (g === 'week') r.setDate(r.getDate() + 7);
  else r.setMonth(r.getMonth() + 1);
  return r;
};
const bucketLabel = (d: Date, g: Granularity, short: boolean) => {
  const m = d.getMonth() + 1;
  const day = d.getDate();
  if (g === 'month') return short ? `${d.getFullYear()}/${m}` : `${d.getFullYear()} 年 ${m} 月`;
  if (g === 'week') {
    const end = new Date(d); end.setDate(end.getDate() + 6);
    return short ? `${m}/${day}` : `${m}/${day} ～ ${end.getMonth() + 1}/${end.getDate()} 那週`;
  }
  return short ? `${m}/${day}` : `${d.getFullYear()}/${m}/${day}`;
};

// Y 軸刻度：取整潔的級距（1 / 2 / 5 × 10^n），4～6 格
const niceTicks = (max: number) => {
  if (max <= 0) return [0];
  const rough = max / 4;
  const pow = Math.pow(10, Math.floor(Math.log10(rough)));
  const step = [1, 2, 5, 10].map(k => k * pow).find(s => s >= rough) || pow * 10;
  const ticks: number[] = [];
  for (let v = 0; v <= max + step * 0.999; v += step) ticks.push(v);
  return ticks;
};

const RevenueChart: React.FC<Props> = ({ points, dateFrom, dateTo, onClose }) => {
  // 依區間長度自動選粒度；使用者可再手動切換
  const autoGranularity: Granularity = useMemo(() => {
    const times = points.map(p => new Date(p.at).getTime());
    const from = dateFrom ? parseYMD(dateFrom).getTime() : (times.length ? Math.min(...times) : Date.now());
    const to = dateTo ? parseYMD(dateTo).getTime() : (times.length ? Math.max(...times) : Date.now());
    const days = Math.max(1, Math.round((to - from) / 86400000) + 1);
    if (days <= 45) return 'day';
    if (days <= 200) return 'week';
    return 'month';
  }, [points, dateFrom, dateTo]);

  const [granularityOverride, setGranularityOverride] = useState<Granularity | null>(null);
  const granularity = granularityOverride ?? autoGranularity;
  const [showTable, setShowTable] = useState(false);
  const [hover, setHover] = useState<number | null>(null);

  // 把區間切成連續的 bucket（沒有訂單的期間補 0，才不會把空檔藏起來）
  const buckets = useMemo(() => {
    const times = points.map(p => new Date(p.at).getTime());
    if (!times.length && !dateFrom && !dateTo) return [] as { start: Date; amount: number; count: number }[];
    const rawFrom = dateFrom ? parseYMD(dateFrom) : new Date(Math.min(...times));
    const rawTo = dateTo ? parseYMD(dateTo) : new Date(Math.max(...times));
    const first = bucketStart(rawFrom, granularity);
    const last = bucketStart(rawTo, granularity);
    const list: { start: Date; amount: number; count: number }[] = [];
    for (let cur = first; cur <= last && list.length < 400; cur = nextBucket(cur, granularity)) {
      list.push({ start: cur, amount: 0, count: 0 });
    }
    const index = new Map(list.map((b, i) => [toYMD(b.start), i]));
    for (const p of points) {
      const key = toYMD(bucketStart(new Date(p.at), granularity));
      const i = index.get(key);
      if (i !== undefined) { list[i].amount += p.amount; list[i].count += 1; }
    }
    return list;
  }, [points, dateFrom, dateTo, granularity]);

  const total = buckets.reduce((s, b) => s + b.amount, 0);
  const count = buckets.reduce((s, b) => s + b.count, 0);
  const max = Math.max(0, ...buckets.map(b => b.amount));
  const maxIndex = buckets.findIndex(b => b.amount === max && max > 0);
  const ticks = niceTicks(max);
  const yMax = ticks[ticks.length - 1] || 1;

  // 版面（SVG 以 viewBox 縮放）
  const W = 720, H = 240;
  const PAD = { top: 20, right: 12, bottom: 28, left: 56 };
  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;
  const n = buckets.length;
  const slot = n ? plotW / n : plotW;
  const barW = Math.min(24, Math.max(2, slot - 2));
  const yOf = (v: number) => PAD.top + plotH - (v / yMax) * plotH;
  const xOf = (i: number) => PAD.left + i * slot + (slot - barW) / 2;

  // X 軸標籤：最多約 8 個，避免重疊
  const labelEvery = Math.max(1, Math.ceil(n / 8));

  const granularityOptions: [Granularity, string][] = [['day', '日'], ['week', '週'], ['month', '月']];

  return (
    <div className="revenue-chart-card">
      <div className="revenue-chart-head">
        <div>
          <h4>已完成營收趨勢</h4>
          <span className="revenue-chart-sub">
            合計 {formatPrice(total)}・{count} 筆・依完成日期
          </span>
        </div>
        <div className="revenue-chart-controls">
          <div className="revenue-chart-seg" role="group" aria-label="時間粒度">
            {granularityOptions.map(([g, label]) => (
              <button
                key={g}
                className={granularity === g ? 'active' : ''}
                onClick={() => setGranularityOverride(g)}
              >
                {label}
              </button>
            ))}
          </div>
          <button className="revenue-chart-link" onClick={() => setShowTable(v => !v)}>
            {showTable ? '看圖表' : '看數字表'}
          </button>
          <button className="revenue-chart-close" onClick={onClose} aria-label="關閉圖表">×</button>
        </div>
      </div>

      {n === 0 ? (
        <p className="revenue-chart-empty">此區間沒有已完成的訂單</p>
      ) : showTable ? (
        <div className="revenue-table-wrap">
          <table className="revenue-table">
            <thead>
              <tr><th>期間</th><th>筆數</th><th>營收</th></tr>
            </thead>
            <tbody>
              {buckets.map((b, i) => (
                <tr key={i} className={b.amount === 0 ? 'zero' : ''}>
                  <td>{bucketLabel(b.start, granularity, false)}</td>
                  <td>{b.count}</td>
                  <td>{formatPrice(b.amount)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr><td>合計</td><td>{count}</td><td>{formatPrice(total)}</td></tr>
            </tfoot>
          </table>
        </div>
      ) : (
        <div className="revenue-chart-plot" onMouseLeave={() => setHover(null)}>
          <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="已完成營收長條圖">
            {/* 格線 + Y 軸刻度 */}
            {ticks.map(t => (
              <g key={t}>
                <line x1={PAD.left} x2={W - PAD.right} y1={yOf(t)} y2={yOf(t)} className="rc-grid" />
                <text x={PAD.left - 8} y={yOf(t)} className="rc-tick" textAnchor="end" dominantBaseline="middle">
                  {t.toLocaleString()}
                </text>
              </g>
            ))}
            {/* 基準線 */}
            <line x1={PAD.left} x2={W - PAD.right} y1={yOf(0)} y2={yOf(0)} className="rc-baseline" />

            {/* 長條：頂端 4px 圓角、底部貼齊基準線 */}
            {buckets.map((b, i) => {
              const x = xOf(i);
              const y = yOf(b.amount);
              const h = Math.max(0, yOf(0) - y);
              const r = Math.min(4, barW / 2, h);
              const path = h <= 0
                ? ''
                : `M${x},${yOf(0)} V${y + r} Q${x},${y} ${x + r},${y} H${x + barW - r} Q${x + barW},${y} ${x + barW},${y + r} V${yOf(0)} Z`;
              return (
                <g key={i}>
                  {h > 0 && (
                    <path d={path} className={`rc-bar ${hover === i ? 'hover' : ''}`} />
                  )}
                  {/* 命中區比長條大，整個 slot 都可 hover */}
                  <rect
                    x={PAD.left + i * slot} y={PAD.top} width={slot} height={plotH}
                    fill="transparent"
                    onMouseEnter={() => setHover(i)}
                    onFocus={() => setHover(i)}
                    tabIndex={0}
                    aria-label={`${bucketLabel(b.start, granularity, false)}：${formatPrice(b.amount)}，${b.count} 筆`}
                  />
                </g>
              );
            })}

            {/* 只標最高的一根 */}
            {maxIndex >= 0 && hover === null && (
              <text
                x={xOf(maxIndex) + barW / 2} y={yOf(max) - 6}
                className="rc-label" textAnchor="middle"
              >
                {formatPrice(max)}
              </text>
            )}

            {/* X 軸標籤 */}
            {buckets.map((b, i) => (
              i % labelEvery === 0 || i === n - 1 ? (
                <text key={i} x={xOf(i) + barW / 2} y={H - 8} className="rc-tick" textAnchor="middle">
                  {bucketLabel(b.start, granularity, true)}
                </text>
              ) : null
            ))}
          </svg>

          {hover !== null && buckets[hover] && (
            <div
              className="rc-tooltip"
              style={{
                left: `${((xOf(hover) + barW / 2) / W) * 100}%`,
                top: `${(yOf(buckets[hover].amount) / H) * 100}%`,
              }}
            >
              <strong>{formatPrice(buckets[hover].amount)}</strong>
              <span>{bucketLabel(buckets[hover].start, granularity, false)}・{buckets[hover].count} 筆</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default RevenueChart;
