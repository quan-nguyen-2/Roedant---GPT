// Load environment variables from a .env file
require('dotenv/config');

// Import necessary modules
const { Client } = require('discord.js');
const { OpenAI } = require('openai');

// Create a new Discord client instance
const client = new Client({
    intents: ['Guilds', 'GuildMembers', 'GuildMessages', 'MessageContent'],
});

// Event handler for when the bot is ready
client.on('ready', () => {
    console.log('Bot is online.');
});

// Define command prefix and specific channels for the bot
const COMMAND_PREFIX = "!gpt";
const CHANNELS = ['1203103426511376454'];

// Create an instance of the OpenAI class using the provided API key
const openai = new OpenAI({
    apiKey: process.env.OPENAI_KEY,
});

// Use a Set to keep track of responded messages to avoid duplicates
const respondedMessages = new Set();

// Function to split a long response into chunks and send them as separate messages
async function sendLongResponse(message, response) {
    const maxLength = 2000;
    const chunks = response.match(/[\s\S]{1,2000}/g) || [];
    
    for (const chunk of chunks) {
        await message.reply(chunk);
    }
}

// Event handler for incoming messages
client.on('messageCreate', async (message) => {
    // Ignore messages from bots and those that don't start with the command prefix
    if (message.author.bot || !message.content.startsWith(COMMAND_PREFIX)) return;

    // Skip if the message has already been responded
    if (respondedMessages.has(message.id)) return;

    // Indicate typing before processing the message
    await message.channel.sendTyping();

    // Set interval to send typing signal every 5 seconds while processing
    const sendTypingInterval = setInterval(() => {
        message.channel.sendTyping();
    }, 5000);

    // Define the conversation history with a system message and the user's message
    let conversation = [];
    conversation.push({
        role: 'system',
        content: 'Chat GPT is a versatile Chat_Bot that can respond to various queries.'
    });
    conversation.push({
        role: 'user',
        name: message.author.username.replace(/\s+/g, '_').replace(/[^\w\s]/gi, ''),
        content: message.content,
    });

    try {
        // Request a completion from the OpenAI GPT model
        const response = await openai.chat.completions.create({
            model: 'gpt-3.5-turbo',
            messages: conversation,
        });

        clearInterval(sendTypingInterval); // Clear typing interval

        // Extract the response content from the OpenAI API
        const responseContent = response.choices[0].message.content;

        // Check if the initial response has already been sent
        if (!respondedMessages.has(message.id)) {
            // If the response is longer than 2000 characters, send in chunks
            if (responseContent.length > 2000) {
                await sendLongResponse(message, responseContent);
            } else {
                message.reply(responseContent);
            }
            respondedMessages.add(message.id); // Mark the message as replied
        }
    } catch (error) {
        console.error('openAI Error:\n', error);
        clearInterval(sendTypingInterval); // Clear typing interval in case of an error
        message.reply("I'm Having Some Trouble Replying...");
    }
});

// Log in to Discord using the provided bot token
client.login(process.env.TOKEN);
