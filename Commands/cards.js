const mongoose = require('mongoose');
const { User } = require('./functions'); // Ensure the path is correct

// Definition of cards organized by categories
const cards = {
  "Normal": {
    'JYRB01': {
      name: 'Normal Card',
      image: 'https://kpopping.com/documents/32/4/800/TWICE-5TH-WORLD-TOUR-READY-TO-BE-in-JAPAN-Concept-Photos-documents-2.jpeg'
    }
  },
  "Legendary": {
    'JYRBB01': {
      name: 'Legendary Card',
      image: 'https://example.com/jyrbb01.png'
    }
  },
  "Rare": {
    'JYRBC01': {
      name: 'Rare Card',
      image: 'https://i.ibb.co/JHj2CdQ/PRUEBA-2.png'
    }
  },
  "Special": {
    'JYRBD01': {
      name: 'Jeongyeon',
      image: 'https://i.ibb.co/dk4fvWd/PRUEBA.png'
    }
  }
};

// Function to get card data
function getImage(card) {
  for (const category in cards) {
    if (cards[category][card]) {
      return cards[category][card]; // Returns the object with name and image
    }
  }
  return null; // Returns null if the card is not found
}

// Function to get the category of a card
function getCategory(card) {
  for (const category in cards) {
    if (cards[category][card]) {
      return category;
    }
  }
  return 'Unknown'; // Returns 'Unknown' if the card does not belong to any category
}

// Save selected card
async function selectCard(userId, cardCode) {
  try {
    // Update the user in the database with the selected card
    const user = await User.findOneAndUpdate(
      { userId },
      { selectedCard: cardCode },
      { new: true } // Returns the updated document
    );
    return user;
  } catch (error) {
    console.error('Error selecting card:', error);
    return null;
  }
}

// Get selected card
async function getSelectedCard(userId) {
  try {
    const user = await User.findOne({ userId });
    return user ? user.selectedCard : null;
  } catch (error) {
    console.error('Error getting selected card:', error);
    return null;
  }
}

// Export necessary functions and data
module.exports = {
  getImage,
  getCategory,
  cards,
  selectCard,
  getSelectedCard
};
