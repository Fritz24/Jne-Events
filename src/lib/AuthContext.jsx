import React, { createContext, useState, useContext, useEffect } from 'react';
import { supabase } from './supabase';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [authError, setAuthError] = useState(null);
  const isInitialLoadDone = React.useRef(false);

  useEffect(() => {
    // 1. Initial session check
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        fetchUserProfile(session.user);
      } else {
        setIsLoadingAuth(false);
        isInitialLoadDone.current = true;
      }
    });

    // 2. Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        fetchUserProfile(session.user);
      } else {
        setUser(null);
        setIsAuthenticated(false);
        setIsLoadingAuth(false);
        isInitialLoadDone.current = true;
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserProfile = async (authUser) => {
    try {
      // Prevent throwing a full-page spinner if we're just doing a background token refresh on tab focus
      if (!isInitialLoadDone.current) {
        setIsLoadingAuth(true);
      }

      // In the ecosystem, the central users table is 'users' and links via 'auth_id'
      const { data: profile, error } = await supabase
        .from('users')
        .select('*')
        .eq('auth_id', authUser.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Profile fetch error:', error);
      }

      // Map ecosystem properties to app user object
      // is_super_admin grants 'admin' role in JnE Events
      const isAdmin = profile?.is_super_admin === true || String(profile?.is_super_admin) === 'true';
      const assignedRole = isAdmin ? 'admin' : 'customer';

      setUser({
        ...authUser,
        role: assignedRole,
        full_name: profile?.name || authUser.user_metadata?.full_name,
        profile_data: profile
      });

      setIsAuthenticated(true);
    } catch (err) {
      console.error('Profile fetch failed:', err);
    } finally {
      setIsLoadingAuth(false);
      isInitialLoadDone.current = true;
    }
  };

  const loginWithEmail = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;

    return data;
  };

  const signUp = async (email, password, metadata) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: metadata }
    });
    if (error) throw error;
    return data;
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  const navigateToLogin = () => {
    window.location.href = '/Login';
  };

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated,
      isLoadingAuth,
      authError,
      loginWithEmail,
      signUp,
      signOut,
      logout: signOut,
      navigateToLogin
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
