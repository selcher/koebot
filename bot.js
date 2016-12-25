'use strict';

const Discord = require('discord.js');
const tokens = require('./tokens.json');
const prefix = tokens.prefix;
const client = new Discord.Client();

const music = require('./modules/music.js');
const gif = require('./modules/gif.js');
const reminder = require('./modules/reminder.js');
const translator = require('./modules/translate.js');
const chat = require('./modules/wit-wrapper.js');
const chatActions = require('./modules/wit-actions.js');

// flags...
let reminderModuleAvailable = false;
let chatModuleAvailable = false;

client.on('ready', () => {
    console.log('Koe: Ready!');

    reminder.init(tokens.firebase).then(
        () => {
            reminderModuleAvailable = true;
            console.log('Koe: Reminder module ready!');
        },
        (err) => {
            reminderModuleAvailable = false;
            console.log('Koe: Reminder module broke...');
        }
    );

    chat.init(tokens.wit, chatActions).then(
        () => {
            chatModuleAvailable = true;
            console.log('Koe: Chat module ready!');
        },
        (err) => {
            chatModuleAvailable = false;
            console.log('Koe: Chat module broke...', err);
        }
    );
});

client.on('message', msg => {
    let stop = msg.author.bot ||
        (msg.client !== client) ||
        !msg.content.startsWith(prefix);

    if (stop) {
        return;
    }

    let message = msg.content;
    let msgSplit = message.toLowerCase().slice(prefix.length).split(' ');
    let cmdName = msgSplit[0];
    let cmdArgs = msgSplit.slice(1).join(' ');

    if (cmdName === 'help') {

        let instructions = [
            '```xl',
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

    } else if (music.hasOwnProperty(cmdName)) {

        music[cmdName](msg, cmdArgs);

    } else if (gif.hasOwnProperty(cmdName)) {

        gif[cmdName](cmdArgs).then(
            url => msg.channel.sendMessage(url)
        ).catch(
            e => console.log('Koe: Gif error >', e)
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
            e => console.log('Koe: Reminder error >', e)
        );

    } else if (translator.hasOwnProperty(cmdName)) {

        let srcLang = msgSplit[1];
        let targetLang = msgSplit[2];
        let keywords = msgSplit.slice(3);

        translator[cmdName](srcLang, targetLang, keywords).then(
            response => msg.channel.sendMessage(response)
        ).catch(
            e => console.log('Koe: Translation error >', e)
        );

    } else if (chatModuleAvailable &&
        cmdName.toLowerCase() === 'koe') {

        chat.message(msg.author.id, cmdArgs).then(
            response => msg.channel.sendMessage(response)
        ).catch(
            e => console.log('Koe: Chat error >', e)
        );

    }
});

client.login(tokens.d_token);
