import React from 'react';

const Footer: React.FC = () => {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-content">
          <div className="footer-section">
            <h3>水煙商城</h3>
            <p>提供優質水煙產品，讓您享受最佳的水煙體驗</p>
          </div>

          <div className="footer-section">
            <h4>快速連結</h4>
            <ul>
              <li><a href="/products">商品目錄</a></li>
              <li><a href="/about">關於我們</a></li>
              <li><a href="/contact">聯絡我們</a></li>
            </ul>
          </div>

          <div className="footer-section">
            <h4>客服資訊</h4>
            <p>電話: 02-1234-5678</p>
            <p>Email: service@hookah-store.com</p>
            <p>營業時間: 週一至週日 10:00-22:00</p>
          </div>
        </div>

        <div className="footer-bottom">
          <p>&copy; 2024 水煙商城. 版權所有.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;