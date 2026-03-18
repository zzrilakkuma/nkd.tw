import React, { useState, useEffect } from 'react';
import '../styles/age-verification.css';

const AgeVerification: React.FC = () => {
  const [visible, setVisible] = useState(false);
  const [denied, setDenied] = useState(false);

  useEffect(() => {
    const verified = localStorage.getItem('age_verified');
    if (!verified) {
      setVisible(true);
      document.body.style.overflow = 'hidden';
    }
  }, []);

  const handleConfirm = () => {
    localStorage.setItem('age_verified', 'true');
    document.body.style.overflow = '';
    setVisible(false);
  };

  const handleDeny = () => {
    setDenied(true);
  };

  if (!visible) return null;

  return (
    <div className="age-overlay">
      <div className="age-modal">
        {!denied ? (
          <>
            <div className="age-icon">🔞</div>
            <h2 className="age-title">年齡確認</h2>
            <p className="age-desc">
              本網站販售水煙相關產品<br />
              依法僅限 <strong>20 歲以上</strong> 成年人瀏覽
            </p>
            <p className="age-sub">請確認您的年齡以繼續</p>
            <div className="age-actions">
              <button className="age-btn age-btn-confirm" onClick={handleConfirm}>
                我已滿 20 歲
              </button>
              <button className="age-btn age-btn-deny" onClick={handleDeny}>
                我未滿 20 歲
              </button>
            </div>
            <p className="age-legal">
              點擊「我已滿 20 歲」即表示您確認已達法定年齡
            </p>
          </>
        ) : (
          <>
            <div className="age-icon">🚫</div>
            <h2 className="age-title">無法進入</h2>
            <p className="age-desc">
              很抱歉，本網站僅限 20 歲以上成年人瀏覽<br />
              請離開此頁面
            </p>
          </>
        )}
      </div>
    </div>
  );
};

export default AgeVerification;
