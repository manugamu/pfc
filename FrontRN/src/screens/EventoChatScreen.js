import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, TextInput, FlatList, StyleSheet, TouchableOpacity,
  Image, KeyboardAvoidingView, Platform, ActivityIndicator, Linking
} from 'react-native';
import EncryptedStorage from 'react-native-encrypted-storage';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { getValidAccessToken } from '../services/authService';

const colors = ['#f94144', '#f3722c', '#f9c74f', '#43aa8b', '#577590'];
const getColorForUser = (username) => {
  let hash = 0;
  for (let i = 0; i < username.length; i++) {
    hash = username.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

export default function EventoChatScreen({ route, navigation }) {
  const { eventoId, title, location, backgroundImage, creatorName, creatorId } = route.params;

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [username, setUsername] = useState(null);
  const [myUserId, setMyUserId] = useState(null);
  const [userImages, setUserImages] = useState({});
  const [creatorProfileImage, setCreatorProfileImage] = useState('');
  const [isConnected, setIsConnected] = useState(true);
  const [pendingMessages, setPendingMessages] = useState([]);
  const ws = useRef(null);
  const flatListRef = useRef(null);

  useEffect(() => {
    if (flatListRef.current && messages.length > 0) {
      flatListRef.current.scrollToEnd({ animated: true });
    }
  }, [messages]);

  useEffect(() => {
    const getUserInfo = async () => {
      try {
        const stored = await EncryptedStorage.getItem('auth');
        if (stored) {
          const parsed = JSON.parse(stored);
          setUsername(parsed.username);
          setMyUserId(parsed.id);
        }
      } catch (err) {
        console.error('Error al recuperar usuario:', err);
      }
    };
    getUserInfo();
  }, []);

  useEffect(() => {
    const fetchHistorial = async () => {
      try {
        const res = await fetch(`http://10.0.2.2:4000/mensajes/${eventoId}`);
        const data = await res.json();
        setMessages(data);
        const userIds = [...new Set(data.map(m => m.userId))];
        userIds.forEach(fetchUserImage);
      } catch (err) {
        console.error('Error cargando historial:', err);
      }
    };
    fetchHistorial();
  }, [eventoId]);

  useEffect(() => {
    const fetchCreatorImage = async () => {
      if (!creatorId) return;
      try {
        const token = await getValidAccessToken(navigation);
        if (!token) return;
        const res = await fetch(`http://10.0.2.2:5000/api/users/${creatorId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setCreatorProfileImage(data.profileImageUrl || '');
        } else {
          console.warn('⚠️ No se pudo obtener la imagen del creador:', res.status);
        }
      } catch (err) {
        console.error('❌ Error al obtener imagen del creador:', err);
      }
    };
    fetchCreatorImage();
  }, [creatorId]);

  const fetchUserImage = async (userId) => {
    if (!userId || userImages[userId]) return;
    try {
      const token = await getValidAccessToken(navigation);
      if (!token) return;
      const res = await fetch(`http://10.0.2.2:5000/api/users/${userId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        const url = data.profileImageUrl || '';
        setUserImages((prev) => ({ ...prev, [userId]: url }));
        setMessages((prev) => [...prev]);
      } else {
        console.warn(`⚠️ No se pudo cargar imagen para ${userId}: ${res.status}`);
      }
    } catch (err) {
      console.error('❌ Error cargando imagen del usuario:', err);
    }
  };

  useEffect(() => {
    if (!username || !eventoId) return;
    let interval;
    const connect = () => {
      ws.current = new WebSocket('ws://10.0.2.2:4000');
      ws.current.onopen = () => {
        console.log('🟢 Conectado');
        setIsConnected(true);
        ws.current.send(JSON.stringify({ type: 'join', eventoId, user: username }));
        setPendingMessages((prev) => {
          prev.forEach((msg) => {
            const { localOnly, ...cleanMsg } = msg;
            ws.current.send(JSON.stringify(cleanMsg));
          });
          return [];
        });
      };

      ws.current.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data);
          if (msg.type === 'chat' && msg.eventoId === eventoId) {
            fetchUserImage(msg.userId);
            setMessages((prev) => {
              const exists = prev.some(m =>
                m.createdAt === msg.createdAt && m.user === msg.user && m.content === msg.content
              );
              return exists ? prev : [...prev, msg];
            });
          } else if (msg.type === 'update_profile_image') {
            setUserImages((prev) => ({ ...prev, [msg.userId]: msg.newProfileImageUrl }));
          } else if (msg.type === 'join') {
            console.log(`🟢 Cliente unido a evento ${msg.eventoId} como ${msg.user}`);
          }
        } catch (err) {
          console.warn('❌ Error parseando mensaje:', e.data);
        }
      };

      ws.current.onclose = () => {
        console.log('🔴 Desconectado');
        setIsConnected(false);
      };

      ws.current.onerror = (err) => {
        console.log('❌ WebSocket error:', err.message);
        setIsConnected(false);
        try { ws.current.close(); } catch (e) {}
      };
    };

    connect();
    interval = setInterval(() => {
      if (!ws.current || ws.current.readyState === WebSocket.CLOSED) connect();
    }, 5000);

    return () => {
      clearInterval(interval);
      ws.current?.close();
    };
  }, [eventoId, username]);

  const sendMessage = () => {
    if (!input.trim() || !username || !myUserId) return;
    const msg = {
      type: 'chat', eventoId, content: input,
      createdAt: new Date().toISOString(),
      user: username, userId: myUserId,
      localOnly: !isConnected
    };
    setMessages((prev) => [...prev, msg]);
    if (ws.current?.readyState === WebSocket.OPEN) {
      const { localOnly, ...cleanMsg } = msg;
      ws.current.send(JSON.stringify(cleanMsg));
    } else {
      setPendingMessages((prev) => [...prev, msg]);
    }
    setInput('');
  };

  const renderItem = ({ item }) => {
    const isOwn = item.userId === myUserId;
    const userColor = getColorForUser(item.user);
    const profileUri = userImages[item.userId];

    return (
      <View style={[styles.messageContainer, isOwn ? styles.ownMessage : styles.otherMessage]}>
        {!isOwn && (
          <Image
            source={profileUri && profileUri.trim() !== '' ? { uri: profileUri } : require('../assets/images/default-avatar.png')}
            style={styles.userImage}
          />
        )}
        <View style={[styles.bubble, isOwn ? styles.ownBubble : styles.otherBubble]}>
          {!isOwn && (<Text style={[styles.messageUser, { color: userColor }]}>{item.user}</Text>)}
          <Text style={styles.messageText}>{item.content}</Text>
        </View>
      </View>
    );
  };

  if (!username) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1E88E5" />
        <Text style={{ color: '#fff', marginTop: 10 }}>Cargando usuario...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}
    >
      <View style={styles.header}>
        <Image source={{ uri: backgroundImage }} style={styles.headerBackground} resizeMode="cover" />
        <View style={styles.headerOverlay} />
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Image
            source={creatorProfileImage && creatorProfileImage.trim() !== '' ? { uri: creatorProfileImage } : require('../assets/images/default-avatar.png')}
            style={styles.creatorImage}
          />
          <Text style={styles.eventTitle}>{title}</Text>
          <TouchableOpacity
            style={styles.locationTag}
            onPress={() => {
              const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`;
              Linking.openURL(url).catch((err) => console.error("Error abriendo Google Maps:", err));
            }}
          >
            <Ionicons name="location-outline" size={14} color="#1E90FF" style={styles.locationIconInline} />
            <Text numberOfLines={1} ellipsizeMode="tail" style={styles.locationTagText}>{location}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(_, index) => index.toString()}
        renderItem={renderItem}
        contentContainerStyle={{ padding: 10 }}
        extraData={userImages}
      />

      {!isConnected && (
        <View style={styles.warningBanner}>
          <Text style={styles.warningText}>⚠️ Sin conexión con el servidor de chat</Text>
        </View>
      )}

      <View style={styles.inputContainer}>
        <TextInput
          value={input}
          onChangeText={setInput}
          placeholder="Escribe un mensaje"
          style={styles.input}
          placeholderTextColor="#888"
        />
        <TouchableOpacity onPress={sendMessage} style={styles.sendButton}>
          <Text style={styles.sendText}>Enviar</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { height: 130, position: 'relative', justifyContent: 'center', alignItems: 'center', borderBottomLeftRadius: 24, borderBottomRightRadius: 24, overflow: 'hidden' },
  locationTag: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255, 255, 255, 0.1)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 16, maxWidth: '90%', alignSelf: 'center', marginTop: 4 },
  locationTagText: { color: '#fff', fontSize: 13, marginLeft: 4 },
  locationIconInline: { marginRight: 2 },
  headerBackground: { ...StyleSheet.absoluteFillObject },
  headerOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
  backButton: { position: 'absolute', top: 10, left: 16, zIndex: 2 },
  backArrow: { color: '#fff', fontSize: 24 },
  headerContent: { alignItems: 'center', zIndex: 1 },
  creatorImage: { width: 48, height: 48, borderRadius: 24, borderWidth: 2, borderColor: '#fff', marginBottom: 4 },
  eventTitle: { fontSize: 16, fontWeight: 'bold', color: '#fff', textAlign: 'center' },
  messageContainer: { marginVertical: 6, maxWidth: '80%', flexDirection: 'row', alignItems: 'center' },
  ownMessage: { alignSelf: 'flex-end', alignItems: 'flex-end' },
  otherMessage: { alignSelf: 'flex-start', alignItems: 'flex-start' },
  bubble: { borderRadius: 18, paddingVertical: 8, paddingHorizontal: 12 },
  ownBubble: { backgroundColor: '#f97209' },
  otherBubble: { backgroundColor: '#333' },
  messageUser: { fontSize: 12, fontWeight: 'bold', marginBottom: 2 },
  messageText: { color: '#fff', fontSize: 14, lineHeight: 18 },
  userImage: { width: 36, height: 36, borderRadius: 18, marginRight: 8 },
  inputContainer: { flexDirection: 'row', padding: 10, borderTopWidth: 1, borderTopColor: '#444', backgroundColor: '#1e1e1e' },
  input: { flex: 1, backgroundColor: '#2c2c2c', borderRadius: 20, paddingHorizontal: 12, color: '#fff' },
  sendButton: { justifyContent: 'center', paddingHorizontal: 16 },
  sendText: { color: '#1E88E5', fontWeight: 'bold' },
  warningBanner: { backgroundColor: '#FFB300', padding: 6, alignItems: 'center' },
  warningText: { color: '#000', fontWeight: 'bold' },
});