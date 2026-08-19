import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../../services/api';

interface ChangePasswordForm {
  oldPassword: string;
  newPassword: string;
  confirmPassword: string;
}

const ChangePassword: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const currentUser = JSON.parse(localStorage.getItem('user') || 'null');
  const forced = !!currentUser?.mustChangePassword;

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
    setError,
  } = useForm<ChangePasswordForm>();

  const newPassword = watch('newPassword');

  React.useEffect(() => {
    if (!currentUser) navigate('/login');
  }, [currentUser, navigate]);

  const onSubmit = async (data: ChangePasswordForm) => {
    setLoading(true);
    try {
      const user = await authAPI.changePassword({
        old_password: data.oldPassword,
        new_password: data.newPassword,
      });

      // 更新本地儲存的 must_change 旗標
      const updated = { ...currentUser, mustChangePassword: user.must_change_password };
      localStorage.setItem('user', JSON.stringify(updated));

      navigate('/');
    } catch (error: any) {
      const msg = error.response?.data?.detail || '修改密碼失敗，請再試一次';
      setError('root', { message: typeof msg === 'string' ? msg : '修改密碼失敗' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-form">
        <h2>{forced ? '首次登入 · 請設定新密碼' : '修改密碼'}</h2>
        {forced && (
          <p className="auth-note" style={{ marginBottom: 16 }}>
            為保護帳號安全，請將管理員提供的臨時密碼更換為您自己的密碼。
          </p>
        )}

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="form-group">
            <label htmlFor="oldPassword">{forced ? '臨時密碼' : '目前密碼'}</label>
            <input
              type="password"
              id="oldPassword"
              {...register('oldPassword', { required: '此欄位為必填' })}
              className={errors.oldPassword ? 'error' : ''}
            />
            {errors.oldPassword && <span className="error-message">{errors.oldPassword.message}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="newPassword">新密碼</label>
            <input
              type="password"
              id="newPassword"
              {...register('newPassword', {
                required: '此欄位為必填',
                minLength: { value: 6, message: '新密碼長度至少 6 碼' },
              })}
              className={errors.newPassword ? 'error' : ''}
            />
            {errors.newPassword && <span className="error-message">{errors.newPassword.message}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">確認新密碼</label>
            <input
              type="password"
              id="confirmPassword"
              {...register('confirmPassword', {
                required: '此欄位為必填',
                validate: (v) => v === newPassword || '兩次輸入的密碼不一致',
              })}
              className={errors.confirmPassword ? 'error' : ''}
            />
            {errors.confirmPassword && <span className="error-message">{errors.confirmPassword.message}</span>}
          </div>

          {errors.root && <div className="error-message">{errors.root.message}</div>}

          <button type="submit" className="submit-btn" disabled={loading}>
            {loading ? '處理中...' : '設定新密碼'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChangePassword;
