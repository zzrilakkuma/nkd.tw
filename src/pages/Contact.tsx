import React from 'react';

/**
 * Contact Us 頁面（骨架版）。
 * 內容待與業主確認：聯絡電話 / LINE 官方帳號 / Email / 營業時間 / 地址等。
 * ContactContent 另供未登入首頁（RestrictedLanding）嵌入使用。
 */
const ContactIcon: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <svg
    className="contact-icon"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-label={label}
    role="img"
  >
    {children}
  </svg>
);

export const ContactContent: React.FC = () => {
  return (
    <>
      <h1>聯絡我們</h1>
        <p className="contact-intro">
          NKD Wholesale Platform 為經銷合作店家提供穩定供應與完整產品支援。
          合作洽詢或訂單問題，歡迎透過以下方式與我們聯繫。
        </p>

        <div className="contact-cards">
          <div className="contact-card">
            <div className="contact-card-icon">
              <ContactIcon label="LINE">
                <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
              </ContactIcon>
            </div>
            <h3>LINE 官方帳號</h3>
            <p className="contact-card-value">（待補：LINE ID / QR Code）</p>
            <p className="contact-card-desc">訂單核對與日常聯繫主要管道</p>
          </div>

          <div className="contact-card">
            <div className="contact-card-icon">
              <ContactIcon label="Instagram">
                <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
              </ContactIcon>
            </div>
            <h3>Instagram</h3>
            <p className="contact-card-value">
              <a
                href="https://www.instagram.com/nkd_co.ltd_?igsi=bzJhcHQ1OWxhOXhm&utm_source=qr"
                target="_blank"
                rel="noopener noreferrer"
              >
                @nkd_co.ltd_
              </a>
            </p>
            <p className="contact-card-desc">追蹤最新商品與活動資訊</p>
          </div>

          <div className="contact-card">
            <div className="contact-card-icon">
              <ContactIcon label="Email">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <polyline points="22,6 12,13 2,6" />
              </ContactIcon>
            </div>
            <h3>Email</h3>
            <p className="contact-card-value">
              <a href="mailto:nkdtwcoltd@gmail.com">nkdtwcoltd@gmail.com</a>
            </p>
            <p className="contact-card-desc">合作提案與一般詢問</p>
          </div>

          <div className="contact-card">
            <div className="contact-card-icon">
              <ContactIcon label="出貨時間">
                <rect x="1" y="3" width="15" height="13" />
                <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
                <circle cx="5.5" cy="18.5" r="2.5" />
                <circle cx="18.5" cy="18.5" r="2.5" />
              </ContactIcon>
            </div>
            <h3>出貨時間</h3>
            <p className="contact-card-value">每週一、三、五</p>
            <p className="contact-card-desc">非出貨日之訂單將於最近出貨日安排出貨</p>
          </div>
        </div>

      <p className="contact-note">
        ※ 本平台僅服務經核准之經銷合作店家，如需開通帳號請先與我們聯繫。
      </p>
    </>
  );
};

const Contact: React.FC = () => {
  return (
    <div className="contact-page">
      <div className="container">
        <ContactContent />
      </div>
    </div>
  );
};

export default Contact;
