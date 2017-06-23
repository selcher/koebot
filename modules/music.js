'use strict';

// Modules
const yt = require('ytdl-core');
const search = require('youtube-search');
const fs = require('fs');
const request = require('request');

// Config
const config = require('./../config.json');

const botConfig = config.bot;
const prefix = botConfig.prefix;

const musicConfig = config.music;
const passes = musicConfig.passes;
let autoPlay = musicConfig.autoPlay;
let repeat = musicConfig.repeat;
let repeatLast = musicConfig.repeatLast;
const msgDeleteDelay = musicConfig.msgDeleteDelay;

// Message
const wrap = (content) => {
    return '```' + content + '```';
};

const msgFormats = {
    autoPlay: (val) => wrap(
            `Play song on add: ${val}`
        ),
    repeat: (val) => wrap(
            `Repeat current song: ${val}`
        ),
    repeatLast: (val) => wrap(
            `Repeat last song on queue: ${val}`
        ),
    addSongFirst: wrap(
            `Add some songs to the queue first with ${prefix}add`
        ),
    missingAddParam: wrap(
            `Add keywords, a url, or youtube video id after ${prefix}add`
        ),
    emptyQueue: wrap(
            'Song queue is empty'
        ),
    addedSong: (song) => wrap(
            `Added:\n${song.title}\n` +
            `Channel [${song.channelId}]`
        ),
    alreadyPlaying: wrap(
            'Already Playing'
        ),
    playError: (delay) => (
            `Oops, an error occured. Resuming in ${duration / 1000}s...`
        ),
    playing: (song) => wrap(
            `Now Playing:\n${song.title}\nrequest by: @${song.requester}`
        ) + song.thumbnail,
    paused: (song) => wrap(
            `Paused:\n${song.title}`
        ),
    resumed: (song) => wrap(
            `Playing:\n${song.title}`
        ),
    skipped: (song) => wrap(
            `Skipped:\n${song.title}`
        ),
    volume: (vol) => wrap(
            `Volume: ${vol}%`
        ),
    noVoiceChannel: wrap(
            'I couldn\'t connect to your voice channel...'
        ),
    voiceConnectionError: 'Error on voiceConnection',
    searchVideoKeywords: keywords => wrap(
            'Searching ' + keywords + ' ...'
        ),
    searchVideoUrl: wrap(
            'Getting video info...'
        ),
    searchVideoError: wrap(
            'Oops, an error occured while searching the video'
        ),
    invalidVideoLink: (err) => wrap(
            'Invalid YouTube Link: ' + err
        )
};

const log = console.log;
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
                log(`Error sending msg: ${content}`);
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
const editMessage = (msg, content, deleteDisabled) => {
    return new Promise((resolve, reject) => {
        msg.edit(
            content
        ).then(
            message => {
                !deleteDisabled && message.delete(msgDeleteDelay);
                resolve(message);
            }
        ).catch(
            err => {
                log(`Error editing msg: ${content}`);
                reject(err);
            }
        );
    });
};

let searchOpts = {
    maxResults: 3,
    key: ''
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
    return msg.guild.id || 0;
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

// Video helper functions
const getVideoInfo = (url, msg) => {
    return new Promise((resolve, reject) => {
        yt.getInfo(url, (err, info) => {
            if (err) {
                reject({
                    "error": err,
                    "message": msg
                });
            }
            else {
                resolve({
                    "data": info,
                    "message": msg
                });
            }
        });
    });
};

const searchVideoInfo = (keyword, msg) => {
    return new Promise((resolve, reject) => {
        search(keyword, searchOpts, (err, results) => {
            if (err) {
                reject({
                    "error": err,
                    "message": msg
                });
            }
            else {
                resolve({
                    "data": results[0],
                    "message": msg
                });
            }
        });
    });
};
    });
};

