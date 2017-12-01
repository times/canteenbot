const { sendResponse } = require('../lib/helpers');
const { storeTeamInDB, sendErrorResponse } = require('./helpers');

// Environment variables
const clientId = process.env.CLIENT_ID;
const clientSecret = process.env.CLIENT_SECRET;
const redirectUri = process.env.REDIRECT_URI;

/**
 * Handle the Slack OAuth process
 */
module.exports = (event, context, callback) => {
  // Attempt to extract the temporary code sent by Slack
  let code;
  try {
    code = event.queryStringParameters.code;
  } catch (e) {
    console.log(`Error retrieving code from ${event.queryStringParameters}`);
    sendErrorResponse(
      callback,
      `Couldn't retrieve code from ${event.queryStringParameters}`
    );
    return;
  }

  // Construct a URL to complete the process
  const url = `https://slack.com/api/oauth.access?client_id=${
    clientId
  }&client_secret=${clientSecret}&code=${code}&redirect_uri=${redirectUri}`;

  // Make a request to the URL
  fetch(url)
    .then(res => res.json())
    .then(data => {
      if (!data.ok) {
        console.log(`Error during OAuth:`, data);
        sendResponse(callback, `Could not complete OAuth process`);
      } else {
        console.log('OAuth completed successfully');
        storeTeamInDB(
          data.team_id,
          data.team_name,
          data.access_token,
          data.incoming_webhook.url,
          res => {
            sendResponse(callback, 'OAuth completed successfully');
          }
        );
      }
    });
};
