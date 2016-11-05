'use strict';

const Request = require('request');

/**
 * Search for a gif using GiphyApi
 */
module.exports = {
    gif: (input) => {

        return new Promise((resolve, reject) => {

            let keywords = input.split(' ').join('+');
            let gifApi = [
                'http://api.giphy.com/v1/gifs/search?',
                'q=' + keywords,
                '&api_key=dc6zaTOxFJmzC&limit=1&offset=0'
            ].join('');

            Request(gifApi, (err, response, body) => {
                if (err) {
                    reject(err);
                } else if (response.statusCode === 200) {
                    let parsedData = JSON.parse(body);
                    let url = parsedData.data[0].images['fixed_height'].url;
                    resolve(url);
                } else {
                    reject(err);
                }
            });
        });
    },
    gifr: (input) => {

        return new Promise((resolve, reject) => {

            let keywords = input.split(' ').join('+');
            let gifApi = [
                'http://api.giphy.com/v1/gifs/random?',
                'tag=' + keywords,
                '&api_key=dc6zaTOxFJmzC&limit=1&offset=0'
            ].join('');

            Request(gifApi, (err, response, body) => {
                if (err) {
                    reject(err);
                } else if (response.statusCode === 200) {
                    let parsedData = JSON.parse(body);
                    let url = parsedData.data.image_url;
                    resolve(url);
                } else {
                    reject(err);
                }
            });
        });
    },
    'help': (prefix) => {

        return [
            '** GIF **',
            prefix + 'gif <keywords>  : "Search gif using keywords"',
            prefix + 'gifr <keywords> : "Search random gif using keywords"'
        ].join('\n');
    }
}