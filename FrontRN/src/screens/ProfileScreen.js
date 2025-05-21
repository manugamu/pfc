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
import { Dimensions } from 'react-native';
const SCREEN_WIDTH = Dimensions.get('window').width;
import { AuthContext } from '../context/AuthContext';
import { getValidAccessToken, logoutUser } from '../services/authService';
import * as ImagePicker from 'react-native-image-picker';
import { useBackground } from '../context/BackgroundContext';
import Ionicons from 'react-native-vector-icons/Ionicons';
import LottieView from 'lottie-react-native';
import { API_BASE_URL } from '../config';

export default function ProfileScreen({ setProfileImageUrl, navigation }) {
  const { setIsLoggedIn } = useContext(AuthContext);
  const { backgroundImage, changeBackground, fondos } = useBackground();

  const [profile, setProfile] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [codigoFalla, setCodigoFalla] = useState('');
  const [checkingCodigo, setCheckingCodigo] = useState(false);
  const [codigoValido, setCodigoValido] = useState(null);
  const [fullName, setFullName] = useState('');
  const [fallaInfo, setFallaInfo] = useState(null);


  const fetchProfile = async () => {
    setLoadingProfile(true);
    try {
      const token = await getValidAccessToken(navigation, setIsLoggedIn);
      if (!token) return;
      const res = await fetch(`${API_BASE_URL}/api/users/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setProfile(data);
      setCodigoFalla(data.codigoFalla || '');
      setFullName(data.fullName || '');

      if ((data.role === 'FALLERO' || data.role === 'USER') && data.codigoFalla) {
        try {
          const resFalla = await fetch(
            `${API_BASE_URL}/api/falla/codigo/${data.codigoFalla}`
          );
          if (resFalla.ok) {
            const fallaData = await resFalla.json();
            setFallaInfo({
              nombre: fallaData.fullname || 'Falla desconocida',
              imagen: fallaData.profileImageUrl || null
            });
          }
        } catch {
          console.warn('No se pudo cargar la info de la falla');
        }
      }
    } catch {
      Alert.alert('Error', 'No se pudo cargar el perfil');
    } finally {
      setLoadingProfile(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const verificarCodigo = async code => {
    if (code.length !== 5) {
      setCodigoValido(null);
      setFallaInfo(null);
      return;
    }

    setCheckingCodigo(true);
    setCodigoValido(null);
    try {
      const res = await fetch(`${API_BASE_URL}/api/falla/codigo/${code}`);
      if (res.ok) {
        const fallaData = await res.json();
        setCodigoValido(true);
        setFallaInfo({
          nombre: fallaData.fullname || 'Falla desconocida',
          imagen: fallaData.profileImageUrl || null,
        });
      } else {
        setCodigoValido(false);
        setFallaInfo(null);
      }
    } catch {
      setCodigoValido(false);
      setFallaInfo(null);
    } finally {
      setCheckingCodigo(false);
    }
  };


  const handleSolicitarUnion = async () => {
    try {
      const token = await getValidAccessToken(navigation, setIsLoggedIn);
      if (!token) return;
      const res = await fetch(
        `${API_BASE_URL}/api/users/solicitar-union`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            codigoFalla: codigoFalla.trim().toUpperCase()
          })
        }
      );
      if (!res.ok) throw new Error();
      Alert.alert('✅ Solicitud enviada', 'Pronto la falla revisará tu petición.');
      setCodigoFalla('');
      setCodigoValido(null);
      fetchProfile();
    } catch {
      Alert.alert('Error', 'No se pudo enviar la solicitud.');
    }
  };


  const handleCancelarSolicitud = async () => {
    try {
      const token = await getValidAccessToken(navigation, setIsLoggedIn);
      if (!token) return;

      const res = await fetch(`${API_BASE_URL}/api/users/cancelar-union`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error();
      Alert.alert('❌ Solicitud cancelada', 'Has cancelado tu solicitud de unión a la falla.');
      fetchProfile();
    } catch {
      Alert.alert('Error', 'No se pudo cancelar la solicitud.');
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
        formData.append('file', {
          uri,
          name: fileName || 'profile.jpg',
          type: type || 'image/jpeg'
        });

        const uploadRes = await fetch(
          `${API_BASE_URL}/api/images/upload`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'multipart/form-data'
            },
            body: formData
          }
        );
        if (!uploadRes.ok) throw new Error();

        const imageUrl = await uploadRes.text();
        const updateRes = await fetch(
          `${API_BASE_URL}/api/users/profile-image`,
          {
            method: 'PUT',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ profileImageUrl: imageUrl })
          }
        );
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


          <View style={styles.toolbar}>
            <Text style={styles.title}>Perfil</Text>
            <TouchableOpacity onPress={handleLogout} style={styles.iconButton}>
              <Ionicons name="log-out-outline" size={24} color="#fff" />
            </TouchableOpacity>
          </View>


          <ScrollView contentContainerStyle={styles.content}>
            {profile && (
              <View style={styles.profileSection}>
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
              </View>
            )}

            {profile.role === 'FALLERO' && fallaInfo && (
              <View style={styles.profileSection}>
                <Text style={styles.sectionLabel}>Tu Falla</Text>
                {fallaInfo.imagen && (
                  <Image
                    source={{ uri: fallaInfo.imagen }}
                    style={styles.fallaAvatarCircular}
                  />
                )}
                <Text style={styles.fallaNombre}>{fallaInfo.nombre}</Text>
              </View>
            )}

            {profile.role === 'FALLA' && (
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
                  <Image
                    source={{ uri: profile.fallaInfo.profileImageUrl }}
                    style={styles.fallaAvatarLarge}
                  />
                )}
              </View>
            )}

            {profile.role === 'USER' && profile.codigoFalla && fallaInfo && (
              <View style={styles.joinBox}>
                <View style={styles.reviewHeader}>
                  <Text style={styles.reviewTitle}>Solicitud en revisión</Text>
                </View>
                <View style={styles.reviewHeader}>
                  <LottieView
                    source={require('../assets/animations/sand.json')}
                    autoPlay
                    loop
                    style={styles.sandAnimation}
                  />
                </View>
                <Text style={styles.reviewText}>
                  Tu solicitud para unirte a la falla "{fallaInfo.nombre}" está siendo revisada.
                </Text>
                <TouchableOpacity
                  style={[styles.button, { marginTop: 12, backgroundColor: '#aa3333' }]}
                  onPress={handleCancelarSolicitud}
                >
                  <Text style={styles.buttonText}>Cancelar solicitud</Text>
                </TouchableOpacity>
              </View>
            )}

            {profile.role === 'USER' && !profile.codigoFalla && (
              <View style={styles.joinBox}>
                <Text style={styles.joinTitle}>Únete a tu falla</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Código de falla"
                  placeholderTextColor="#888"
                  value={codigoFalla}
                  autoCapitalize="characters"
                  maxLength={5}
                  onChangeText={text => {
                    const upperText = text.trim().toUpperCase();
                    setCodigoFalla(upperText);
                    if (upperText.length === 5) {
                      verificarCodigo(upperText);
                    } else {
                      setCodigoValido(null);
                      setFallaInfo(null);
                    }
                  }}
                />
                {checkingCodigo ? (
                  <ActivityIndicator size="small" color="#fd882d" />
                ) : codigoValido != null ? (
                  codigoValido ? (
                    <Text style={{ color: 'lime', marginBottom: 8 }}>
                      Código válido:{' '}
                      <Text style={{ color: '#1E90FF', fontWeight: 'bold' }}>
                        {fallaInfo?.nombre || '—'}
                      </Text>
                    </Text>
                  ) : (
                    <Text style={{ color: 'tomato', marginBottom: 8 }}>
                      Código no válido
                    </Text>
                  )
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



            <Text style={styles.sectionTitle}>Fondo de pantalla</Text>
            <FlatList
              horizontal
              data={fondoKeys}
              keyExtractor={item => item}
              contentContainerStyle={styles.fondosList}
              renderItem={({ item }) => (
                <TouchableOpacity onPress={() => changeBackground(item)}>
                  <Image
                    source={fondos[item]}
                    style={[
                      styles.fondoItem,
                      backgroundImage === fondos[item] && styles.fondoItemActive
                    ]}
                  />
                </TouchableOpacity>
              )}
              showsHorizontalScrollIndicator={false}
            />
          </ScrollView>
        </SafeAreaView>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: { flex: 1 },
  overlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.23)', paddingTop: 20 },
  container: { flex: 1 },

  toolbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 10
  },
  iconButton: { padding: 4 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#fff' },

  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#121212'
  },
  content: { padding: 16, paddingBottom: 40 },

  profileSection: { alignItems: 'center', marginBottom: 24 },
  avatar: {
    width: SCREEN_WIDTH * 0.3,
    height: SCREEN_WIDTH * 0.3,
    borderRadius: (SCREEN_WIDTH * 0.3) / 2,
    borderWidth: 2,
    borderColor: '#fd882d',
    marginBottom: 12,
  },

  username: { fontSize: 18, fontWeight: '600', color: '#fff' },
  email: { fontSize: 14, color: '#fff', marginTop: 4 },

  sectionLabel: {
    color: '#fd882d', fontSize: 16,
    marginBottom: 8, fontWeight: '600'
  },
  fallaAvatarCircular: {
    width: SCREEN_WIDTH * 0.24,
    height: SCREEN_WIDTH * 0.24,
    borderRadius: (SCREEN_WIDTH * 0.24) / 2,
    borderWidth: 2,
    borderColor: '#fd882d',
    marginBottom: 8,
  },

  fallaNombre: { color: '#fff', fontSize: 16, fontWeight: '500' },

  fallaBox: {
    width: '100%',
    maxWidth: 500,
    alignSelf: 'center',
    padding: 16,
    backgroundColor: '#1f1f1f',
    borderRadius: 12,
    marginBottom: 24,
    alignItems: 'center',
  },

  sandAnimation: {
    width: SCREEN_WIDTH * 0.10,
    height: SCREEN_WIDTH * 0.10,
  },

  fallaText: { color: '#fff', fontSize: 16, marginBottom: 4 },
  fallaLabel: { fontWeight: '600' },
  fallaAvatarLarge: {
    width: SCREEN_WIDTH * 0.2,
    height: SCREEN_WIDTH * 0.2,
    borderRadius: (SCREEN_WIDTH * 0.2) / 2,
    marginTop: 12,
  },


  sectionTitle: { color: '#fff', fontSize: 16, fontWeight: '600', marginBottom: 8 },
  fondosList: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
  },

  fondoItem: {
    width: SCREEN_WIDTH * 0.2,
    height: SCREEN_WIDTH * 0.2,
    marginHorizontal: 6,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },

  fondoItemActive: { borderColor: '#fd882d' },

  joinBox: {
    width: '100%',
    maxWidth: 500,
    alignSelf: 'center',
    padding: 16,
    backgroundColor: '#1f1f1f',
    borderRadius: 12,
    marginBottom: 24,
  },

  joinTitle: {
    color: '#fd882d',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'center',
  },

  input: {
    backgroundColor: '#2c2c2c',
    color: '#fff',
    padding: 10,
    borderRadius: 8,
    marginBottom: 8,
    width: '100%',
  },

  button: {
    backgroundColor: '#fd882d',
    paddingVertical: 12, borderRadius: 8
  },
  buttonDisabled: { backgroundColor: '#555' },
  buttonText: {
    color: '#fff', textAlign: 'center',
    fontWeight: '600'
  },

  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 5,
  },
  reviewIcon: {
    marginRight: 6,
  },
  reviewText: {
    color: '#fff',
    textAlign: 'center',
  },
  reviewTitle: {
    color: '#fd882d',
    fontSize: 16,
    fontWeight: '600',
  },
});
