import React from 'react';
import { Link } from 'react-router-dom';

const Home: React.FC = () => {
  return (
    <div className="home">
      <section className="hero">
        <div className="hero-content">
          <h1>歡迎來到水煙商城</h1>
          <p>精選優質水煙產品，為您帶來極致的享受體驗</p>
          <Link to="/products" className="cta-button">
            瀏覽商品
          </Link>
        </div>
      </section>

      <section className="features">
        <div className="container">
          <h2>為什麼選擇我們？</h2>
          <div className="features-grid">
            <div className="feature">
              <h3>優質產品</h3>
              <p>精選全球知名品牌，保證品質與口感</p>
            </div>
            <div className="feature">
              <h3>快速配送</h3>
              <p>專業包裝，快速安全送達</p>
            </div>
            <div className="feature">
              <h3>專業服務</h3>
              <p>專業客服團隊，為您提供最佳服務</p>
            </div>
          </div>
        </div>
      </section>

      <section className="popular-products">
        <div className="container">
          <h2>熱門商品</h2>
          <div className="products-preview">
            <p>探索我們最受歡迎的水煙產品</p>
            <Link to="/products" className="view-all-link">
              查看所有商品 →
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;