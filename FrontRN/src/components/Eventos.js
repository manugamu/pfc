import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Linking,
  ActivityIndicator,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';

const screenWidth = Dimensions.get('window').width;

export default function Evento({
  backgroundImage,
  creatorId,     
  creatorName,
  title,
  location,
  startDate,
  endDate,
  description,
  createdAt,
  onPress,
}) {
  const [fetchedCreatorImage, setFetchedCreatorImage] = useState(null);
  const [loadingImage, setLoadingImage] = useState(true);

  useEffect(() => {
    const fetchCreatorImage = async () => {
      try {
        const response = await fetch(`http://10.0.2.2:5000/api/users/profile-image/${creatorId}`);
        if (response.ok) {
          const data = await response.json();
          setFetchedCreatorImage(data.profileImageUrl);
        } else {
          console.warn(`No se encontró el usuario con ID ${creatorId}, status: ${response.status}`);
          setFetchedCreatorImage(null);
        }
      } catch (error) {
        console.error("Error al obtener la imagen de usuario:", creatorId, error);
        setFetchedCreatorImage(null);
      } finally {
        setLoadingImage(false);
      }
    };
  
    fetchCreatorImage();
  }, [creatorId]);
  

  const openLocationInMaps = () => {
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`;
    Linking.openURL(url).catch((err) =>
      console.error("Error abriendo el link a Maps:", err)
    );
  };

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
      <View style={styles.card}>
        <View style={styles.topSection}>
          <Image
            source={{ uri: backgroundImage }}
            style={styles.backgroundImage}
            resizeMode="cover"
          />
          <View style={styles.overlay} />

          <View style={styles.topSectionContent}>
            <View style={styles.creatorInfo}>
              {loadingImage ? (
                <ActivityIndicator size="small" color="#ccc" style={styles.creatorImage} />
              ) : (
                <Image
                  source={
                    fetchedCreatorImage && fetchedCreatorImage.trim() !== ''
                      ? { uri: fetchedCreatorImage }
                      : require('../assets/images/default-avatar.png')
                  }
                  style={styles.creatorImage}
                />
              )}
              <Text style={styles.creatorName}>{creatorName}</Text>
            </View>

            <Text style={styles.title}>{title}</Text>

            <TouchableOpacity
              onPress={openLocationInMaps}
              style={styles.locationPill}
            >
              <Ionicons
                name="location-outline"
                size={14}
                color="#1e90ff"
                style={{ marginRight: 4 }}
              />
              <Text
                numberOfLines={1}
                ellipsizeMode="tail"
                style={styles.locationText}
              >
                {location}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        
        <View style={styles.bottomSection}>
          <Text style={styles.metaText}>
            {startDate} - {endDate}
          </Text>
          <Text style={styles.description}>{description}</Text>
          <Text style={styles.createdAt}>Publicado: {createdAt}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    overflow: 'hidden',
    marginVertical: 10,
    backgroundColor: '#1a1a1a',
    width: screenWidth * 0.9,
    alignSelf: 'center',
  },
  topSection: {
    position: 'relative',
    height: 200,
  },
  backgroundImage: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  topSectionContent: {
    flex: 1,
    padding: 10,
    justifyContent: 'space-between',
  },
  creatorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  creatorImage: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 8,
  },
  creatorName: {
    color: '#fff',
    fontWeight: 'bold',
  },
  title: {
    alignSelf: 'center',
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginVertical: 6,
  },
  locationPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
    maxWidth: '90%',
    marginBottom: 6,
  },
  locationText: {
    color: '#ddd',
    fontSize: 12,
    flexShrink: 1,
  },
  metaText: {
    color: '#bbb',
    fontSize: 12,
    marginBottom: 6,
  },
  bottomSection: {
    padding: 12,
  },
  description: {
    color: '#eee',
    fontSize: 14,
    marginBottom: 8,
  },
  createdAt: {
    fontSize: 10,
    color: '#aaa',
  },
});
