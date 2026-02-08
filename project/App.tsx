import React from 'react';
import '@radix-ui/themes/styles.css';
import { Theme } from '@radix-ui/themes';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

import Home from './src/pages/Home';
import Login from './src/pages/Login';

import Anomalies from './src/pages/Anomalies';
import Settings from './src/pages/Settings';
import ExecutionTracking from './src/pages/ExecutionTracking';
import DataDrivenManager from './src/pages/DataDrivenManager';
import ReleaseManager from './src/pages/ReleaseManager';
import TesterDashboard from './src/pages/TesterDashboard';
import TeamPerformancePage from './src/pages/TeamPerformancePage';
import NotFound from './src/pages/NotFound';


import UserManagement from './src/pages/UserManagement';
import Unauthorized from './src/pages/Unauthorized';

// Admin Pages
import AdminReleases from './src/pages/admin/AdminReleases';
import AdminCampaigns from './src/pages/admin/AdminCampaigns';
import AdminExecutions from './src/pages/admin/AdminExecutions';
import AdminAnomalies from './src/pages/admin/AdminAnomalies';
import AdminComments from './src/pages/admin/AdminComments';

import { AuthProvider } from './src/context/AuthContext';
import RoleGuard from './src/components/RoleGuard';


import { ThemeProvider } from './src/context/ThemeContext';

const App: React.FC = () => {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <Theme appearance="inherit" radius="large" scaling="100%">
        <AuthProvider>
          <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <main className="min-h-screen font-sans bg-background text-foreground transition-colors duration-300">

              <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/unauthorized" element={<Unauthorized />} />

                <Route path="/" element={
                  <RoleGuard allowedRoles={['ADMIN', 'MANAGER', 'TESTER']}>
                    <Home />
                  </RoleGuard>
                } />

                <Route path="/anomalies" element={
                  <RoleGuard allowedRoles={['ADMIN', 'MANAGER', 'TESTER']}>
                    <Anomalies />
                  </RoleGuard>
                } />

                <Route path="/manager" element={
                  <RoleGuard allowedRoles={['ADMIN', 'MANAGER']}>
                    <DataDrivenManager />
                  </RoleGuard>
                } />

                <Route path="/releases" element={
                  <RoleGuard allowedRoles={['ADMIN', 'MANAGER']}>
                    <ReleaseManager />
                  </RoleGuard>
                } />



                <Route path="/performance" element={
                  <RoleGuard allowedRoles={['ADMIN', 'MANAGER']}>
                    <TeamPerformancePage />
                  </RoleGuard>
                } />

                <Route path="/execution" element={
                  <RoleGuard allowedRoles={['ADMIN', 'TESTER', 'MANAGER']}>
                    <ExecutionTracking />
                  </RoleGuard>
                } />

                <Route path="/tester-dashboard" element={
                  <RoleGuard allowedRoles={['ADMIN', 'TESTER']}>
                    <TesterDashboard />
                  </RoleGuard>
                } />

                <Route path="/users" element={
                  <RoleGuard allowedRoles={['ADMIN']}>
                    <UserManagement />
                  </RoleGuard>
                } />

                <Route path="/settings" element={
                  <RoleGuard allowedRoles={['ADMIN', 'MANAGER']}>
                    <Settings />
                  </RoleGuard>
                } />

                {/* Admin Routes */}
                <Route path="/admin/releases" element={
                  <RoleGuard allowedRoles={['ADMIN']}>
                    <AdminReleases />
                  </RoleGuard>
                } />

                <Route path="/admin/campaigns" element={
                  <RoleGuard allowedRoles={['ADMIN']}>
                    <AdminCampaigns />
                  </RoleGuard>
                } />

                <Route path="/admin/executions" element={
                  <RoleGuard allowedRoles={['ADMIN']}>
                    <AdminExecutions />
                  </RoleGuard>
                } />

                <Route path="/admin/anomalies" element={
                  <RoleGuard allowedRoles={['ADMIN']}>
                    <AdminAnomalies />
                  </RoleGuard>
                } />

                <Route path="/admin/comments" element={
                  <RoleGuard allowedRoles={['ADMIN']}>
                    <AdminComments />
                  </RoleGuard>
                } />

                <Route path="*" element={<NotFound />} />
              </Routes>
              <ToastContainer
                position="top-right"
                autoClose={3000}
                newestOnTop
                closeOnClick
                pauseOnHover
                theme="dark"
              />
            </main>
          </Router>
        </AuthProvider>
      </Theme>
    </ThemeProvider>
  );
};

export default App;