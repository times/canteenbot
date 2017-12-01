const { storeTeamInDB, respond, respondWithError } = require('./helpers');

// Environment variables
const clientId = process.env.CLIENT_ID;
const clientSecret = process.env.CLIENT_SECRET;
const redirectUri = process.env.REDIRECT_URI;

/**
 * Handle the Slack OAuth process
 */
module.exports = (callback, event) => {
  // Attempt to extract the temporary code sent by Slack
  let code;
  try {
    code = event.queryStringParameters.code;
  } catch (e) {
    const errMsg = `Error retrieving code from ${
      event.queryStringParameters
    }: ${e}`;
    console.log(errMsg);
    return sendErrorResponse(callback, errMsg);
  }

  // Construct a URL to complete the process
  const url = `https://slack.com/api/oauth.access?client_id=${
    clientId
  }&client_secret=${clientSecret}&code=${code}&redirect_uri=${redirectUri}`;

  return fetch(url)
    .then(res => res.json())
    .then(data => {
      if (!data.ok) throw new Error(`Error during OAuth: ${data}`);

      return storeTeamInDB(
        data.team_id,
        data.team_name,
        data.access_token,
        data.incoming_webhook.url
      );
    })
    .then(() => respond(callback, 'OAuth completed successfully'))
    .catch(err => respondWithError(callback, err));
};
