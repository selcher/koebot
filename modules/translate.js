'use strict';

const translator = require('google-translator');

module.exports = {
	translate: (srcLang, targetLang, keyword) => {
		return new Promise((resolve, reject) => {
			try {
				translator(srcLang, targetLang, keyword, response => {
					if (response.isCorrect) {
						resolve(response.text);
					} else {
						resolve('Did you mean: ' + response.text + ' ?');
					}
				});
			} catch (e) {
				reject(e);
			}
		});
	},
	'help': (prefix) => {

        return [
            '** TRANSLATE **',
            prefix + 'translate <source lang> <target lang> <words> : "Translate words from source language to target language"'
        ].join('\n');
    }
};