'use strict';

// Modules
const config = require('./config.json');
const Discord = require('discord.js');
const modules = require('./modules/index.js');

// Bot Variables
const client = new Discord.Client();
const botConfig = config.bot;
const botName = botConfig.name;
const botPrefix = botConfig.prefix;

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
                let instructions = [
                    '```xl',
                    `** ${botName} **`,
                    `${botPrefix}help  : "Show commands"`,
                    `${botPrefix}sleep : "Exit"`
                ];

                for (let moduleName in modules) {
                    const moduleInfo = modules[moduleName];

                    if (moduleInfo.available &&
                        moduleInfo.pointer &&
                        moduleInfo.pointer['help']) {
                        instructions.push(
                            '\n' +
                            moduleInfo.pointer['help'](botPrefix)
                        );
                    }
                }

                instructions.push('```');

                msg.channel.sendMessage(instructions.join('\n'));
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
    // TODO: check when playing music
    // else {
    //     msg.channel.sendMessage(
    //         `${botName}: Command not found [${cmdName}]`
    //     );
    // }
});

client.login(botConfig.d_token);
