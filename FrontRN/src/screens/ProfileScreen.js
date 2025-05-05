import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Image,
  ScrollView,
  SafeAreaView,
  ImageBackground,
  FlatList
} from 'react-native';
import EncryptedStorage from 'react-native-encrypted-storage';
import { AuthContext } from '../context/AuthContext';
import { getValidAccessToken, logoutUser } from '../services/authService';
import * as ImagePicker from 'react-native-image-picker';
import { useBackground } from '../context/BackgroundContext';

export default function ProfileScreen({ setProfileImageUrl, navigation }) {
  const { setIsLoggedIn } = useContext(AuthContext);
  const { backgroundImage, changeBackground, fondos } = useBackground();

  const [profile, setProfile] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [codigoFalla, setCodigoFalla] = useState('');
  const [checkingCodigo, setCheckingCodigo] = useState(false);
  const [codigoValido, setCodigoValido] = useState(null);
  const [fullName, setFullName] = useState('');

  const fetchProfile = async () => {
    setLoadingProfile(true);
    try {
      const token = await getValidAccessToken(navigation, setIsLoggedIn);
      if (!token) return;
      const res = await fetch('http://10.0.2.2:5000/api/users/me', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setProfile(data);
      setCodigoFalla(data.codigoFalla || '');
      setFullName(data.fullName || '');
    } catch {
      Alert.alert('Error', 'No se pudo cargar el perfil');
    } finally {
      setLoadingProfile(false);
    }
  };

  useEffect(() => { fetchProfile(); }, []);

  const verificarCodigo = async code => {
    setCheckingCodigo(true);
    setCodigoValido(null);
    try {
      const res = await fetch(`http://10.0.2.2:5000/api/falla/codigo/${code}`);
      setCodigoValido(res.ok);
    } catch {
      setCodigoValido(false);
    } finally {
      setCheckingCodigo(false);
    }
  };

  const handleSolicitarUnion = async () => {
    try {
      const token = await getValidAccessToken(navigation, setIsLoggedIn);
      if (!token) return;
      const res = await fetch('http://10.0.2.2:5000/api/users/solicitar-union', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ codigoFalla: codigoFalla.trim().toUpperCase() })
      });
      if (!res.ok) throw new Error();
      Alert.alert('✅ Solicitud enviada', 'Pronto la falla revisará tu petición.');
      setCodigoFalla('');
      setCodigoValido(null);
    } catch {
      Alert.alert('Error', 'No se pudo enviar la solicitud.');
    }
  };

  const handleSelectPhoto = () => {
    ImagePicker.launchImageLibrary({ mediaType: 'photo' }, async response => {
      if (response.didCancel || response.errorCode) return;
      try {
        const { uri, fileName, type } = response.assets[0];
        const token = await getValidAccessToken(navigation, setIsLoggedIn);
        if (!token) return;

        const formData = new FormData();
        formData.append('file', { uri, name: fileName || 'profile.jpg', type: type || 'image/jpeg' });

        const uploadRes = await fetch('http://10.0.2.2:5000/api/images/upload', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' },
          body: formData
        });
        if (!uploadRes.ok) throw new Error();

        const imageUrl = await uploadRes.text();
        const updateRes = await fetch('http://10.0.2.2:5000/api/users/profile-image', {
          method: 'PUT',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ profileImageUrl: imageUrl })
        });
        if (!updateRes.ok) throw new Error();

        const stored = await EncryptedStorage.getItem('auth');
        if (stored) {
          const parsed = JSON.parse(stored);
          parsed.profileImageUrl = imageUrl;
          await EncryptedStorage.setItem('auth', JSON.stringify(parsed));
          setProfileImageUrl?.(imageUrl);
        }
        Alert.alert('Perfil actualizado', 'Tu imagen se ha subido con éxito.');
        setProfile(prev => ({ ...prev, profileImageUrl: imageUrl }));
      } catch {
        Alert.alert('Error', 'No se pudo actualizar la foto');
      }
    });
  };

  const handleLogout = () => {
    logoutUser(null, setIsLoggedIn);
  };

  if (loadingProfile) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#fd882d" />
      </View>
    );
  }

  const fondoKeys = Object.keys(fondos);

  return (
    <ImageBackground source={backgroundImage} style={styles.background}>
      <View style={styles.overlay}>
        <SafeAreaView style={styles.container}>
          <ScrollView contentContainerStyle={styles.content}>
            <Text style={styles.title}>Perfil</Text>

            {profile && (
              <>
                <TouchableOpacity onPress={handleSelectPhoto}>
                  <Image
                    source={
                      profile.profileImageUrl
                        ? { uri: profile.profileImageUrl }
                        : require('../assets/images/default-avatar.png')
                    }
                    style={styles.avatar}
                  />
                </TouchableOpacity>
                <Text style={styles.username}>{profile.username}</Text>
                <Text style={styles.email}>{profile.email}</Text>
              </>
            )}

            <Text style={styles.sectionTitle}>Fondo de pantalla</Text>
            <FlatList
              horizontal
              data={fondoKeys}
              keyExtractor={(item) => item}
              contentContainerStyle={{ paddingVertical: 8 }}
              renderItem={({ item }) => (
                <TouchableOpacity onPress={() => changeBackground(item)}>
                  <Image
                    source={fondos[item]}
                    style={{
                      width: 80,
                      height: 80,
                      marginRight: 10,
                      borderRadius: 12,
                      borderWidth: 2,
                      borderColor: backgroundImage === fondos[item] ? '#fd882d' : 'transparent'
                    }}
                  />
                </TouchableOpacity>
              )}
              showsHorizontalScrollIndicator={false}
            />

            {profile?.role === 'FALLA' && (
              <View style={styles.fallaBox}>
                <Text style={styles.fallaText}>
                  <Text style={styles.fallaLabel}>Código: </Text>
                  {profile.fallaInfo?.fallaCode || '—'}
                </Text>
                <Text style={styles.fallaText}>
                  <Text style={styles.fallaLabel}>Nombre: </Text>
                  {fullName || '—'}
                </Text>
                {profile.fallaInfo?.profileImageUrl && (
                  <Image source={{ uri: profile.fallaInfo.profileImageUrl }} style={styles.fallaAvatarLarge} />
                )}
              </View>
            )}

            {profile?.role === 'USER' && (
              <View style={styles.joinBox}>
                <Text style={styles.joinTitle}>Únete a tu falla</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Código de falla"
                  value={codigoFalla}
                  autoCapitalize="characters"
                  onChangeText={text => {
                    setCodigoFalla(text);
                    if (text.length >= 3) verificarCodigo(text.trim().toUpperCase());
                  }}
                />
                {checkingCodigo ? (
                  <ActivityIndicator size="small" />
                ) : codigoValido != null ? (
                  <Text style={{ color: codigoValido ? 'lime' : 'tomato' }}>
                    {codigoValido ? '✅ Código válido' : '❌ Código no válido'}
                  </Text>
                ) : null}
                <TouchableOpacity
                  style={[styles.button, !codigoValido && styles.buttonDisabled]}
                  disabled={!codigoValido}
                  onPress={handleSolicitarUnion}
                >
                  <Text style={styles.buttonText}>Solicitar unión</Text>
                </TouchableOpacity>
              </View>
            )}

            <TouchableOpacity style={styles.logout} onPress={handleLogout}>
              <Text style={styles.logoutText}>Cerrar sesión</Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: { flex: 1 },
  overlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.23)' },
  loading: {
    flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#121212'
  },
  container: { flex: 1 },
  content: { alignItems: 'center', padding: 20 },
  title: {
    fontSize: 24, fontWeight: 'bold', color: '#fff', marginBottom: 16
  },
  avatar: {
    width: 120, height: 120, borderRadius: 60, borderWidth: 2,
    borderColor: '#fd882d', marginBottom: 12
  },
  username: {
    fontSize: 18, fontWeight: '600', color: '#fff'
  },
  email: {
    fontSize: 14, color: '#fff', marginBottom: 24
  },
  sectionTitle: {
    color: '#fd882d', fontSize: 16, fontWeight: '600', marginBottom: 8, alignSelf: 'flex-start'
  },
  fallaBox: {
    width: '100%', padding: 16, backgroundColor: '#1f1f1f',
    borderRadius: 12, alignItems: 'center', marginBottom: 24
  },
  fallaText: {
    color: '#fff', fontSize: 16, marginBottom: 4
  },
  fallaLabel: {
    fontWeight: '600'
  },
  fallaAvatarLarge: {
    width: 80, height: 80, borderRadius: 40, marginTop: 12
  },
  joinBox: {
    width: '100%', padding: 16, backgroundColor: '#1f1f1f',
    borderRadius: 12, alignItems: 'center', marginBottom: 24
  },
  joinTitle: {
    color: '#fd882d', fontSize: 16, marginBottom: 8, fontWeight: '600'
  },
  input: {
    width: '80%', backgroundColor: '#2c2c2c', color: '#fff',
    padding: 10, borderRadius: 8, marginBottom: 8
  },
  button: {
    width: '80%', backgroundColor: '#fd882d',
    paddingVertical: 12, borderRadius: 8, marginTop: 8
  },
  buttonDisabled: {
    backgroundColor: '#555'
  },
  buttonText: {
    color: '#fff', textAlign: 'center', fontWeight: '600'
  },
  logout: {
    marginTop: 40
  },
  logoutText: {
    color: '#d00', fontSize: 16
  }
});
