'use strict';

require('babel-polyfill');
require('isomorphic-fetch');

const common = require('../lib/common');
const { sendResponse } = require('../lib/helpers');

// Where to find the menus
const menuUrl = process.env.DATA_URL;

// Helpers
const buildMenuUrl = day => `${menuUrl}${day}.json`;

// Send data back
const sendData = (callback, data) => {
  sendResponse(callback, { data });
};

// Send an error back. Default to 400 (Bad Request)
const sendError = (callback, error, statusCode = 400) => {
  sendResponse(callback, { error }, statusCode);
};

/*
 * Handle menu requests - returns menu data for the given day
 */
const menuHandler = (callback, menu) => {
  // Validate the requested menu
  if (!common.menuTypes.includes(menu)) {
    sendError(callback, `Invalid menu type ${menu}.`);
    return;
  }

  // Fetch the JSON for that menu
  return fetch(buildMenuUrl(menu))
    .then(res => res.json())
    .then(body => sendData(callback, body))
    .catch(err => sendData(callback, `Couldn't read menu file for "${menu}"`));
};

/*
 * Handle ingredient requests - returns a list of days on which a given ingredient is available
 */
const ingredientHandler = (callback, ingredient) => {
  // Fetch the JSON for each of the menus
  const promises = common.days
    .map(buildMenuUrl)
    .map(url => fetch(url).then(res => res.json()));

  // Return only the days containing that ingredient
  return Promise.all(promises)
    .then(getDaysWithIngredient(ingredient))
    .then(days => sendData(callback, days))
    .catch(err => sendError(callback, err));
};

// Check each menu to see if it contains the given ingredient
const getDaysWithIngredient = ingredient => menus =>
  menus
    .filter(menu => menu.locations.some(hasIngredient(ingredient)))
    .map(menu => menu.day);

// Check whether a given ingredient exists within a given menu
const hasIngredient = ingredient => ({ menu, location }) => {
  const ingredientLC = ingredient.toLowerCase();

  return (
    menu.toLowerCase().includes(ingredientLC) ||
    location.toLowerCase().includes(ingredientLC)
  );
};

/**
 * Entry point
 */
module.exports.handler = (event, context, callback) => {
  // Parse arguments
  const { httpMethod, queryStringParameters: args } = event;

  // Check the request was recieved via a supported method
  if (httpMethod !== 'GET') {
    sendError(callback, 'Invalid HTTP method. Method should be GET.', 405); // Method Not Allowed
    return;
  }

  // Check parameters were provided
  if (!args) {
    sendError(callback, 'No arguments provided.');
    return;
  }

  // Check we got the correct parameters
  if (!args.message_type || !args.message_param) {
    sendError(
      callback,
      'Both message_type and message_param must be provided.'
    );
    return;
  }

  // Valid values for message_type
  const { MENU, INGREDIENT } = common.messageTypes;

  switch (args.message_type) {
    case MENU:
      return menuHandler(callback, args.message_param);
    case INGREDIENT:
      return ingredientHandler(callback, args.message_param);
    default:
      sendError(callback, `Invalid message_type ${args.message_type}.`);
      break;
  }
};
