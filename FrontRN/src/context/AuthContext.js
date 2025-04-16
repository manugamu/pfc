import React, { createContext, useState, useEffect } from 'react';
import EncryptedStorage from 'react-native-encrypted-storage';
import { isJwtExpired } from '../utils/jwtUtils';
import { logoutUser } from '../services/authService';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  
  const checkToken = async () => {
    try {
      const auth = await EncryptedStorage.getItem('auth');
      if (!auth) {
        setIsLoggedIn(false);
        return;
      }

      const { accessToken } = JSON.parse(auth);
      const expired = isJwtExpired(accessToken);
      if (expired) {
        await logoutUser();
        setIsLoggedIn(false);
      } else {
        setIsLoggedIn(true);
      }
    } catch (err) {
      console.error('Error validando token:', err);
      setIsLoggedIn(false);
    }
  };

  useEffect(() => {
    checkToken();
  }, []);

  return (
    <AuthContext.Provider value={{ isLoggedIn, setIsLoggedIn }}>
      {children}
    </AuthContext.Provider>
  );
};
