import React from 'react';
import { Outlet, Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { FiBookOpen, FiHome, FiBook, FiUsers, FiLogOut, FiUser } from 'react-icons/fi';
import './AdminLayout.css';

export default function AdminLayout() {
  const { user, logout, isSuperAdmin } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/admin/login');
  };

  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <div className="admin-sidebar-header">
          <Link to="/admin" className="admin-logo">
            <FiBookOpen size={22} />
            <span>ФМИ Курсове</span>
          </Link>
        </div>

        <nav className="admin-nav">
          <NavLink to="/admin" end className={({ isActive }) => `admin-nav-item ${isActive ? 'active' : ''}`}>
            <FiHome size={18} />
            <span>Табло</span>
          </NavLink>
          <NavLink to="/admin/courses" className={({ isActive }) => `admin-nav-item ${isActive ? 'active' : ''}`}>
            <FiBook size={18} />
            <span>Курсове</span>
          </NavLink>
          {isSuperAdmin() && (
            <NavLink to="/admin/users" className={({ isActive }) => `admin-nav-item ${isActive ? 'active' : ''}`}>
              <FiUsers size={18} />
              <span>Потребители</span>
            </NavLink>
          )}
        </nav>

        <div className="admin-sidebar-footer">
          <div className="admin-user-info">
            <FiUser size={16} />
            <div>
              <div className="admin-user-name">{user?.name}</div>
              <div className="admin-user-role">
                {user?.role === 'super_admin' ? 'Супер админ' : user?.role === 'admin' ? 'Преподавател' : 'Асистент'}
              </div>
            </div>
          </div>
          <button onClick={handleLogout} className="btn btn-ghost btn-sm" style={{ width: '100%', justifyContent: 'center' }}>
            <FiLogOut size={16} />
            Изход
          </button>
        </div>
      </aside>

      <main className="admin-main">
        <Outlet />
      </main>
    </div>
  );
}
