'use strict';

require('babel-polyfill');

const fetch = require('node-fetch');
const aws = require('aws-sdk');

const common = require('../lib/common');
const { sendResponse, days, buildCoreQuery } = require('../lib/helpers');

// Environment variables
const coreUrl = process.env.CORE_URL;
const clientId = process.env.CLIENT_ID;
const clientSecret = process.env.CLIENT_SECRET;
const redirectUri = process.env.REDIRECT_URI;

// Instantiate DB connection
const dynamoDB = new aws.DynamoDB();

// Helper
const parseCommand = body => {
  return body.split('&').reduce((params, str) => {
    const parts = str.split('=').map(decodeURIComponent);
    return Object.assign({}, params, {
      [parts[0]]: parts[1],
    });
  }, {});
};

/**
 * Get the record for a given team from the DB
 */
const getTeamFromDB = (teamId, cb) => {
  const dynamoParams = {
    Key: { id: { S: teamId } },
    TableName: 'slackmonitor',
  };

  dynamoDB.getItem(dynamoParams, (err, data) => {
    if (err) {
      console.log(`Error retrieving data for ${teamId} from DynamoDB`, err);
      cb(err);
    } else cb(data.Item);
  });
};

/**
 * Store a record for a given team in the DB
 */
const storeTeamInDB = (teamId, teamName, accessToken, webhookUrl, cb) => {
  const dynamoParams = {
    Item: {
      id: { S: teamId },
      teamName: { S: teamName },
      accessToken: { S: accessToken },
      webhookUrl: { S: webhookUrl },
    },
    TableName: 'canteenbot',
  };

  dynamoDB.putItem(dynamoParams, (err, data) => {
    if (err) {
      console.log(`Error storing data for ${teamName} in DynamoDB`, err);
      cb(err);
    } else cb(data);
  });
};

/**
 * Entry point
 */
module.exports.handler = (event, context, callback) => {
  // console.log(`event`, event);
  // console.log(`context`, context);

  // if (event.notify) {
  //   notifyHandler(event, context, callback);
  //   return;
  // }

  const { httpMethod } = event;

  console.log(`Received request via ${httpMethod}`);

  switch (httpMethod) {
    case 'GET':
      oAuthHandler(event, context, callback);
      return;
    case 'POST':
      canteenCommandHandler(event, context, callback);
      return;
    default:
      sendErrorResponse(callback, 'Invalid HTTP method "${httpMethod}"', 405);
      return;
  }
};

/**
 * Handle the Slack OAuth process
 */
const oAuthHandler = (event, context, callback) => {
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
        respond({ error: `Could not complete OAuth process` });
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

const canteenCommandHandler = (event, context, callback) => {
  // Parse arguments
  const { token, command, text } = parseCommand(event.body);

  if (command !== '/canteen') {
    sendErrorResponse(
      callback,
      `Sorry, the service ${command} isn't supported.`
    );
    return;
  }

  // Valid parameters that can be passed via Slack
  const recognisedParams = ['', ...common.menuTypes, 'ingredient', 'help'];

  // Now look at the first parameter the user supplied
  const params = text.split('+').map(a => a.toLowerCase());
  const firstParam = params[0];

  // If we don't recognise the parameter, return an error
  if (!recognisedParams.includes(firstParam)) {
    sendErrorResponse(
      callback,
      `Sorry, I didn’t recognise the command "${firstParam}."`
    );
    return;
  }

  switch (firstParam) {
    case 'help':
      sendHelpResponse(callback, recognisedParams);
      break;

    // For ingredient requests, return a list of days where that ingredient is on the menu
    case 'ingredient':
      const ingredient = params[1];

      // Check the user passed an ingredient to check
      if (!ingredient) {
        sendErrorResponse(
          callback,
          'You need to give me an ingredient to check!'
        );
        return;
      }

      // Query the core server
      fetch(buildCoreQuery(coreUrl, common.messageTypes.INGREDIENT, ingredient))
        .then(res => res.json())
        .then(body => {
          if (body.error) sendErrorResponse(callback, body.error);
          else if (body.data)
            sendIngredientResponse(callback, ingredient, body.data);
          else
            throw new Error(
              'Response from core server did not contain error or data'
            );
        })
        .catch(err =>
          sendErrorResponse(callback, `Error querying core server: ${err}`)
        );
      break;

    // Otherwise it must be a menu request
    default:
      // Default to today's menu
      const requestedMenu = firstParam || 'today';

      // Query the core server
      fetch(buildCoreQuery(coreUrl, common.messageTypes.MENU, requestedMenu))
        .then(res => res.json())
        .then(body => {
          if (body.error) sendErrorResponse(callback, body.error);
          else if (body.data)
            sendMenuResponse(callback, requestedMenu, body.data);
          else
            throw new Error(
              'Response from core server did not contain error or data'
            );
        })
        .catch(err =>
          sendErrorResponse(callback, `Error querying core server: ${err}`)
        );
      break;
  }
};

// Helper function to return a JSON response to Slack
const sendSlackResponse = (callback, text = '', attachments = []) => {
  const payload = {
    text,
    attachments,
  };

  sendResponse(callback, payload);
};

// Return an error to Slack
const sendErrorResponse = (callback, text) => {
  sendSlackResponse(callback, '*Something went wrong*', [
    {
      fallback: text,
      text,
      color: 'danger',
    },
  ]);
};

// Build and return a 'help' response to Slack
const sendHelpResponse = (callback, recognisedParams) => {
  const helpText =
    '*Hungry? Type* `/canteen` *, optionally followed by one of these commands, to see what’s on offer:*';
  const paramsText = recognisedParams.reduce((str, p) => `${str}\n${p}`);

  sendSlackResponse(callback, helpText + paramsText);
};

// Build and return an 'ingredient' response to Slack
const sendIngredientResponse = (callback, ingredient, daysWithIngredient) => {
  let responseText;

  // If we didn't find the ingredient
  if (daysWithIngredient.length === 0) {
    responseText = `Sorry, I couldn’t find "${
      ingredient
    }" in the menu this week`;
  } else {
    // If we did find it
    const daysText = daysWithIngredient.reduce((str, d, i, arr) => {
      if (i === 0) return d;
      if (i === arr.length - 1) return `${str} and ${d}`;
      return `${str}, ${d}`;
    }, '');
    responseText = `Looks like the canteen are serving ${ingredient} on ${
      daysText
    } this week`;
  }

  sendSlackResponse(callback, responseText);
};

// Build and return a 'menu' response to Slack;
const sendMenuResponse = (callback, requestedMenu, menuData) => {
  const menuText = menuData.locations
    .map(({ location, menu }) => `*${location}*\n${menu}`)
    .join('\n\n');
  const menuUrl = menuData.url;
  const day = requestedMenu.charAt(0).toUpperCase() + requestedMenu.slice(1);

  const attachments = [
    {
      fallback: day + '’s menu',
      color: 'good',
      title: day + '’s menu',
      title_link: menuUrl,
      fields: [
        {
          value: menuText,
          short: false,
        },
      ],
      mrkdwn_in: ['fields'],
    },
  ];

  sendSlackResponse(callback, '', attachments);
};
