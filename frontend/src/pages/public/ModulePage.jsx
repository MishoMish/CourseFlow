import React, { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../../lib/api';
import { FiChevronRight, FiHash } from 'react-icons/fi';

export default function ModulePage() {
  const { slug, moduleSlug } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/public/courses/${slug}/modules/${moduleSlug}`)
      .then(({ data }) => setData(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [slug, moduleSlug]);

  if (loading) return <div className="loading-center"><div className="spinner" /></div>;
  if (!data) return <div className="empty-state"><h3>Модулът не е намерен</h3></div>;

  const { module: mod, course } = data;

  return (
    <div>
      <nav className="flex items-center gap-2 mb-4 text-sm text-muted" style={{ flexWrap: 'wrap' }}>
        <Link to="/">Начало</Link>
        <FiChevronRight size={14} />
        <Link to={`/courses/${slug}`}>{course.title}</Link>
        <FiChevronRight size={14} />
        <span>{mod.title}</span>
      </nav>

      <h1 style={{ marginBottom: '0.5rem' }}>{mod.title}</h1>
      {mod.description && (
        <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', maxWidth: 700 }}>{mod.description}</p>
      )}

      <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem' }}>Теми</h2>

      {!mod.topics?.length ? (
        <div className="empty-state">
          <div className="empty-state-icon">📋</div>
          <h3>Няма налични теми</h3>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {mod.topics.map((topic) => (
            <Link
              key={topic.id}
              to={`/courses/${slug}/modules/${moduleSlug}/topics/${topic.slug}`}
              className="card card-hover"
              style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 20px' }}
            >
              <FiHash size={18} style={{ color: 'var(--accent)', flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 500 }}>{topic.title}</div>
                {topic.description && (
                  <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>{topic.description}</div>
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
