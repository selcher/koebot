'use strict';

const Discord = require('discord.js');
const tokens = require('./tokens.json');
const prefix = tokens.prefix;
const client = new Discord.Client();

const music = require('./modules/music.js');
const gif = require('./modules/gif.js');
const translator = require('./modules/translate.js');

client.on('ready', () => {
    console.log('ready!');
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

    if (music.hasOwnProperty(cmdName)) {

        music[cmdName](msg, cmdArgs);

    } else if (gif.hasOwnProperty(cmdName)) {

        gif[cmdName](cmdArgs).then(url => {
            msg.channel.sendMessage(url);
        });

    } else if (translator.hasOwnProperty(cmdName)) {

        let srcLang = msgSplit[1];
        let targetLang = msgSplit[2];
        let keywords = msgSplit.slice(3);

        translator[cmdName](srcLang, targetLang, keywords).then(
            response => {
                msg.channel.sendMessage(response);
            }
        ).catch(e => {
            console.log('Translation error:', e);
        });

    }
});

client.login(tokens.d_token);
