import React, { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../../lib/api';
import { FiChevronRight, FiFileText } from 'react-icons/fi';

export default function TopicPage() {
  const { slug, moduleSlug, topicSlug } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/public/courses/${slug}/modules/${moduleSlug}/topics/${topicSlug}`)
      .then(({ data }) => setData(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [slug, moduleSlug, topicSlug]);

  if (loading) return <div className="loading-center"><div className="spinner" /></div>;
  if (!data) return <div className="empty-state"><h3>Темата не е намерена</h3></div>;

  const { topic, module: mod, course } = data;

  return (
    <div>
      <nav className="flex items-center gap-2 mb-4 text-sm text-muted" style={{ flexWrap: 'wrap' }}>
        <Link to="/">Начало</Link>
        <FiChevronRight size={14} />
        <Link to={`/courses/${slug}`}>{course.title}</Link>
        <FiChevronRight size={14} />
        <Link to={`/courses/${slug}/modules/${moduleSlug}`}>{mod.title}</Link>
        <FiChevronRight size={14} />
        <span>{topic.title}</span>
      </nav>

      <h1 style={{ marginBottom: '0.5rem' }}>{topic.title}</h1>
      {topic.description && (
        <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', maxWidth: 700 }}>{topic.description}</p>
      )}

      <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem' }}>Уроци</h2>

      {!topic.lessons?.length ? (
        <div className="empty-state">
          <div className="empty-state-icon">📝</div>
          <h3>Няма налични уроци</h3>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {topic.lessons.map((lesson) => (
            <Link
              key={lesson.id}
              to={`/courses/${slug}/modules/${moduleSlug}/topics/${topicSlug}/lessons/${lesson.slug}`}
              className="card card-hover"
              style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 20px' }}
            >
              <FiFileText size={18} style={{ color: 'var(--accent)', flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 500 }}>{lesson.title}</div>
              </div>
              <FiChevronRight size={18} style={{ color: 'var(--text-muted)' }} />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
