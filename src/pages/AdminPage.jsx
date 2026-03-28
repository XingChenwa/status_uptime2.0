import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext.jsx';
import AdminSetup from './AdminSetup.jsx';
import AdminLogin from './AdminLogin.jsx';
import AdminDashboard from './AdminDashboard.jsx';

export default function AdminPage() {
  const { isAdmin, verifyToken, token } = useAuth();
  const [isSetup, setIsSetup] = useState(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    (async () => {
      const res = await fetch('/api/sadmin/check-setup');
      const data = await res.json();
      setIsSetup(data.isSetup);
      if (data.isSetup && token) await verifyToken(token);
      setChecking(false);
    })();
  }, []);

  if (checking) {
    return (
      <div className="min-h-screen bg-th-bg flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-th-accent border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!isSetup) return <AdminSetup onSetupComplete={() => setIsSetup(true)} />;
  if (!isAdmin) return <AdminLogin />;
  return <AdminDashboard />;
}
