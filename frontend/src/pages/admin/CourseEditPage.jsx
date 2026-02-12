import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../../lib/api';
import { useAuthStore } from '../../stores/authStore';
import { FiPlus, FiEdit2, FiTrash2, FiEye, FiEyeOff, FiChevronDown, FiChevronRight, FiSave, FiUsers, FiArrowLeft, FiUpload, FiMenu } from 'react-icons/fi';
import toast from 'react-hot-toast';

export default function CourseEditPage() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const { isSuperAdmin, user } = useAuthStore();

  const [course, setCourse] = useState(null);
  const [modules, setModules] = useState([]);
  const [expandedModule, setExpandedModule] = useState(null);
  const [expandedTopic, setExpandedTopic] = useState(null);
  const [topics, setTopics] = useState({});
  const [lessons, setLessons] = useState({});
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [courseForm, setCourseForm] = useState({});
  const [allGroups, setAllGroups] = useState([]);
  const [courseGroupIds, setCourseGroupIds] = useState([]);

  // Staff management
  const [users, setUsers] = useState([]);
  const [showStaffModal, setShowStaffModal] = useState(false);
  const [staffForm, setStaffForm] = useState({ user_id: '', role: 'assistant' });

  // Create modals
  const [showModuleModal, setShowModuleModal] = useState(false);
  const [showTopicModal, setShowTopicModal] = useState(null);
  const [showLessonModal, setShowLessonModal] = useState(null);
  const [newItem, setNewItem] = useState({ title: '', description: '' });

  // Folder import
  const folderInputRef = React.useRef(null);
  const [importData, setImportData] = useState(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importing, setImporting] = useState(false);

  // Generic drag-and-drop reorder for modules, topics, and lessons
  const [dragItem, setDragItem] = useState(null); // { type, id, parentId }
  const [dropTarget, setDropTarget] = useState(null); // { type, id }

  const handleDragStart = (e, type, item, parentId) => {
    setDragItem({ type, id: item.id, parentId });
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', ''); // required for Firefox
    requestAnimationFrame(() => e.target.classList.add('dragging'));
  };

  const handleDragEnd = (e) => {
    e.currentTarget.classList.remove('dragging');
    setDragItem(null);
    setDropTarget(null);
  };

  const handleDragOver = (e, type, id) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const key = `${type}-${id}`;
    if (!dropTarget || `${dropTarget.type}-${dropTarget.id}` !== key) {
      setDropTarget({ type, id });
    }
  };

  const reorderList = (list, fromId, toId) => {
    const arr = [...list];
    const fromIdx = arr.findIndex(x => x.id === fromId);
    const toIdx = arr.findIndex(x => x.id === toId);
    if (fromIdx === -1 || toIdx === -1) return null;
    const [moved] = arr.splice(fromIdx, 1);
    arr.splice(toIdx, 0, moved);
    return arr.map((x, i) => ({ ...x, sort_order: i }));
  };

  const handleDrop = async (e, type, targetItem, parentId) => {
    e.preventDefault();
    setDropTarget(null);
    if (!dragItem || dragItem.type !== type || dragItem.id === targetItem.id || dragItem.parentId !== parentId) return;

    if (type === 'module') {
      const reordered = reorderList(modules, dragItem.id, targetItem.id);
      if (!reordered) return;
      setModules(reordered);
      try {
        await api.put('/modules/reorder/batch', { orders: reordered.map((m, i) => ({ id: m.id, sort_order: i })) });
      } catch { toast.error('Грешка при подреждане'); loadModules(); }
    } else if (type === 'topic') {
      const reordered = reorderList(topics[parentId] || [], dragItem.id, targetItem.id);
      if (!reordered) return;
      setTopics(prev => ({ ...prev, [parentId]: reordered }));
      try {
        await api.put('/topics/reorder/batch', { orders: reordered.map((t, i) => ({ id: t.id, sort_order: i })) });
      } catch { toast.error('Грешка при подреждане'); loadTopics(parentId); }
    } else if (type === 'lesson') {
      const reordered = reorderList(lessons[parentId] || [], dragItem.id, targetItem.id);
      if (!reordered) return;
      setLessons(prev => ({ ...prev, [parentId]: reordered }));
      try {
        await api.put('/lessons/reorder/batch', { orders: reordered.map((l, i) => ({ id: l.id, sort_order: i })) });
      } catch { toast.error('Грешка при подреждане'); loadLessons(parentId); }
    }
  };

  const isDropTarget = (type, id) => dropTarget?.type === type && dropTarget.id === id && dragItem?.id !== id && dragItem?.type === type;

  const processFolder = async (e) => {
    const files = Array.from(e.target.files).filter(f =>
      f.name.endsWith('.md') && f.name.toLowerCase() !== 'readme.md'
    );
    e.target.value = '';
    if (files.length === 0) { toast.error('Не са намерени .md файлове.'); return; }

    const clean = (n) => n.replace(/^(?:Модул|Module|Тема|Topic)\s+\d+\s*[-–—]\s*/, '').trim() || n;
    const order = (n) => { const m = n.match(/(\d+)/); return m ? parseInt(m[1]) : 999; };
    const titleFromMd = (content, name) => {
      const h1 = content.match(/^#\s+(.+)$/m);
      if (h1) return h1[1].trim();
      return name.replace(/\.md$/, '').replace(/^\d+-/, '').replace(/[-_]/g, ' ');
    };

    const fileData = await Promise.all(files.map(async (f) => ({
      path: f.webkitRelativePath, name: f.name, content: await f.text(),
    })));

    const modMap = new Map();
    for (const f of fileData) {
      const parts = f.path.split('/');
      if (parts.length < 3) continue;
      const modDir = parts[1];
      if (!modMap.has(modDir)) modMap.set(modDir, { title: clean(modDir), sort_order: order(modDir), topicMap: new Map() });
      const mod = modMap.get(modDir);
      let topicDir, fileName;
      if (parts.length === 3) { topicDir = '__default__'; fileName = parts[2]; }
      else { topicDir = parts[2]; fileName = parts[parts.length - 1]; }
      if (!mod.topicMap.has(topicDir)) {
        mod.topicMap.set(topicDir, {
          title: topicDir === '__default__' ? 'Общо' : clean(topicDir),
          sort_order: topicDir === '__default__' ? 0 : order(topicDir),
          lessons: [],
        });
      }
      mod.topicMap.get(topicDir).lessons.push({
        title: titleFromMd(f.content, fileName),
        content_md: f.content,
        sort_order: order(fileName),
      });
    }

    const modules = Array.from(modMap.values())
      .map(m => ({
        title: m.title, sort_order: m.sort_order,
        topics: Array.from(m.topicMap.values())
          .map(t => ({ ...t, lessons: t.lessons.sort((a, b) => a.sort_order - b.sort_order) }))
          .sort((a, b) => a.sort_order - b.sort_order),
      }))
      .sort((a, b) => a.sort_order - b.sort_order);

    setImportData(modules);
    setShowImportModal(true);
  };

  const doImport = async () => {
    setImporting(true);
    try {
      const { data } = await api.post(`/courses/${courseId}/import`, { modules: importData });
      toast.success(`Импортирани: ${data.counts.modules} модула, ${data.counts.topics} теми, ${data.counts.lessons} урока`);
      setShowImportModal(false);
      setImportData(null);
      loadModules();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Грешка при импортиране');
    } finally {
      setImporting(false);
    }
  };

  const loadCourse = useCallback(async () => {
    try {
      const { data } = await api.get(`/courses/${courseId}`);
      setCourse(data.course);
      setCourseForm({
        title: data.course.title,
        description: data.course.description || '',
        academic_year: data.course.academic_year || '',
        semester: data.course.semester || '',
        language: data.course.language || 'bg',
        is_visible: data.course.is_visible,
      });
      setCourseGroupIds((data.course.groups || []).map((g) => g.id));
    } catch (err) {
      toast.error('Грешка при зареждане на курса');
    }
  }, [courseId]);

  const loadModules = useCallback(async () => {
    try {
      const { data } = await api.get(`/modules/course/${courseId}`);
      setModules(data.modules);
    } catch (_) {}
  }, [courseId]);

  const loadTopics = async (moduleId) => {
    try {
      const { data } = await api.get(`/topics/module/${moduleId}`);
      setTopics((prev) => ({ ...prev, [moduleId]: data.topics }));
    } catch (_) {}
  };

  const loadLessons = async (topicId) => {
    try {
      const { data } = await api.get(`/lessons/topic/${topicId}`);
      setLessons((prev) => ({ ...prev, [topicId]: data.lessons }));
    } catch (_) {}
  };

  useEffect(() => {
    Promise.all([loadCourse(), loadModules()])
      .finally(() => setLoading(false));
  }, [loadCourse, loadModules]);

  // Load all groups
  useEffect(() => {
    api.get('/groups').then(({ data }) => setAllGroups(data.groups)).catch(() => {});
  }, []);

  // Load users for staff management
  useEffect(() => {
    if (showStaffModal) {
      api.get('/users').then(({ data }) => setUsers(data.users)).catch(() => {});
    }
  }, [showStaffModal]);

  const saveCourse = async () => {
    try {
      await api.put(`/courses/${courseId}`, {
        ...courseForm,
        semester: courseForm.semester || null,
        academic_year: courseForm.academic_year || null,
        group_ids: courseGroupIds,
      });
      toast.success('Курсът е запазен.');
      setEditing(false);
      loadCourse();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Грешка при запазване');
    }
  };

  const toggleModuleVisibility = async (mod) => {
    try {
      await api.put(`/modules/${mod.id}`, { is_visible: !mod.is_visible });
      loadModules();
    } catch (_) { toast.error('Грешка'); }
  };

  const toggleTopicVisibility = async (topic, moduleId) => {
    try {
      await api.put(`/topics/${topic.id}`, { is_visible: !topic.is_visible });
      loadTopics(moduleId);
    } catch (_) { toast.error('Грешка'); }
  };

  const toggleLessonVisibility = async (lesson, topicId) => {
    try {
      await api.put(`/lessons/${lesson.id}`, { is_visible: !lesson.is_visible });
      loadLessons(topicId);
    } catch (_) { toast.error('Грешка'); }
  };

  const createModule = async (e) => {
    e.preventDefault();
    try {
      await api.post('/modules', { course_id: parseInt(courseId), ...newItem, sort_order: modules.length });
      toast.success('Модулът е създаден!');
      setShowModuleModal(false);
      setNewItem({ title: '', description: '' });
      loadModules();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Грешка');
    }
  };

  const createTopic = async (e, moduleId) => {
    e.preventDefault();
    try {
      const topicsList = topics[moduleId] || [];
      await api.post('/topics', { module_id: moduleId, ...newItem, sort_order: topicsList.length });
      toast.success('Темата е създадена!');
      setShowTopicModal(null);
      setNewItem({ title: '', description: '' });
      loadTopics(moduleId);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Грешка');
    }
  };

  const createLesson = async (e, topicId) => {
    e.preventDefault();
    try {
      const lessonsList = lessons[topicId] || [];
      await api.post('/lessons', { topic_id: topicId, ...newItem, sort_order: lessonsList.length });
      toast.success('Урокът е създаден!');
      setShowLessonModal(null);
      setNewItem({ title: '', description: '' });
      loadLessons(topicId);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Грешка');
    }
  };

  const deleteModule = async (id) => {
    if (!confirm('Изтриване на модула и всичко в него?')) return;
    try {
      await api.delete(`/modules/${id}`);
      toast.success('Модулът е изтрит.');
      loadModules();
    } catch (err) { toast.error(err.response?.data?.error || 'Грешка'); }
  };

  const deleteTopic = async (id, moduleId) => {
    if (!confirm('Изтриване на темата и всички уроци в нея?')) return;
    try {
      await api.delete(`/topics/${id}`);
      toast.success('Темата е изтрита.');
      loadTopics(moduleId);
    } catch (err) { toast.error(err.response?.data?.error || 'Грешка'); }
  };

  const deleteLesson = async (id, topicId) => {
    if (!confirm('Изтриване на урока?')) return;
    try {
      await api.delete(`/lessons/${id}`);
      toast.success('Урокът е изтрит.');
      loadLessons(topicId);
    } catch (err) { toast.error(err.response?.data?.error || 'Грешка'); }
  };

  const addStaff = async (e) => {
    e.preventDefault();
    try {
      await api.post(`/courses/${courseId}/staff`, { user_id: parseInt(staffForm.user_id), role: staffForm.role });
      toast.success('Член на екипа е добавен.');
      setShowStaffModal(false);
      setStaffForm({ user_id: '', role: 'assistant' });
      loadCourse();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Грешка');
    }
  };

  const removeStaff = async (userId) => {
    if (!confirm('Премахване на този член от екипа?')) return;
    try {
      await api.delete(`/courses/${courseId}/staff/${userId}`);
      toast.success('Членът е премахнат.');
      loadCourse();
    } catch (err) { toast.error(err.response?.data?.error || 'Грешка'); }
  };

  const expandModule = (moduleId) => {
    if (expandedModule === moduleId) {
      setExpandedModule(null);
    } else {
      setExpandedModule(moduleId);
      if (!topics[moduleId]) loadTopics(moduleId);
    }
  };

  const expandTopic = (topicId) => {
    if (expandedTopic === topicId) {
      setExpandedTopic(null);
    } else {
      setExpandedTopic(topicId);
      if (!lessons[topicId]) loadLessons(topicId);
    }
  };

  if (loading) return <div className="loading-center"><div className="spinner" /></div>;
  if (!course) return <div className="empty-state"><h3>Курсът не е намерен</h3></div>;

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <button className="btn btn-ghost btn-sm" onClick={() => navigate('/admin/courses')}>
          <FiArrowLeft size={16} /> Назад
        </button>
      </div>

      {/* Course details */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="flex items-center justify-between mb-4">
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>
            {editing ? 'Редактиране на курс' : course.title}
          </h1>
          <div className="flex gap-2">
            {!editing ? (
              <button className="btn btn-secondary btn-sm" onClick={() => setEditing(true)}>
                <FiEdit2 size={14} /> Редактирай
              </button>
            ) : (
              <>
                <button className="btn btn-secondary btn-sm" onClick={() => setEditing(false)}>Отказ</button>
                <button className="btn btn-primary btn-sm" onClick={saveCourse}>
                  <FiSave size={14} /> Запази
                </button>
              </>
            )}
          </div>
        </div>

        {editing ? (
          <div>
            <div className="form-group">
              <label className="form-label">Заглавие</label>
              <input className="form-input" value={courseForm.title} onChange={(e) => setCourseForm({ ...courseForm, title: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Описание</label>
              <textarea className="form-textarea" value={courseForm.description} onChange={(e) => setCourseForm({ ...courseForm, description: e.target.value })} rows={3} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
              <div className="form-group">
                <label className="form-label">Учебна година</label>
                <input className="form-input" value={courseForm.academic_year} onChange={(e) => setCourseForm({ ...courseForm, academic_year: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Семестър</label>
                <select className="form-select" value={courseForm.semester} onChange={(e) => setCourseForm({ ...courseForm, semester: e.target.value })}>
                  <option value="">—</option>
                  <option value="winter">Зимен</option>
                  <option value="summer">Летен</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Език</label>
                <select className="form-select" value={courseForm.language} onChange={(e) => setCourseForm({ ...courseForm, language: e.target.value })}>
                  <option value="bg">Български</option>
                  <option value="en">English</option>
                </select>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label flex items-center gap-2">
                <label className="toggle">
                  <input type="checkbox" checked={courseForm.is_visible} onChange={(e) => setCourseForm({ ...courseForm, is_visible: e.target.checked })} />
                  <span className="toggle-slider" />
                </label>
                Видим за студенти
              </label>
            </div>
            {allGroups.length > 0 && (
              <div className="form-group">
                <label className="form-label">Специалности</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {allGroups.map((g) => (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => setCourseGroupIds((prev) =>
                        prev.includes(g.id) ? prev.filter((id) => id !== g.id) : [...prev, g.id]
                      )}
                      style={{
                        fontSize: 12, padding: '4px 10px', borderRadius: 20,
                        border: `1.5px solid ${courseGroupIds.includes(g.id) ? 'var(--accent)' : 'var(--border)'}`,
                        background: courseGroupIds.includes(g.id) ? 'var(--accent)' : 'var(--card-bg)',
                        color: courseGroupIds.includes(g.id) ? '#fff' : 'var(--text-secondary)',
                        cursor: 'pointer', transition: 'all 0.2s',
                      }}
                    >
                      {g.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-wrap gap-3">
            {course.groups?.length > 0 && course.groups.map((g) => (
              <span key={g.id} className="badge badge-yellow">{g.name}</span>
            ))}
            {course.academic_year && <span className="badge badge-blue">{course.academic_year}</span>}
            {course.semester && <span className="badge badge-blue">{course.semester === 'winter' ? 'Зимен' : 'Летен'}</span>}
            <span className="badge badge-blue">{course.language?.toUpperCase()}</span>
            {course.is_visible
              ? <span className="badge badge-green">Видим</span>
              : <span className="badge badge-gray">Скрит</span>
            }
          </div>
        )}
      </div>

      {/* Staff section */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="flex items-center justify-between mb-4">
          <h2 style={{ fontSize: '1.1rem', fontWeight: 600 }}>
            <FiUsers size={18} style={{ marginRight: 8 }} />
            Екип на курса
          </h2>
          <button className="btn btn-secondary btn-sm" onClick={() => setShowStaffModal(true)}>
            <FiPlus size={14} /> Добави
          </button>
        </div>

        {course.staffEntries?.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {course.staffEntries.map((entry) => (
              <div key={entry.id} className="flex items-center justify-between" style={{ padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                <div>
                  <span style={{ fontWeight: 500 }}>{entry.User?.name}</span>
                  <span className="text-sm text-muted" style={{ marginLeft: 8 }}>{entry.User?.email}</span>
                  <span className={`badge ${entry.role === 'teacher' ? 'badge-blue' : 'badge-yellow'}`} style={{ marginLeft: 8 }}>
                    {entry.role === 'teacher' ? 'Преподавател' : 'Асистент'}
                  </span>
                </div>
                <button className="btn btn-ghost btn-sm" onClick={() => removeStaff(entry.User?.id)}>
                  <FiTrash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-muted text-sm">Няма добавени членове на екипа.</p>
        )}
      </div>

      {/* Staff modal */}
      {showStaffModal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowStaffModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <h2 className="modal-title">Добави член на екипа</h2>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowStaffModal(false)}>✕</button>
            </div>
            <form onSubmit={addStaff}>
              <div className="form-group">
                <label className="form-label">Потребител</label>
                <select className="form-select" value={staffForm.user_id} onChange={(e) => setStaffForm({ ...staffForm, user_id: e.target.value })} required>
                  <option value="">Изберете…</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Роля</label>
                <select className="form-select" value={staffForm.role} onChange={(e) => setStaffForm({ ...staffForm, role: e.target.value })}>
                  <option value="teacher">Преподавател</option>
                  <option value="assistant">Асистент</option>
                </select>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowStaffModal(false)}>Отказ</button>
                <button type="submit" className="btn btn-primary">Добави</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Content tree */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Съдържание</h2>
          <div className="flex gap-2">
            <button className="btn btn-secondary btn-sm" onClick={() => folderInputRef.current?.click()}>
              <FiUpload size={14} /> Импортирай папка
            </button>
            <input ref={folderInputRef} type="file" webkitdirectory="" directory="" multiple style={{ display: 'none' }} onChange={processFolder} />
            <button className="btn btn-primary btn-sm" onClick={() => { setShowModuleModal(true); setNewItem({ title: '', description: '' }); }}>
              <FiPlus size={14} /> Нов модул
            </button>
          </div>
        </div>

        {modules.length === 0 ? (
          <p className="text-muted text-sm">Няма модули. Създайте първия модул.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {modules.map((mod) => (
              <div key={mod.id}>
                {/* Module row */}
                <div
                  className={`sortable-item${isDropTarget('module', mod.id) ? ' drop-above' : ''}`}
                  onClick={() => expandModule(mod.id)}
                  style={{ cursor: 'pointer' }}
                  draggable
                  onDragStart={(e) => handleDragStart(e, 'module', mod, courseId)}
                  onDragEnd={handleDragEnd}
                  onDragOver={(e) => handleDragOver(e, 'module', mod.id)}
                  onDrop={(e) => handleDrop(e, 'module', mod, courseId)}
                >
                  <FiMenu size={14} className="drag-handle" onClick={(e) => e.stopPropagation()} />
                  {expandedModule === mod.id ? <FiChevronDown size={16} /> : <FiChevronRight size={16} />}
                  <div className="sortable-item-content">
                    <div className="sortable-item-title">{mod.title}</div>
                    {mod.description && <div className="sortable-item-meta">{mod.description}</div>}
                  </div>
                  <div className="sortable-item-actions" onClick={(e) => e.stopPropagation()}>
                    <button className="btn btn-ghost btn-sm" onClick={() => toggleModuleVisibility(mod)} title={mod.is_visible ? 'Скрий' : 'Покажи'}>
                      {mod.is_visible ? <FiEye size={14} /> : <FiEyeOff size={14} />}
                    </button>
                    <button className="btn btn-ghost btn-sm" onClick={() => deleteModule(mod.id)}>
                      <FiTrash2 size={14} />
                    </button>
                  </div>
                </div>

                {/* Topics under module */}
                {expandedModule === mod.id && (
                  <div style={{ marginLeft: 32, borderLeft: '2px solid var(--border)', paddingLeft: 12, marginBottom: 8 }}>
                    {(topics[mod.id] || []).map((topic) => (
                      <div key={topic.id}>
                        <div
                          className={`sortable-item${isDropTarget('topic', topic.id) ? ' drop-above' : ''}`}
                          onClick={() => expandTopic(topic.id)}
                          style={{ cursor: 'pointer', marginTop: 4 }}
                          draggable
                          onDragStart={(e) => { e.stopPropagation(); handleDragStart(e, 'topic', topic, mod.id); }}
                          onDragEnd={handleDragEnd}
                          onDragOver={(e) => { e.stopPropagation(); handleDragOver(e, 'topic', topic.id); }}
                          onDrop={(e) => { e.stopPropagation(); handleDrop(e, 'topic', topic, mod.id); }}
                        >
                          <FiMenu size={12} className="drag-handle" onClick={(e) => e.stopPropagation()} />
                          {expandedTopic === topic.id ? <FiChevronDown size={14} /> : <FiChevronRight size={14} />}
                          <div className="sortable-item-content">
                            <div className="sortable-item-title" style={{ fontSize: 13 }}>{topic.title}</div>
                          </div>
                          <div className="sortable-item-actions" onClick={(e) => e.stopPropagation()}>
                            <button className="btn btn-ghost btn-sm" onClick={() => toggleTopicVisibility(topic, mod.id)}>
                              {topic.is_visible ? <FiEye size={12} /> : <FiEyeOff size={12} />}
                            </button>
                            <button className="btn btn-ghost btn-sm" onClick={() => deleteTopic(topic.id, mod.id)}>
                              <FiTrash2 size={12} />
                            </button>
                          </div>
                        </div>

                        {/* Lessons under topic */}
                        {expandedTopic === topic.id && (
                          <div style={{ marginLeft: 28, borderLeft: '2px solid var(--border)', paddingLeft: 12, marginBottom: 8 }}>
                            {(lessons[topic.id] || []).map((lesson) => (
                              <div
                                key={lesson.id}
                                className={`sortable-item${isDropTarget('lesson', lesson.id) ? ' drop-above' : ''}`}
                                style={{ marginTop: 4 }}
                                draggable
                                onDragStart={(e) => { e.stopPropagation(); handleDragStart(e, 'lesson', lesson, topic.id); }}
                                onDragEnd={handleDragEnd}
                                onDragOver={(e) => { e.stopPropagation(); handleDragOver(e, 'lesson', lesson.id); }}
                                onDrop={(e) => { e.stopPropagation(); handleDrop(e, 'lesson', lesson, topic.id); }}
                              >
                                <FiMenu size={12} className="drag-handle" />
                                <div className="sortable-item-content">
                                  <Link to={`/admin/lessons/${lesson.id}`} className="sortable-item-title" style={{ fontSize: 13, color: 'var(--accent)' }}>
                                    {lesson.title}
                                  </Link>
                                </div>
                                <div className="sortable-item-actions">
                                  <button className="btn btn-ghost btn-sm" onClick={() => toggleLessonVisibility(lesson, topic.id)}>
                                    {lesson.is_visible ? <FiEye size={12} /> : <FiEyeOff size={12} />}
                                  </button>
                                  <Link to={`/admin/lessons/${lesson.id}`} className="btn btn-ghost btn-sm">
                                    <FiEdit2 size={12} />
                                  </Link>
                                  <button className="btn btn-ghost btn-sm" onClick={() => deleteLesson(lesson.id, topic.id)}>
                                    <FiTrash2 size={12} />
                                  </button>
                                </div>
                              </div>
                            ))}
                            <button className="btn btn-ghost btn-sm mt-2" onClick={() => { setShowLessonModal(topic.id); setNewItem({ title: '', description: '' }); }}>
                              <FiPlus size={12} /> Нов урок
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                    <button className="btn btn-ghost btn-sm mt-2" onClick={() => { setShowTopicModal(mod.id); setNewItem({ title: '', description: '' }); }}>
                      <FiPlus size={12} /> Нова тема
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Module create modal */}
      {showModuleModal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowModuleModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <h2 className="modal-title">Нов модул</h2>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowModuleModal(false)}>✕</button>
            </div>
            <form onSubmit={createModule}>
              <div className="form-group">
                <label className="form-label">Заглавие *</label>
                <input className="form-input" value={newItem.title} onChange={(e) => setNewItem({ ...newItem, title: e.target.value })} required autoFocus />
              </div>
              <div className="form-group">
                <label className="form-label">Описание</label>
                <textarea className="form-textarea" value={newItem.description} onChange={(e) => setNewItem({ ...newItem, description: e.target.value })} rows={2} />
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModuleModal(false)}>Отказ</button>
                <button type="submit" className="btn btn-primary">Създай</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Topic create modal */}
      {showTopicModal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowTopicModal(null)}>
          <div className="modal">
            <div className="modal-header">
              <h2 className="modal-title">Нова тема</h2>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowTopicModal(null)}>✕</button>
            </div>
            <form onSubmit={(e) => createTopic(e, showTopicModal)}>
              <div className="form-group">
                <label className="form-label">Заглавие *</label>
                <input className="form-input" value={newItem.title} onChange={(e) => setNewItem({ ...newItem, title: e.target.value })} required autoFocus />
              </div>
              <div className="form-group">
                <label className="form-label">Описание</label>
                <textarea className="form-textarea" value={newItem.description} onChange={(e) => setNewItem({ ...newItem, description: e.target.value })} rows={2} />
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowTopicModal(null)}>Отказ</button>
                <button type="submit" className="btn btn-primary">Създай</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Lesson create modal */}
      {showLessonModal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowLessonModal(null)}>
          <div className="modal">
            <div className="modal-header">
              <h2 className="modal-title">Нов урок</h2>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowLessonModal(null)}>✕</button>
            </div>
            <form onSubmit={(e) => createLesson(e, showLessonModal)}>
              <div className="form-group">
                <label className="form-label">Заглавие *</label>
                <input className="form-input" value={newItem.title} onChange={(e) => setNewItem({ ...newItem, title: e.target.value })} required autoFocus />
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowLessonModal(null)}>Отказ</button>
                <button type="submit" className="btn btn-primary">Създай</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Import preview modal */}
      {showImportModal && importData && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowImportModal(false)}>
          <div className="modal" style={{ maxWidth: 700 }}>
            <div className="modal-header">
              <h2 className="modal-title">Импортиране на съдържание</h2>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowImportModal(false)}>✕</button>
            </div>
            <div style={{ maxHeight: '60vh', overflowY: 'auto', padding: 16 }}>
              <p className="text-sm text-muted" style={{ marginBottom: 16 }}>
                {importData.length} модула · {importData.reduce((s, m) => s + m.topics.length, 0)} теми · {importData.reduce((s, m) => s + m.topics.reduce((s2, t) => s2 + t.lessons.length, 0), 0)} урока
              </p>
              {importData.map((mod, mi) => (
                <div key={mi} style={{ marginBottom: 12 }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>📁 {mod.title}</div>
                  {mod.topics.map((topic, ti) => (
                    <div key={ti} style={{ marginLeft: 20, marginTop: 4 }}>
                      <div style={{ fontWeight: 500, fontSize: 13, color: 'var(--text-secondary)' }}>
                        📂 {topic.title} <span className="text-muted text-sm">({topic.lessons.length})</span>
                      </div>
                      {topic.lessons.map((lesson, li) => (
                        <div key={li} style={{ marginLeft: 20, fontSize: 12, color: 'var(--text-muted)', padding: '2px 0' }}>
                          📄 {lesson.title}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              ))}
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setShowImportModal(false)}>Отказ</button>
              <button className="btn btn-primary" onClick={doImport} disabled={importing}>
                {importing ? 'Импортиране…' : 'Импортирай'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
