import React from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { Link, useNavigate } from 'react-router-dom';
import { RegisterForm } from '../../types';
import { generateId } from '../../utils';

const schema = yup.object({
  username: yup.string().min(2, '使用者名稱至少需要 2 個字元').required('使用者名稱為必填'),
  email: yup.string().email('請輸入有效的電子郵件').required('電子郵件為必填'),
  password: yup.string().min(6, '密碼至少需要 6 個字元').required('密碼為必填'),
  confirmPassword: yup.string()
    .oneOf([yup.ref('password')], '密碼不符合')
    .required('確認密碼為必填')
});

const Register: React.FC = () => {
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    formState: { errors },
    setError
  } = useForm<RegisterForm>({
    resolver: yupResolver(schema)
  });

  const onSubmit = (data: RegisterForm) => {
    const users = JSON.parse(localStorage.getItem('users') || '[]');

    if (users.find((u: any) => u.email === data.email)) {
      setError('email', { message: '此電子郵件已被註冊' });
      return;
    }

    const newUser = {
      id: generateId(),
      username: data.username,
      email: data.email,
      password: data.password,
      createdAt: new Date().toISOString(),
      isAdmin: false
    };

    users.push(newUser);
    localStorage.setItem('users', JSON.stringify(users));
    localStorage.setItem('user', JSON.stringify(newUser));

    navigate('/products');
  };

  return (
    <div className="auth-page">
      <div className="auth-form">
        <h2>會員註冊</h2>

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="form-group">
            <label htmlFor="username">使用者名稱</label>
            <input
              type="text"
              id="username"
              {...register('username')}
              className={errors.username ? 'error' : ''}
            />
            {errors.username && <span className="error-message">{errors.username.message}</span>}
          </div>

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

          <div className="form-group">
            <label htmlFor="confirmPassword">確認密碼</label>
            <input
              type="password"
              id="confirmPassword"
              {...register('confirmPassword')}
              className={errors.confirmPassword ? 'error' : ''}
            />
            {errors.confirmPassword && <span className="error-message">{errors.confirmPassword.message}</span>}
          </div>

          <button type="submit" className="submit-btn">註冊</button>
        </form>

        <div className="auth-links">
          <p>已有帳號？ <Link to="/login">立即登入</Link></p>
        </div>
      </div>
    </div>
  );
};

export default Register;