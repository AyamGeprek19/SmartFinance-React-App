import React, { useEffect, useState } from 'react';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import { apiRequest } from './lib/api';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiRequest('/auth/me')
      .catch(() => null)
      .then((data) => {
        if (data?.user) {
          setUser(data.user);
          setIsAuthenticated(true);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const handleLogout = async () => {
    await apiRequest('/auth/logout', { method: 'POST' });
    setUser(null);
    setIsAuthenticated(false);
  };

  if (loading) return null;

  return (
    <div className="dark">
      {isAuthenticated ? (
        <Dashboard user={user} onLogout={handleLogout} />
      ) : (
        <Login onLogin={(authenticatedUser) => {
          setUser(authenticatedUser);
          setIsAuthenticated(true);
        }} />
      )}
    </div>
  );
}