'use strict';

const Discord = require('discord.js');
const tokens = require('./tokens.json');
const client = new Discord.Client();

const music = require('./modules/music.js');
const gif = require('./modules/gif.js');

client.on('ready', () => {
	console.log('ready!');
});

client.on('message', msg => {
	let message = msg.content;
	let cmdPrefix = tokens.prefix;

	if (!msg.content.startsWith(cmdPrefix)) {
		return;
	}

	let msgSplit = message.toLowerCase().slice(cmdPrefix.length).split(' ');
	let cmdName = msgSplit[0];
	let cmdArgs = msgSplit.slice(1).join(' ');

	if (music.hasOwnProperty(cmdName)) {
		music[cmdName](msg);
	} else if (gif.hasOwnProperty(cmdName)) {
		gif[cmdName](cmdArgs).then(url => {
			msg.channel.sendMessage(url);
		});
	}
});

client.login(tokens.d_token);
