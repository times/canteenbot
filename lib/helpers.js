'use strict';

/*
 * HTTP helper functions
 */

// Send a generic response. Default to 200 OK
const sendResponse = (callback, data, statusCode = 200) => {
  callback(null, {
    statusCode,
    body: JSON.stringify(data),
  });
};

const buildCoreQuery = (coreUrl, type, param) =>
  `${coreUrl}?message_type=${type}&message_param=${encodeURIComponent(param)}`;

// Exports
module.exports = {
  sendResponse,
  buildCoreQuery,
};
