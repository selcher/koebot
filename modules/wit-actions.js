'use strict';

const firstEntityValue = (entities, entity) => {
    const val = entities && entities[entity] &&
        Array.isArray(entities[entity]) &&
        entities[entity].length > 0 &&
        entities[entity][0].value;

    if (!val) {
        return null;
    }

    return typeof val === 'object' ? val.value : val;
};

module.exports = {
	getForecast({context, entities}) {
        const location = firstEntityValue(entities, 'location');

        if (location) {
        	// TODO: use api for getting weather forecast of a location
            context.forecast = 'sunny in ' + location;
            delete context.missingLocation;
        } else {
            context.missingLocation = true;
            delete context.forecast;
        }

        return context;
    }
};