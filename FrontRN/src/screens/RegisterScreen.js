// RegisterScreen.js

import React, { useState, useEffect, useRef } from 'react';
import {
  Text,
  TextInput,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Animated,
  ScrollView,
  Keyboard,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import LottieView from 'lottie-react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { scale, verticalScale, moderateScale } from 'react-native-size-matters';
import { API_BASE_URL } from '../config';
import countriesJson from '../assets/calles/countries.json';
import Toast from 'react-native-toast-message';
const allCountries = Array.isArray(countriesJson.countries)
  ? countriesJson.countries
  : [];

export default function RegisterScreen({ navigation }) {
  const { width, height } = useWindowDimensions();
  const baseSize = Math.min(width, height);
  const initialLogoHeight = baseSize * 0.45;
  const smallLogoHeight = baseSize * 0.22;
  const logoHeight = useRef(new Animated.Value(initialLogoHeight)).current;

  const [form, setForm] = useState({
    country: '',
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    fullName: '',
    phone: '',
    address: '',
    codigoFalla: '',
  });
  const [filteredCountries, setFilteredCountries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [codigoValido, setCodigoValido] = useState(null);
  const [checkingCodigo, setCheckingCodigo] = useState(false);
  const [nombreFalla, setNombreFalla] = useState('');
  const [pwdValid, setPwdValid] = useState(null);        // null = sin validar, true/false
  const [pwdMatch, setPwdMatch] = useState(null);
  const [pwdLengthOk, setPwdLengthOk] = useState(false);
  const [pwdUpperOk, setPwdUpperOk] = useState(false);
  const [pwdDigitOk, setPwdDigitOk] = useState(false);
  const [confirmTouched, setConfirmTouched] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const errorMessages = [
    "¡Mira darrere, darrere!",
    "¡Tot el tinglao l'ha pillat!",
    "Em fa mal la panxa y tot..",
    "¡Mira el de darrere, el de darrere!",
    "¡Em fa mal la panxaaaaaaaaa!",
    "¡Me se fan els pels de gallina!",
    "¡Fes darrere!",
    "¡S'ha perdut, s'ha perdut!"
  ];
  const [errorIndex, setErrorIndex] = useState(0);


  // Ajustar logo al mostrar/ocultar teclado
  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', () =>
      Animated.timing(logoHeight, {
        toValue: smallLogoHeight,
        duration: 300,
        useNativeDriver: false,
      }).start()
    );
    const hide = Keyboard.addListener('keyboardDidHide', () =>
      Animated.timing(logoHeight, {
        toValue: initialLogoHeight,
        duration: 300,
        useNativeDriver: false,
      }).start()
    );
    return () => {
      show.remove();
      hide.remove();
    };
  }, [initialLogoHeight, smallLogoHeight]);

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));

    if (field === 'country') {
      if (value.length > 0) {
        const q = value.toLowerCase();
        setFilteredCountries(
          allCountries
            .filter(c =>
              c.prefix.toLowerCase().includes(q) ||
              c.name_en.toLowerCase().includes(q) ||
              c.name_es.toLowerCase().includes(q)
            )
            .slice(0, 10)
        );
      } else {
        setFilteredCountries([]);
      }
    }


    if (field === 'confirmPassword') {
      const isMismatch = !form.password.startsWith(value);
      setPwdMatch(!isMismatch);

      if (confirmTouched && isMismatch) {
        setErrorIndex(prev => {
          const next = (prev + 1) % errorMessages.length;
          return next;
        });
      }
    }

    if (field === 'codigoFalla') {
      setCodigoValido(null);
      setNombreFalla('');
      const code = value.trim().toUpperCase();
      if (code.length >= 5) {
        verificarCodigoFalla(code);
      }
    }

    // Validación inmediata de la contraseña
    if (field === 'password') {
      setPwdLengthOk(value.length >= 8);
      setPwdUpperOk(/[A-Z]/.test(value));
      setPwdDigitOk(/\d/.test(value));
      // solo si todos ok consideramos la contraseña en conjunto
      setPwdValid(value.length >= 8 && /[A-Z]/.test(value) && /\d/.test(value));
      // revalidar match
      setPwdMatch(value === form.confirmPassword);
    }


    // Validación inmediata de confirmación
    if (field === 'confirmPassword') {
      setPwdMatch(form.password === value);
    }
  };


  const selectCountry = item => {
    setForm(prev => ({ ...prev, country: item.name_es }));
    setFilteredCountries([]);
  };

  const verificarCodigoFalla = async codigo => {
    setCheckingCodigo(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/falla/codigo/${codigo}`);
      if (res.ok) {
        const data = await res.json();
        setCodigoValido(true);
        setNombreFalla(data.fullname || '');
      } else {
        setCodigoValido(false);
        setNombreFalla('');
      }
    } catch {
      setCodigoValido(false);
      setNombreFalla('');
    } finally {
      setCheckingCodigo(false);
    }
  };

  const validateEmail = email => {
    const re = /^[\w-.]+@([\w-]+\.)+[\w-]{2,4}$/;
    return re.test(email);
  };


  const validatePassword = pwd => {
    const re = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
    return re.test(pwd);
  };

  const handleRegister = async () => {
    const { country, username, email, password, confirmPassword } = form;
    if (!country || !email || !username || !password || !confirmPassword) {
      Toast.show({
        type: 'error',
        text1: 'Campos obligatorios',
        text2: 'Completa todos los campos requeridos.',
        position: 'bottom',
        visibilityTime: 3000,
      });
      return;
    }
    if (!validateEmail(email)) {
      Toast.show({
        type: 'error',
        text1: 'Email inválido',
        text2: 'Introduce un correo electrónico válido.',
        position: 'bottom',
        visibilityTime: 3000,
      });
      return;
    }
    if (!validatePassword(password)) {
      Toast.show({
        type: 'error',
        text1: 'Contraseña insegura',
        text2: 'La contraseña debe tener al menos 8 caracteres, incluyendo mayúsculas, minúsculas y números.',
        position: 'bottom',
        visibilityTime: 3000,
      });
      return;
    }
    if (password !== confirmPassword) {
      Toast.show({
        type: 'error',
        text1: 'Error de confirmación',
        text2: 'Las contraseñas no coinciden.',
        position: 'bottom',
        visibilityTime: 3000,
      });
      return;
    }


    setLoading(true);
    try {
      const payload = {
        ...form,
        role: 'USER',
        active: true,
        profileImageUrl: null,
        codigoFalla: form.codigoFalla
          ? form.codigoFalla.trim().toUpperCase()
          : null,
      };
      const res = await fetch(`${API_BASE_URL}/api/users/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        if (form.codigoFalla) {
          Toast.show({
            type: 'success',
            text1: '✅ Registro exitoso',
            text2: `Tu solicitud para unirte a la falla "${nombreFalla}" ha sido enviada.`,
            position: 'bottom',
            visibilityTime: 3000,
          });
        } else {
          Toast.show({
            type: 'success',
            text1: '✅ Registro exitoso',
            text2: 'Ahora puedes iniciar sesión.',
            position: 'bottom',
            visibilityTime: 3000,
          });
        }
        navigation.goBack();
      } else {
        const errText = await res.text();
        Toast.show({
          type: 'error',
          text1: '❌ Error',
          text2: errText,
          position: 'bottom',
          visibilityTime: 4000,
        });
      }
    } catch (err) {
      console.error('Registro fallido:', err);
      Toast.show({
        type: 'error',
        text1: 'Error de red',
        text2: 'No se pudo conectar al servidor.',
        position: 'bottom',
        visibilityTime: 4000,
      });
    } finally {
      setLoading(false);
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
              style={[
                styles.fireAbsolute,
                { top: '-65%', left: '-40%', width: '150%', height: '160%' }
              ]}
              resizeMode="cover"
            />
            <Animated.Image
              source={require('../assets/images/PenyaFalleraLogo.png')}
              style={styles.logo}
              resizeMode="contain"
            />
          </Animated.View>




          <TextInput
            placeholder="Nombre completo"
            value={form.fullName}
            onChangeText={t => handleChange('fullName', t)}
            style={[styles.input, { textAlign: 'center' }]}
            placeholderTextColor="#fff"
          />


          <TextInput
            placeholder="Nombre de usuario"
            value={form.username}
            onChangeText={t => handleChange('username', t)}
            style={[styles.input, { textAlign: 'center' }]}
            placeholderTextColor="#fff"
            autoCapitalize="none"
          />


          <TextInput
            placeholder="Correo electrónico"
            value={form.email}
            onChangeText={t => handleChange('email', t)}
            style={[styles.input, { textAlign: 'center' }]}
            placeholderTextColor="#fff"
            keyboardType="email-address"
            autoCapitalize="none"
          />


          <TextInput
            placeholder="País"
            placeholderTextColor="#fff"
            style={[styles.input, { textAlign: 'center' }]}
            value={form.country}
            onChangeText={text => handleChange('country', text)}
            autoCapitalize="characters"
          />
          {filteredCountries.length > 0 && (
            <View style={styles.suggestionBox}>
              {filteredCountries.map((c, i) => (
                <TouchableOpacity
                  key={i}
                  style={styles.suggestionItem}
                  onPress={() => selectCountry(c)}
                >
                  <Text style={styles.suggestionText}>
                    {`${c.name_es} (${c.name_en}) [${c.prefix}]`}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}


          <TextInput
            placeholder="Teléfono (opcional)"
            value={form.phone}
            onChangeText={t => handleChange('phone', t)}
            style={[styles.input, { textAlign: 'center' }]}
            placeholderTextColor="#fff"
            keyboardType="phone-pad"
          />



          <TextInput
            placeholder="Dirección (opcional)"
            value={form.address}
            onChangeText={t => handleChange('address', t)}
            style={[styles.input, { textAlign: 'center' }]}
            placeholderTextColor="#fff"
          />

          <TextInput
            placeholder="Contraseña"
            value={form.password}
            onChangeText={t => handleChange('password', t)}
            secureTextEntry
            style={[styles.input, { textAlign: 'center' }]}
            placeholderTextColor="#fff"
          />
          {form.password.length > 0 && (
            <View style={{ alignSelf: 'flex-start', marginBottom: verticalScale(10) }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                {pwdLengthOk ? (
                  <LottieView
                    source={require('../assets/animations/flamecheck.json')}
                    autoPlay
                    loop={true}
                    style={{ width: moderateScale(16), height: moderateScale(16) }}
                  />
                ) : (
                  <Ionicons
                    name="ellipse-outline"
                    size={moderateScale(16)}
                    color="grey"
                  />
                )}
                <Text style={{ color: pwdLengthOk ? '#7de868' : 'grey', marginLeft: 6 }}>
                  Al menos 8 caracteres
                </Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                {pwdUpperOk ? (
                  <LottieView
                    source={require('../assets/animations/flamecheck.json')}
                    autoPlay
                    loop={true}
                    style={{ width: moderateScale(16), height: moderateScale(16) }}
                  />
                ) : (
                  <Ionicons
                    name="ellipse-outline"
                    size={moderateScale(16)}
                    color="grey"
                  />
                )}
                <Text style={{ color: pwdUpperOk ? '#7de868' : 'grey', marginLeft: 6 }}>
                  Una letra mayúscula
                </Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                {pwdDigitOk ? (
                  <LottieView
                    source={require('../assets/animations/flamecheck.json')}
                    autoPlay
                    loop={true}
                    style={{ width: moderateScale(16), height: moderateScale(16) }}
                  />
                ) : (
                  <Ionicons
                    name="ellipse-outline"
                    size={moderateScale(16)}
                    color="grey"
                  />
                )}
                <Text style={{ color: pwdDigitOk ? '#7de868' : 'grey', marginLeft: 6 }}>
                  Un número
                </Text>
              </View>
            </View>
          )}


          <TextInput
            placeholder="Confirmar contraseña"
            value={form.confirmPassword}
            onChangeText={t => {
              handleChange('confirmPassword', t);
              setConfirmTouched(true);
            }}
            secureTextEntry
            style={[styles.input, { textAlign: 'center' }]}
            placeholderTextColor="#fff"
          />

          {confirmTouched &&
            form.confirmPassword.length > 0 &&
            !form.password.startsWith(form.confirmPassword) && (
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: verticalScale(6) }}>
                <LottieView
                  source={require('../assets/animations/flamecheckred.json')}
                  autoPlay
                  loop
                  style={{ width: moderateScale(16), height: moderateScale(16) }}
                />
                <Text style={{ color: '#e84646' }}>
                  {errorIndex >= 0 && errorMessages[errorIndex]}
                </Text>
                <LottieView
                  source={require('../assets/animations/flamecheckred.json')}
                  autoPlay
                  loop
                  style={{ width: moderateScale(16), height: moderateScale(16) }}
                />
              </View>
            )}




          {/* Éxito: cuando se igualan por completo */}
          {form.confirmPassword.length > 0 &&
            form.confirmPassword === form.password && (
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: verticalScale(6) }}>
                <LottieView
                  source={require('../assets/animations/flamecheck.json')}
                  autoPlay
                  loop
                  style={{ width: moderateScale(16), height: moderateScale(16) }}
                />
                <Text style={{ color: '#7de868' }}>
                  ¡Contraseña confirmada!
                </Text>
                <LottieView
                  source={require('../assets/animations/flamecheck.json')}
                  autoPlay
                  loop
                  style={{ width: moderateScale(16), height: moderateScale(16) }}
                />
              </View>
            )}




          <TextInput
            placeholder="¿Eres fallero? Código de falla (opcional)"
            value={form.codigoFalla}
            onChangeText={t => handleChange('codigoFalla', t)}
            style={[styles.input, { textAlign: 'center' }]}
            placeholderTextColor="#fff"
            autoCapitalize="characters"
          />

          {(checkingCodigo || form.codigoFalla.trim().length >= 5) && (
            codigoValido ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: verticalScale(6), justifyContent: 'center' }}>
                <LottieView
                  source={require('../assets/animations/flamecheck.json')}
                  autoPlay
                  loop
                  style={{ width: moderateScale(16), height: moderateScale(16) }}
                />
                <Text style={{ color: '#7de868' }}>
                  Código válido
                </Text>
                <LottieView
                  source={require('../assets/animations/flamecheck.json')}
                  autoPlay
                  loop
                  style={{ width: moderateScale(16), height: moderateScale(16) }}
                />
              </View>
            ) : (
              <Text
                style={{
                  color: checkingCodigo ? '#fff' : '#e84646',
                  marginBottom: verticalScale(6),
                  textAlign: 'center',
                }}
              >
                {checkingCodigo
                  ? 'Comprobando código...'
                  : 'Código no válido'}
              </Text>
            )
          )}

          {codigoValido && nombreFalla !== '' && (
            <View style={styles.messageOverlay}>
              <Text style={styles.joinText}>
                Solicitarás unirte a{'\n'}
                <Text style={styles.joinName}>{nombreFalla}</Text>
              </Text>
            </View>
          )}


          <TouchableOpacity
            style={[styles.button, { opacity: loading ? 0.6 : 1 }]}
            onPress={handleRegister}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading ? 'Registrando...' : 'Registrarme'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={{ marginTop: verticalScale(12) }}
          >
            <Text style={styles.linkText}>¿Ya tienes cuenta? Inicia sesión</Text>
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
    paddingTop: verticalScale(30),
    paddingBottom: verticalScale(40),
    justifyContent: 'flex-start',
    alignItems: 'center',
  },
  logoGroup: {
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: verticalScale(20),
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
  suggestionBox: {
    width: '100%',
    marginBottom: verticalScale(15),
    backgroundColor: 'tomato',
    borderRadius: scale(8),
    overflow: 'hidden',
  },
  suggestionItem: {
    padding: moderateScale(10),
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  suggestionText: {
    color: '#fff',
    fontSize: moderateScale(14),
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
    textAlign: 'center',
  },
  button: {
    borderWidth: 1,
    borderColor: '#fff',
    borderRadius: scale(8),
    paddingVertical: verticalScale(12),
    paddingHorizontal: scale(20),
    backgroundColor: 'transparent',
    width: '50%',
    alignItems: 'center',
    marginTop: verticalScale(12),
  },
  buttonText: {
    color: '#fff',
    fontSize: moderateScale(16),
    fontWeight: 'bold',
  },
  linkText: {
    color: '#1E88E5',
    fontSize: moderateScale(14),
    textAlign: 'center',
  },
  messageOverlay: {
    backgroundColor: 'rgba(2, 121, 22, 0.18)',  // semitransparente
    padding: moderateScale(16),
    borderRadius: scale(10),
    alignSelf: 'center',
    marginVertical: verticalScale(9),
  },
  joinText: {
    marginBottom: verticalScale(10),
    fontWeight: 'bold',
    color: '#1E88E5',
    textAlign: 'center',
  },
  joinName: {
    color: 'tomato',
  },
});
