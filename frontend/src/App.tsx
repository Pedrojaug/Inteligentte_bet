import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Layout from './components/Layout';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import CreatePool from './pages/CreatePool';
import PoolView from './pages/PoolView';
import PoolMatches from './pages/PoolMatches';
import LiveScores from './pages/LiveScores';
import JoinPool from './pages/JoinPool';
import Profile from './pages/Profile';
import RecoverAccount from './pages/RecoverAccount';
import { ReactNode } from 'react';

function PrivateRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <div className="loading-spinner"><div className="spinner" /></div>;
  }
  
  return user ? <>{children}</> : <Navigate to="/login" replace />;
}

function PublicRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <div className="loading-spinner"><div className="spinner" /></div>;
  }
  
  return !user ? <>{children}</> : <Navigate to="/dashboard" replace />;
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
      <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
      <Route path="/recover" element={<PublicRoute><RecoverAccount /></PublicRoute>} />
      <Route path="/join/:code" element={<JoinPool />} />

      {/* Protected routes */}
      <Route element={<PrivateRoute><Layout /></PrivateRoute>}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/create" element={<CreatePool />} />
        <Route path="/pool/:id" element={<PoolView />} />
        <Route path="/pool/:id/matches" element={<PoolMatches />} />
        <Route path="/live" element={<LiveScores />} />
        <Route path="/profile" element={<Profile />} />
      </Route>

      {/* Catch-all redirect */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
