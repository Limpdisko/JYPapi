// command.js

const { EmbedBuilder } = require("discord.js");
const { MongoClient } = require('mongodb');
const config = require('../config.json');
const { User, addExperience, getExperience, getRankForCard, getVisualLevel, ascendUser, selectCard, getSelectedCard, assignWork, updateWorkUsage, applyWorkExperience, buyCard } = require('./functions.js');
const { getImage, cards } = require('./cards.js');
const { works } = require('./works.js');

module.exports = (client, message) => {
  const prefix = `;`;

  if (!message.content.startsWith(prefix) || message.author.bot) return;

  const args = message.content.slice(prefix.length).split(/ +/);
  const command = args.shift().toLowerCase();
  const userId = message.author.id;


  if (command === 'start') {
    (async () => {
      try {
        // Get all card codes from different categories
        const cardKeys = Object.keys(cards.Normal).concat(
          Object.keys(cards.Legendary),
          Object.keys(cards.Rare),
          Object.keys(cards.Special)
        );
  
        // Randomly select a card
        const randomCardCode = cardKeys[Math.floor(Math.random() * cardKeys.length)];
  
        // Check if the user already has a card
        let user = await User.findOne({ userId: message.author.id });
  
        if (user) {
          if (user.ownedCards.length > 0) {
            return message.channel.send('You already have a card assigned.');
          }
  
          // Assign the card to the user
          user.ownedCards.push(randomCardCode);
          user.selectedCard = randomCardCode;
          await user.save();
        } else {
          // Create a new user and assign the card
          user = new User({
            userId: message.author.id,
            ownedCards: [randomCardCode],
            selectedCard: randomCardCode
          });
          await user.save();
        }
  
        // Get card details
        const cardData = getImage(randomCardCode);
  
        // Create and send embed message
        const embed = new EmbedBuilder()
          .setTitle("Card Assigned")
          .setDescription(`Congratulations! You have been assigned the card **${cardData.name}**.`)
          .setImage(cardData.image)
          .setColor("#00FF00"); // Green color for success
  
        message.channel.send({ embeds: [embed] });
  
      } catch (err) {
        console.error('Error assigning card:', err);
        message.channel.send('There was an error trying to assign a card.');
      }
    })();
  }
  

  if (command === 'select') {
    async function selectCardCommand() {
      const cardCode = args[0]; // Get the card code from the command arguments
  
      if (!cardCode) {
        return message.channel.send('Please provide the card code.');
      }
  
      // Get the card data to verify it exists
      const cardData = getImage(cardCode);
  
      if (!cardData) {
        return message.channel.send('Card not found.');
      }
  
      // Get the user's data from the database
      try {
        const user = await User.findOne({ userId: message.author.id });
  
        if (!user) {
          return message.channel.send('User not found.');
        }
  
        // Check if the user owns the card
        if (!user.ownedCards.includes(cardCode)) {
          const embed = new EmbedBuilder()
            .setTitle("Card Not Found")
            .setDescription(`You do not own the card with code **${cardCode}**.`)
            .setColor("#FF0000"); // Red color to indicate an error
  
          return message.channel.send({ embeds: [embed] });
        }
  
        // Proceed with selecting the card
        const cardName = cardData.name;
        const cardImage = cardData.image;
  
        const embed = new EmbedBuilder()
          .setTitle("Selected Card")
          .setDescription(`You have selected the card: **${cardName}**`);
  
        // Verify that cardImage is a valid string and an image URL
        if (typeof cardImage === 'string' && cardImage.startsWith('http')) {
          embed.setImage(cardImage);
        } else {
          console.warn('Invalid image URL:', cardImage);
        }
  
        await selectCard(message.author.id, cardCode); // Register the selected card in the database
  
        message.channel.send({ embeds: [embed] });
      } catch (error) {
        console.error('Error processing card selection:', error);
        message.channel.send('There was an error trying to select the card.');
      }
    }
  
    selectCardCommand();
  }
  
  

  if (command === 'train') {
    (async () => {
      try {
        const selectedCardCode = await getSelectedCard(message.author.id);
  
        if (!selectedCardCode) {
          // If no card is selected
          const embed = new EmbedBuilder()
            .setTitle("No Card Selected")
            .setDescription("You need to select a card before training.")
            .setColor("#FF0000"); // Red color to indicate an error
  
          return message.channel.send({ embeds: [embed] });
        }
  
        const cardData = getImage(selectedCardCode); // Use getImage to get card details
        if (!cardData) {
          return message.channel.send('Card not found.');
        }
  
        const cardName = cardData.name;
        const cardImageUrl = cardData.image; // URL for the card image
  
        // Get the user data
        const user = await User.findOne({ userId: message.author.id });
        if (!user) {
          return message.channel.send('User not found.');
        }
  
        let selectedCard = user.cardData.get(selectedCardCode);
  
        // Grant a fixed amount of experience points
        const experienceGained = 40;
        selectedCard.experience += experienceGained;
  
        // Assign a random work if none is assigned
        let assignedWorkName = 'None'; // Default if no work is assigned
        if (!selectedCard.work) {
          const randomWorkKey = Object.keys(works)[Math.floor(Math.random() * Object.keys(works).length)];
          const randomWork = works[randomWorkKey];
  
          selectedCard.work = randomWork.code;
          selectedCard.workRemainingUses = randomWork.uses;
          assignedWorkName = randomWork.name; // Get the name of the assigned work
        } else {
          // Get the name of the currently assigned work
          const work = works[selectedCard.work];
          assignedWorkName = work ? work.name : 'Unknown'; // Handle cases where work might not be found
        }
  
        // Save the updated user data
        user.cardData.set(selectedCardCode, selectedCard);
        await user.save();
  
        const totalExperience = selectedCard.experience;
        const cardRank = await getRankForCard(message.author.id, selectedCardCode);
        const cardLevel = getVisualLevel(totalExperience, cardRank);
  
        const embed = new EmbedBuilder()
          .setTitle("Training Complete")
          .setDescription(`**${cardName}** has gained **${experienceGained}** experience points.`)
          .addFields(
            { name: 'Total Experience', value: `\`${totalExperience}\``, inline: true },
            { name: 'Level', value: `\`${cardLevel}\``, inline: true },
            { name: 'Rank', value: `\`${cardRank}\``, inline: true },
            { name: 'Assigned Work', value: `${assignedWorkName}`, inline: true } // Add assigned work name to the embed
          )
          .setThumbnail(cardImageUrl) // Set the card image as the thumbnail
          .setColor("#00FF00"); // Green color to indicate success
  
        message.channel.send({ embeds: [embed] });
  
      } catch (err) {
        console.error('Error during training:', err);
        message.channel.send('There was an error processing the training.');
      }
    })();
  }



  if (command === 'ascend') {
    (async () => {
      try {
        // Get the selected card
        const selectedCardCode = await getSelectedCard(userId);
        const cardData = getImage(selectedCardCode);
        const cardName = cardData ? cardData.name : 'Unknown'; // Get the card name
        const cardImage = cardData ? cardData.image : null; // Get the card image URL

        // Ascend the user
        const ascended = await ascendUser(message.author.id);
        if (ascended) {
          const currentExp = await getExperience(message.author.id);
          const currentRank = await getRankForCard(message.author.id);
          const currentLevel = getVisualLevel(currentExp, currentRank);

          const embed = new EmbedBuilder()
            .setTitle("Ascension")
            .setDescription(`Congratulations! **${cardName}** has ascended to the rank \`${currentRank}\``)
            .addFields(
              { name: 'Total Experience', value: `\`${currentExp}\``, inline: true },
              { name: 'Level', value: `\`${currentLevel}\``, inline: true },
              { name: 'Rank', value: `\`${currentRank}\``, inline: true }
            )
            .setColor("#FFD700"); // Gold color for the rank

          if (cardImage) {
            embed.setThumbnail(cardImage); // Set the card thumbnail
          }

          message.channel.send({ embeds: [embed] });
        } else {
          message.channel.send('You do not meet the requirements to ascend.');
        }
      } catch (err) {
        console.error('Error during ascension:', err);
        message.channel.send('There was an error trying to ascend.');
      }
    })();
  }

  if (command === 'work') {
    (async () => {
      try {
        const selectedCardCode = await getSelectedCard(message.author.id);
  
        if (!selectedCardCode) {
          // If no card is selected
          const embed = new EmbedBuilder()
            .setTitle("No Card Selected")
            .setDescription("You need to select a card before working.")
            .setColor("#FF0000"); // Red color to indicate an error
  
          return message.channel.send({ embeds: [embed] });
        }
  
        // Get the user data
        const user = await User.findOne({ userId: message.author.id });
        if (!user) {
          return message.channel.send('User not found.');
        }
  
        let selectedCard = user.cardData.get(selectedCardCode);
  
        if (!selectedCard.work) {
          const embed = new EmbedBuilder()
            .setTitle("No Work Assigned")
            .setDescription("The selected card does not have any work assigned.")
            .setColor("#FF0000"); // Red color to indicate an error
  
          return message.channel.send({ embeds: [embed] });
        }
  
        const workCode = selectedCard.work;
        const work = works[workCode];
  
        if (!work) {
          return message.channel.send('Work not found.');
        }
  
        // Get the card details using getImage or similar function
        const cardData = getImage(selectedCardCode); // Use getImage to get card details
        if (!cardData) {
          return message.channel.send('Card not found.');
        }
  
        const cardName = cardData.name;
        const cardImageUrl = cardData.image; // URL for the card image
  
        // Update the experience of the card
        selectedCard.experience += work.experience;
        selectedCard.workRemainingUses -= 1;
  
        if (selectedCard.workRemainingUses <= 0) {
          // If no uses remain, remove the work from the card
          selectedCard.work = null;
          selectedCard.workRemainingUses = 0;
        }
  
        await user.save(); // Save the updated user data
  
        const totalExperience = selectedCard.experience;
        const cardRank = await getRankForCard(message.author.id, selectedCardCode);
        const cardLevel = getVisualLevel(totalExperience, cardRank);
  
        const embed = new EmbedBuilder()
          .setTitle("Work Complete")
          .setDescription(`**${cardName}** has gained **${work.experience}** experience points from the work **${work.name}**.`)
          .addFields(
            { name: 'Total Experience', value: `\`${totalExperience}\``, inline: true },
            { name: 'Level', value: `\`${cardLevel}\``, inline: true },
            { name: 'Rank', value: `\`${cardRank}\``, inline: true }
          )
          .setColor("#00FF00") // Green color to indicate success
          .setThumbnail(cardImageUrl) // Set the card image as the thumbnail
          .setFooter({ text: `Remaining Uses: ${selectedCard.workRemainingUses}` }); // Add remaining uses to the footer
  
        message.channel.send({ embeds: [embed] });
  
      } catch (err) {
        console.error('Error during work:', err);
        message.channel.send('There was an error processing the work.');
      }
    })();
  }

 
  if (command === 'inbox') {
    (async () => {
      try {
        const userId = message.author.id;
        const user = await User.findOne({ userId: userId });
  
        const embed = new EmbedBuilder()
          .setTitle("Mailbox")
          .setColor("#0099ff");
  
        if (!user || !user.mailbox || user.mailbox.length === 0) {
          embed.setDescription("The inbox is empty.");
        } else {
          let description = "";
          user.mailbox.forEach((item, index) => {
            if (item.type === 'work') {
              const work = works[item.code];
              if (work) {
                description += `${index + 1}. **${work.name}** (work)\n`;
              }
            } else {
              description += `${index + 1}. **${item.name}** (${item.type})\n`;
            }
          });
          description += ("Type `;use 1` to activate an item.");
          embed.setDescription(description);
        }
  
        message.channel.send({ embeds: [embed] });
  
      } catch (err) {
        console.error('Error handling the mailbox command:', err);
        message.channel.send('There was an error processing the command.');
      }
    })();
  }
  



  if (command === 'use') {
    (async () => {
      try {
        const index = parseInt(args[0], 10) - 1;

        const userId = message.author.id;
        const user = await User.findOne({ userId: userId });

        if (!user || !user.mailbox || user.mailbox.length <= index || index < 0) {
          return message.channel.send('Item not found in the mailbox.');
        }

        const item = user.mailbox[index];
        user.mailbox.splice(index, 1);
        await user.save();

        if (item.type === 'work') {
          const selectedCardCode = await getSelectedCard(userId);
          await setWork(userId, selectedCardCode, item.code, workk[item.code].maxUses);
          return message.channel.send(`You have activated the work **${item.name}** for the selected card.`);
        }

        // You can handle other types of items here if needed

      } catch (err) {
        console.error('Error handling the use command:', err);
        message.channel.send('There was an error processing the command.');
      }
    })();
  }



  if (command === 'buy') {
    (async () => {
      const cardCode = args[0];
  
      if (!cardCode) {
        return message.channel.send('Please provide the card code.');
      }
  
      // Check if the card exists
      const cardData = getImage(cardCode);
      if (!cardData) {
        return message.channel.send('Card not found.');
      }
  
      // Attempt to buy the card
      const success = await buyCard(message.author.id, cardCode);
      if (success) {
        const embed = new EmbedBuilder()
          .setTitle("Card Purchased")
          .setDescription(`You have successfully purchased the card: **${cardData.name}**`)
          .setImage(cardData.image)
          .setColor("#00FF00"); // Green color for success
  
        message.channel.send({ embeds: [embed] });
      } else {
        message.channel.send('You already own this card or there was an error trying to purchase it.');
      }
    })();
  }



};
