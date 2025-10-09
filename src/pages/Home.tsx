import React from 'react';
import { Link } from 'react-router-dom';
import { motion, useScroll, useTransform, useSpring } from 'framer-motion';

const Home: React.FC = () => {
  const { scrollYProgress } = useScroll();

  // Hero parallax effects with spring for smooth animation
  const heroY = useSpring(
    useTransform(scrollYProgress, [0, 0.5], [0, 300]),
    { stiffness: 100, damping: 30, restDelta: 0.001 }
  );

  const heroOpacity = useSpring(
    useTransform(scrollYProgress, [0, 0.3], [1, 0]),
    { stiffness: 100, damping: 30, restDelta: 0.001 }
  );

  return (
    <div className="home">
      <section className="hero">
        <div className="smoke-particles">
          {[...Array(20)].map((_, i) => (
            <motion.div
              key={i}
              className="smoke-particle"
              initial={{ bottom: -150, opacity: 0 }}
              animate={{
                bottom: ['100%'],
                opacity: [0, 0.6, 0.4, 0],
                x: [0, 100, -50],
                scale: [1, 1.5, 2],
              }}
              transition={{
                duration: 15 + Math.random() * 10,
                delay: Math.random() * 10,
                repeat: Infinity,
                ease: 'linear',
              }}
              style={{
                left: `${Math.random() * 100}%`,
              }}
            />
          ))}
        </div>
        <motion.div
          className="hero-content"
          style={{ y: heroY, opacity: heroOpacity }}
        >
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.2 }}
          >
            NKD.tw
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.4 }}
          >
            精選頂級水煙產品 · 極致品味體驗
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.6 }}
          >
            <Link to="/products" className="cta-button">
              探索商品
            </Link>
          </motion.div>
        </motion.div>
      </section>

      <motion.section
        className="features"
        initial={{ opacity: 0, y: 50 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
      >
        <div className="container">
          <motion.h2
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            為什麼選擇我們？
          </motion.h2>
          <div className="features-grid">
            {[
              { title: '優質產品', desc: '精選全球知名品牌，保證品質與口感' },
              { title: '快速配送', desc: '專業包裝，快速安全送達' },
              { title: '專業服務', desc: '專業客服團隊，為您提供最佳服務' },
            ].map((feature, i) => (
              <motion.div
                key={feature.title}
                className="feature"
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.5 }}
                transition={{ duration: 0.6, delay: i * 0.15 }}
                whileHover={{ y: -12, transition: { duration: 0.3 } }}
              >
                <h3>{feature.title}</h3>
                <p>{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.section>

      <motion.section
        className="popular-products"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{ duration: 0.8 }}
      >
        <div className="container">
          <motion.h2
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            熱門商品
          </motion.h2>
          <div className="products-preview">
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.3 }}
            >
              探索我們最受歡迎的水煙產品
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.4 }}
            >
              <Link to="/products" className="view-all-link">
                查看所有商品 →
              </Link>
            </motion.div>
          </div>
        </div>
      </motion.section>
    </div>
  );
};

export default Home;