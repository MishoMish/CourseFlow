import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './stores/authStore';

// Public pages
import PublicLayout from './layouts/PublicLayout';
import HomePage from './pages/public/HomePage';
import CoursePage from './pages/public/CoursePage';
import ModulePage from './pages/public/ModulePage';
import TopicPage from './pages/public/TopicPage';
import LessonPage from './pages/public/LessonPage';

// Admin pages
import AdminLayout from './layouts/AdminLayout';
import LoginPage from './pages/admin/LoginPage';
import DashboardPage from './pages/admin/DashboardPage';
import CoursesManagePage from './pages/admin/CoursesManagePage';
import CourseEditPage from './pages/admin/CourseEditPage';
import LessonEditPage from './pages/admin/LessonEditPage';
import UsersManagePage from './pages/admin/UsersManagePage';

function ProtectedRoute({ children }) {
  const { token } = useAuthStore();
  if (!token) return <Navigate to="/admin/login" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      {/* Public routes */}
      <Route element={<PublicLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/courses/:slug" element={<CoursePage />} />
        <Route path="/courses/:slug/modules/:moduleSlug" element={<ModulePage />} />
        <Route path="/courses/:slug/modules/:moduleSlug/topics/:topicSlug" element={<TopicPage />} />
        <Route path="/courses/:slug/modules/:moduleSlug/topics/:topicSlug/lessons/:lessonSlug" element={<LessonPage />} />
      </Route>

      {/* Admin routes */}
      <Route path="/admin/login" element={<LoginPage />} />
      <Route path="/admin" element={<ProtectedRoute><AdminLayout /></ProtectedRoute>}>
        <Route index element={<DashboardPage />} />
        <Route path="courses" element={<CoursesManagePage />} />
        <Route path="courses/:courseId" element={<CourseEditPage />} />
        <Route path="lessons/:lessonId" element={<LessonEditPage />} />
        <Route path="users" element={<UsersManagePage />} />
      </Route>
    </Routes>
  );
}
