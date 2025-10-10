import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { Link, useNavigate } from 'react-router-dom';
import { LoginForm } from '../../types';
import { authAPI } from '../../services/api';

const schema = yup.object({
  email: yup.string().email('請輸入有效的電子郵件').required('電子郵件為必填'),
  password: yup.string().min(6, '密碼至少需要 6 個字元').required('密碼為必填')
});

const Login: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
    setError
  } = useForm<LoginForm>({
    resolver: yupResolver(schema)
  });

  const onSubmit = async (data: LoginForm) => {
    setLoading(true);
    try {
      const response = await authAPI.login(data);

      // 儲存使用者資訊和 token（轉換命名格式）
      const userData = {
        id: response.user.id,
        email: response.user.email,
        username: response.user.username,
        isAdmin: response.user.is_admin,  // 轉換為駝峰命名
        token: response.access_token
      };
      localStorage.setItem('user', JSON.stringify(userData));

      navigate('/');
    } catch (error: any) {
      console.error('Login error:', error);
      const errorMessage = error.response?.data?.detail || '登入失敗，請檢查您的電子郵件和密碼';
      setError('root', { message: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-form">
        <h2>會員登入</h2>

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="form-group">
            <label htmlFor="email">電子郵件</label>
            <input
              type="email"
              id="email"
              {...register('email')}
              className={errors.email ? 'error' : ''}
            />
            {errors.email && <span className="error-message">{errors.email.message}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="password">密碼</label>
            <input
              type="password"
              id="password"
              {...register('password')}
              className={errors.password ? 'error' : ''}
            />
            {errors.password && <span className="error-message">{errors.password.message}</span>}
          </div>

          {errors.root && <div className="error-message">{errors.root.message}</div>}

          <button type="submit" className="submit-btn" disabled={loading}>
            {loading ? '登入中...' : '登入'}
          </button>
        </form>

        <div className="auth-links">
          <p>還沒有帳號？ <Link to="/register">立即註冊</Link></p>
        </div>
      </div>
    </div>
  );
};

export default Login;