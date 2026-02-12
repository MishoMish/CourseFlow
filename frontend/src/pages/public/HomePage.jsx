import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../../lib/api';
import { FiBook, FiCalendar, FiUser, FiSearch, FiX } from 'react-icons/fi';
import './HomePage.css';

export default function HomePage() {
  const [courses, setCourses] = useState([]);
  const [groups, setGroups] = useState([]);
  const [years, setYears] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeGroup, setActiveGroup] = useState('');
  const [activeYear, setActiveYear] = useState('');

  // Load groups and years on mount
  useEffect(() => {
    api.get('/public/groups')
      .then(({ data }) => setGroups(data.groups))
      .catch(() => {});
    api.get('/public/years')
      .then(({ data }) => setYears(data.years))
      .catch(() => {});
  }, []);

  // Search/filter courses
  const loadCourses = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (searchQuery.trim()) params.set('q', searchQuery.trim());
    if (activeGroup) params.set('group', activeGroup);
    if (activeYear) params.set('year', activeYear);

    const url = params.toString()
      ? `/public/search?${params.toString()}`
      : '/public/courses';

    api.get(url)
      .then(({ data }) => setCourses(data.courses))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [searchQuery, activeGroup, activeYear]);

  useEffect(() => {
    const timer = setTimeout(loadCourses, 300);
    return () => clearTimeout(timer);
  }, [loadCourses]);

  const clearFilters = () => {
    setSearchQuery('');
    setActiveGroup('');
    setActiveYear('');
  };

  const hasFilters = searchQuery.trim() || activeGroup || activeYear;

  return (
    <div className="home-page">
      <div className="hero">
        <h1>ФМИ Курсове</h1>
        <p className="hero-subtitle">
          Платформа за учебни материали на Факултета по математика и информатика,
          Софийски университет „Св. Климент Охридски"
        </p>
      </div>

      {/* Search bar */}
      <div className="search-bar">
        <FiSearch size={18} className="search-icon" />
        <input
          type="text"
          className="search-input"
          placeholder="Търси курс по име или описание..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        {searchQuery && (
          <button className="search-clear" onClick={() => setSearchQuery('')}>
            <FiX size={16} />
          </button>
        )}
      </div>

      {/* Group filter pills */}
      {groups.length > 0 && (
        <div className="group-filters">
          <button
            className={`group-pill ${!activeGroup ? 'group-pill-active' : ''}`}
            onClick={() => setActiveGroup('')}
          >
            Всички
          </button>
          {groups.map((g) => (
            <button
              key={g.id}
              className={`group-pill ${activeGroup === g.slug ? 'group-pill-active' : ''}`}
              onClick={() => setActiveGroup(activeGroup === g.slug ? '' : g.slug)}
            >
              {g.name}
            </button>
          ))}
        </div>
      )}

      {/* Year filter pills */}
      {years.length > 0 && (
        <div className="group-filters year-filters">
          <FiCalendar size={14} className="text-muted" style={{ marginRight: 2 }} />
          <button
            className={`group-pill ${!activeYear ? 'group-pill-active' : ''}`}
            onClick={() => setActiveYear('')}
          >
            Всички години
          </button>
          {years.map((y) => (
            <button
              key={y}
              className={`group-pill ${activeYear === y ? 'group-pill-active' : ''}`}
              onClick={() => setActiveYear(activeYear === y ? '' : y)}
            >
              {y}
            </button>
          ))}
        </div>
      )}

      {hasFilters && (
        <div className="filter-status">
          <span className="text-sm text-muted">
            {loading ? 'Търсене...' : `${courses.length} ${courses.length === 1 ? 'курс' : 'курса'}`}
          </span>
          <button className="btn-clear-filters" onClick={clearFilters}>
            <FiX size={14} /> Изчисти филтрите
          </button>
        </div>
      )}

      {loading ? (
        <div className="loading-center"><div className="spinner" /></div>
      ) : courses.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📚</div>
          <h3>{hasFilters ? 'Няма намерени курсове' : 'Все още няма публикувани курсове'}</h3>
          <p>{hasFilters ? 'Опитайте с други критерии за търсене.' : 'Скоро тук ще бъдат добавени учебни материали.'}</p>
          {hasFilters && (
            <button className="btn btn-secondary" style={{ marginTop: 12 }} onClick={clearFilters}>
              Изчисти филтрите
            </button>
          )}
        </div>
      ) : (
        <div className="courses-grid">
          {courses.map((course) => (
            <Link to={`/courses/${course.slug}`} key={course.id} className="course-card card card-hover">
              <div className="course-card-header">
                <FiBook size={20} className="course-card-icon" />
                <h2 className="course-card-title">{course.title}</h2>
              </div>
              {course.description && (
                <p className="course-card-desc">{course.description}</p>
              )}
              {/* Group tags */}
              {course.groups?.length > 0 && (
                <div className="course-card-groups">
                  {course.groups.map((g) => (
                    <span key={g.id} className="group-tag">{g.name}</span>
                  ))}
                </div>
              )}
              <div className="course-card-meta">
                {course.academic_year && (
                  <span className="course-card-meta-item">
                    <FiCalendar size={14} />
                    {course.academic_year}
                    {course.semester && ` (${course.semester === 'winter' ? 'Зимен' : 'Летен'})`}
                  </span>
                )}
                {course.staffEntries?.length > 0 && (
                  <span className="course-card-meta-item">
                    <FiUser size={14} />
                    {course.staffEntries.map((s) => s.User?.name).filter(Boolean).join(', ')}
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
