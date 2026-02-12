import React, { useState, useEffect } from 'react';
import api from '../../lib/api';
import { useAuthStore } from '../../stores/authStore';
import { FiPlus, FiEdit2, FiTrash2, FiKey, FiUserCheck, FiUserX } from 'react-icons/fi';
import toast from 'react-hot-toast';

export default function UsersManagePage() {
  const { isSuperAdmin } = useAuthStore();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showResetPw, setShowResetPw] = useState(null);
  const [form, setForm] = useState({ email: '', password: '', name: '', role: 'assistant' });
  const [newPassword, setNewPassword] = useState('');

  const loadUsers = () => {
    api.get('/users')
      .then(({ data }) => setUsers(data.users))
      .catch(() => toast.error('Грешка при зареждане'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadUsers(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await api.post('/users', form);
      toast.success('Потребителят е създаден!');
      setShowCreate(false);
      setForm({ email: '', password: '', name: '', role: 'assistant' });
      loadUsers();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Грешка при създаване');
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    try {
      await api.post(`/users/${showResetPw}/reset-password`, { new_password: newPassword });
      toast.success('Паролата е нулирана.');
      setShowResetPw(null);
      setNewPassword('');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Грешка');
    }
  };

  const toggleActive = async (user) => {
    try {
      await api.put(`/users/${user.id}`, { is_active: !user.is_active });
      toast.success(user.is_active ? 'Потребителят е деактивиран.' : 'Потребителят е активиран.');
      loadUsers();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Грешка');
    }
  };

  const handleDelete = async (id, name) => {
    if (!confirm(`Сигурни ли сте, че искате да изтриете „${name}"?`)) return;
    try {
      await api.delete(`/users/${id}`);
      toast.success('Потребителят е изтрит.');
      loadUsers();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Грешка');
    }
  };

  const changeRole = async (userId, newRole) => {
    try {
      await api.put(`/users/${userId}`, { role: newRole });
      toast.success('Ролята е променена.');
      loadUsers();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Грешка');
    }
  };

  if (!isSuperAdmin()) {
    return <div className="empty-state"><h3>Нямате достъп до тази страница.</h3></div>;
  }

  if (loading) return <div className="loading-center"><div className="spinner" /></div>;

  const roleLabels = {
    super_admin: 'Супер админ',
    admin: 'Преподавател',
    assistant: 'Асистент',
  };
  const roleBadges = {
    super_admin: 'badge-red',
    admin: 'badge-blue',
    assistant: 'badge-yellow',
  };

  return (
    <div>
      <div className="admin-page-header">
        <h1 className="admin-page-title">Потребители</h1>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
          <FiPlus size={16} /> Нов потребител
        </button>
      </div>

      {/* Create modal */}
      {showCreate && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowCreate(false)}>
          <div className="modal">
            <div className="modal-header">
              <h2 className="modal-title">Нов потребител</h2>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowCreate(false)}>✕</button>
            </div>
            <form onSubmit={handleCreate}>
              <div className="form-group">
                <label className="form-label">Име *</label>
                <input className="form-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div className="form-group">
                <label className="form-label">Имейл *</label>
                <input type="email" className="form-input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
              </div>
              <div className="form-group">
                <label className="form-label">Парола * (мин. 8 символа)</label>
                <input type="password" className="form-input" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required minLength={8} />
              </div>
              <div className="form-group">
                <label className="form-label">Роля</label>
                <select className="form-select" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                  <option value="admin">Преподавател</option>
                  <option value="assistant">Асистент</option>
                </select>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowCreate(false)}>Отказ</button>
                <button type="submit" className="btn btn-primary">Създай</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset password modal */}
      {showResetPw && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowResetPw(null)}>
          <div className="modal">
            <div className="modal-header">
              <h2 className="modal-title">Нулиране на парола</h2>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowResetPw(null)}>✕</button>
            </div>
            <form onSubmit={handleResetPassword}>
              <div className="form-group">
                <label className="form-label">Нова парола (мин. 8 символа)</label>
                <input type="password" className="form-input" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength={8} autoFocus />
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowResetPw(null)}>Отказ</button>
                <button type="submit" className="btn btn-primary">Нулирай</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Users table */}
      <table className="admin-table">
        <thead>
          <tr>
            <th>Име</th>
            <th>Имейл</th>
            <th>Роля</th>
            <th>Статус</th>
            <th style={{ textAlign: 'right' }}>Действия</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id}>
              <td style={{ fontWeight: 500 }}>{u.name}</td>
              <td className="text-muted">{u.email}</td>
              <td>
                {u.role === 'super_admin' ? (
                  <span className={`badge ${roleBadges[u.role]}`}>{roleLabels[u.role]}</span>
                ) : (
                  <select
                    className="form-select"
                    style={{ width: 'auto', padding: '4px 8px', fontSize: 13 }}
                    value={u.role}
                    onChange={(e) => changeRole(u.id, e.target.value)}
                  >
                    <option value="admin">Преподавател</option>
                    <option value="assistant">Асистент</option>
                  </select>
                )}
              </td>
              <td>
                {u.is_active
                  ? <span className="badge badge-green">Активен</span>
                  : <span className="badge badge-red">Неактивен</span>
                }
              </td>
              <td>
                <div className="actions">
                  {u.role !== 'super_admin' && (
                    <>
                      <button className="btn btn-secondary btn-sm" onClick={() => setShowResetPw(u.id)} title="Нулиране на парола">
                        <FiKey size={14} />
                      </button>
                      <button className="btn btn-secondary btn-sm" onClick={() => toggleActive(u)} title={u.is_active ? 'Деактивирай' : 'Активирай'}>
                        {u.is_active ? <FiUserX size={14} /> : <FiUserCheck size={14} />}
                      </button>
                      <button className="btn btn-danger btn-sm" onClick={() => handleDelete(u.id, u.name)}>
                        <FiTrash2 size={14} />
                      </button>
                    </>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
