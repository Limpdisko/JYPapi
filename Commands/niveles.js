const mongoose = require('mongoose');
const { trabajos } = require('./trabajos');

// Definición del esquema y modelo para los usuarios
const userSchema = new mongoose.Schema({
  userId: String,
  experience: Number,
  rank: String,
  selectedCard: { type: String, default: null },
  hasAscended: { type: Boolean, default: false },
  trabajo: { type: String, default: null },
  trabajoUsosRestantes: { type: Number, default: 0 }
});

const User = mongoose.model('User', userSchema);

// Definición de los rangos en orden ascendente
const ranks = [
  "Trainee", "Idol", "Estrella", "Superestrella", 
  "Superestrella Global", "Superestrella Galactica", 
  "Superestrella Universal", "Deidad"
];

async function addExperience(userId, exp) {
  const user = await User.findOne({ userId });
  if (!user) {
    const newUser = new User({ userId, experience: exp, rank: ranks[0] });
    await newUser.save();
    return newUser.experience;
  } else {
    user.experience += exp;
    await user.save();
    return user.experience;
  }
}

async function getExperience(userId) {
  const user = await User.findOne({ userId });
  return user ? user.experience : 0;
}

async function getRankForUser(userId) {
  const user = await User.findOne({ userId });
  return user ? user.rank : ranks[0];
}

function getVisualLevel(exp, rank) {
  const rankIndex = ranks.indexOf(rank);
  const baseLevel = 100 * rankIndex;
  const levelWithinRank = Math.floor(exp / 5); // 5 puntos por nivel dentro de cada rango
  return baseLevel + levelWithinRank;
}

async function ascendUser(userId) {
  const user = await User.findOne({ userId });
  if (!user) return false;

  const currentRankIndex = ranks.indexOf(user.rank);
  const currentLevel = getVisualLevel(user.experience, user.rank);

  if (currentLevel >= (100 * (currentRankIndex + 1)) && currentRankIndex < ranks.length - 1) {
    user.rank = ranks[currentRankIndex + 1];
    user.hasAscended = true;
    await user.save();
    return true;
  }

  return false;
}

async function resetUser(userId) {
  await User.findOneAndUpdate({ userId }, { 
    experience: 0, 
    rank: ranks[0], 
    selectedCard: null, 
    hasAscended: false,
    trabajo: null,
    trabajoUsosRestantes: 0
  });
}

async function selectCard(userId, cardName) {
  try {
    const user = await User.findOneAndUpdate(
      { userId },
      { selectedCard: cardName },
      { upsert: true, new: true }
    );
    return user;
  } catch (error) {
    console.error('Error al seleccionar carta:', error);
    return null;
  }
}

async function getSelectedCard(userId) {
  try {
    const user = await User.findOne({ userId });
    return user ? user.selectedCard : null;
  } catch (error) {
    console.error('Error al obtener carta seleccionada:', error);
    return null;
  }
}

async function setTrabajo(userId, trabajoCodigo) {
  const trabajo = trabajos[trabajoCodigo];
  if (!trabajo) {
    throw new Error('Trabajo no encontrado');
  }

  const usosIniciales = trabajo.usosMaximos;

  const user = await User.findOneAndUpdate(
    { userId },
    {
      trabajo: trabajoCodigo,
      trabajoUsosRestantes: usosIniciales
    },
    { upsert: true, new: true }
  );
  return user;
}

async function getTrabajo(userId) {
  const user = await User.findOne({ userId });
  return user ? user.trabajo : null;
}

async function updateTrabajoUsos(userId, decrement = 1) {
  const user = await User.findOne({ userId });
  if (!user) return null;

  if (user.trabajoUsosRestantes <= 0) return null;

  user.trabajoUsosRestantes -= decrement;
  if (user.trabajoUsosRestantes <= 0) {
    user.trabajo = null;
    user.trabajoUsosRestantes = 0;
  }
  await user.save();
  return user;
}

async function resetUser(userId) {
  try {
    // Restablecer solo la carta seleccionada
    await User.findOneAndUpdate(
      { userId },
      { selectedCard: null },
      { new: true } // Devolver el documento actualizado
    );
  } catch (error) {
    console.error('Error al resetear la carta seleccionada:', error);
  }
}

module.exports = {
  User,
  addExperience,
  getExperience,
  getRankForUser,
  getVisualLevel,
  ascendUser,
  resetUser,
  selectCard,
  getSelectedCard,
  setTrabajo,
  getTrabajo,
  updateTrabajoUsos
};
