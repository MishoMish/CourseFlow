import React, { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../../lib/api';
import { FiChevronRight, FiFolder } from 'react-icons/fi';

export default function CoursePage() {
  const { slug } = useParams();
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/public/courses/${slug}`)
      .then(({ data }) => setCourse(data.course))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) return <div className="loading-center"><div className="spinner" /></div>;
  if (!course) return <div className="empty-state"><h3>Курсът не е намерен</h3></div>;

  return (
    <div>
      <nav className="flex items-center gap-2 mb-4 text-sm text-muted">
        <Link to="/">Начало</Link>
        <FiChevronRight size={14} />
        <span>{course.title}</span>
      </nav>

      <h1 style={{ marginBottom: '0.5rem' }}>{course.title}</h1>
      {course.description && (
        <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', maxWidth: 700 }}>{course.description}</p>
      )}

      {course.staffEntries?.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {course.staffEntries.map((s) => (
            <span key={s.id} className="badge badge-blue">{s.User?.name}</span>
          ))}
        </div>
      )}

      {course.groups?.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {course.groups.map((g) => (
            <span key={g.id} className="badge badge-yellow">{g.name}</span>
          ))}
        </div>
      )}

      <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem' }}>Модули</h2>

      {!course.modules?.length ? (
        <div className="empty-state">
          <div className="empty-state-icon">📂</div>
          <h3>Няма налични модули</h3>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {course.modules.map((mod) => (
            <Link
              key={mod.id}
              to={`/courses/${slug}/modules/${mod.slug}`}
              className="card card-hover"
              style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 20px' }}
            >
              <FiFolder size={20} style={{ color: 'var(--accent)', flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 500 }}>{mod.title}</div>
                {mod.description && (
                  <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>{mod.description}</div>
                )}
              </div>
              <FiChevronRight size={18} style={{ color: 'var(--text-muted)' }} />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
