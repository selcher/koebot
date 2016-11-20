'use strict';

const Request = require('request');
const firebase = require('firebase');

var events = {};

var firebaseApp = null;
var firebaseDBRef = null;
var firebaseConfig = {
    apiKey: '',
    authDomain: '',
    databaseURL: '',
    storageBucket: '',
    messagingSenderId: ''
};

/**
 * Add reminders and store it on a database (firebase)
 */
module.exports = {
    init: (config) => {
        firebaseConfig = config;
        firebaseApp = firebase.initializeApp(firebaseConfig);

        var signInPromise = firebase.auth().signInAnonymously();

        return new Promise((resolve, reject) => {
            signInPromise.then(
                () => {

                    // Store Reference
                    firebaseDBRef = firebase.database().ref('reminders');

                    // Sync content changes
                    firebaseDBRef.on('value', function(dataSnapShot) {
                        var newContent = dataSnapShot.val();

                        if (newContent) {
                            events = newContent;
                        }
                    });

                    resolve();
                },
                err => reject(err)
            )
        });
    },
    remind: (input, author) => {

        return new Promise((resolve, reject) => {

            var matches = input.match(/(\d\d\/\d\d\/\d\d\d\d) (.*)/);
            var eventDate = matches[1];
            var eventDetails = matches[2];
            var dateAdded = eventDate.replace(/\//g, '');

            if (!events[dateAdded]) {
                events[dateAdded] = [];
            }

            events[dateAdded].push(
                {
                    date: eventDate,
                    details: eventDetails,
                    author: author
                }
            );

            firebaseDBRef.set(events);

            resolve('```Reminder added on ' + eventDate + '```');
        });
    },
    today: (input, requester) => {

        return new Promise((resolve, reject) => {

            var now = new Date();
            var month = now.getMonth() + 1;
            var day = now.getDate();
            var year = now.getFullYear();
            var dateToday = month + '' + day + '' + year;
            var remindersList = events[dateToday];
            var remindersToday = 'Nothing to do today~';

            if (remindersList) {
                remindersToday = '';

                var totalReminders = remindersList.length;
                var eventInfo = null;

                for (var i = 0; i < totalReminders; i++) {
                    eventInfo = remindersList[i];
                    remindersToday +=
                        '@' + eventInfo.author + '\n' +
                        '- ' + eventInfo.details + '\n\n';
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
}