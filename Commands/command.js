// command.js

const { EmbedBuilder } = require("discord.js");
const { MongoClient } = require('mongodb');
const config = require('../config.json');
const { addExperience, getExperience, getRankForUser, getVisualLevel, ascendUser, resetUser, selectCard, getSelectedCard, setTrabajo, getTrabajo } = require('./niveles');
const { getImage } = require('./cartas');
const { trabajos } = require('./trabajos.js');
const { User } = require('./niveles');


module.exports = (client, message) => {
  const prefix = `;`;

  if (!message.content.startsWith(prefix) || message.author.bot) return;

  const args = message.content.slice(prefix.length).split(/ +/);
  const command = args.shift().toLowerCase();
  const userId = message.author.id;

  if (command === 'seleccionar') {
    async function seleccionarCarta() {
      const cartaCodigo = args[0]; // Aquí usamos el código de la carta
  
      if (!cartaCodigo) {
        return message.channel.send('Por favor, proporciona el código de la carta.');
      }
  
      const cardData = getImage(cartaCodigo);
  
      if (!cardData) {
        return message.channel.send('Carta no encontrada.');
      }
  
      const cardName = cardData.nombre;
      const cardImage = cardData.imagen;
  
      const embed = new EmbedBuilder()
        .setTitle("Carta Seleccionada")
        .setDescription(`Has seleccionado la carta: **${cardName}**`);
  
      // Verifica que cardImage sea una cadena válida y una URL de imagen
      if (typeof cardImage === 'string' && cardImage.startsWith('http')) {
        embed.setImage(cardImage);
      } else {
        console.warn('URL de imagen inválida:', cardImage);
      }
  
      message.channel.send({ embeds: [embed] });
  
      // Registrar la selección de la carta en la base de datos usando el código de la carta
      try {
        await selectCard(message.author.id, cartaCodigo);
      } catch (error) {
        console.error('Error al registrar la carta seleccionada:', error);
        message.channel.send('Hubo un error al intentar registrar la selección de la carta.');
      }
    }
  
    seleccionarCarta();
  }
  

  if (command === 'entrenar') {
    (async () => {
      try {
        const selectedCardCode = await getSelectedCard(message.author.id);
  
        if (!selectedCardCode) {
          return message.channel.send('Debes seleccionar una carta antes de entrenar.');
        }
  
        const cardData = getImage(selectedCardCode);
        if (!cardData) {
          return message.channel.send('Carta no encontrada.');
        }
  
        const cardImage = cardData.imagen;
        const cardName = cardData.nombre;
  
        if (!cardImage) {
          return message.channel.send('No se pudo obtener la imagen de la carta.');
        }
  
        let gainedExp = 40;
        const rand = Math.random();
        let multiplierMessage = "";
  
        if (rand < 0.01) {
          gainedExp *= 10;
          multiplierMessage = "¡Increíble! Has recibido un multiplicador de experiencia por 10!";
        } else if (rand < 0.03) {
          gainedExp *= 5;
          multiplierMessage = "¡Asombroso! Has recibido un multiplicador de experiencia por 5!";
        } else if (rand < 0.06) {
          gainedExp *= 2;
          multiplierMessage = "¡Genial! Has recibido un multiplicador de experiencia por 2!";
        }
  
        const newExp = await addExperience(message.author.id, gainedExp);
        const currentRank = await getRankForUser(message.author.id);
        const currentLevel = getVisualLevel(newExp, currentRank);
  
        const embed = new EmbedBuilder()
          .setTitle("Entrenamiento")
          .setDescription(`**${cardName}** ganó **${gainedExp}** puntos de experiencia`)
          .addFields(
            { name: 'Experiencia Total', value: `\`${newExp}\``, inline: true },
            { name: 'Nivel', value: `\`${currentLevel}\``, inline: true },
            { name: 'Rango', value: `\`${currentRank}\``, inline: true }
          )
          .setColor("#FF0000");
  
        if (cardImage) {
          embed.setThumbnail(cardImage);
        }
  
        if (multiplierMessage) {
          embed.addFields({ name: 'Multiplicador', value: multiplierMessage });
        }
  
        if (Math.random() < 0.50) {
          const trabajoKeys = Object.keys(trabajos);
          const randomTrabajo = trabajoKeys[Math.floor(Math.random() * trabajoKeys.length)];
          const trabajo = trabajos[randomTrabajo];
          if (trabajo) {
            const mensajeTrabajo = trabajo.nombre;
            embed.addFields({ name: 'A agarrar la pala', value: `**${cardName}** ha recibido el siguiente laburo: **${mensajeTrabajo}**.` });
  
            await setTrabajo(message.author.id, trabajo.codigo);
          }
        }
  
        message.channel.send({ embeds: [embed] });
      } catch (err) {
        console.error('Error añadiendo experiencia:', err);
        message.channel.send('Hubo un error al intentar añadir experiencia.');
      }
    })();
  }
  

  if (command === 'trabajar') {
    (async () => {
      try {
        // Obtener el trabajo actual del usuario
        const trabajoCodigo = await getTrabajo(userId);
  
        if (!trabajoCodigo) {
          return message.channel.send('No tienes ningún trabajo asignado actualmente.');
        }
  
        const trabajo = trabajos[trabajoCodigo];
        if (!trabajo) {
          return message.channel.send('El trabajo asignado no existe.');
        }
  
        // Obtener el usuario desde la base de datos
        const user = await User.findOne({ userId: userId });
        if (!user) {
          return message.channel.send('No se encontró al usuario.');
        }
  
        // Obtener la carta seleccionada y sus datos
        const selectedCard = await getSelectedCard(userId);
        if (!selectedCard) {
          return message.channel.send('Debes seleccionar una carta antes de trabajar.');
        }
  
        const cardData = getImage(selectedCard);
        const cardName = cardData?.nombre || 'Desconocida'; // Nombre de la carta, con valor por defecto
        const cardImage = cardData?.imagen; // URL de la imagen
  
        // Verificar y decrementar el contador de usos restantes
        if (user.trabajoUsosRestantes <= 0) {
          // Si ya no quedan usos, reiniciar el trabajo
          user.trabajo = null;
          user.trabajoUsosRestantes = 0;
          await user.save();
  
          const embed = new EmbedBuilder()
            .setTitle("Trabajo")
            .setDescription(`El trabajo **${trabajo.nombre}** ha expirado.`)
            .setColor("#FF0000"); // Color rojo para notificar expiración
  
          if (cardImage) {
            embed.setThumbnail(cardImage); // Agregar el thumbnail de la carta
          }
  
          return message.channel.send({ embeds: [embed] });
        } else {
          // Decrementar el contador de usos restantes
          user.trabajoUsosRestantes -= 1;
  
          // Añadir experiencia
          const gainedExp = trabajo.experiencia;
          const newExp = await addExperience(userId, gainedExp);
  
          // Actualizar el usuario
          await user.save();
  
          // Obtener la experiencia total, nivel y rango actualizados
          const currentRank = await getRankForUser(userId);
          const currentLevel = getVisualLevel(newExp, currentRank);
  
          const embed = new EmbedBuilder()
            .setTitle("Trabajo")
            .setDescription(`**${trabajo.nombre}**\n**${cardName}** ganó **${gainedExp}** puntos de experiencia`)
            .addFields(
              { name: 'Experiencia Total', value: `\`${newExp}\``, inline: true },
              { name: 'Nivel', value: `\`${currentLevel}\``, inline: true },
              { name: 'Rango', value: `\`${currentRank}\``, inline: true }
            )
            .setColor("#00FF00"); // Color verde para éxito
  
          if (cardImage) {
            embed.setThumbnail(cardImage); // Agregar el thumbnail de la carta
          }

          // Mover "Usos Restantes" al footer
        embed.setFooter({ text: `Usos Restantes: ${user.trabajoUsosRestantes}` });
  
          // Mostrar mensaje si es el último uso
          if (user.trabajoUsosRestantes === 0) {
            embed.addFields({
              name: 'A descansar',
              value: `**${cardName}** ha finalizado su trabajo.`,
            });
          }
  
          message.channel.send({ embeds: [embed] });
        }
  
      } catch (err) {
        console.error('Error al manejar el comando trabajar:', err);
        message.channel.send('Hubo un error al procesar el comando.');
      }
    })();
  }
  

if (command === 'ascender') {
  (async () => {
    try {
      // Obtener la carta seleccionada
      const selectedCardCode = await getSelectedCard(userId);
      const cardData = getImage(selectedCardCode);
      const cardName = cardData ? cardData.nombre : 'Desconocida'; // Obtener el nombre de la carta
      const cardImage = cardData ? cardData.imagen : null; // Obtener la URL de la imagen

      // Ascender al usuario
      const ascended = await ascendUser(message.author.id);
      if (ascended) {
        const currentExp = await getExperience(message.author.id);
        const currentRank = await getRankForUser(message.author.id);
        const currentLevel = getVisualLevel(currentExp, currentRank);

        const embed = new EmbedBuilder()
          .setTitle("Ascenso")
          .setDescription(`¡Felicidades! **${cardName}** ha ascendido al rango \`${currentRank}\``)
          .addFields(
            { name: 'Experiencia Total', value: `\`${currentExp}\``, inline: true },
            { name: 'Nivel', value: `\`${currentLevel}\``, inline: true },
            { name: 'Rango', value: `\`${currentRank}\``, inline: true }
          )
          .setColor("#FFD700"); // Color dorado para el rango

        if (cardImage) {
          embed.setThumbnail(cardImage); // Establecer el thumbnail de la carta
        }

        message.channel.send({ embeds: [embed] });
      } else {
        message.channel.send('No cumples con los requisitos para ascender.');
      }
    } catch (err) {
      console.error('Error al ascender:', err);
      message.channel.send('Hubo un error al intentar ascender.');
    }
  })();
}
  
  if (command === 'buzon') {
    (async () => {
      try {
        const trabajoCodigo = await getTrabajo(userId);
        const embed = new EmbedBuilder()
          .setTitle("Buzón")
          .setColor("#0099ff");

        if (trabajoCodigo) {
          const trabajo = trabajos[trabajoCodigo];
          if (trabajo) {
            embed.setDescription(`1. **${trabajo.nombre}**\n\nComo ejemplo escribi \`;usar 1\` para activar un item.`);
          }
        } else {
          embed.setDescription("El buzón esta vacío.");
        }

        message.channel.send({ embeds: [embed] });

      } catch (err) {
        console.error('Error al manejar el comando buzon:', err);
        message.channel.send('Hubo un error al procesar el comando.');
      }
    })();
    
  }

  if (command === 'usar') {
    (async () => {
      try {
        const index = parseInt(args[0], 10);
  
        if (isNaN(index)) {
          return message.channel.send('Por favor, proporciona un número válido para usar el item.');
        }
  
        const trabajoCodigo = await getTrabajo(userId);
  
        if (!trabajoCodigo) {
          return message.channel.send('No tenes ningún item.');
        }
  
        const trabajo = trabajos[trabajoCodigo];
        if (!trabajo) {
          return message.channel.send('El item que intentas usar no existe.');
        }
  
        // Aquí activamos el trabajo/item. Dependiendo de la estructura de tu "buzón", podrías necesitar verificar el índice.
        if (index === 1) { // Si el índice es 1 y tienes solo un item, lo activamos
          await setTrabajo(userId, trabajo.codigo); // Asigna el trabajo al usuario
  
          const embed = new EmbedBuilder()
            .setTitle("Item Usado")
            .setDescription(`Has activado el trabajo: **${trabajo.nombre}**`)
            .setColor("#00FF00");
  
          message.channel.send({ embeds: [embed] });
        } else {
          message.channel.send('No tienes un item en esa posición.');
        }
  
      } catch (err) {
        console.error('Error al usar el item:', err);
        message.channel.send('Hubo un error al intentar usar el item.');
      }
    })();
  }

  if (command === 'reset') {
    (async () => {
      try {
        // Ejecutar el reset de la carta seleccionada
        await resetUser(message.author.id);
  
        // Enviar confirmación de reset
        const embed = new EmbedBuilder()
          .setTitle("Reset de Carta")
          .setDescription("Tu carta seleccionada ha sido reseteada.")
          .setColor("#FF0000");
  
        message.channel.send({ embeds: [embed] });
      } catch (err) {
        console.error('Error reseteando la carta seleccionada:', err);
        message.channel.send('Hubo un error al intentar resetear la carta seleccionada.');
      }
    })();
  }
};
