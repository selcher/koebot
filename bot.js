'use strict';

// Modules
const config = require('./config.json');
const Discord = require('discord.js');

const music = require('./modules/music.js');
const gif = require('./modules/gif.js');
const reminder = require('./modules/reminder.js');
const translator = require('./modules/translate.js');
const chat = require('./modules/wit-wrapper.js');
const chatActions = require('./modules/wit-actions.js');

// Bot Variables
const client = new Discord.Client();
const botConfig = config.bot;
const botName = botConfig.name;
const prefix = botConfig.prefix;
let reminderModuleAvailable = false;
let chatModuleAvailable = false;

// Event Listeners
client.on('ready', () => {

    console.log(`${botName}: Ready!`);

    reminder.init(config.firebase).then(
        () => {
            reminderModuleAvailable = true;
            console.log(`${botName}: Reminder module ready!`);
        },
        (err) => {
            reminderModuleAvailable = false;
            console.log(`${botName}: Reminder module disabled.`);
        }
    );

    chat.init(config.wit.token, chatActions).then(
        () => {
            chatModuleAvailable = true;
            console.log(`${botName}: Chat module ready!`);
        },
        (err) => {
            chatModuleAvailable = false;
            console.log(`${botName}: Chat module disabled.`);
        }
    );
});

client.on('message', msg => {

    const stop = msg.author.bot ||
        (msg.client !== client) ||
        !msg.content.startsWith(prefix);

    if (stop) {
        return;
    }

    let message = msg.content;
    let msgSplit = message.slice(prefix.length).split(' ');
    let cmdName = msgSplit[0].toLowerCase();
    let cmdArgs = msgSplit.slice(1).join(' ');

    if (cmdName === 'help') {

        let instructions = [
            '```xl',
            `** ${botName} **`,
            `${prefix}help  : "Show commands"`,
            `${prefix}sleep : "Exit"`,
            '\n',
            music[cmdName](prefix),
            '\n',
            gif[cmdName](prefix),
            '\n',
            reminder[cmdName](prefix),
            '\n',
            translator[cmdName](prefix),
            '\n',
            '```'
        ].join('\n');

        msg.channel.sendMessage(instructions);

    } else if (cmdName === 'sleep') {

        if (msg.author.id == botConfig.adminID) {

            msg.channel.sendMessage('Bye ...').then(
                () => client.destroy()
            ).then(
                () => process.exit()
            ).catch(
                e => {
                    msg.channes.sendMessage('I can\'t sleep ...');
                    console.log(`${botName}: can't sleep > `, e);
                }
            );

        } else {

            msg.channel.sendMessage('Only master can make me sleep!');
            console.log(`${botName}: unauthorized to sleep`);
        }

        // TODO:
        // Reboot: requires a node module like Forever to work.

    } else if (music.hasOwnProperty(cmdName)) {

        music[cmdName](msg, cmdArgs);

    } else if (gif.hasOwnProperty(cmdName)) {

        gif[cmdName](cmdArgs).then(
            url => msg.channel.sendMessage(url)
        ).catch(
            e => console.log(`${botName}: Gif error >`, e)
        );

    } else if (reminderModuleAvailable &&
        reminder.hasOwnProperty(cmdName)) {

        reminder[cmdName](
            cmdArgs,
            msg.author.username,
            msg.author.id
        ).then(
            eventDetails => msg.author.sendMessage(eventDetails)
        ).catch(
            e => console.log(`${botName}: Reminder error >`, e)
        );

    } else if (translator.hasOwnProperty(cmdName)) {

        let srcLang = msgSplit[1];
        let targetLang = msgSplit[2];
        let keywords = msgSplit.slice(3);

        translator[cmdName](srcLang, targetLang, keywords).then(
            response => msg.channel.sendMessage(response)
        ).catch(
            e => console.log(`${botName}: Translation error >`, e)
        );

    } else if (chatModuleAvailable &&
        cmdName.toLowerCase() === botName.toLowerCase()) {

        chat.message(msg.author.id, cmdArgs).then(
            response => msg.channel.sendMessage(response)
        ).catch(
            e => console.log(`${botName}: Chat error >`, e)
        );

    }
});

client.login(botConfig.d_token);
