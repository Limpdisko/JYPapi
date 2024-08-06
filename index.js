const { Client, GatewayIntentBits } = require('discord.js');
const mongoose = require('mongoose');
const commandHandler = require('./Commands/command');
const config = require('./config.json');

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });

client.once('ready', () => {
  console.log('Cliente X-Pulse iniciado');
});

client.on('messageCreate', (message) => {
  commandHandler(client, message);
});

const mongoUri = config.mongopass;
const discordToken = config.token;

if (!mongoUri) {
  console.error('Error: mongopass no está definido en el archivo config.json');
  process.exit(1);
}

if (!discordToken) {
  console.error('Error: token no está definido en el archivo config.json');
  process.exit(1);
}

mongoose.connect(mongoUri, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => {
    console.log('Conectado a MongoDB');
    client.login(discordToken);
  })
  .catch(err => {
    console.error('Error conectando a MongoDB', err);
  });
