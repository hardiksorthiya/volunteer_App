import React from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import './App.css';

// Context
import { SidebarProvider } from './contexts/SidebarContext';

// Components
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Footer from './components/Footer';
import { SidebarWrapper } from './components/SidebarWrapper';
import Home from './components/Home';
import AIChatFloatingWidget from './components/AIChatFloatingWidget';

// Pages
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import AdminDashboard from './pages/AdminDashboard';
import Chat from './pages/Chat';
import ListUser from './pages/ListUsers';
import Activities from './pages/Activities';
import ActivityDetail from './pages/ActivityDetail';
import AddActivity from './pages/AddActivity';
import EditActivity from './pages/EditActivity';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import RoleManagement from './pages/RoleManagement';
import PermissionsManagement from './pages/PermissionsManagement';
import Profile from './pages/Profile';
import EditProfile from './pages/EditProfile';
import PrivacyPolicy from './pages/PrivacyPolicy';
import TermsConditions from './pages/TermsConditions';
import HelpSupport from './pages/HelpSupport';
import HourTargets from './pages/HourTargets';

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

// Component to conditionally show Sidebar and Header
const AppContent = () => {
  const location = useLocation();
  const token = localStorage.getItem('token');
  const isAuthPage = location.pathname === '/login' || location.pathname === '/register' || location.pathname === '/forgot-password' || location.pathname.startsWith('/reset-password');
  const showLayout = token && !isAuthPage;

  return (
    <div className="App">
      {showLayout && (
        <SidebarWrapper>
          <Sidebar />
          <Header />
          <Footer />
        </SidebarWrapper>
      )}
      <Routes>
        <Route path="/" element={token ? <Navigate to="/dashboard" replace /> : <Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/admin-dashboard" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
        <Route path="/users" element={<ProtectedRoute><ListUser /></ProtectedRoute>} />
        <Route path="/permissions" element={<ProtectedRoute><PermissionsManagement /></ProtectedRoute>} />
        <Route path="/roles" element={<ProtectedRoute><RoleManagement /></ProtectedRoute>} />
        <Route path="/chat" element={<ProtectedRoute><Chat /></ProtectedRoute>} />
        <Route path="/activities" element={<ProtectedRoute><Activities /></ProtectedRoute>} />
        <Route path="/activities/add" element={<ProtectedRoute><AddActivity /></ProtectedRoute>} />
        <Route path="/activities/:id/edit" element={<ProtectedRoute><EditActivity /></ProtectedRoute>} />
        <Route path="/activities/:id" element={<ProtectedRoute><ActivityDetail /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
        <Route path="/profile/edit" element={<ProtectedRoute><EditProfile /></ProtectedRoute>} />
        <Route path="/privacy-policy" element={<ProtectedRoute><PrivacyPolicy /></ProtectedRoute>} />
        <Route path="/terms-conditions" element={<ProtectedRoute><TermsConditions /></ProtectedRoute>} />
        <Route path="/help-support" element={<ProtectedRoute><HelpSupport /></ProtectedRoute>} />
        <Route path="/hour-targets" element={<ProtectedRoute><HourTargets /></ProtectedRoute>} />
        <Route path="/history" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to={token ? "/dashboard" : "/login"} replace />} />
      </Routes>
      <AIChatFloatingWidget />
    </div>
  );
};

function App() {
  return (
    <Router>
      <SidebarProvider>
        <AppContent />
      </SidebarProvider>
    </Router>
  );
}

export default App;

