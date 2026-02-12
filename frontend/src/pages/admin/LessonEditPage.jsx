import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../lib/api';
import { renderMarkdown, hydrateLiveDemos } from '../../lib/markdown';
import { FiArrowLeft, FiSave, FiEye, FiEyeOff, FiPlus, FiTrash2, FiUpload } from 'react-icons/fi';
import toast from 'react-hot-toast';
import 'highlight.js/styles/github-dark.css';
import './LessonEditPage.css';

export default function LessonEditPage() {
  const { lessonId } = useParams();
  const navigate = useNavigate();

  const [lesson, setLesson] = useState(null);
  const [content, setContent] = useState('');
  const [title, setTitle] = useState('');
  const [isVisible, setIsVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [previewMode, setPreviewMode] = useState('split'); // 'edit', 'preview', 'split'
  const [resources, setResources] = useState([]);

  // Resource form
  const [showResourceModal, setShowResourceModal] = useState(false);
  const [resourceForm, setResourceForm] = useState({ type: 'link', title: '', url: '', language: '' });
  const [resourceFile, setResourceFile] = useState(null);
  const previewRef = React.useRef(null);

  // Hydrate live demos in preview pane
  useEffect(() => {
    if (previewMode !== 'edit' && previewRef.current) {
      hydrateLiveDemos(previewRef.current);
    }
  }, [content, previewMode]);

  const loadLesson = useCallback(async () => {
    try {
      const { data } = await api.get(`/lessons/${lessonId}`);
      setLesson(data.lesson);
      setTitle(data.lesson.title);
      setContent(data.lesson.content_md || '');
      setIsVisible(data.lesson.is_visible);
      setResources(data.lesson.resources || []);
    } catch (err) {
      toast.error('Грешка при зареждане на урока');
    } finally {
      setLoading(false);
    }
  }, [lessonId]);

  useEffect(() => { loadLesson(); }, [loadLesson]);

  const save = async () => {
    setSaving(true);
    try {
      await api.put(`/lessons/${lessonId}`, {
        title,
        content_md: content,
        is_visible: isVisible,
      });
      toast.success('Урокът е запазен!');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Грешка при запазване');
    } finally {
      setSaving(false);
    }
  };

  const addResource = async (e) => {
    e.preventDefault();
    try {
      if (resourceFile) {
        const formData = new FormData();
        formData.append('file', resourceFile);
        formData.append('lesson_id', lessonId);
        formData.append('type', resourceForm.type);
        formData.append('title', resourceForm.title);
        formData.append('sort_order', resources.length);
        if (resourceForm.url) formData.append('url', resourceForm.url);

        await api.post('/resources', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      } else {
        await api.post('/resources', {
          lesson_id: parseInt(lessonId),
          type: resourceForm.type,
          title: resourceForm.title,
          url: resourceForm.url,
          language: resourceForm.language,
          sort_order: resources.length,
        });
      }
      toast.success('Ресурсът е добавен!');
      setShowResourceModal(false);
      setResourceForm({ type: 'link', title: '', url: '', language: '' });
      setResourceFile(null);
      loadLesson();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Грешка');
    }
  };

  const deleteResource = async (id) => {
    if (!confirm('Изтриване на ресурса?')) return;
    try {
      await api.delete(`/resources/${id}`);
      toast.success('Ресурсът е изтрит.');
      loadLesson();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Грешка');
    }
  };

  const toggleResourceVisibility = async (res) => {
    try {
      await api.put(`/resources/${res.id}`, { is_visible: !res.is_visible });
      loadLesson();
    } catch (_) { toast.error('Грешка'); }
  };

  // Keyboard shortcut: Ctrl+S to save
  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        save();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [title, content, isVisible]);

  if (loading) return <div className="loading-center"><div className="spinner" /></div>;
  if (!lesson) return <div className="empty-state"><h3>Урокът не е намерен</h3></div>;

  return (
    <div className="lesson-edit-page">
      {/* Toolbar */}
      <div className="lesson-edit-toolbar">
        <div className="flex items-center gap-3">
          <button className="btn btn-ghost btn-sm" onClick={() => navigate(-1)}>
            <FiArrowLeft size={16} />
          </button>
          <input
            className="form-input lesson-title-input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Заглавие на урока"
          />
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm">
            <label className="toggle">
              <input type="checkbox" checked={isVisible} onChange={(e) => setIsVisible(e.target.checked)} />
              <span className="toggle-slider" />
            </label>
            Видим
          </label>
          <div className="btn-group">
            <button className={`btn btn-sm ${previewMode === 'edit' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setPreviewMode('edit')}>Код</button>
            <button className={`btn btn-sm ${previewMode === 'split' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setPreviewMode('split')}>Разделен</button>
            <button className={`btn btn-sm ${previewMode === 'preview' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setPreviewMode('preview')}>Преглед</button>
          </div>
          <button className="btn btn-primary btn-sm" onClick={save} disabled={saving}>
            <FiSave size={14} />
            {saving ? 'Запазване…' : 'Запази'}
          </button>
        </div>
      </div>

      {/* Editor */}
      <div className={`lesson-edit-content mode-${previewMode}`}>
        {previewMode !== 'preview' && (
          <div className="editor-pane">
            <div className="editor-pane-header">
              <span>Markdown</span>
              <span className="text-muted text-sm">{content.length} символа</span>
            </div>
            <textarea
              className="editor-textarea"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Напишете съдържанието на урока в Markdown формат…

# Заглавие

Текст с **удебелен** и *наклонен* шрифт.

```javascript
console.log('Код с подчертаване на синтаксиса');
```

![video](https://youtube.com/watch?v=example)
![pdf](/uploads/pdfs/file.pdf)
"
              spellCheck={false}
            />
          </div>
        )}
        {previewMode !== 'edit' && (
          <div className="preview-pane">
            <div className="editor-pane-header">
              <span>Преглед</span>
            </div>
            <div
              ref={previewRef}
              className="preview-content md-content"
              dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
            />
          </div>
        )}
      </div>

      {/* Resources */}
      <div className="card" style={{ marginTop: 24 }}>
        <div className="flex items-center justify-between mb-4">
          <h2 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Ресурси</h2>
          <button className="btn btn-secondary btn-sm" onClick={() => setShowResourceModal(true)}>
            <FiPlus size={14} /> Добави ресурс
          </button>
        </div>

        {resources.length === 0 ? (
          <p className="text-muted text-sm">Няма добавени ресурси.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {resources.map((res) => (
              <div key={res.id} className="sortable-item">
                <div className="sortable-item-content">
                  <div className="sortable-item-title">{res.title}</div>
                  <div className="sortable-item-meta">
                    <span className="badge badge-blue" style={{ marginRight: 4 }}>{res.type}</span>
                    {res.url && <span className="text-muted">{res.url.substring(0, 60)}</span>}
                    {res.file_path && <span className="text-muted">{res.file_path}</span>}
                  </div>
                </div>
                <div className="sortable-item-actions">
                  <button className="btn btn-ghost btn-sm" onClick={() => toggleResourceVisibility(res)}>
                    {res.is_visible ? <FiEye size={14} /> : <FiEyeOff size={14} />}
                  </button>
                  <button className="btn btn-ghost btn-sm" onClick={() => deleteResource(res.id)}>
                    <FiTrash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Resource modal */}
      {showResourceModal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowResourceModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <h2 className="modal-title">Добави ресурс</h2>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowResourceModal(false)}>✕</button>
            </div>
            <form onSubmit={addResource}>
              <div className="form-group">
                <label className="form-label">Тип</label>
                <select className="form-select" value={resourceForm.type} onChange={(e) => setResourceForm({ ...resourceForm, type: e.target.value })}>
                  <option value="link">Връзка</option>
                  <option value="video">Видео</option>
                  <option value="pdf">PDF</option>
                  <option value="github">GitHub</option>
                  <option value="code">Код</option>
                  <option value="file">Файл</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Заглавие *</label>
                <input className="form-input" value={resourceForm.title} onChange={(e) => setResourceForm({ ...resourceForm, title: e.target.value })} required />
              </div>
              <div className="form-group">
                <label className="form-label">URL</label>
                <input className="form-input" value={resourceForm.url} onChange={(e) => setResourceForm({ ...resourceForm, url: e.target.value })} placeholder="https://..." />
              </div>
              {resourceForm.type === 'code' && (
                <div className="form-group">
                  <label className="form-label">Език</label>
                  <input className="form-input" value={resourceForm.language} onChange={(e) => setResourceForm({ ...resourceForm, language: e.target.value })} placeholder="javascript, python, etc." />
                </div>
              )}
              <div className="form-group">
                <label className="form-label">Или качете файл</label>
                <input type="file" onChange={(e) => setResourceFile(e.target.files[0])} />
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowResourceModal(false)}>Отказ</button>
                <button type="submit" className="btn btn-primary">Добави</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