// API
const commands = {
    init: (apiKey, playlistId) => {
        searchOpts.key = apiKey;
    },
    autoplay: (msg) => {
        autoPlay = !autoPlay;
        sendMessage(msg, msgFormats.autoPlay(autoPlay));
    },
    repeat: (msg) => {
        repeat = !repeat;
        sendMessage(msg, msgFormats.repeat(repeat));
    },
    repeatlast: (msg) => {
        repeatLast = !repeatLast;
        sendMessage(msg, msgFormats.repeatLast(repeatLast));
    },



    play: (msg) => {

        const queueId = getQueueId(msg);
        let currentQueue = queue[queueId];

        if (currentQueue === undefined) {
            return sendMessage(msg, msgFormats.addSongFirst);
        }

        if (currentQueue.playing) {
            return sendMessage(msg, msgFormats.alreadyPlaying);
        }

        let voiceConnection = null;

        try {
            voiceConnection = getVoiceConnection(msg);
        } catch (exception) {
            return sendMessage(
                msg,
                msgFormats.noVoiceChannel
            );
        }

        if (!voiceConnection) {
            return commands.join(msg).then(
                connection => commands.play(msg)
            ).catch(
                err => log(msgFormats.voiceConnectionError)
            );
        }

        const play = (song) => {

            if (song === undefined) {

                queue[queueId].playing = false;

                sendMessage(msg, msgFormats.emptyQueue).then(
                    message => getVoiceChannel(msg).leave()
                );

            } else {

                queue[queueId].playing = true;

                sendMessage(msg, msgFormats.playing(song)).then(
                    message => streamSong(song)
                );

            }

        };

        const streamSong = (song) => {
            // TODO: add as option
            // getUser(msg, song.requesterId).then(
            //     (user) => pmMessage(user, msgFormats.playing(song))
            // );

            let dispatcher = voiceConnection.playStream(
                yt(song.url, {quality: 'lowest', audioonly: true}),
                {passes}
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
                } else if (m.content.startsWith(prefix + 'np')) {
                    const calcTime = (time) => {
                        let minutes = Math.floor(time / 60000);
                        let seconds = Math.floor((time % 60000) / 1000);

                        return `${minutes}:${seconds < 10 ? '0' + seconds : seconds}`;    
                    }

                    let currentTime = calcTime(dispatcher.time);
                    let totalTime = song.duration;

                    sendMessage(msg, `${song.title}\n[ ${currentTime} / ${totalTime} ]\n${song.thumbnail}`);
                }
            });

            dispatcher.on('end', () => {
                collector.stop();

                // http://stackoverflow.com/a/41193080
                dispatcher = null;

                queue[queueId].playing = false;

                // Repeat is enabled if:
                // - only 1 song is left and
                //   repeatLast option is true (default)
                // - repeat option is true
                const repeatEnabled = (
                    queue[queueId].songs.length === 1 && repeatLast) ||
                    repeat;

                // Remove next song in queue if repeat is disabled.
                if (!repeatEnabled) {
                    queue[queueId].songs.shift();
                }

                // TODO:
                // Handle cases where stream dispatcher
                // ends without playing song
                // (e.g. unstable connection, short songs, ...)
                play(queue[queueId].songs[0]);
            });

            dispatcher.on('error', (err) => {
                sendMessage(
                    msg,
                    msgFormats.playError(msgDeleteDelay)
                ).then(message => {

                    // Pause and resume later on error
                    // TODO: limit re attempts
                    dispatcher.pause();
                    setTimeout(() => {
                        dispatcher.resume();
                    }, msgDeleteDelay);
                });
            });
        };

        play(currentQueue.songs[0]);
    },
    join: (msg) => {

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
    add: (msg, cmdArgs) => {

        let url = cmdArgs;
        let isLink = url.indexOf('http') >= 0;

        if (url == '' || url === undefined) {

            sendMessage(msg, msgFormats.missingAddParam);

        } else if (!isLink) {

            sendMessage(
                msg,
                msgFormats.searchVideoKeywords(cmdArgs),
                true
            ).then(
                message => searchVideoInfo(url, message),
                err => log('Error sending message: search video')
            ).then(
                response => {
                    let info = response.data;
                    let message = response.message;
                    let queueId = getQueueId(msg);

                    addToQueue(
                        queueId,
                        {
                            url: 'https://www.youtube.com/watch?v=' + info.id,
                            title: info.title,
                            duration: info.duration || '0',
                            thumbnail: info.thumbnail || '',
                            requester: msg.author.username,
                            requesterId: msg.author.id
                        }
                    );

                    editMessage(message, msgFormats.addedSong(info));

                    !isPlaying(queueId) && autoPlay &&
                        commands.play(msg);
                },
                response => {
                    log(`Error adding song: ${url}\n${response.error}`);
                    editMessage(
                        response.message,
                        msgFormats.searchVideoError
                    );
                }
            ).catch(
                err => log(`Error adding song: ${url}\n${err}`)
            );

        } else if (url) {

            sendMessage(
                msg,
                msgFormats.searchVideoUrl,
                true
            ).then(
                message => getVideoInfo(url, message)
            ).then(
                (response) => {
                    let info = response.data;
                    let message = response.message;
                    let queueId = getQueueId(msg);

                    addToQueue(
                        queueId,
                        {
                            url: url,
                            title: info.title,
                            duration: info.duration,
                            thumbnail: info.thumbnail || '',
                            requester: msg.author.username,
                            requesterId: msg.author.id
                        }
                    );

                    editMessage(message, msgFormats.addedSong(info));

                    !isPlaying(queueId) && autoPlay &&
                        commands.play(msg);
                },
                (response) => {
                    log(`Error adding link: ${url}\n${response.error}`);
                    editMessage(
                        response.message,
                        msgFormats.invalidVideoLink(response.error)
                    );
                }
            ).catch(
                err => log(`Error adding link: ${url}\n${err}`)
            );
        }
    },
    queue: (msg) => {

        const queueId = getQueueId(msg);

        if (queue[queueId] === undefined || queue[queueId].songs.length === 0) {

            sendMessage(msg, msgFormats.addSongFirst);

        } else {

            let tosend = [];

            queue[queueId].songs.forEach((song, i) => {
                tosend.push(
                    `${i+1}. ${song.title}\n\t[request by: ${song.requester}]`
                );
            });

            sendMessage(
                msg,
                `__**${msg.guild.name}'s Music Queue: **__ **${tosend.length}** songs ${(tosend.length > 15 ? '*[Only next 15 shown]*' : '')}\n\`\`\`${tosend.slice(0,15).join('\n')}\`\`\``
            );
        }
    },
    help: (cmdPrefix) => {

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
            cmdPrefix + 'pause : "pauses the playing song"',
            cmdPrefix + 'resume : "resumes last played song"',
            cmdPrefix + 'skip : "skips the playing song"',
            cmdPrefix + 'np : "Shows the playtime of current song."',
            'volume+(+++) : "increases volume by 2%/+"',
            'volume-(---) : "decreases volume by 2%/-"'
        ].join('\n');
    }
};

// Export Module
module.exports = commands;
