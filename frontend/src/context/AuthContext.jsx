import { useState, useEffect } from 'react';
import { getProfile } from '../services/api';

import { AuthContext } from './auth-context';

const PREFS_KEY = 'user_profile_prefs';

const getStoredPrefs = () => {
  try {
    return JSON.parse(localStorage.getItem(PREFS_KEY) || '{}');
  } catch {
    return {};
  }
};

const getUserPrefs = (email) => {
  if (!email) return {};
  const allPrefs = getStoredPrefs();
  return allPrefs[email] || {};
};

const saveUserPrefs = (email, patch) => {
  if (!email) return;
  const allPrefs = getStoredPrefs();
  allPrefs[email] = {
    ...(allPrefs[email] || {}),
    ...patch,
  };
  localStorage.setItem(PREFS_KEY, JSON.stringify(allPrefs));
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadUser = async () => {
      if (token) {
        try {
          const res = await getProfile();
          const apiUser = res.data.user;
          setUser({ ...apiUser, ...getUserPrefs(apiUser.email) });
        } catch (err) {
          if (err?.response && (err.response.status === 401 || err.response.status === 403)) {
            console.error('Session expired');
            localStorage.removeItem('token');
            setToken(null);
            setUser(null);
          } else {
            console.warn('Could not fetch profile, but token is kept.');
          }
        }
      }
      setIsLoading(false);
    };
    loadUser();
  }, [token]);

  const login = (authToken, userData) => {
    localStorage.setItem('token', authToken);
    setToken(authToken);
    setUser({ ...userData, ...getUserPrefs(userData.email) });
  };

  const updateUserProfile = (patch) => {
    setUser((prev) => {
      if (!prev) return prev;
      const next = { ...prev, ...patch };
      saveUserPrefs(prev.email, patch);
      return next;
    });
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, logout, updateUserProfile }}>
      {children}
    </AuthContext.Provider>
  );
};
