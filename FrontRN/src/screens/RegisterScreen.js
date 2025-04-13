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
  });

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleRegister = async () => {
    try {
      const res = await fetch('http://10.0.2.2:5000/api/auth/register', {
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
          profileImageUrl: null  
        }),
      });

      if (res.ok) {
        Alert.alert('✅ Registro exitoso', 'Ahora puedes iniciar sesión');
        navigation.goBack();
      } else {
        const err = await res.text();
        Alert.alert('❌ Error', err);
      }
    } catch (err) {
      console.error('Registro fallido:', err);
      Alert.alert('Error de red', 'No se pudo conectar al servidor');
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
      />

      <TextInput
        style={styles.input}
        placeholder="Nombre de usuario"
        onChangeText={text => handleChange('username', text)}
        value={form.username}
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

      <Button title="Registrarme" onPress={handleRegister} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, flexGrow: 1, justifyContent: 'center' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  input: { backgroundColor: '#eee', padding: 10, borderRadius: 5, marginBottom: 15 },
});
