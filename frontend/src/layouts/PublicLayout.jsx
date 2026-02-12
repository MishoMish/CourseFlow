import React from 'react';
import { Outlet, Link } from 'react-router-dom';
import { FiBookOpen } from 'react-icons/fi';
import './PublicLayout.css';

export default function PublicLayout() {
  return (
    <div className="public-layout">
      <header className="public-header">
        <div className="public-header-inner">
          <Link to="/" className="public-logo">
            <FiBookOpen size={24} />
            <span>ФМИ Курсове</span>
          </Link>
          <nav className="public-nav">
            <Link to="/">Начало</Link>
            <Link to="/admin/login" className="btn btn-secondary btn-sm">
              Вход за преподаватели
            </Link>
          </nav>
        </div>
      </header>
      <main className="public-main">
        <Outlet />
      </main>
      <footer className="public-footer">
        <div className="public-footer-inner">
          <p>© {new Date().getFullYear()} Факултет по математика и информатика, Софийски университет</p>
        </div>
      </footer>
    </div>
  );
}
