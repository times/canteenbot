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

/*
 * Other
 */

// Days of the week
const days = [
  // 'monday',
  // 'tuesday',
  'wednesday',
  // 'thursday',
  // 'friday',
  // 'saturday',
  // 'sunday',
];

// Exports
module.exports = {
  sendResponse,
  buildCoreQuery,
  days,
};
