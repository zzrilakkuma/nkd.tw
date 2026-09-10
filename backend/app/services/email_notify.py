"""訂單 Email 通知（Resend）。

設計原則：
  - 寄信一律走 FastAPI BackgroundTasks（或逾期掃描的背景執行緒），不阻塞 API 回應。
  - 寄信失敗只記 log，絕不影響訂單流程。
  - 信件內容在 DB session 仍開啟時先快照成 dict，背景執行時不再碰 ORM。
"""
import logging
from typing import Optional

import httpx

from app.core.config import settings
from app.models.order import Order, OrderStatus

logger = logging.getLogger("email_notify")

RESEND_API_URL = "https://api.resend.com/emails"

# 各狀態通知客戶的（主旨、說明文字）
_STATUS_MESSAGES = {
    OrderStatus.PENDING_REVIEW.value: (
        "訂單已成立，等待核對",
        "我們已收到您的訂單，將盡快核對品項與運費。核對完成後會再以 Email 通知您付款。",
    ),
    OrderStatus.PENDING_PAYMENT.value: (
        "運費已核對，請於期限內完成付款",
        "您的訂單已完成核對，請於付款期限前完成轉帳，並回到網站訂單頁填寫帳號末五碼。",
    ),
    OrderStatus.PENDING_CONFIRM.value: (
        "已收到您的付款資訊，確認入帳中",
        "我們已收到您提交的轉帳資訊，將盡快核對入帳，確認後即為您準備出貨。",
    ),
    OrderStatus.PREPARING.value: (
        "已確認收款，訂單準備出貨",
        "您的款項已確認入帳，我們正在為您準備出貨。",
    ),
    OrderStatus.COMPLETED.value: (
        "訂單已完成",
        "您的訂單已完成，感謝您的購買！",
    ),
    OrderStatus.CANCELLED.value: (
        "訂單已取消",
        "您的訂單已取消。若有疑問，直接回覆此信即可與我們聯繫。",
    ),
    OrderStatus.EXPIRED.value: (
        "訂單已逾期取消",
        "由於超過付款期限，您的訂單已自動取消。如仍需訂購，請重新下單，或回覆此信與我們聯繫。",
    ),
}

_DELIVERY_LABELS = {
    "home_delivery": "黑貓宅配",
    "cvs_711": "7-ELEVEN 取貨",
    "self_pickup": "自取",
}


def snapshot_order(order: Order) -> dict:
    """在 session 開啟時把寄信需要的資料快照成純 dict。"""
    items = []
    for i in order.items:
        name = i.product.name if i.product else i.product_id
        spec = getattr(i.sku, "spec", None) if i.sku else None
        items.append({
            "name": f"{name}（{spec}）" if spec else name,
            "quantity": i.quantity,
            "price": i.price or 0,
        })
    return {
        "id": order.id,
        "status": order.status,
        "customer_email": order.user.email if order.user else None,
        "customer_name": (order.shipping_info or {}).get("name", ""),
        "delivery_method": _DELIVERY_LABELS.get(order.delivery_method or "", order.delivery_method or ""),
        "subtotal": order.subtotal or 0,
        "discount": order.discount or 0,
        "shipping_fee": order.shipping_fee or 0,
        "total_amount": order.total_amount or 0,
        "payment_deadline": order.payment_deadline.strftime("%Y-%m-%d %H:%M（UTC）") if order.payment_deadline else None,
        "payment_last5": (order.payment_info or {}).get("last5Digits"),
        "items": items,
    }


def _site_url() -> str:
    return (settings.allowed_origins or ["https://nkd.tw"])[0]


