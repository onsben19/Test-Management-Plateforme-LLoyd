import React, { lazy } from 'react';
import '@radix-ui/themes/styles.css';
import { Theme } from '@radix-ui/themes';
import ThemeToastContainer from './src/components/ThemeToastContainer';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './src/context/AuthContext';
import RoleGuard from './src/components/RoleGuard';
import { ThemeProvider } from './src/context/ThemeContext';
import { SidebarProvider } from './src/context/SidebarContext';

// Pages chargées uniquement à la navigation (code splitting)
const Home = lazy(() => import('./src/pages/Home'));
const Login = lazy(() => import('./src/pages/Login'));
const Anomalies = lazy(() => import('./src/pages/Anomalies'));
const ExecutionTracking = lazy(() => import('./src/pages/ExecutionTracking'));
const DataDrivenManager = lazy(() => import('./src/pages/DataDrivenManager'));
const ReleaseManager = lazy(() => import('./src/pages/ReleaseManager'));
const ProjectPortfolio = lazy(() => import('./src/pages/ProjectPortfolio'));
const TesterDashboard = lazy(() => import('./src/pages/TesterDashboard'));
const NotFound = lazy(() => import('./src/pages/NotFound'));
const Analytics = lazy(() => import('./src/pages/Analytics'));
const QANewsPage = lazy(() => import('./src/pages/QANewsPage'));
const CatchupPlanPage = lazy(() => import('./src/pages/CatchupPlanPage'));
const Profile = lazy(() => import('./src/pages/Profile'));
const UserManagement = lazy(() => import('./src/pages/UserManagement'));
const Unauthorized = lazy(() => import('./src/pages/Unauthorized'));
const EmailDashboard = lazy(() => import('./src/pages/EmailDashboard'));
const ChatCenter = lazy(() => import('./src/pages/ChatCenter'));

// Admin pages
const AdminReleases = lazy(() => import('./src/pages/admin/AdminReleases'));
const AdminCampaigns = lazy(() => import('./src/pages/admin/AdminCampaigns'));
const AdminExecutions = lazy(() => import('./src/pages/admin/AdminExecutions'));
const AdminAnomalies = lazy(() => import('./src/pages/admin/AdminAnomalies'));
const AdminComments = lazy(() => import('./src/pages/admin/AdminComments'));
const AdminEmails = lazy(() => import('./src/pages/admin/AdminEmails'));
const AdminAnalytics = lazy(() => import('./src/pages/admin/AdminAnalytics'));
const AdminDashboard = lazy(() => import('./src/pages/admin/AdminDashboard'));
const AdminQANews = lazy(() => import('./src/pages/admin/AdminQANews'));
const ManagerDashboard = lazy(() => import('./src/pages/manager/ManagerDashboard'));

const PageLoader = () => (
  <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 dark:bg-[#060a16] gap-4">
    <div className="w-10 h-10 border-4 border-violet-500/20 border-t-violet-500 rounded-full animate-spin" />
    <span className="text-slate-400 dark:text-slate-500 dark:text-white/30 text-xs font-semibold tracking-widest uppercase animate-pulse">Chargement...</span>
  </div>
);

const App: React.FC = () => {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <Theme appearance="inherit" radius="large" scaling="100%">
        <AuthProvider>
          <SidebarProvider>
            <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
              <main className="min-h-screen font-sans bg-background text-foreground transition-colors duration-300">
                <React.Suspense fallback={<PageLoader />}>
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

                    <Route path="/manager/dashboard" element={
                      <RoleGuard allowedRoles={['ADMIN', 'MANAGER']}>
                        <ManagerDashboard />
                      </RoleGuard>
                    } />

                    <Route path="/manager" element={
                      <RoleGuard allowedRoles={['ADMIN', 'MANAGER']}>
                        <DataDrivenManager />
                      </RoleGuard>
                    } />

                    <Route path="/manager/optimization/:campaignId" element={
                      <RoleGuard allowedRoles={['ADMIN', 'MANAGER']}>
                        <CatchupPlanPage />
                      </RoleGuard>
                    } />

                    <Route path="/portfolio" element={
                      <RoleGuard allowedRoles={['ADMIN', 'MANAGER']}>
                        <ProjectPortfolio />
                      </RoleGuard>
                    } />

                    <Route path="/releases" element={
                      <RoleGuard allowedRoles={['ADMIN', 'MANAGER']}>
                        <ReleaseManager />
                      </RoleGuard>
                    } />

                    <Route path="/analytics" element={
                      <RoleGuard allowedRoles={['ADMIN', 'MANAGER', 'TESTER']}>
                        <Analytics />
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

                    <Route path="/qa-intelligence" element={
                      <RoleGuard allowedRoles={['ADMIN', 'MANAGER', 'TESTER']}>
                        <QANewsPage />
                      </RoleGuard>
                    } />

                    <Route path="/users" element={
                      <RoleGuard allowedRoles={['ADMIN']}>
                        <UserManagement />
                      </RoleGuard>
                    } />

                    <Route path="/profile" element={
                      <RoleGuard allowedRoles={['ADMIN', 'MANAGER', 'TESTER']}>
                        <Profile />
                      </RoleGuard>
                    } />

                    <Route path="/messages" element={
                      <RoleGuard allowedRoles={['ADMIN', 'MANAGER', 'TESTER']}>
                        <EmailDashboard />
                      </RoleGuard>
                    } />

                    <Route path="/chat" element={
                      <RoleGuard allowedRoles={['ADMIN', 'MANAGER', 'TESTER']}>
                        <ChatCenter />
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
                    <Route path="/management/messages" element={
                      <RoleGuard allowedRoles={['ADMIN']}>
                        <AdminEmails />
                      </RoleGuard>
                    } />
                    <Route path="/admin/dashboard" element={
                      <RoleGuard allowedRoles={['ADMIN']}>
                        <AdminDashboard />
                      </RoleGuard>
                    } />
                    <Route path="/management/analytics" element={
                      <RoleGuard allowedRoles={['ADMIN']}>
                        <AdminAnalytics />
                      </RoleGuard>
                    } />
                    <Route path="/admin/qa-intelligence" element={
                      <RoleGuard allowedRoles={['ADMIN']}>
                        <AdminQANews />
                      </RoleGuard>
                    } />

                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </React.Suspense>
                <ThemeToastContainer />
              </main>
            </Router>
          </SidebarProvider>
        </AuthProvider>
      </Theme>
    </ThemeProvider>
  );
};

export default App;
