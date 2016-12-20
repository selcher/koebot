'use strict';

const firebase = require('firebase');

let firebaseDBRef = null;

const api = {
    /**
        Firebase config format:
        config = {
            apiKey: '',
            authDomain: '',
            databaseURL: '',
            storageBucket: '',
            messagingSenderId: ''
        };
     */
	init: (config) => {
        return new Promise((resolve, reject) => {
            try {
                firebase.initializeApp(config);
                resolve();
            } catch(exception) {
                reject(exception);
            }
        });
    },
    login: () => {
        let signInPromise = firebase.auth().signInAnonymously();

        return new Promise((resolve, reject) => {
            signInPromise.then(
                () => resolve(),
                err => reject(err)
            )
        });
    },
    register: (name, callback) => {
        return new Promise((resolve, reject) => {
            try {
                firebaseDBRef = firebase.database().ref(name);

                // Register on value change listener
                firebaseDBRef.on('value', callback);

                resolve();
            } catch(exception) {
                reject(exception);
            }
        });
    },
    set: (data) => {
        return new Promise((resolve, reject) => {
            try {
    	       firebaseDBRef.set(data);
               resolve();
            } catch(exception) {
                reject(exception);
            }
        });
    }
};

module.exports = api;