def _render_customer_html(snap: dict, status: str, intro: str) -> str:
    rows = "".join(
        f"<tr><td style='padding:6px 12px;border-bottom:1px solid #eee'>{i['name']}</td>"
        f"<td style='padding:6px 12px;border-bottom:1px solid #eee;text-align:center'>{i['quantity']}</td>"
        f"<td style='padding:6px 12px;border-bottom:1px solid #eee;text-align:right'>NT$ {i['price']:,.0f}</td></tr>"
        for i in snap["items"]
    )
    deadline_html = ""
    if status == OrderStatus.PENDING_PAYMENT.value and snap.get("payment_deadline"):
        deadline_html = (
            f"<p style='color:#b8860b;font-weight:bold'>付款期限：{snap['payment_deadline']}，"
            "逾期訂單將自動取消。</p>"
        )
    discount_html = (
        f"<tr><td colspan='2' style='padding:4px 12px;text-align:right'>折扣</td>"
        f"<td style='padding:4px 12px;text-align:right'>-NT$ {snap['discount']:,.0f}</td></tr>"
        if snap["discount"] else ""
    )
    return f"""
<div style="font-family:'Helvetica Neue',Arial,'Microsoft JhengHei',sans-serif;max-width:560px;margin:0 auto;color:#222">
  <div style="background:#111;color:#d4af37;padding:16px 24px;border-radius:8px 8px 0 0">
    <h2 style="margin:0;font-size:18px">NKD 訂單通知</h2>
  </div>
  <div style="border:1px solid #eee;border-top:none;padding:24px;border-radius:0 0 8px 8px">
    <p>{snap['customer_name'] or '您好'}，</p>
    <p>{intro}</p>
    {deadline_html}
    <p style="margin-bottom:4px"><strong>訂單編號：</strong>{snap['id']}　<strong>配送方式：</strong>{snap['delivery_method']}</p>
    <table style="border-collapse:collapse;width:100%;font-size:14px">
      <tr style="background:#f7f7f7">
        <th style="padding:6px 12px;text-align:left">品項</th>
        <th style="padding:6px 12px;text-align:center">數量</th>
        <th style="padding:6px 12px;text-align:right">單價</th>
      </tr>
      {rows}
      <tr><td colspan="2" style="padding:8px 12px 4px;text-align:right">小計</td>
          <td style="padding:8px 12px 4px;text-align:right">NT$ {snap['subtotal']:,.0f}</td></tr>
      {discount_html}
      <tr><td colspan="2" style="padding:4px 12px;text-align:right">運費</td>
          <td style="padding:4px 12px;text-align:right">NT$ {snap['shipping_fee']:,.0f}</td></tr>
      <tr><td colspan="2" style="padding:4px 12px;text-align:right;font-weight:bold">總計</td>
          <td style="padding:4px 12px;text-align:right;font-weight:bold">NT$ {snap['total_amount']:,.0f}</td></tr>
    </table>
    <p style="margin-top:20px">
      <a href="{_site_url()}/orders" style="background:#d4af37;color:#111;text-decoration:none;padding:10px 20px;border-radius:6px;font-weight:bold">
        查看訂單
      </a>
    </p>
    <p style="color:#888;font-size:12px;margin-top:24px">此信由系統自動發送，直接回覆即可與我們聯繫。</p>
  </div>
</div>
"""


def _send(to: str, subject: str, html: str) -> None:
    """實際呼叫 Resend API。失敗只記 log，不拋出例外。"""
    if not settings.RESEND_API_KEY:
        logger.warning("RESEND_API_KEY 未設定，略過寄信：%s", subject)
        return
    if not to:
        logger.warning("收件人為空，略過寄信：%s", subject)
        return
    try:
        resp = httpx.post(
            RESEND_API_URL,
            headers={"Authorization": f"Bearer {settings.RESEND_API_KEY}"},
            json={
                "from": settings.MAIL_FROM,
                "to": [to],
                **({"reply_to": settings.MAIL_REPLY_TO} if settings.MAIL_REPLY_TO else {}),
                "subject": subject,
                "html": html,
            },
            timeout=15,
        )
        if resp.status_code >= 400:
            logger.error("Resend 寄信失敗（%s）：%s %s", subject, resp.status_code, resp.text)
    except Exception:
        logger.exception("Resend 寄信例外（%s）", subject)


def send_status_email(snap: dict, extra_admin_note: Optional[str] = None) -> None:
    """依快照的狀態寄客戶通知；extra_admin_note 有值時同時通知店家。

    設計為可直接丟進 BackgroundTasks 的純函式（不碰 ORM / DB session）。
    """
    status = snap["status"]
    msg = _STATUS_MESSAGES.get(status)
    if msg:
        subject, intro = msg
        _send(
            snap.get("customer_email"),
            f"【NKD】{subject}（訂單 {snap['id']}）",
            _render_customer_html(snap, status, intro),
        )
    if extra_admin_note and settings.ADMIN_NOTIFY_EMAIL:
        last5 = f"，帳號末五碼：{snap['payment_last5']}" if snap.get("payment_last5") else ""
        _send(
            settings.ADMIN_NOTIFY_EMAIL,
            f"【NKD 後台】{extra_admin_note}（訂單 {snap['id']}）",
            f"""
<div style="font-family:Arial,'Microsoft JhengHei',sans-serif;max-width:560px">
  <p>{extra_admin_note}{last5}</p>
  <p>訂單編號：{snap['id']}<br>
     客戶：{snap['customer_name']}（{snap.get('customer_email') or '無 Email'}）<br>
     配送方式：{snap['delivery_method']}<br>
     總金額：NT$ {snap['total_amount']:,.0f}</p>
  <p><a href="{_site_url()}/admin">前往後台處理</a></p>
</div>
""",
        )
