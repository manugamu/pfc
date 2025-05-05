import React, { createContext, useState, useContext } from 'react';

const fondos = {
  fondo1: require('../assets/images/fondo1.png'),
  fondo2: require('../assets/images/fondo2.png'),
  fondo3: require('../assets/images/fondo3.png'),
};

const BackgroundContext = createContext();

export const BackgroundProvider = ({ children }) => {
  const [selectedBackground, setSelectedBackground] = useState('fondo3');

  const changeBackground = (key) => {
    if (fondos[key]) setSelectedBackground(key);
  };

  return (
    <BackgroundContext.Provider
      value={{
        selectedBackground,
        backgroundImage: fondos[selectedBackground],
        changeBackground,
        fondos,
      }}
    >
      {children}
    </BackgroundContext.Provider>
  );
};

export const useBackground = () => useContext(BackgroundContext);
