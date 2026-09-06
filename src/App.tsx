import { useEffect, useState } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { Layout } from '@/components/Layout';
import { Dashboard } from '@/pages/Dashboard';
import { Family } from '@/pages/Family';
import { MemberDetail } from '@/pages/MemberDetail';
import { Collections } from '@/pages/Collections';
import { Analytics } from '@/pages/Analytics';
import { Settings } from '@/pages/Settings';
import { Login } from '@/pages/Login';

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setChecked(true);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  if (!checked) return null; // brief flash-avoidance; swap for a splash/skeleton if desired

  if (!session) {
    return <Login onSignedIn={() => {}} />;
  }

  return (
    <HashRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/family" element={<Family />} />
          <Route path="/family/:memberId" element={<MemberDetail />} />
          <Route path="/collections" element={<Collections />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}
