const notifyHandler = require('./notify');
const oAuthHandler = require('./oauth');
const commandHandler = require('./command');

const { getTeamsFromDB, respondWithError } = require('./helpers');

/**
 * Entry point
 */
module.exports.handler = (event, context, callback) => {
  // Handle scheduled notifications via cron
  if (event.notify) {
    console.log(`Received request via cron`);
    return getTeamsFromDB()
      .then(teams => notifyHandler(teams.map(t => t.webhookUrl)))
      .catch(err => respondWithError(callback, err));
  }

  // Otherwise handle HTTP requests
  const { httpMethod } = event;
  console.log(`Received request via ${httpMethod}`);

  switch (httpMethod) {
    case 'GET':
      return oAuthHandler(callback, event);
    case 'POST':
      return commandHandler(callback, event);
    default:
      return respondWithError(callback, 'Invalid HTTP method "${httpMethod}"');
  }
};
