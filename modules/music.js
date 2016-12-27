'use strict';

// Modules
const tokens = require('./../tokens.json');
const prefix = tokens.prefix;

const yt = require('ytdl-core');
const ytdl = require('youtube-dl');
const fs = require('fs');
const request = require('request');

// Definitions
let autoPlay = true;
let repeat = false;
let repeatLast = true;
const msgDeleteDelay = 15000;

let wrap = (content) => {
    return '```' + content + '```';
};

let msgFormats = {
    addSongFirst: wrap(`Add some songs to the queue first with ${prefix}add`),
    missingAddParam: wrap(`Add keywords, a url, or youtube video id after ${prefix}add`),
    emptyQueue: wrap('Song queue is empty'),
    addedSong: (song) => wrap(`Added ${song.title} to the queue\n`) +
        song.thumbnail,
    alreadyPlaying: wrap('Already Playing'),
    playError: 'Oops, an error occured. Resuming in 5s...',
    playing: (song) => wrap(
            `Now Playing:\n${song.title}\nas requested by: @${song.requester}`
        ),
    paused: (song) => wrap(
            `Paused: ${song.title}`
        ),
    resumed: (song) => wrap(
            `Playing: ${song.title}`
        ),
    skipped: (song) => wrap(
            `Skipped: ${song.title}`
        ),
    volume: (vol) => wrap(
            `Volume: ${vol}%`
        ),
    noVoiceChannel: wrap('I couldn\'t connect to your voice channel...'),
    searchVideoError: wrap('Oops, an error occured while searching the video'),
    invalidVideoLink: (err) => wrap('Invalid YouTube Link: ' + err)
};

let queue = {};
const addToQueue = (id, song) => {
    if (!queue.hasOwnProperty(id)) {
        queue[id] = {};
        queue[id].playing = false;
        queue[id].songs = [];
    }

    queue[id].songs.push(song);
};
const isPlaying = (id) => {
    return queue[id] && queue[id].playing;
};
const getQueueId = (msg) => {
    return msg.guild.id;
};
const getVoiceConnection = (msg) => {
    return msg.guild.voiceConnection;
};
const getVoiceChannel = (msg) => {
    return msg.member.voiceChannel;
};

const getUser = (msg, userId) => {
    return msg.client.fetchUser(userId);
};

const log = () => {
    console.log.apply(console, arguments);
};
const sendMessage = (msg, content, dontDelete)  => {
    return new Promise((resolve, reject) => {
        msg.channel.sendMessage(
            content
        ).then(
            message => {
                !dontDelete && message.delete(msgDeleteDelay);
                resolve(message);
            }
        ).catch(
            err => {
                log(
                    'Error sending msg:',
                    content,
                    '\n',
                    err
                );
                reject(err);
            }
        );
    });
};
const pmMessage = (user, content) => {
    return new Promise((resolve, reject) => {
        user.sendMessage(content).then(
            () => resolve(content)
        ).catch(
            (err) => reject(err)
        );
    });
};

