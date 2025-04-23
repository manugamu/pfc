import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Button,
  StyleSheet,
  Alert,
  ScrollView
} from 'react-native';

export default function RegisterScreen({ navigation }) {
  const [form, setForm] = useState({
    username: '',
    email: '',
    password: '',
    fullName: '',
    phone: '',
    address: '',
    codigoFalla: '',
  });

  const [loading, setLoading] = useState(false);
  const [codigoValido, setCodigoValido] = useState(null);
  const [checkingCodigo, setCheckingCodigo] = useState(false);
  const [nombreFalla, setNombreFalla] = useState('');

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));

    if (field === 'codigoFalla') {
      setCodigoValido(null);
      setNombreFalla('');
      if (value.length >= 3) {
        verificarCodigoFalla(value.trim().toUpperCase());
      }
    }
  };

  const verificarCodigoFalla = async (codigo) => {
    setCheckingCodigo(true);
    try {
      const res = await fetch(`http://10.0.2.2:5000/api/falla/codigo/${codigo}`);
      if (res.ok) {
        const data = await res.json();
        setCodigoValido(true);
        setNombreFalla(data.username || '');
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

  const handleRegister = async () => {
    if (!form.email || !form.username || !form.password) {
      Alert.alert('Campos obligatorios', 'Por favor, completa email, usuario y contraseña.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('http://10.0.2.2:5000/api/users/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: form.username,
          email: form.email,
          password: form.password,
          fullName: form.fullName,
          phone: form.phone,
          address: form.address,
          role: 'USER',
          active: true,
          profileImageUrl: null,
          codigoFalla: form.codigoFalla ? form.codigoFalla.trim().toUpperCase() : null
        }),
      });

      if (res.ok) {
        if (form.codigoFalla) {
          Alert.alert('✅ Registro exitoso', `Tu solicitud para unirte a la falla "${nombreFalla}" ha sido enviada.`);
        } else {
          Alert.alert('✅ Registro exitoso', 'Ahora puedes iniciar sesión');
        }
        navigation.goBack();
      } else {
        const errText = await res.text();
        try {
          const errJson = JSON.parse(errText);
          Alert.alert('❌ Error', errJson.message || errText);
        } catch {
          Alert.alert('❌ Error', errText);
        }
      }
    } catch (err) {
      console.error('Registro fallido:', err);
      Alert.alert('Error de red', 'No se pudo conectar al servidor');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Registro</Text>

      <TextInput
        style={styles.input}
        placeholder="Correo electrónico"
        onChangeText={text => handleChange('email', text)}
        value={form.email}
        keyboardType="email-address"
        autoCapitalize="none"
      />

      <TextInput
        style={styles.input}
        placeholder="Nombre de usuario"
        onChangeText={text => handleChange('username', text)}
        value={form.username}
        autoCapitalize="none"
      />

      <TextInput
        style={styles.input}
        placeholder="Contraseña"
        secureTextEntry
        onChangeText={text => handleChange('password', text)}
        value={form.password}
      />

      <TextInput
        style={styles.input}
        placeholder="Nombre completo"
        onChangeText={text => handleChange('fullName', text)}
        value={form.fullName}
      />

      <TextInput
        style={styles.input}
        placeholder="Teléfono"
        onChangeText={text => handleChange('phone', text)}
        value={form.phone}
        keyboardType="phone-pad"
      />

      <TextInput
        style={styles.input}
        placeholder="Dirección"
        onChangeText={text => handleChange('address', text)}
        value={form.address}
      />

      <TextInput
        style={styles.input}
        placeholder="¿Eres fallero? Introduce el código de tu falla"
        onChangeText={text => handleChange('codigoFalla', text)}
        value={form.codigoFalla}
        autoCapitalize="characters"
      />

      {form.codigoFalla !== '' && (
        <Text style={{ color: codigoValido ? 'green' : 'red', marginBottom: 6 }}>
          {checkingCodigo ? 'Comprobando código...' : codigoValido ? '✅ Código válido' : '❌ Código no válido'}
        </Text>
      )}

      {codigoValido && nombreFalla && (
        <Text style={{ color: '#1E88E5', marginBottom: 10, fontWeight: 'bold', textAlign: 'center' }}>
          {`Te estás uniendo a: ${nombreFalla}`}
        </Text>
      )}

      <Button
        title={loading ? 'Registrando...' : 'Registrarme'}
        onPress={handleRegister}
        disabled={loading}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    flexGrow: 1,
    justifyContent: 'center'
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center'
  },
  input: {
    backgroundColor: '#eee',
    padding: 10,
    borderRadius: 5,
    marginBottom: 15
  }
});
