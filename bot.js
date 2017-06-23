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
const botPrefix = botConfig.prefix;
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
                err => console.log('Chat: no response', err)
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

// Event Listeners
client.on('ready', () => {
    let modulesInitialized = [];

    console.log(`${botName}: Initializing Modules!`);

    for (let moduleName in modules) {
        const moduleInfo = modules[moduleName];
        const moduleInitialized = moduleInfo.available ?
            Promise.resolve() :
            moduleInfo.pointer.init.apply(
                moduleInfo.pointer,
                moduleInfo.initParameters
            );

        modulesInitialized.push(moduleInitialized);

        moduleInitialized.then(
            () => {
                console.log(`${botName}: ${moduleName} ready!`);
                modules[moduleName].status = 'ready';
                modules[moduleName].available = true;
            },
            () => console.log(`${botName}: ${moduleName} unavailable.`)
        );
    }

    Promise.all(modulesInitialized).then(
        () => {},
        () => {}
    ).then(
        () => console.log(`${botName}: Ready!`)
    );
});

client.on('message', msg => {

    const stop = msg.author.bot ||
        (msg.client !== client) ||
        !msg.content.startsWith(botPrefix);

    if (stop) {
        return;
    }

    let message = msg.content;
    let msgSplit = message.slice(botPrefix.length).split(' ');
    let cmdName = msgSplit[0].toLowerCase();
    let cmdArgs = msgSplit.slice(1).join(' ');

    const commands = {
        help: {
            run: () => {
                const instructions = [
                    '```xl',
                    `** ${botName} **`,
                    `${botPrefix}help  : "Show commands"`,
                    `${botPrefix}sleep : "Exit"`,
                    '\n',
                    music[cmdName](botPrefix),
                    '\n',
                    gif[cmdName](botPrefix),
                    '\n',
                    reminder[cmdName](botPrefix),
                    '\n',
                    translator[cmdName](botPrefix),
                    '\n',
                    '```'
                ].join('\n');

                msg.channel.sendMessage(instructions);
            }
        },
        sleep: {
            run: () => {
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
            }
        }
    };

    let command = commands[cmdName];

    if (!command) {
        for (let moduleName in modules) {
            let moduleInfo = modules[moduleName];

            if (moduleInfo.available &&
                moduleInfo.pointer.hasOwnProperty(cmdName)) {
                command = moduleInfo;
            }
        }
    }

    if (command) {
        command.run(msg, cmdName, cmdArgs);
    }
    else {
        msg.channel.sendMessage(
            `${botName}: Command not found [${cmdName}]`
        );
    }
});

client.login(botConfig.d_token);
