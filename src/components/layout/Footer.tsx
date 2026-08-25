import React from 'react';
import { Link } from 'react-router-dom';

const Footer: React.FC = () => {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-content">
          <div className="footer-section">
            <h3>NKD Wholesale Platform</h3>
            <p>為經銷合作店家提供穩定供應與完整產品支援之訂貨平台</p>
            <p className="footer-warning">吸菸有害健康，戒菸可減少對健康的危害</p>
            <p className="footer-warning">依法拒售，未滿20歲依法禁止吸菸</p>
          </div>

          <div className="footer-section footer-links">
            <Link to="/contact" className="footer-link">聯絡我們</Link>
          </div>
        </div>

        <div className="footer-bottom">
          <p>&copy; {new Date().getFullYear()} NKD Wholesale Platform. 版權所有.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
