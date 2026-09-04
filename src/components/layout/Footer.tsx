import React from 'react';
import { Link } from 'react-router-dom';

const Footer: React.FC = () => {
  const currentUser = JSON.parse(localStorage.getItem('user') || 'null');

  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-content">
          <div className="footer-section footer-brand">
            <img src="/nkd-logo.png" alt="NKD" className="footer-logo" />
            <h3>NKD Wholesale Platform</h3>
            <p>為經銷合作店家提供穩定供應與完整產品支援之訂貨平台</p>
          </div>

          <div className="footer-section">
            <h4>快速連結</h4>
            <ul>
              <li><Link to="/">首頁</Link></li>
              <li><Link to="/contact">聯絡我們</Link></li>
              {!currentUser && (
                <li><Link to="/login">經銷商登入</Link></li>
              )}
            </ul>
          </div>

          <div className="footer-section">
            <h4>聯繫方式</h4>
            <ul>
              <li>
                <a href="mailto:nkdtwcoltd@gmail.com">nkdtwcoltd@gmail.com</a>
              </li>
              <li>
                <a
                  href="https://www.instagram.com/nkd_co.ltd_?igsi=bzJhcHQ1OWxhOXhm&utm_source=qr"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Instagram @nkd_co.ltd_
                </a>
              </li>
              <li>出貨時間：每週一、三、五</li>
            </ul>
          </div>
        </div>

        <div className="footer-warnings">
          <p>吸菸有害健康，戒菸可減少對健康的危害</p>
          <p>依法拒售，未滿20歲依法禁止吸菸</p>
        </div>

        <div className="footer-bottom">
          <p>&copy; {new Date().getFullYear()} NKD Wholesale Platform. 版權所有.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
