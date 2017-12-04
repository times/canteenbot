const common = require('../lib/common');
const { buildCoreQuery } = require('../lib/helpers');

const {
  respond,
  respondWithError,
  fetchMenu,
  fetchIngredient,
  buildMenuAttachments,
} = require('./helpers');

/**
 * Handle /canteen slash commands
 */
module.exports = (callback, event) => {
  // Parse arguments
  const { token, command, text } = parseCommand(event.body);

  if (command !== '/canteen')
    return respondWithError(
      callback,
      `Sorry, the service ${command} isn't supported.`
    );

  // Valid parameters that can be passed via Slack
  const recognisedParams = ['', ...common.menuTypes, 'ingredient', 'help'];

  // Now look at the first parameter the user supplied
  const params = text.split('+').map(a => a.toLowerCase());
  const firstParam = params[0];

  // If we don't recognise the parameter, return an error
  if (!recognisedParams.includes(firstParam))
    return respondWithError(
      callback,
      `Sorry, I didn’t recognise the command "${firstParam}."`
    );

  switch (firstParam) {
    case 'help':
      return respondWithHelp(callback, recognisedParams);

    // For ingredient requests, return a list of days where that ingredient is on the menu
    case 'ingredient':
      const ingredient = params[1];

      // Check the user passed an ingredient to check
      if (!ingredient)
        return respondWithError(
          callback,
          'You need to give me an ingredient to check!'
        );

      return fetchIngredient(ingredient)
        .then(days => respondWithIngredient(callback, ingredient, days))
        .catch(err =>
          respondWithError(callback, `Error querying core server: ${err}`)
        );

    // Otherwise it must be a menu request
    default:
      // Default to today's menu
      const requestedMenu = firstParam || 'today';

      return fetchMenu(requestedMenu)
        .then(menu => respondWithMenu(callback, requestedMenu, menu))
        .catch(err =>
          respondWithError(callback, `Error querying core server: ${err}`)
        );
  }
};

// Helper
const parseCommand = body =>
  body.split('&').reduce((params, str) => {
    const parts = str.split('=').map(decodeURIComponent);
    return Object.assign({}, params, {
      [parts[0]]: parts[1],
    });
  }, {});

// Build and return a 'help' response to Slack
const respondWithHelp = (callback, recognisedParams) => {
  const helpText =
    '*Hungry? Type* `/canteen` *, optionally followed by one of these commands, to see what’s on offer:*';
  const paramsText = recognisedParams.reduce((str, p) => `${str}\n${p}`);

  return respond(callback, helpText + paramsText);
};

// Build and return an 'ingredient' response to Slack
const respondWithIngredient = (callback, ingredient, daysWithIngredient) => {
  let responseText;

  // If we didn't find the ingredient
  if (daysWithIngredient.length === 0) {
    responseText = `Sorry, I couldn’t find "${
      ingredient
    }" in the menu this week`;
  } else {
    const daysText = daysWithIngredient.reduce((str, d, i, arr) => {
      if (i === 0) return d;
      if (i === arr.length - 1) return `${str} and ${d}`;
      return `${str}, ${d}`;
    }, '');

    responseText = `Looks like the canteen are serving ${ingredient} on ${
      daysText
    } this week`;
  }

  return respond(callback, responseText);
};

// Build and return a 'menu' response to Slack;
const respondWithMenu = (callback, requestedMenu, menuData) =>
  respond(callback, '', buildMenuAttachments(requestedMenu, menuData));
