import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../lib/api';
import { useAuthStore } from '../../stores/authStore';
import { FiBook, FiUsers, FiEye, FiEyeOff } from 'react-icons/fi';

export default function DashboardPage() {
  const { user } = useAuthStore();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/courses')
      .then(({ data }) => setCourses(data.courses))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading-center"><div className="spinner" /></div>;

  const visibleCount = courses.filter((c) => c.is_visible).length;
  const hiddenCount = courses.length - visibleCount;

  return (
    <div>
      <div className="admin-page-header">
        <h1 className="admin-page-title">Добре дошли, {user?.name}!</h1>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16, marginBottom: 32 }}>
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: 'var(--accent-light)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <FiBook size={22} style={{ color: 'var(--accent)' }} />
          </div>
          <div>
            <div style={{ fontSize: 24, fontWeight: 700 }}>{courses.length}</div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Курсове</div>
          </div>
        </div>

        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: 'var(--success-light)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <FiEye size={22} style={{ color: 'var(--success)' }} />
          </div>
          <div>
            <div style={{ fontSize: 24, fontWeight: 700 }}>{visibleCount}</div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Видими</div>
          </div>
        </div>

        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: 'var(--warning-light)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <FiEyeOff size={22} style={{ color: 'var(--warning)' }} />
          </div>
          <div>
            <div style={{ fontSize: 24, fontWeight: 700 }}>{hiddenCount}</div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Скрити</div>
          </div>
        </div>
      </div>

      <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: 16 }}>Моите курсове</h2>

      {courses.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📚</div>
          <h3>Няма курсове</h3>
          <p>Създайте първия си курс от менюто „Курсове".</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 }}>
          {courses.map((course) => (
            <Link key={course.id} to={`/admin/courses/${course.id}`} className="card card-hover" style={{ display: 'block' }}>
              <div className="flex items-center justify-between mb-2">
                <h3 style={{ fontWeight: 600, fontSize: 15 }}>{course.title}</h3>
                {course.is_visible
                  ? <span className="badge badge-green">Видим</span>
                  : <span className="badge badge-gray">Скрит</span>
                }
              </div>
              {course.academic_year && (
                <div className="text-sm text-muted">{course.academic_year}</div>
              )}
              <div className="text-sm text-muted mt-1">
                {course.staffEntries?.length || 0} членове на екипа
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
