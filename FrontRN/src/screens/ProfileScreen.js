import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Button,
  StyleSheet,
  Alert,
  Image,
  TouchableOpacity
} from 'react-native';
import EncryptedStorage from 'react-native-encrypted-storage';
import { getValidAccessToken } from '../services/authService';
import * as ImagePicker from 'react-native-image-picker'; 

export default function ProfileScreen({ setIsLoggedIn, setProfileImageUrl, navigation }) {
  const [profile, setProfile] = useState(null);

  const fetchProfile = async () => {
    try {
      const token = await getValidAccessToken();
      if (!token) throw new Error('No hay token');

      const res = await fetch('http://10.0.2.2:5000/api/users/me', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) {
        Alert.alert('Error', 'No se pudo cargar el perfil');
        return;
      }
      const data = await res.json();
      setProfile(data);
    } catch (err) {
      console.error('Error fetching profile:', err);
      Alert.alert('Error', 'No se pudo cargar el perfil');
    }
  };

  const handleSelectPhoto = () => {
    const options = { mediaType: 'photo' };
    ImagePicker.launchImageLibrary(options, async (response) => {
      if (response.didCancel) {
        console.log('Usuario canceló la selección de imagen');
      } else if (response.errorCode) {
        console.log('ImagePicker Error: ', response.errorMessage);
      } else {
        const asset = response.assets[0]; 
        const { uri, fileName, type } = asset;
        try {
          const token = await getValidAccessToken();
          if (!token) throw new Error('No hay token');

          const formData = new FormData();
          formData.append('file', {
            uri,
            name: fileName || 'profile.jpg',
            type: type || 'image/jpeg',
          });

          const uploadRes = await fetch('http://10.0.2.2:5000/api/images/upload', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'multipart/form-data',
            },
            body: formData,
          });

          if (!uploadRes.ok) {
            Alert.alert('Error', 'No se pudo subir la imagen');
            return;
          }

          const imageUrl = await uploadRes.text();
          console.log('URL de imagen subida:', imageUrl);

          const updateRes = await fetch('http://10.0.2.2:5000/api/users/profile-image', {
            method: 'PUT',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ profileImageUrl: imageUrl }),
          });

          if (!updateRes.ok) {
            Alert.alert('Error', 'No se pudo actualizar el usuario con la imagen');
            return;
          }

          const stored = await EncryptedStorage.getItem('auth');
          if (stored) {
            const parsed = JSON.parse(stored);
            parsed.profileImageUrl = imageUrl;
            await EncryptedStorage.setItem('auth', JSON.stringify(parsed));
            if (setProfileImageUrl) {
              setProfileImageUrl(imageUrl);
            }
          }

          Alert.alert('Perfil actualizado', 'Tu imagen se ha subido con éxito.');
          fetchProfile();

        } catch (error) {
          console.error('Error uploading image:', error);
          Alert.alert('Error', 'No se pudo subir la imagen');
        }
      }
    });
  };

  const handleLogout = async () => {
    try {
      const token = await getValidAccessToken();
      if (token) {
        await fetch('http://10.0.2.2:5000/api/auth/logout', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
      }
      await EncryptedStorage.removeItem('auth');
      setIsLoggedIn(false);
    } catch (error) {
      console.error('❌ Error al cerrar sesión:', error);
      Alert.alert('Error', 'No se pudo cerrar sesión de forma segura');
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.text}>Perfil</Text>
      {profile && (
        <>
          <Image
            source={profile.profileImageUrl ? { uri: profile.profileImageUrl } : require('../assets/images/default-avatar.png')}
            style={styles.avatar}
          />
          <Text style={styles.label}>Nombre de usuario: {profile.username}</Text>
          <Text style={styles.label}>Email: {profile.email}</Text>
        </>
      )}
      <Button title="Subir foto de perfil" onPress={handleSelectPhoto} />
      <View style={{ marginTop: 20 }}>
        <Button title="Cerrar sesión" onPress={handleLogout} color="#d00" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 16 },
  text: { fontSize: 24, fontWeight: 'bold', marginBottom: 20 },
  avatar: { width: 120, height: 120, borderRadius: 60, marginBottom: 10 },
  label: { fontSize: 16, marginBottom: 5 },
});
