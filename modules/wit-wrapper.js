'use strict';

/** Modules **/
const Wit = require('node-wit').Wit;

/** Definitions **/

// client
let client = null;

// actions
const actions = {
    send(request, response) {
        const {sessionId, context, entities} = request;
        const {text, quickreplies} = response;

        sessions[sessionId].context = context;
        sessions[sessionId].response = text;
    }
};

// session
let sessions = {};

const getOrCreateSession = (id) => {
    let session = null;

    if (!sessions[id]) {
        sessions[id] = session = {
            id: id,
            context: {},
            response: ''
        };
    } else {
        session = sessions[id];
    }

    return session;
};

/** API **/
module.exports = {
    init: (accessToken, customActions) => {
        if (customActions) {
            Object.assign(actions, customActions);
        }

        return new Promise((resolve, reject) => {
            try {
                client = new Wit({accessToken, actions});
                resolve(client);
            } catch(exception) {
                reject(exception);
            }
        });
    },
    message: (id, text) => {
        let newSession = getOrCreateSession(id);

        return new Promise((resolve, reject) => {
            client.runActions(
                newSession.id,
                text,
                newSession.context
            ).then(
                (context) => {
                    resolve(
                        getOrCreateSession(newSession.id).response || '>_<'
                    );
                }
            ).catch(
                err => reject(err)
            );
        });
    }
};