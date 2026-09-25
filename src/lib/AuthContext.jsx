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
    // Safety fallback: ensure initial loading state NEVER freezes the app longer than 2.5s
    const safetyTimer = setTimeout(() => {
      setIsLoadingAuth(false);
      isInitialLoadDone.current = true;
    }, 2500);

    // 1. Initial session check with catch
    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        if (session) {
          fetchUserProfile(session.user).finally(() => clearTimeout(safetyTimer));
        } else {
          setIsLoadingAuth(false);
          isInitialLoadDone.current = true;
          clearTimeout(safetyTimer);
        }
      })
      .catch((err) => {
        console.warn("Initial auth session check error:", err);
        setIsLoadingAuth(false);
        isInitialLoadDone.current = true;
        clearTimeout(safetyTimer);
      });

    // 2. Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      clearTimeout(safetyTimer);
      if (session) {
        fetchUserProfile(session.user);
      } else {
        setUser(null);
        setIsAuthenticated(false);
        setIsLoadingAuth(false);
        isInitialLoadDone.current = true;
      }
    });

    return () => {
      clearTimeout(safetyTimer);
      subscription?.unsubscribe();
    };
  }, []);

  const fetchUserProfile = async (authUser) => {
    try {
      if (!isInitialLoadDone.current) {
        setIsLoadingAuth(true);
      }

      // Add a 3.5s timeout so a slow ecosystem users query never freezes the app
      const profilePromise = supabase
        .from('users')
        .select('*')
        .eq('auth_id', authUser.id)
        .single();

      const timeoutPromise = new Promise((resolve) => setTimeout(() => resolve({ data: null, error: null }), 3500));
      const { data: profile } = await Promise.race([profilePromise, timeoutPromise]);

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
      console.warn('Profile fetch failed, using fallback:', err);
      setUser(authUser);
      setIsAuthenticated(true);
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
