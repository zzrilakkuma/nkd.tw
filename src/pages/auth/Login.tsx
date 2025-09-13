import React from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { Link, useNavigate } from 'react-router-dom';
import { LoginForm } from '../../types';

const schema = yup.object({
  email: yup.string().email('請輸入有效的電子郵件').required('電子郵件為必填'),
  password: yup.string().min(6, '密碼至少需要 6 個字元').required('密碼為必填')
});

const Login: React.FC = () => {
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    formState: { errors },
    setError
  } = useForm<LoginForm>({
    resolver: yupResolver(schema)
  });

  const onSubmit = (data: LoginForm) => {
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    const user = users.find((u: any) => u.email === data.email && u.password === data.password);

    if (user) {
      localStorage.setItem('user', JSON.stringify(user));
      navigate('/products');
    } else {
      setError('root', { message: '電子郵件或密碼錯誤' });
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

          <button type="submit" className="submit-btn">登入</button>
        </form>

        <div className="auth-links">
          <p>還沒有帳號？ <Link to="/register">立即註冊</Link></p>
        </div>
      </div>
    </div>
  );
};

export default Login;