import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import ScrollToTop from './components/ScrollToTop';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import { HelmetProvider } from 'react-helmet-async';
import { LanguageProvider } from '@/lib/LanguageContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import { Navigate } from 'react-router-dom';
import React, { Suspense, lazy } from 'react';
import Layout from './components/Layout';
import Home from './pages/Home';

// Lazy load secondary routes to make initial 2G payload tiny and instantaneous
const Events = lazy(() => import('./pages/Events'));
const EventDetails = lazy(() => import('./pages/EventDetails'));
const Tickets = lazy(() => import('./pages/Tickets'));
const Admin = lazy(() => import('./pages/Admin'));
const ScanTicket = lazy(() => import('./pages/ScanTicket'));
const Login = lazy(() => import('./pages/Login'));
const SignUp = lazy(() => import('./pages/SignUp'));
const ProgrammaticPage = lazy(() => import('./pages/ProgrammaticPage'));
const Privacy = lazy(() => import('./pages/Privacy'));
const Terms = lazy(() => import('./pages/Terms'));
const EventCalendar = lazy(() => import('./pages/EventCalendar'));
const Albums = lazy(() => import('./pages/Albums'));
const Favorites = lazy(() => import('./pages/Favorites'));
const Rentals = lazy(() => import('./pages/Rentals'));

const PageFallback = () => (
  <div className="min-h-[50vh] flex items-center justify-center bg-[#0a0a0f]">
    <div className="w-8 h-8 border-3 border-amber-500/20 border-t-amber-400 rounded-full animate-spin"></div>
  </div>
);

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-[#0a0a0f] z-50">
        <div className="w-8 h-8 border-3 border-amber-500/20 border-t-amber-400 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      // Redirect to login automatically
      navigateToLogin();
      return null;
    }
  }

  // Render the main app
  return (
    <Suspense fallback={<PageFallback />}>
      <Routes>
        {/* Admin has its own layout (sidebar) */}
        <Route path="/admin" element={<Admin />} />
        <Route path="/Admin" element={<Navigate to="/admin" replace />} />

        <Route element={<Layout />}>
          <Route path="/" element={<Navigate to="/home" replace />} />
          <Route path="/home" element={<Home />} />
          <Route path="/Home" element={<Navigate to="/home" replace />} />
          <Route path="/events" element={<Events />} />
          <Route path="/Events" element={<Navigate to="/events" replace />} />
          <Route path="/tickets" element={<Tickets />} />
          <Route path="/favorites" element={<Favorites />} />
          <Route path="/events/:eventId" element={<EventDetails />} />
          <Route path="/calendar" element={<EventCalendar />} />
          <Route path="/Calendar" element={<Navigate to="/calendar" replace />} />
          <Route path="/albums" element={<Albums />} />
          <Route path="/Albums" element={<Navigate to="/albums" replace />} />
          <Route path="/rentals" element={<Rentals />} />
          <Route path="/Rentals" element={<Navigate to="/rentals" replace />} />

          {/* Programmatic SEO Routes */}
          <Route path="/events/city/:value" element={<ProgrammaticPage type="city" />} />
          <Route path="/events/category/:value" element={<ProgrammaticPage type="category" />} />
          <Route path="/discover/:slug" element={<ProgrammaticPage type="discover" />} />

          <Route path="/privacy" element={<Privacy />} />
          <Route path="/terms" element={<Terms />} />

          <Route path="/scanticket" element={<ScanTicket />} />
          <Route path="/login" element={<Login />} />
          <Route path="/Login" element={<Navigate to="/login" replace />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="/SignUp" element={<Navigate to="/signup" replace />} />
        </Route>
        <Route path="*" element={<PageNotFound />} />
      </Routes>
    </Suspense>
  );
};


function App() {

  return (
    <HelmetProvider>
      <AuthProvider>
        <LanguageProvider>
          <QueryClientProvider client={queryClientInstance}>
            <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
              <ScrollToTop />
              <AuthenticatedApp />
            </Router>
            <Toaster />
          </QueryClientProvider>
        </LanguageProvider>
      </AuthProvider>
    </HelmetProvider>
  )
}

export default App