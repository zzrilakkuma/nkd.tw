import { DeliveryMethod } from '../types';

// 前端顯示用的預設運費（需與後端 config.default_shipping_fees 一致；實際金額以後端為準）
export const DEFAULT_SHIPPING_FEE: Record<string, number> = {
  home_delivery: 100,
  cvs_711: 60,
  self_pickup: 0,
};

export const DELIVERY_LABEL: Record<string, string> = {
  home_delivery: '黑貓宅配',
  cvs_711: '7-ELEVEN 取貨',
  self_pickup: '自取',
};

export const DELIVERY_OPTIONS = [
  { value: DeliveryMethod.HOME_DELIVERY, label: '黑貓宅配' },
  { value: DeliveryMethod.CVS_711, label: '7-ELEVEN 取貨' },
  { value: DeliveryMethod.SELF_PICKUP, label: '自取' },
];

export const deliveryLabel = (m?: string) => (m ? DELIVERY_LABEL[m] || m : '—');
