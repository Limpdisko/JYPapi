const mongoose = require('mongoose');
const { works } = require('./works');

// Definition of the schema and model for users
const userSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  selectedCard: { type: String, default: null },
  hasAscended: { type: Boolean, default: false },
  cardData: {
    type: Map,
    of: {
      experience: { type: Number, default: 0 },
      rank: { type: String, default: 'Trainee' },
      work: { type: String, default: null },
      workRemainingUses: { type: Number, default: 0 }
    },
    default: {}
  },
  inbox: {
    type: Array,
    default: []
  },
  ownedCards: {
    type: [String], // Array of card codes
    default: []
  }
});

const User = mongoose.model('User', userSchema);

// Definition of ranks in ascending order
const ranks = [
  "Trainee", "Idol", "Star", "Superstar", 
  "Global Superstar", "Galactic Superstar", 
  "Universal Superstar", "Deity"
];

async function selectCard(userId, cardCode) {
  try {
    const user = await User.findOne({ userId });
    if (!user) {
      throw new Error('User not found');
    }

    // Check if the card is owned by the user
    if (!user.ownedCards.includes(cardCode)) {
      throw new Error('Card not owned by the user');
    }

    // Check if cardData exists, if not initialize it
    if (!user.cardData.has(cardCode)) {
      user.cardData.set(cardCode, { experience: 0, rank: 'Trainee', work: null, workRemainingUses: 0 });
    }

    user.selectedCard = cardCode;
    await user.save();
    return user;
  } catch (error) {
    console.error('Error selecting card:', error);
    return null;
  }
}

async function addExperience(userId, cardCode, exp) {
  const user = await User.findOne({ userId });
  if (!user) {
    const newUser = new User({
      userId,
      cardData: {
        [cardCode]: {
          experience: exp,
          rank: ranks[0]
        }
      }
    });
    await newUser.save();
    return newUser.cardData.get(cardCode).experience;
  } else {
    if (!user.cardData.has(cardCode)) {
      user.cardData.set(cardCode, {
        experience: exp,
        rank: ranks[0]
      });
    } else {
      const cardData = user.cardData.get(cardCode);
      cardData.experience += exp;
      user.cardData.set(cardCode, cardData); // Ensure the map is updated
    }
    await user.save();
    return user.cardData.get(cardCode).experience;
  }
}

async function getExperience(userId) {
  const user = await User.findOne({ userId });
  if (!user || !user.selectedCard) {
    return 0;
  }

  const cardData = user.cardData.get(user.selectedCard);
  return cardData ? cardData.experience : 0;
}

async function getRankForCard(userId, cardCode) {
  const user = await User.findOne({ userId });
  if (!user || !user.cardData || !user.cardData.has(cardCode)) {
    return ranks[0]; // If the user or the card does not exist, return the initial rank
  }
  return user.cardData.get(cardCode).rank;
}


async function ascendUser(userId) {
  const user = await User.findOne({ userId });
  if (!user) return false;

  if (!user.selectedCard) return false;

  const selectedCard = user.selectedCard;
  const cardData = user.cardData.get(selectedCard);
  if (!cardData) return false;

  const currentRankIndex = ranks.indexOf(cardData.rank);
  const currentLevel = getVisualLevel(cardData.experience, cardData.rank);

  if (currentLevel >= (100 * (currentRankIndex + 1)) && currentRankIndex < ranks.length - 1) {
    cardData.rank = ranks[currentRankIndex + 1];
    user.hasAscended = true;
    user.cardData.set(selectedCard, cardData);
    await user.save();
    return true;
  }

  return false;
}

function getVisualLevel(exp, rank) {
  const rankIndex = ranks.indexOf(rank);
  const baseLevel = 100 * rankIndex;
  const levelWithinRank = Math.floor(exp / 5); // 5 points per level within each rank
  return baseLevel + levelWithinRank;
}

async function getSelectedCard(userId) {
  try {
    const user = await User.findOne({ userId });
    return user ? user.selectedCard : null;
  } catch (error) {
    console.error('Error getting selected card:', error);
    return null;
  }
}

async function getCardDetails(cardCode) {
  const cardData = cards[cardCode];
  return cardData ? cardData : null;
}


async function buyCard(userId, cardCode) {
  try {
    const user = await User.findOne({ userId });
    if (!user) {
      // If the user doesn't exist, create a new user and add the card
      const newUser = new User({
        userId,
        ownedCards: [cardCode]
      });
      await newUser.save();
      return true;
    }

    // Check if the user already owns the card
    if (user.ownedCards.includes(cardCode)) {
      return false; // Card is already owned
    }

    // Add the card to the user's owned cards
    user.ownedCards.push(cardCode);
    await user.save();
    return true; // Successfully added the card
  } catch (error) {
    console.error('Error buying card:', error);
    return false;
  }
}

