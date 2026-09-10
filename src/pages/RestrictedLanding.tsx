import React from 'react';
import { Link } from 'react-router-dom';
import { ContactContent } from './Contact';

/**
 * 未登入時的首頁：主視覺 hero 疊加平台說明，並顯示聯絡我們內容。
 */
const RestrictedLanding: React.FC = () => {
  return (
    <div className="restricted-landing">
      <section className="restricted-hero">
        <img src="/banner/nkd-keyvisual.png" alt="NKD 主視覺" />
      </section>

      <section className="restricted-notice">
        <p className="restricted-text">
          本平台僅供完成資格審核之合作經銷商使用，提供經銷業務及訂單管理服務，不對一般消費者開放瀏覽、註冊或購買。
        </p>
        <Link to="/login" className="cta-button restricted-cta">
          經銷商登入
          <span className="cta-arrow" aria-hidden="true">→</span>
        </Link>
        <p className="restricted-cta-hint">尚無帳號？合作洽詢請參考下方聯繫方式</p>
      </section>

      <div className="container">
        <section className="restricted-contact">
          <p className="restricted-contact-lead">
            如有經銷合作需求，請透過以下方式與我們聯繫：
          </p>
          <ContactContent />
        </section>
      </div>
    </div>
  );
};

export default RestrictedLanding;
