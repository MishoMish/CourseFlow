import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { FiBookOpen, FiLock, FiMail } from 'react-icons/fi';
import toast from 'react-hot-toast';
import './LoginPage.css';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      toast.success('Успешен вход!');
      navigate('/admin');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Грешка при вход.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <form onSubmit={handleSubmit} className="login-form card">
        <div className="login-header">
          <FiBookOpen size={32} style={{ color: 'var(--accent)' }} />
          <h1>ФМИ Курсове</h1>
          <p>Вход в администрацията</p>
        </div>

        <div className="form-group">
          <label className="form-label">Имейл</label>
          <div style={{ position: 'relative' }}>
            <FiMail size={16} style={{ position: 'absolute', left: 12, top: 12, color: 'var(--text-muted)' }} />
            <input
              type="email"
              className="form-input"
              style={{ paddingLeft: 36 }}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
              placeholder="admin@fmi.uni-sofia.bg"
            />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Парола</label>
          <div style={{ position: 'relative' }}>
            <FiLock size={16} style={{ position: 'absolute', left: 12, top: 12, color: 'var(--text-muted)' }} />
            <input
              type="password"
              className="form-input"
              style={{ paddingLeft: 36 }}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
            />
          </div>
        </div>

        <button type="submit" className="btn btn-primary btn-lg" style={{ width: '100%', justifyContent: 'center' }} disabled={loading}>
          {loading ? <span className="spinner" style={{ width: 18, height: 18 }} /> : 'Вход'}
        </button>
      </form>
    </div>
  );
}
