'use strict';

const request = require('request');

let api = '';

module.exports = {
    init: (apiKey, searchEngineId) => {

        let response = null;

        if (apiKey && searchEngineId) {

            api = [
                'https://www.googleapis.com/customsearch/v1?',
                `key=${apiKey}`,
                `&cx=${searchEngineId}`,
                `&searchType=image`,
                `&imgType=photo`,
                '&q='
            ].join('');

            response = Promise.resolve({
                status: 'success',
                message: ''
            });
        }
        else {

            response = Promise.reject({
                status: 'error',
                message: 'Please provide api key and search engine id'
            });
        }

        return response;
    },
    img: (keywords) => {

        let keywordsCount = keywords.split(' ').length;
        let encodedKeywords = keywordsCount > 1 ?
            keywords.replace(/\s/g, '+') :
            keywords;
        let url = api + encodedKeywords;

        return new Promise((resolve, reject) => {
            request(url, (err, response, body) => {

                if (err) {

                    reject(err);
                }
                else {

                    let responseContent = JSON.parse(body);
                    let items = responseContent.items;

                    if (items && items.length > 0) {
                        resolve(items[0].link);
                    }
                    else {
                        resolve('No image found');
                    }
                }
            });
        });
    },
    'help': (prefix) => {

        return [
            '** IMG **',
            prefix + 'img <keywords>  : "Search img using keywords"'
        ].join('\n');
    }
};