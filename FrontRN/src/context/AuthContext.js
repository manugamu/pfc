import React, { createContext, useState, useEffect } from 'react';
import EncryptedStorage from 'react-native-encrypted-storage';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [isLoggedIn, setIsLoggedIn] = useState(null); // null mientras no se sabe
  const [role, setRole] = useState(null); // 👈 Añadido

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const authData = await EncryptedStorage.getItem('auth');
        if (authData) {
          const parsed = JSON.parse(authData);
          setIsLoggedIn(!!parsed.accessToken);
          setRole(parsed.role || null); // 👈 Establece role si existe
        } else {
          setIsLoggedIn(false);
          setRole(null);
        }
      } catch (e) {
        console.error('Error al validar sesión en AuthContext:', e);
        setIsLoggedIn(false);
        setRole(null);
      }
    };
    checkAuth();
  }, []);

  return (
    <AuthContext.Provider value={{ isLoggedIn, setIsLoggedIn, role, setRole }}>
      {children}
    </AuthContext.Provider>
  );
};
