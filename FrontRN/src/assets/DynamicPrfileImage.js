import React, { useEffect, useState } from 'react';
import { Image, ActivityIndicator, StyleSheet } from 'react-native';

const DynamicPrfileImage = ({ userId, style }) => {
  const [imageUrl, setImageUrl] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfileImage = async () => {
      try {
        console.log("DynamicProfileImage: Consultando usuario con ID:", userId);
        const response = await fetch(`http://10.0.2.2:5000/api/users/${userId}`);
        console.log("HTTP status:", response.status);
        if (response.ok) {
          const data = await response.json();
          console.log("DynamicProfileImage: Datos recibidos:", data);
          setImageUrl(data.profileImageUrl);
        } else {
          console.warn(`No se encontró usuario (ID: ${userId}). Status:`, response.status);
        }
      } catch (error) {
        console.error("Error fetching profile image for user:", userId, error);
      }
      setLoading(false);
    };

    fetchProfileImage();
  }, [userId]);

  if (loading) {
    return <ActivityIndicator size="small" color="#ccc" style={styles.loader} />;
  }

  return (
    <Image
      source={
        imageUrl && imageUrl.trim() !== ''
          ? { uri: imageUrl }
          : require('../assets/images/default-avatar.png')
      }
      style={style}
    />
  );
};

const styles = StyleSheet.create({
  loader: {
    alignSelf: 'center',
  },
});

export default DynamicPrfileImage;
