import EncryptedStorage from 'react-native-encrypted-storage';
import { getDeviceId } from './deviceService'; 


export async function getValidAccessToken() {
  const stored = await EncryptedStorage.getItem('auth');
  if (!stored) return null;

  const { accessToken, refreshToken } = JSON.parse(stored);
  const isExpired = isJwtExpired(accessToken);
  if (!isExpired) return accessToken;

  try {
    const deviceId = await getDeviceId();
    const res = await fetch('http://10.0.2.2:5000/api/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken, deviceId }),
    });

    if (!res.ok) throw new Error('Refresh token inválido');

    const data = await res.json();
    await EncryptedStorage.setItem('auth', JSON.stringify(data));
    return data.accessToken;
  } catch (err) {
    console.error('Error renovando token:', err);
    return null;
  }
}


export async function validateStoredToken() {
  try {
    const token = await getValidAccessToken();
    if (!token) return false;

    const res = await fetch('http://10.0.2.2:5000/api/users/me', {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    });

    return res.ok;
  } catch (err) {
    console.error('❌ Error validando token al iniciar:', err);
    return false;
  }
}


export async function logoutUser() {
  try {
    await EncryptedStorage.removeItem('auth');
    console.log('🔒 Usuario desconectado: token eliminado');
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
