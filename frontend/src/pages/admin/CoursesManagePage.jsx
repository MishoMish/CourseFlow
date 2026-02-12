import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../lib/api';
import { useAuthStore } from '../../stores/authStore';
import { FiPlus, FiEdit2, FiTrash2, FiEye, FiEyeOff, FiSearch } from 'react-icons/fi';
import toast from 'react-hot-toast';

export default function CoursesManagePage() {
  const { isSuperAdmin } = useAuthStore();
  const [courses, setCourses] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [form, setForm] = useState({ title: '', description: '', academic_year: '', semester: '', language: 'bg', group_ids: [] });

  const loadCourses = () => {
    api.get('/courses')
      .then(({ data }) => setCourses(data.courses))
      .catch(() => toast.error('Грешка при зареждане'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadCourses(); }, []);
  useEffect(() => {
    api.get('/groups').then(({ data }) => setGroups(data.groups)).catch(() => {});
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await api.post('/courses', {
        ...form,
        semester: form.semester || null,
        academic_year: form.academic_year || null,
      });
      toast.success('Курсът е създаден!');
      setShowCreate(false);
      setForm({ title: '', description: '', academic_year: '', semester: '', language: 'bg', group_ids: [] });
      loadCourses();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Грешка при създаване');
    }
  };

  const toggleGroupInForm = (gid) => {
    setForm((prev) => ({
      ...prev,
      group_ids: prev.group_ids.includes(gid)
        ? prev.group_ids.filter((id) => id !== gid)
        : [...prev.group_ids, gid],
    }));
  };

  const handleDelete = async (id, title) => {
    if (!confirm(`Сигурни ли сте, че искате да изтриете „${title}"?`)) return;
    try {
      await api.delete(`/courses/${id}`);
      toast.success('Курсът е изтрит.');
      loadCourses();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Грешка при изтриване');
    }
  };

  const toggleVisibility = async (course) => {
    try {
      await api.put(`/courses/${course.id}`, { is_visible: !course.is_visible });
      loadCourses();
    } catch (err) {
      toast.error('Грешка при промяна на видимостта');
    }
  };

  if (loading) return <div className="loading-center"><div className="spinner" /></div>;

  return (
    <div>
      <div className="admin-page-header">
        <h1 className="admin-page-title">Курсове</h1>
        <div className="flex items-center gap-3">
          <div style={{ position: 'relative' }}>
            <FiSearch size={16} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              className="form-input"
              placeholder="Търси..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ paddingLeft: 34, width: 220, height: 36 }}
            />
          </div>
          {isSuperAdmin() && (
            <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
              <FiPlus size={16} /> Нов курс
            </button>
          )}
        </div>
      </div>

      {/* Create modal */}
      {showCreate && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowCreate(false)}>
          <div className="modal">
            <div className="modal-header">
              <h2 className="modal-title">Нов курс</h2>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowCreate(false)}>✕</button>
            </div>
            <form onSubmit={handleCreate}>
              <div className="form-group">
                <label className="form-label">Заглавие *</label>
                <input className="form-input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
              </div>
              <div className="form-group">
                <label className="form-label">Описание</label>
                <textarea className="form-textarea" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label className="form-label">Учебна година</label>
                  <input className="form-input" placeholder="2025-2026" value={form.academic_year} onChange={(e) => setForm({ ...form, academic_year: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Семестър</label>
                  <select className="form-select" value={form.semester} onChange={(e) => setForm({ ...form, semester: e.target.value })}>
                    <option value="">—</option>
                    <option value="winter">Зимен</option>
                    <option value="summer">Летен</option>
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Език</label>
                <select className="form-select" value={form.language} onChange={(e) => setForm({ ...form, language: e.target.value })}>
                  <option value="bg">Български</option>
                  <option value="en">English</option>
                </select>
              </div>
              {groups.length > 0 && (
                <div className="form-group">
                  <label className="form-label">Специалности</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {groups.map((g) => (
                      <button
                        key={g.id}
                        type="button"
                        className={`group-pill ${form.group_ids.includes(g.id) ? 'group-pill-active' : ''}`}
                        onClick={() => toggleGroupInForm(g.id)}
                        style={{ fontSize: 12, padding: '4px 10px' }}
                      >
                        {g.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowCreate(false)}>Отказ</button>
                <button type="submit" className="btn btn-primary">Създай</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Course list */}
      {courses.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📚</div>
          <h3>Няма курсове</h3>
          <p>Създайте първия курс чрез бутона „Нов курс".</p>
        </div>
      ) : (
        <table className="admin-table">
          <thead>
            <tr>
              <th>Заглавие</th>
              <th>Специалности</th>
              <th>Година</th>
              <th>Език</th>
              <th>Видимост</th>
              <th>Екип</th>
              <th style={{ textAlign: 'right' }}>Действия</th>
            </tr>
          </thead>
          <tbody>
            {courses
              .filter((c) => !searchQuery.trim() || c.title.toLowerCase().includes(searchQuery.toLowerCase()))
              .map((course) => (
              <tr key={course.id}>
                <td><Link to={`/admin/courses/${course.id}`} style={{ fontWeight: 500 }}>{course.title}</Link></td>
                <td>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {course.groups?.map((g) => (
                      <span key={g.id} style={{ fontSize: 11, padding: '1px 6px', borderRadius: 8, background: 'var(--bg-secondary, #f0f0f5)', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{g.name}</span>
                    ))}
                    {(!course.groups || course.groups.length === 0) && <span className="text-muted">—</span>}
                  </div>
                </td>
                <td className="text-muted">{course.academic_year || '—'}</td>
                <td><span className="badge badge-blue">{course.language?.toUpperCase() || 'BG'}</span></td>
                <td>
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => toggleVisibility(course)}
                    title={course.is_visible ? 'Скрий' : 'Покажи'}
                  >
                    {course.is_visible ? <><FiEye size={14} /> Видим</> : <><FiEyeOff size={14} /> Скрит</>}
                  </button>
                </td>
                <td className="text-sm text-muted">
                  {course.staffEntries?.map((s) => s.User?.name).filter(Boolean).join(', ') || '—'}
                </td>
                <td>
                  <div className="actions">
                    <Link to={`/admin/courses/${course.id}`} className="btn btn-secondary btn-sm"><FiEdit2 size={14} /></Link>
                    {isSuperAdmin() && (
                      <button className="btn btn-danger btn-sm" onClick={() => handleDelete(course.id, course.title)}>
                        <FiTrash2 size={14} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
