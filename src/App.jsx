import { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext.jsx';
import { AuthProvider } from './contexts/AuthContext.jsx';
import StatusPage from './pages/StatusPage.jsx';

const AdminPage = lazy(() => import('./pages/AdminPage.jsx'));

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<StatusPage />} />
            <Route
              path="/sadmin/*"
              element={
                <Suspense fallback={
                  <div className="min-h-screen bg-th-bg flex items-center justify-center">
                    <div className="w-8 h-8 rounded-full border-2 border-th-accent border-t-transparent animate-spin" />
                  </div>
                }>
                  <AdminPage />
                </Suspense>
              }
            />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}
