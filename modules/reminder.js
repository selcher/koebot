'use strict';

// Modules
const Request = require('request');
const db = require('./firebase-wrapper.js');

// Variables
let events = {};

const getCurrentDate = () => {
    let now = new Date();
    let month = now.getMonth() + 1;
    let day = now.getDate() > 10 ?
        now.getDate() : '0' + now.getDate();
    let year = now.getFullYear();

    return (month + '' + day + '' + year);
};

const onRemindersUpdate = (dataSnapShot) => {
    events = dataSnapShot ? dataSnapShot.val() : {};
};

/**
 * Add reminders and store it on a database
 */
const api = {
    init: (config) => {

        return db.init(config).then(
            () => db.login()
        ).then(
            () => db.register('reminders', onRemindersUpdate)
        );
    },
    remind: (input, author, authorId) => {

        return new Promise((resolve, reject) => {

            let matches = input.match(/(\d\d\/\d\d\/\d\d\d\d) (.*)/);
            let eventDate = matches[1];
            let eventDetails = matches[2];
            let dateAdded = eventDate.replace(/\//g, '');

            if (!events[dateAdded]) {
                events[dateAdded] = [];
            }

            events[dateAdded].push(
                {
                    date: eventDate,
                    details: eventDetails,
                    author: author,
                    authorId: authorId
                }
            );

            db.set(events).then(
                () => resolve('```Reminder added on ' + eventDate + '```')
            ).catch(
                (err) => reject(err)
            );
        });
    },
    today: (input, requester, requesterId) => {

        return new Promise((resolve, reject) => {

            let dateToday = getCurrentDate();
            let remindersList = events[dateToday];
            let remindersToday = 'Nothing to do today~';

            if (remindersList) {
                remindersToday = '';

                let totalReminders = remindersList.length;
                let eventInfo = null;

                for (let i = 0; i < totalReminders; i++) {
                    eventInfo = remindersList[i];

                    if (eventInfo.authorId === requesterId) {
                        remindersToday +=
                            '@' + eventInfo.author + '\n' +
                            '- ' + eventInfo.details + '\n\n';
                    }
                }
            }

            resolve('```' + remindersToday + '```');
        });
    },
    'help': (prefix) => {

        return [
            '** Reminder **',
            prefix + 'remind mm/dd/yyyy <reminder> : "Add reminder on given date"',
            prefix + 'today : "List reminders for today"'
        ].join('\n');
    }
};

module.exports = api;