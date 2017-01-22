'use strict';

/*
 * Response helper functions
 */

// TODO run this through babel to allow e.g. default params

// Send a generic response. Default to 200 OK
const sendResponse = (callback, data, statusCode = 200) => {
  callback(null, {
    statusCode,
    body: JSON.stringify(data)
  });
}

// Send data back
const sendData = (callback, data) => {
  sendResponse(callback, { data });
}

// Send an error back. Default to 400 (Bad Request)
const sendError = (callback, error, statusCode = 400) => {
  sendResponse(callback, { error }, statusCode);
}


/*
 * Given a list of days of the week, sort it (and introduce proper capitalisation)
 */
const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

const buildMenuUrl = menuUrl => day => `${menuUrl}${day}.json`;


// Exports
module.exports = {
  sendResponse,
  sendData,
  sendError,
  days,
  buildMenuUrl,
};