// API
const commands = {
    'autoplay': () => {
        autoPlay = !autoPlay;
    },
    'repeat': () => {
        repeat = !repeat;
    },
    'repeatlast': () => {
        repeatLast = !repeatLast;
    },
    'dl': (msg, cmdArgs) => {

        const url = cmdArgs.split(' ')[0];

        sendMessage(msg, 'Starting download from ' + url, true).then(
            (message) => {

                yt.getInfo(url, (err, info) => {

                    if (err) {
                        message.edit('Error on download');
                        return;
                    }

                    message.edit('Downloading ' + info.title).catch(
                        err => console.log('Error editing msg:', err)
                    );

                    let video = ytdl(url);

                    video.pipe(
                        fs.createWriteStream(info.title + '.mp4', {flags: 'a'})
                    );

                    video.on('complete', (info) => {
                        message.edit('Download complete');
                    });

                    video.on('end', (info) => {
                        message.edit('Download end');
                    });
                });

            }
        );

    },
    'play': (msg) => {

        const queueId = getQueueId(msg);
        let currentQueue = queue[queueId];

        if (currentQueue === undefined) {
            return sendMessage(msg, msgFormats.addSongFirst);
        }

        if (currentQueue.playing) {
            return sendMessage(msg, msgFormats.alreadyPlaying);
        }

        let voiceConnection = getVoiceConnection(msg);

        if (!voiceConnection) {
            return commands.join(msg).then(
                connection => commands.play(msg)
            ).catch(
                err => {
                    log(
                        'Error on voiceConnection:\n',
                        err
                    );
                }
            );
        }

        (function play(song) {

            if (song === undefined) {

                sendMessage(msg, msgFormats.emptyQueue).then(
                    message => {
                        getVoiceChannel(msg).leave();
                    }
                );

            } else {

                queue[queueId].playing = true;

                sendMessage(msg, msgFormats.playing(song));

                getUser(msg, song.requesterId).then(
                    (user) => pmMessage(user, msgFormats.playing(song))
                );

                let dispatcher = voiceConnection.playStream(
                    yt(song.url, {quality: 'lowest', audioonly: true}),
                    {passes: tokens.passes}
                );

                let collector = msg.channel.createCollector(m => m);

                collector.on('message', m => {
                    if (m.content.startsWith(prefix + 'pause')) {
                        sendMessage(msg, msgFormats.paused(song)).then(
                            message => dispatcher.pause()
                        );
                    } else if (m.content.startsWith(prefix + 'resume')) {
                        sendMessage(msg, msgFormats.resumed(song)).then(
                            message => dispatcher.resume()
                        );
                    } else if (m.content.startsWith(prefix + 'skip')) {
                        sendMessage(msg, msgFormats.skipped(song)).then(
                            message => dispatcher.end()
                        );
                    } else if (m.content.startsWith('volume+')) {
                        const volume = Math.round(dispatcher.volume * 50);

                        if (volume < 100) {

                            dispatcher.setVolume(
                                Math.min(
                                    (dispatcher.volume * 50 + (2 * (m.content.split('+').length - 1))) / 50,
                                    2
                                )
                            );

                        }

                        sendMessage(msg, msgFormats.volume(volume));
                    } else if (m.content.startsWith('volume-')) {
                        const volume = Math.round(dispatcher.volume * 50);

                        if (volume > 0) {

                            dispatcher.setVolume(
                                Math.max(
                                    (dispatcher.volume * 50 - (2 * (m.content.split('-').length - 1))) / 50,
                                    0
                                )
                            );

                        }

                        sendMessage(msg, msgFormats.volume(volume));
                    } else if (m.content.startsWith(prefix + 'time')) {
                        let minutes = Math.floor(dispatcher.time / 60000);
                        let seconds = Math.floor((dispatcher.time % 60000) / 1000);

                        sendMessage(msg, `time: ${minutes}:${seconds < 10 ? '0' + seconds : seconds}`);
                    }
                });

                dispatcher.on('end', () => {
                    collector.stop();

                    queue[queueId].playing = false;
                    // Repeat if:
                    // only 1 song is left and repeatLast is enabled (default)
                    // repeat is enabled
                    (
                        (queue[queueId].songs.length > 1 && repeatLast) ||
                        repeat
                    ) && queue[queueId].songs.shift();

                    play(queue[queueId].songs[0]);
                });

                dispatcher.on('error', (err) => {
                    sendMessage(
                        msg,
                        msgFormats.playError
                    ).then(message => {
                        dispatcher.pause();
                        setTimeout(() => {
                            dispatcher.resume();
                        }, msgDeleteDelay);
                    });
                });

            }

        })(currentQueue.songs[0]);
    },
    'join': (msg) => {

        return new Promise((resolve, reject) => {
            const voiceChannel = getVoiceChannel(msg);

            if (!voiceChannel || voiceChannel.type !== 'voice') {

                msg.reply(msgFormats.noVoiceChannel);
                reject(msgFormats.noVoiceChannel);

            } else if (voiceChannel.connection) {

                resolve(voiceChannel.connection);

            } else {

                voiceChannel.join().then(
                    connection => resolve(connection)
                ).catch(
                    err => reject(err)
                );

            }
        });
    },
    'add': (msg, cmdArgs) => {

        let url = cmdArgs;

        if (url == '' || url === undefined) {

            sendMessage(msg, msgFormats.missingAddParam);

        } else if (!url.toLowerCase().startsWith('http')) {

            // If the suffix doesn't start with 'http',
            // assume it's a search.
            url = 'gvsearch1:' + url;

            sendMessage(
                msg,
                wrap('Searching ' + cmdArgs + ' ...'),
                true
            ).then(
                message => {

                    ytdl.getInfo(url, (err, info) => {
                        if (err) {

                            message.edit(msgFormats.searchVideoError);
                            message.delete(5000);

                        } else {

                            let queueId = getQueueId(msg);

                            addToQueue(
                                queueId,
                                {
                                    url: 'https://www.youtube.com/watch?v=' + info.id,
                                    title: info.title,
                                    requester: msg.author.username,
                                    requesterId: msg.author.id
                                }
                            );

                            message.edit(msgFormats.addedSong(info));
                            message.delete(5000);

                            !isPlaying(queueId) && autoPlay && commands.play(msg);
                        }
                    });
                }
            );

        } else if (url) {

            sendMessage(
                msg,
                wrap('Getting video info...'),
                true
            ).then(
                message => {

                    yt.getInfo(url, (err, info) => {
                        if (err) {

                            message.edit(msgFormats.invalidVideoLink(err));
                            message.delete(5000);

                        } else {

                            let queueId = getQueueId(msg);

                            addToQueue(
                                queueId,
                                {
                                    url: url,
                                    title: info.title,
                                    requester: msg.author.username,
                                    requesterId: msg.author.id
                                }
                            );

                            message.edit(msgFormats.addedSong(info));
                            message.delete(5000);

                            !isPlaying(queueId) && autoPlay && commands.play(msg);
                        }
                    });

                }
            );
        }
    },
    'queue': (msg) => {

        const queueId = getQueueId(msg);

        if (queue[queueId] === undefined || queue[queueId].songs.length === 0) {

            sendMessage(msg, msgFormats.addSongFirst);

        } else {

            let tosend = [];

            queue[queueId].songs.forEach((song, i) => {
                tosend.push(`${i+1}. ${song.title} - Requested by: ${song.requester}`);
            });

            sendMessage(
                msg,
                `__**${msg.guild.name}'s Music Queue:**__ **${tosend.length}** songs ${(tosend.length > 15 ? '*[Only next 15 shown]*' : '')}\n\`\`\`${tosend.slice(0,15).join('\n')}\`\`\``
            );
        }
    },
    'help': (cmdPrefix) => {

        return [
            '** MUSIC **',
            cmdPrefix + 'join : "Join Voice channel of msg sender"',
            cmdPrefix + 'add <keywords/url> : "Add a valid youtube link to the queue"',
            cmdPrefix + 'queue : "Shows the current queue, up to 15 songs shown."',
            cmdPrefix + 'play : "Play the music queue if already joined to a voice channel"',
            cmdPrefix + 'autoplay : "Toggle auto play when adding a song"',
            cmdPrefix + 'repeat : "Toggle repeat of current song"',
            cmdPrefix + 'repeatlast : "Toggle repeat of last song"',
            '',
            'the following commands only function while the play command is running:'.toUpperCase(),
            cmdPrefix + 'pause : "pauses the music"',
            cmdPrefix + 'resume : "resumes the music"',
            cmdPrefix + 'skip : "skips the playing song"',
            cmdPrefix + 'time : "Shows the playtime of the song."',
            'volume+(+++) : "increases volume by 2%/+"',
            'volume-(---) : "decreases volume by 2%/-"'
        ].join('\n');
    },
    'reboot': (msg) => {

        if (msg.author.id == tokens.adminID) {
            //Requires a node module like Forever to work.
            process.exit();
        }
    }
};

// Export Module
module.exports = commands;
