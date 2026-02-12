import React, { useState, useEffect, useRef } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../../lib/api';
import { renderMarkdown, hydrateLiveDemos } from '../../lib/markdown';
import { FiChevronRight, FiChevronLeft, FiExternalLink, FiFile, FiGithub, FiPlay, FiCode } from 'react-icons/fi';
import 'highlight.js/styles/github-dark.css';
import './LessonPage.css';

export default function LessonPage() {
  const { slug, moduleSlug, topicSlug, lessonSlug } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const contentRef = useRef(null);

  useEffect(() => {
    setLoading(true);
    api.get(`/public/courses/${slug}/modules/${moduleSlug}/topics/${topicSlug}/lessons/${lessonSlug}`)
      .then(({ data }) => setData(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [slug, moduleSlug, topicSlug, lessonSlug]);

  // Handle interactive code blocks + live demos
  useEffect(() => {
    if (!contentRef.current) return;

    // Hydrate live demo blocks (```html live, ```demo, etc.)
    hydrateLiveDemos(contentRef.current);

    // Find code blocks marked as "interactive" / "run" and add run buttons
    const codeBlocks = contentRef.current.querySelectorAll('pre code');
    codeBlocks.forEach((block) => {
      const pre = block.parentElement;
      if (pre.querySelector('.code-run-btn')) return; // already processed
      if (pre.closest('.live-demo')) return; // inside a live demo — handled by hydrateLiveDemos

      const lang = (block.className.match(/language-(\w+)/) || [])[1];
      if (['html', 'css', 'javascript', 'js'].includes(lang)) {
        const btn = document.createElement('button');
        btn.className = 'code-run-btn btn btn-sm btn-secondary';
        btn.innerHTML = '▶ Изпълни';
        btn.onclick = () => runCodeBlock(block.textContent, lang, pre);
        pre.style.position = 'relative';
        pre.appendChild(btn);
      }
    });
  }, [data]);

  function runCodeBlock(code, lang, preElement) {
    let existing = preElement.nextElementSibling;
    if (existing?.classList?.contains('code-output')) {
      existing.remove();
      return;
    }

    const output = document.createElement('div');
    output.className = 'code-output';

    if (lang === 'html' || lang === 'css' || lang === 'javascript' || lang === 'js') {
      const iframe = document.createElement('iframe');
      iframe.sandbox = 'allow-scripts';
      iframe.style.cssText = 'width:100%;border:1px solid var(--border);border-radius:8px;background:white;overflow:hidden;display:block;';
      iframe.scrolling = 'no';

      const resizeScript = `<script>(function(){function s(){parent.postMessage({__iframeResize:true,h:document.body.scrollHeight},'*');}if(window.ResizeObserver){new ResizeObserver(s).observe(document.body);}window.addEventListener('load',function(){setTimeout(s,0);setTimeout(s,100);setTimeout(s,500);});s();})()</` + 'script>';

      const htmlContent = lang === 'html'
        ? code
        : lang === 'css'
          ? `<style>${code}</style><p>CSS приложен. Добавете HTML за преглед.</p>`
          : `<script>${code}<\/script>`;

      const fullHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{font-family:sans-serif;padding:12px;margin:0;overflow:hidden;}</style></head><body>${htmlContent}${resizeScript}</body></html>`;

      output.appendChild(iframe);
      preElement.after(output);

      iframe.srcdoc = fullHtml;
    }
  }

  if (loading) return <div className="loading-center"><div className="spinner" /></div>;
  if (!data) return <div className="empty-state"><h3>Урокът не е намерен</h3></div>;

  const { lesson, siblings, topic, module: mod, course } = data;

  const currentIdx = siblings.findIndex((s) => s.id === lesson.id);
  const prevLesson = currentIdx > 0 ? siblings[currentIdx - 1] : null;
  const nextLesson = currentIdx < siblings.length - 1 ? siblings[currentIdx + 1] : null;

  const resourceIcons = {
    pdf: FiFile,
    video: FiPlay,
    github: FiGithub,
    code: FiCode,
    link: FiExternalLink,
    file: FiFile,
  };

  return (
    <div className="lesson-page">
      <nav className="flex items-center gap-2 mb-4 text-sm text-muted" style={{ flexWrap: 'wrap' }}>
        <Link to="/">Начало</Link>
        <FiChevronRight size={14} />
        <Link to={`/courses/${slug}`}>{course.title}</Link>
        <FiChevronRight size={14} />
        <Link to={`/courses/${slug}/modules/${moduleSlug}`}>{mod.title}</Link>
        <FiChevronRight size={14} />
        <Link to={`/courses/${slug}/modules/${moduleSlug}/topics/${topicSlug}`}>{topic.title}</Link>
        <FiChevronRight size={14} />
        <span>{lesson.title}</span>
      </nav>

      <h1 className="lesson-title">{lesson.title}</h1>

      {/* Resources */}
      {lesson.resources?.length > 0 && (
        <div className="lesson-resources">
          {lesson.resources.map((res) => {
            const Icon = resourceIcons[res.type] || FiFile;

            if (res.type === 'video' && res.url?.match(/(?:youtube\.com|youtu\.be)/)) {
              const match = res.url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/);
              const videoId = match?.[1];
              return (
                <div key={res.id} className="resource-video">
                  <h3><FiPlay size={16} /> {res.title}</h3>
                  <iframe
                    src={`https://www.youtube.com/embed/${videoId}`}
                    allowFullScreen
                    loading="lazy"
                    style={{ width: '100%', aspectRatio: '16/9', borderRadius: 8, border: 'none' }}
                  />
                </div>
              );
            }

            if (res.type === 'pdf') {
              const pdfUrl = res.file_path || res.url;
              return (
                <div key={res.id} className="resource-pdf">
                  <h3><FiFile size={16} /> {res.title}</h3>
                  <embed src={pdfUrl} type="application/pdf" width="100%" height="600px" style={{ borderRadius: 8, border: '1px solid var(--border)' }} />
                </div>
              );
            }

            return (
              <a key={res.id} href={res.url || res.file_path} target="_blank" rel="noopener noreferrer" className="resource-link card">
                <Icon size={18} />
                <span>{res.title}</span>
                <FiExternalLink size={14} style={{ marginLeft: 'auto', color: 'var(--text-muted)' }} />
              </a>
            );
          })}
        </div>
      )}

      {/* Markdown content */}
      <div
        ref={contentRef}
        className="md-content"
        dangerouslySetInnerHTML={{ __html: renderMarkdown(lesson.content_md) }}
      />

      {/* Navigation */}
      <div className="lesson-nav">
        {prevLesson ? (
          <Link
            to={`/courses/${slug}/modules/${moduleSlug}/topics/${topicSlug}/lessons/${prevLesson.slug}`}
            className="lesson-nav-btn prev"
          >
            <FiChevronLeft size={18} />
            <div>
              <div className="lesson-nav-label">Предишен урок</div>
              <div className="lesson-nav-title">{prevLesson.title}</div>
            </div>
          </Link>
        ) : <div />}
        {nextLesson ? (
          <Link
            to={`/courses/${slug}/modules/${moduleSlug}/topics/${topicSlug}/lessons/${nextLesson.slug}`}
            className="lesson-nav-btn next"
          >
            <div style={{ textAlign: 'right' }}>
              <div className="lesson-nav-label">Следващ урок</div>
              <div className="lesson-nav-title">{nextLesson.title}</div>
            </div>
            <FiChevronRight size={18} />
          </Link>
        ) : <div />}
      </div>
    </div>
  );
}
