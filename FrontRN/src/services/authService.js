import EncryptedStorage from 'react-native-encrypted-storage';
import { getDeviceId } from './deviceService';
import { Alert } from 'react-native';
import { API_BASE_URL } from '../config'; 

let isRefreshing = false;
let refreshPromise = null;

export async function getValidAccessToken(navigation = null, setIsLoggedIn = null, setRole = null) {
  const stored = await EncryptedStorage.getItem('auth');
  if (!stored) return null;

  const { accessToken, refreshToken } = JSON.parse(stored);
  const isExpired = isJwtExpired(accessToken);
  if (!isExpired) return accessToken;

  if (isRefreshing) return refreshPromise;

  isRefreshing = true;
  refreshPromise = (async () => {
    try {
      const deviceId = await getDeviceId();
      console.log("➡️ Enviando para refresh:", { refreshToken, deviceId });

      const res = await fetch(
        `${API_BASE_URL}/api/auth/refresh`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken, deviceId }),
        }
      );

      if (!res.ok) throw new Error('Refresh token inválido');

      const {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
        username,
        profileImageUrl,
        id,
        role,
        fallaInfo,
        codigoFalla,
        fullName
      } = await res.json();

      await EncryptedStorage.setItem(
        'auth',
        JSON.stringify({
          accessToken: newAccessToken,
          refreshToken: newRefreshToken,
          username,
          profileImageUrl,
          id,
          role,
          fallaInfo,
          codigoFalla,
          fullName
        })
      );

      if (setRole) setRole(role);
      return newAccessToken;
    } catch (err) {
      console.error('Error renovando token:', err);
      await logoutUser(navigation, setIsLoggedIn, setRole);
      return null;
    } finally {
      isRefreshing = false;
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

export async function validateStoredToken(setIsLoggedIn) {
  try {
    const token = await getValidAccessToken(null, setIsLoggedIn);
    if (!token) return false;

    const res = await fetch(
      `${API_BASE_URL}/api/users/me`,
      {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    return res.ok;
  } catch (err) {
    console.error('❌ Error validando token al iniciar:', err);
    return false;
  }
}

export async function logoutUser(navigation = null, setIsLoggedIn = null, setRole = null) {
  try {
    await EncryptedStorage.removeItem('auth');
    console.log('🔒 Usuario desconectado: token eliminado');

    if (setIsLoggedIn) setIsLoggedIn(false);
    if (setRole) setRole(null);

    if (navigation) {
      Alert.alert('Sesión expirada', 'Por favor, inicia sesión de nuevo.');
    }
  } catch (e) {
    console.error('⚠️ Error eliminando token:', e);
  }
}

function isJwtExpired(token) {
  try {
    const [, payloadBase64] = token.split('.');
    const payload = JSON.parse(atob(payloadBase64));
    return payload.exp * 1000 < Date.now();
  } catch {
    return true;
  }
}
