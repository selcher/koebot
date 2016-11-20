'use strict';

const Discord = require('discord.js');
const tokens = require('./tokens.json');
const prefix = tokens.prefix;
const client = new Discord.Client();

const music = require('./modules/music.js');
const gif = require('./modules/gif.js');
const reminder = require('./modules/reminder.js');
const translator = require('./modules/translate.js');

let reminderModuleAvailable = false;

client.on('ready', () => {
    console.log('Koe: Ready!');

    reminder.init(tokens.firebase).then(
        () => {
            reminderModuleAvailable = true;
            console.log('Koe: Reminder module ready!');
        },
        (err) => reminderModuleAvailable = false
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

        music[cmdName](msg, cmdArgs).catch(
            e => console.log('Koe: Music error >', e)
        );

    } else if (gif.hasOwnProperty(cmdName)) {

        gif[cmdName](cmdArgs).then(
            url => msg.channel.sendMessage(url)
        ).catch(
            e => console.log('Koe: Gif error >', e)
        );

    } else if (reminderModuleAvailable &&
        reminder.hasOwnProperty(cmdName)) {

        reminder[cmdName](cmdArgs, msg.author.username).then(
            eventDetails => msg.channel.sendMessage(eventDetails)
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

    }
});

client.login(tokens.d_token);
