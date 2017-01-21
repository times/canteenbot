'use strict';

require('babel-polyfill');

const fetch = require('node-fetch');
const common = require('../lib/common');
const { sendData, sendError, days, buildMenuUrl } = require('../lib/helpers');

// Where to find the menus
const baseMenuUrl = process.env.DATA_URL;
const getMenuUrl = helpers.buildMenuUrl(baseMenuUrl);


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
  fetch(getMenuUrl(menu))
    .then(res => res.json())
    .then(body => sendData(callback, body))
    .catch(err => sendData(callback, `Couldn't read menu file for "${menu}"`));
};


/*
 * Handle ingredient requests - returns a list of days on which a given ingredient is available
 */
const ingredientHandler = (callback, ingredient) => {
  // Fetch the JSON for each of the menus
  const promises =
    helpers.days
      .map(getMenuUrl)
      .map(url => fetch(url).then(res => res.json()));

  // Return only the days containing that ingredient
  Promise.all(promises)
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
const hasIngredient = ingredient => ({menu, location}) => {
  const ingredientLC = ingredient.toLowerCase();
  return menu.toLowerCase().includes(ingredientLC) || location.toLowerCase().includes(ingredientLC);
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
    sendError(callback, 'Both message_type and message_param must be provided.');
    return;
  }

  // Valid values for message_type
  const { MENU, INGREDIENT } = common.messageTypes;

  switch (args.message_type) {
    case MENU:
      menuHandler(callback, args.message_param);
      break;
    case INGREDIENT:
      ingredientHandler(callback, args.message_param);
      break;
    default:
      sendError(callback, `Invalid message_type ${args.message_type}.`);
      break;
  };
};
