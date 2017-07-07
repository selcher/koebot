'use strict';

// Modules
const music = require('./music.js');
const gif = require('./gif.js');
const imgSearch = require('./img-search.js');
const reminder = require('./reminder.js');
const translator = require('./translate.js');
const chat = require('./wit-wrapper.js');
const chatActions = require('./wit-actions.js');

// Config
const config = require('./../config.json');
const botConfig = config.bot;
const botName = botConfig.name;
const searchConfig = config.google.customSearch;
const youtubeConfig = config.google.youtube;

let modules = {
    music: {
        pointer: music,
        status: 'error',
        available: false,
        initParameters: [
            youtubeConfig.apiKey,
            youtubeConfig.playlist
        ],
        run: (msg, cmdName, cmdArgs) => {
            music[cmdName](msg, cmdArgs);
        }
    },
    imgSearch: {
        pointer: imgSearch,
        status: 'error',
        available: false,
        initParameters: [
            searchConfig.apiKey,
            searchConfig.searchEngineId
        ],
        run: (msg, cmdName, cmdArgs) => {
            imgSearch[cmdName](cmdArgs).then(
                url => msg.channel.sendMessage(url)
            ).catch(
                e => console.log(`${botName}: Img Search error >`, e)
            );
        }
    },
    gif: {
        pointer: gif,
        status: 'success',
        available: true,
        initParameters: [],
        run: (msg, cmdName, cmdArgs) => {
            gif[cmdName](cmdArgs).then(
                url => msg.channel.sendMessage(url)
            ).catch(
                e => console.log(`${botName}: Gif error >`, e)
            );
        }
    },
    chat: {
        pointer: chat,
        status: 'error',
        available: false,
        initParameters: [
            config.wit.token,
            chatActions
        ],
        run: (msg, cmdName, cmdArgs) => {
            chat.message(msg.author.id, cmdArgs).then(
                response => msg.channel.sendMessage(response),
                err => console.log(`${botName}: Chat no response`, err)
            ).catch(
                e => console.log(`${botName}: Chat error >`, e)
            );
        }
    },
    reminder: {
        pointer: reminder,
        status: 'error',
        available: false,
        initParameters: [
            config.firebase
        ],
        run: (msg, cmdName, cmdArgs) => {
            reminder[cmdName](
                cmdArgs,
                msg.author.username,
                msg.author.id
            ).then(
                eventDetails => msg.author.sendMessage(eventDetails)
            ).catch(
                e => console.log(`${botName}: Reminder error >`, e)
            );
        }
    },
    translator: {
        pointer: translator,
        status: 'success',
        available: true,
        initParameters: [],
        run: (msg, cmdName, cmdArgs) => {
            let msgSplit = cmdArgs.split(' ');
            let srcLang = msgSplit[0];
            let targetLang = msgSplit[1];
            let keywords = msgSplit.slice(2);

            translator[cmdName](srcLang, targetLang, keywords).then(
                response => msg.channel.sendMessage(response)
            ).catch(
                e => console.log(`${botName}: Translation error >`, e)
            );
        }
    }
};

// Export Module
module.exports = modules;
