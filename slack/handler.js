'use strict';

require('babel-polyfill');

const notifyHandler = require('./notify');
const oAuthHandler = require('./oauth');
const commandHandler = require('./command');

const { getTeamsFromDB, sendErrorResponse } = require('./helpers');

/**
 * Entry point
 */
module.exports.handler = (event, context, callback) => {
  // Handle scheduled notifications via cron
  if (event.notify) {
    getTeamsFromDB(teams => notifyHandler(teams.map(t => t.webhookUrl)));
    return;
  }

  // Otherwise handle HTTP requests
  const { httpMethod } = event;
  console.log(`Received request via ${httpMethod}`);

  switch (httpMethod) {
    case 'GET':
      oAuthHandler(event, context, callback);
      return;
    case 'POST':
      commandHandler(event, context, callback);
      return;
    default:
      sendErrorResponse(callback, 'Invalid HTTP method "${httpMethod}"', 405);
      return;
  }
};
