import React, { useEffect, useRef, useState, useContext } from 'react';
import {
  View, Text, TextInput, FlatList, StyleSheet, TouchableOpacity,
  Image, KeyboardAvoidingView, Platform, ActivityIndicator, Linking
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getValidAccessToken, logoutUser } from '../services/authService';
import { AuthContext } from '../context/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL, MESSAGES_HTTP_URL, WS_BASE_URL } from '../config';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const colors = ['#f94144', '#f3722c', '#f9c74f', '#43aa8b', '#577590'];
const getColorForUser = (username) => {
  if (!username || typeof username !== 'string') return '#888';
  let hash = 0;
  for (let i = 0; i < username.length; i++) {
    hash = username.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

export default function EventoChatScreen({ route, navigation }) {
  const { eventoId, title, location = '', backgroundImage = '', creatorName = '', creatorId = '', creatorImage = '' } = route.params;
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [username, setUsername] = useState(null);
  const [myUserId, setMyUserId] = useState(null);
  const [userImages, setUserImages] = useState({});
  const [creatorProfileImage, setCreatorProfileImage] = useState('');
  const [isConnected, setIsConnected] = useState(true);
  const [pendingMessages, setPendingMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const ws = useRef(null);
  const flatListRef = useRef(null);
  const { setIsLoggedIn } = useContext(AuthContext);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    const getUserInfo = async () => {
      try {
        const token = await getValidAccessToken(null, setIsLoggedIn);
        if (!token) return;
        const res = await fetch(`${API_BASE_URL}/api/users/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setUsername(data.username);
          setMyUserId(data.id);
        }
      } catch (err) {
        console.error('Error al recuperar usuario:', err);
      }
    };
    getUserInfo();
  }, [setIsLoggedIn]);

  useEffect(() => {
    if (flatListRef.current && messages.length > 0) {
      flatListRef.current.scrollToEnd({ animated: true });
    }
  }, [messages]);

  useEffect(() => {
    const fetchHistorial = async () => {
      const token = await getValidAccessToken(null, setIsLoggedIn);
      if (!token) {
        setLoading(false);
        return;
      }

      const cacheKey = `mensajes_${eventoId}`;
      try {
        const res = await fetch(`${MESSAGES_HTTP_URL}/mensajes/${eventoId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.status === 401 || res.status === 403) {
          await logoutUser(null, setIsLoggedIn);
          setLoading(false);
          return;
        }

        if (!res.ok) throw new Error('Error de red');

        const data = await res.json();
        const validMessages = data.filter(m => m.content && m.content.trim() !== '');
        setMessages(validMessages);
        await AsyncStorage.setItem(cacheKey, JSON.stringify(validMessages));

        const userIds = [...new Set(validMessages.map(m => m.userId))];
        userIds.forEach(fetchUserImage);
      } catch (err) {
        setIsConnected(false);
        try {
          const cached = await AsyncStorage.getItem(cacheKey);
          if (cached) {
            const data = JSON.parse(cached);
            setMessages(data);
            const userIds = [...new Set(data.map(m => m.userId))];
            userIds.forEach(fetchUserImage);
          }
        } catch {
          console.warn("No se pudo leer caché local");
        }
      } finally {
        setLoading(false);
      }
    };

    if (eventoId && username && myUserId) {
      fetchHistorial();
    } else {
      const fallbackTimeout = setTimeout(() => setLoading(false), 5000);
      return () => clearTimeout(fallbackTimeout);
    }
  }, [eventoId, username, myUserId, setIsLoggedIn]);

  useEffect(() => {
    if (creatorImage) {
      setCreatorProfileImage(creatorImage);
    } else if (creatorId) {
      const fetchCreatorImage = async () => {
        try {
          const token = await getValidAccessToken(null, setIsLoggedIn);
          if (!token) return;
          const res = await fetch(`${API_BASE_URL}/api/users/${creatorId}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok) {
            const data = await res.json();
            setCreatorProfileImage(data.profileImageUrl || '');
          }
        } catch (err) {
          console.error('Error al obtener imagen del creador:', err);
        }
      };
      fetchCreatorImage();
    }
  }, [creatorId, creatorImage, setIsLoggedIn]);

  const fetchUserImage = async (userId) => {
    if (!userId || userImages[userId]) return;
    try {
      const token = await getValidAccessToken(null, setIsLoggedIn);
      if (!token) return;
      const res = await fetch(`${API_BASE_URL}/api/users/${userId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        const url = data.profileImageUrl || '';
        setUserImages((prev) => ({ ...prev, [userId]: url }));
        setMessages((prev) => [...prev]);
      }
    } catch { }
  };

  useEffect(() => {
    if (!username || !eventoId || !myUserId) return;
    let interval;
    const connect = () => {
      ws.current = new WebSocket(`${WS_BASE_URL}`);
      ws.current.onopen = () => {
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
          }
        } catch { }
      };
      ws.current.onclose = () => setIsConnected(false);
      ws.current.onerror = () => setIsConnected(false);
    };
    connect();
    interval = setInterval(() => {
      if (!ws.current || ws.current.readyState === WebSocket.CLOSED) connect();
    }, 5000);
    return () => {
      clearInterval(interval);
      ws.current?.close();
    };
  }, [eventoId, username, myUserId]);

  const sendMessage = () => {
    const cleanInput = input.trim();

    if (!cleanInput || !username || !myUserId) return;

    const msg = {
      type: 'chat',
      eventoId,
      content: cleanInput,
      createdAt: new Date().toISOString(),
      user: username,
      userId: myUserId,
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
          <Image source={profileUri ? { uri: profileUri } : require('../assets/images/default-avatar.png')} style={styles.userImage} />
        )}
        <View style={[styles.bubble, isOwn ? styles.ownBubble : styles.otherBubble]}>
          {!isOwn && (<Text style={[styles.messageUser, { color: userColor }]}>{item.user}</Text>)}
          <Text style={styles.messageText}>{item.content}</Text>
        </View>
      </View>
    );
  };

  if (!username || loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1E88E5" />
        <Text style={{ color: '#fff', marginTop: 10 }}>Cargando chat...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? insets.bottom : 0}
      >
        <View style={styles.header}>
          <Image source={backgroundImage ? { uri: backgroundImage } : require('../assets/images/default-event.jpg')} style={styles.headerBackground} resizeMode="cover" />
          <View style={styles.headerOverlay} />
          {navigation && (
            <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
          )}
          <View style={styles.headerContent}>
            <Image source={creatorProfileImage ? { uri: creatorProfileImage } : require('../assets/images/default-avatar.png')} style={styles.creatorImage} />
            <Text style={styles.eventTitle}>{title}</Text>
            {!!location && (
              <TouchableOpacity
                style={styles.locationTag}
                onPress={() => Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`)}>
                <Ionicons name="location-outline" size={14} color="#1E90FF" style={styles.locationIconInline} />
                <Text numberOfLines={1} ellipsizeMode="tail" style={styles.locationTagText}>{location}</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        <FlatList
          ref={flatListRef}
          data={Array.isArray(messages) ? messages : []}
          keyExtractor={(_, index) => index.toString()}
          renderItem={renderItem}
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 10 }}
          ListEmptyComponent={
            <Text style={{ color: '#ccc', textAlign: 'center', marginTop: 20 }}>
              Aún no hay mensajes
            </Text>
          }
          extraData={userImages}
          onContentSizeChange={() =>
            flatListRef.current?.scrollToEnd({ animated: true })
          }
        />


        {!isConnected && (
          <View style={styles.warningBanner}>
            <Text style={styles.warningText}>⚠️ Sin conexión con el servidor de chat</Text>
          </View>
        )}

        <View style={[styles.inputRow, { paddingBottom: 6 }]}>
          <TextInput
            value={input}
            onChangeText={(text) => {
              const sanitized = text.replace(/^[\t ]+/, '');
              setInput(sanitized);
            }}
            placeholder="Mensaje"
            style={styles.flatInput}
            placeholderTextColor="#ccc"
            multiline
            allowFontScaling={false}
            textAlignVertical="center"
            maxHeight={100}
          />

          <TouchableOpacity onPress={sendMessage} style={styles.sendButtonClean}>
            <Ionicons name="send" size={22} color="#1E88E5" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}


const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212' },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 8,
    backgroundColor: '#121212',
  },
  flatInput: {
    flex: 1,
    fontSize: 16,
    color: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    maxHeight: 120,
  },
  sendButtonClean: {
    padding: 10,
  },
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
  warningBanner: { backgroundColor: '#FFB300', padding: 6, alignItems: 'center' },
  warningText: { color: '#000', fontWeight: 'bold' },
});