async function assignWork(userId, cardCode) {
  try {
    const user = await User.findOne({ userId });
    if (!user) {
      throw new Error('User not found');
    }

    // Ensure cardData exists for the cardCode
    if (!user.cardData.has(cardCode)) {
      user.cardData.set(cardCode, { experience: 0, rank: 'Trainee', work: null, workRemainingUses: 0 });
    }

    // If the card already has work assigned, return the work details
    const selectedCard = user.cardData.get(cardCode);
    if (selectedCard.work) {
      const work = works[selectedCard.work];
      return { work, remainingUses: selectedCard.workRemainingUses };
    }

    // Assign a random work from the available works
    const randomWorkKey = Object.keys(works)[Math.floor(Math.random() * Object.keys(works).length)];
    const randomWork = works[randomWorkKey];

    selectedCard.work = randomWork.code;
    selectedCard.workRemainingUses = randomWork.uses;
    user.cardData.set(cardCode, selectedCard);

    await user.save();
    return { work: randomWork, remainingUses: randomWork.uses };
  } catch (error) {
    console.error('Error assigning work:', error);
    return null;
  }
}

// Update work usage and experience
async function updateWorkUsage(userId, cardCode) {
  try {
    const user = await User.findOne({ userId });
    if (!user) {
      throw new Error('User not found');
    }

    const selectedCard = user.cardData.get(cardCode);
    if (!selectedCard || !selectedCard.work) {
      throw new Error('No work assigned to this card');
    }

    const work = works[selectedCard.work];
    if (!work) {
      throw new Error('Work not found');
    }

    // Update experience and decrement remaining uses
    selectedCard.experience += work.experience;
    selectedCard.workRemainingUses -= 1;

    // Remove the work if no uses remain
    if (selectedCard.workRemainingUses <= 0) {
      selectedCard.work = null;
      selectedCard.workRemainingUses = 0;
    }

    user.cardData.set(cardCode, selectedCard);
    await user.save();

    return { experienceGained: work.experience, remainingUses: selectedCard.workRemainingUses };
  } catch (error) {
    console.error('Error updating work usage:', error);
    return null;
  }
}

// Retrieve work details for a specific card
async function getWorkForCard(userId, cardCode) {
  try {
    const user = await User.findOne({ userId });
    if (!user) {
      return null;
    }

    const selectedCard = user.cardData.get(cardCode);
    if (!selectedCard || !selectedCard.work) {
      return null;
    }

    const work = works[selectedCard.work];
    return { work, remainingUses: selectedCard.workRemainingUses };
  } catch (error) {
    console.error('Error retrieving work for card:', error);
    return null;
  }
}


async function applyWorkExperience(userId) {
  const user = await User.findOne({ userId });
  if (!user || !user.selectedCard) {
    throw new Error('No card selected or user not found.');
  }

  const selectedCardCode = user.selectedCard;
  const selectedCard = user.cardData.get(selectedCardCode);

  if (!selectedCard) {
    throw new Error('Selected card data not found.');
  }

  const workCode = selectedCard.work;
  const work = works[workCode];

  if (!work) {
    throw new Error('Assigned work not found.');
  }

  // Apply the experience gain
  selectedCard.experience += work.experience;
  selectedCard.workRemainingUses -= 1;

  if (selectedCard.workRemainingUses <= 0) {
    selectedCard.work = null;
    selectedCard.workRemainingUses = 0;
  }

  user.cardData.set(selectedCardCode, selectedCard);
  await user.save();

  // Assuming card name and other details are stored in some object or database
  const cardData = getCardDetails(selectedCardCode); // Replace this with your card details retrieval logic
  const cardName = cardData ? cardData.name : 'Unknown Card';

  const totalExperience = selectedCard.experience;
  const cardRank = await getRankForCard(userId, selectedCardCode);
  const cardLevel = getVisualLevel(totalExperience, cardRank);

  return {
    cardName,
    workName: work.name,
    experienceGained: work.experience,
    totalExperience,
    cardLevel,
    cardRank,
  };
}





module.exports = {
  User,
  addExperience,
  getExperience,
  getRankForCard,
  getVisualLevel,
  ascendUser,
  selectCard,
  getSelectedCard,
  getCardDetails,
  assignWork,
  updateWorkUsage,
  getWorkForCard,
  applyWorkExperience,
  buyCard
};
