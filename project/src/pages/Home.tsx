import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Home = () => {
  const { user } = useAuth();

  if (!user) return <Navigate to="/login" />;

  if (user.role === 'ADMIN') return <Navigate to="/admin/executions" />;

  // Managers can also see Releases or Execution. Defaulting to Execution as it's the main work.
  if (user.role === 'MANAGER') return <Navigate to="/execution" />;

  if (user.role === 'TESTER') return <Navigate to="/tester-dashboard" />;

  // Fallback
  return <Navigate to="/unauthorized" />;
};

export default Home;