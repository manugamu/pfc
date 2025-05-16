import React, { useState, useEffect, useRef, useContext } from 'react';
import {
  Text, TextInput, StyleSheet, Alert, KeyboardAvoidingView,
  Platform, Animated, ScrollView, Keyboard, TouchableOpacity, useWindowDimensions
} from 'react-native';
import EncryptedStorage from 'react-native-encrypted-storage';
import LottieView from 'lottie-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getDeviceId } from '../services/deviceService';
import { scale, verticalScale, moderateScale } from 'react-native-size-matters';
import { AuthContext } from '../context/AuthContext';
import { API_BASE_URL } from '../config';

export default function LoginScreen({ navigation }) {
  const { setIsLoggedIn, setRole } = useContext(AuthContext);

  const { width, height } = useWindowDimensions();
  const baseSize = Math.min(width, height);
  const initialLogoHeight = baseSize * 0.45;
  const smallLogoHeight = baseSize * 0.22;

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const logoHeight = useRef(new Animated.Value(initialLogoHeight)).current;

  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', () => {
      Animated.timing(logoHeight, {
        toValue: smallLogoHeight,
        duration: 300,
        useNativeDriver: false,
      }).start();
    });

    const hide = Keyboard.addListener('keyboardDidHide', () => {
      Animated.timing(logoHeight, {
        toValue: initialLogoHeight,
        duration: 300,
        useNativeDriver: false,
      }).start();
    });

    return () => {
      show.remove();
      hide.remove();
    };
  }, [initialLogoHeight, smallLogoHeight]);

  const handleLogin = async () => {
    try {
      const deviceId = await getDeviceId();
  
      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: username, password, deviceId }),
      });
  
      if (response.ok) {
        const data = await response.json();
  
        if (!data.username) {
          Alert.alert('Error', 'El servidor no devolvió el username');
          return;
        }
  
       
        await EncryptedStorage.setItem('auth', JSON.stringify({
          id: data.id,
          username: data.username,
          accessToken: data.accessToken,
          profileImageUrl: data.profileImageUrl,
          refreshToken: data.refreshToken,
          role: data.role,
          fallaInfo: data.fallaInfo,
          codigoFalla: data.codigoFalla,
          fullName: data.fullName
        }));
        
  
        const stored = await EncryptedStorage.getItem('auth');
        console.log('🧠 Datos guardados en auth:', stored);
  
        setIsLoggedIn(true);
        setRole(data.role);
      } else {
        Alert.alert('Login fallido', 'Usuario o contraseña incorrectos');
      }
    } catch (error) {
      console.error('Error al iniciar sesión:', error);
      Alert.alert('Error de red', 'No se pudo conectar al servidor');
    }
  };
  

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.overlay}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <Animated.View
            style={[styles.logoGroup, { height: logoHeight, width: logoHeight }]}
          >
            <LottieView
              source={require('../assets/animations/fuego.json')}
              autoPlay
              loop
              style={[styles.fireAbsolute, {
                top: '-65%',
                left: '-40%',
                width: '150%',
                height: '160%'
              }]}
              resizeMode="cover"
            />
            <Animated.Image
              source={require('../assets/images/PenyaFalleraLogo.png')}
              style={styles.logo}
              resizeMode="contain"
            />
          </Animated.View>

          <TextInput
            placeholder="Usuario"
            value={username}
            onChangeText={setUsername}
            style={styles.input}
            placeholderTextColor="#fff"
          />

          <TextInput
            placeholder="Contraseña"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            style={styles.input}
            placeholderTextColor="#fff"
          />

          <TouchableOpacity style={styles.button} onPress={handleLogin}>
            <Text style={styles.buttonText}>Entrar</Text>
          </TouchableOpacity>

          <Text style={styles.texto}>O</Text>

          <TouchableOpacity
            style={styles.buttonRegister}
            onPress={() => navigation.navigate('Register')}
          >
            <Text style={styles.buttonText}>¿No tienes cuenta? Regístrate</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  overlay: { flex: 1 },
  scrollContent: {
    padding: scale(20),
    paddingBottom: verticalScale(40),
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100%',
  },
  logoGroup: {
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: verticalScale(20),
    position: 'relative',
  },
  fireAbsolute: {
    position: 'absolute',
    zIndex: -1,
    pointerEvents: 'none',
  },
  logo: {
    width: '100%',
    height: '100%',
    zIndex: 1,
  },
  texto: {
    fontSize: moderateScale(10),
    fontWeight: 'bold',
    marginBottom: verticalScale(10),
    textAlign: 'center',
    color: '#fff',
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: scale(25),
    padding: moderateScale(10),
    marginBottom: verticalScale(15),
    width: '100%',
    color: '#fff',
    fontSize: moderateScale(14),
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  button: {
    borderWidth: 1,
    borderColor: '#fff',
    borderRadius: scale(8),
    paddingVertical: verticalScale(12),
    paddingHorizontal: scale(20),
    marginTop: verticalScale(24),
    marginBottom: verticalScale(8),
    backgroundColor: 'transparent',
    width: '50%',
    alignItems: 'center',
  },
  buttonRegister: {
    borderWidth: 1,
    borderColor: '#fff',
    borderRadius: scale(8),
    paddingVertical: verticalScale(12),
    paddingHorizontal: scale(20),
    backgroundColor: 'transparent',
    width: '100%',
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: moderateScale(16),
    fontWeight: 'bold',
  },
});