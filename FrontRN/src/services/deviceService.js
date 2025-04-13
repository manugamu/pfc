import EncryptedStorage from 'react-native-encrypted-storage';
import uuid from 'react-native-uuid';

export async function getDeviceId() {
  let deviceId = await EncryptedStorage.getItem('deviceId');
  if (!deviceId) {
    deviceId = uuid.v4();
    await EncryptedStorage.setItem('deviceId', deviceId);
  }
  return deviceId;
}
