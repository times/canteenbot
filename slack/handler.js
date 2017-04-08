'use strict';

require('babel-polyfill');

const fetch = require('node-fetch');
const common = require('../lib/common');
const { sendResponse, days, buildCoreQuery } = require('../lib/helpers');

const coreUrl = process.env.CORE_URL;

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
 * Entry point
 */
module.exports.handler = (event, context, callback) => {
  // Check the request was recieved via a supported method
  if (event.httpMethod !== 'POST') {
    sendErrorResponse(
      callback,
      'Invalid HTTP method. Method should be POST.',
      405
    );
    return;
  }

  // Parse arguments
  const { token, command, text } = parseCommand(event.body);

  if (command !== '/canteen') {
    sendErrorResponse(
      callback,
      `Sorry, the service ${command} isn't supported.`
    );
    return;
  }

  if (token !== process.env.TIMES_TEAM) {
    sendErrorResponse(callback, 401, `Invalid token.`);
    return;
  }

  canteenHandler(callback, command, text);
};

const canteenHandler = (callback, command, text) => {
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
          sendErrorResponse(callback, `Error querying core server: ${err}`));
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
          sendErrorResponse(callback, `Error querying core server: ${err}`));
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
  const helpText = '*Hungry? Type* `/canteen` *, optionally followed by one of these commands, to see what’s on offer:*';
  const paramsText = recognisedParams.reduce((str, p) => `${str}\n${p}`);

  sendSlackResponse(callback, helpText + paramsText);
};

// Build and return an 'ingredient' response to Slack
const sendIngredientResponse = (callback, ingredient, daysWithIngredient) => {
  let responseText;

  // If we didn't find the ingredient
  if (daysWithIngredient.length === 0) {
    responseText = `Sorry, I couldn’t find "${ingredient}" in the menu this week`;
  } else {
    // If we did find it
    const daysText = daysWithIngredient.reduce(
      (str, d, i, arr) => {
        if (i === 0) return d;
        if (i === arr.length - 1) return `${str} and ${d}`;
        return `${str}, ${d}`;
      },
      ''
    );
    responseText = `Looks like the canteen are serving ${ingredient} on ${daysText} this week`;
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
