import React from 'react';

/**
 * Contact Us 頁面（骨架版）。
 * 內容待與業主確認：聯絡電話 / LINE 官方帳號 / Email / 營業時間 / 地址等。
 */
const Contact: React.FC = () => {
  return (
    <div className="contact-page">
      <div className="container">
        <h1>聯絡我們</h1>
        <p className="contact-intro">
          NKD Wholesale Platform 為經銷合作店家提供穩定供應與完整產品支援。
          合作洽詢或訂單問題，歡迎透過以下方式與我們聯繫。
        </p>

        <div className="contact-cards">
          <div className="contact-card">
            <div className="contact-card-icon">💬</div>
            <h3>LINE 官方帳號</h3>
            <p className="contact-card-value">（待補：LINE ID / QR Code）</p>
            <p className="contact-card-desc">訂單核對與日常聯繫主要管道</p>
          </div>

          <div className="contact-card">
            <div className="contact-card-icon">📧</div>
            <h3>Email</h3>
            <p className="contact-card-value">（待補：聯絡信箱）</p>
            <p className="contact-card-desc">合作提案與一般詢問</p>
          </div>

          <div className="contact-card">
            <div className="contact-card-icon">🕐</div>
            <h3>服務時間</h3>
            <p className="contact-card-value">（待補：營業時間）</p>
            <p className="contact-card-desc">非服務時間之訊息將於下個工作日回覆</p>
          </div>
        </div>

        <p className="contact-note">
          ※ 本平台僅服務經核准之經銷合作店家，如需開通帳號請先與我們聯繫。
        </p>
      </div>
    </div>
  );
};

export default Contact;
