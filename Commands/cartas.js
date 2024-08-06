const mongoose = require('mongoose');
const { User } = require('./niveles'); // Asegúrate de que la ruta sea correcta

// Definición de las cartas organizadas por categorías
const cartas = {
  "Normal": {
    'JYRB01': {
      nombre: 'Carta Rara',
      imagen: 'https://kpopping.com/documents/32/4/800/TWICE-5TH-WORLD-TOUR-READY-TO-BE-in-JAPAN-Concept-Photos-documents-2.jpeg'
    }
  },
  "Legendary": {
    'JYRBB01': {
      nombre: 'Carta Legendaria',
      imagen: 'https://example.com/jyrbb01.png'
    }
  },
  "Rare": {
    'JYRBC01': {
      nombre: 'Carta Rara',
      imagen: 'https://example.com/jyrbc01.png'
    }
  },
  "Special": {
    'JYRBD01': {
      nombre: 'Jeongyeon',
      imagen: 'https://i.ibb.co/dk4fvWd/PRUEBA.png'
    }
  }
};

// Función para obtener los datos de una carta
function getImage(carta) {
  for (const categoria in cartas) {
    if (cartas[categoria][carta]) {
      return cartas[categoria][carta]; // Devuelve el objeto con nombre e imagen
    }
  }
  return null; // Devuelve null si no se encuentra la carta
}

// Función para obtener la categoría de una carta
function getCategory(carta) {
  for (const categoria in cartas) {
    if (cartas[categoria][carta]) {
      return categoria;
    }
  }
  return 'Desconocida'; // Devuelve 'Desconocida' si la carta no pertenece a ninguna categoría
}

// Guardar carta seleccionada
async function selectCard(userId, cardCode) {
  try {
    // Actualizar el usuario en la base de datos con la carta seleccionada
    const user = await User.findOneAndUpdate(
      { userId },
      { selectedCard: cardCode },
      { new: true } // Devuelve el documento actualizado
    );
    return user;
  } catch (error) {
    console.error('Error al seleccionar carta:', error);
    return null;
  }
}

// Obtener carta seleccionada
async function getSelectedCard(userId) {
  try {
    const user = await User.findOne({ userId });
    return user ? user.selectedCard : null;
  } catch (error) {
    console.error('Error al obtener carta seleccionada:', error);
    return null;
  }
}

// Exportar las funciones y datos necesarios
module.exports = {
  getImage,
  getCategory,
  cartas,
  selectCard,
  getSelectedCard
};
