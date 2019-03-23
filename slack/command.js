const common = require('../lib/common');
const { buildCoreQuery } = require('../lib/helpers');

const {
  respond,
  respondWithError,
  fetchMenu,
  fetchIngredient,
  buildPayload,
} = require('./helpers');

/**
 * Handle /canteen slash commands
 */
module.exports = (callback, event) => {
  // Parse arguments
  const { token, command, text } = parseCommand(event.body);

  if (!['/canteen', '/canteen-dev'].includes(command))
    return respondWithError(
      callback,
      `Sorry, the service ${command} isn't supported.`
    );

  // Valid parameters that can be passed via Slack
  const recognisedParams = ['', ...common.menuTypes, 'help'];

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

    // Otherwise it must be a menu request
    default:
      // Default to today's menu
      const requestedMenu = firstParam || 'today';

      return fetchMenu(requestedMenu)
        .then(({ mainMenuContent, cafeMenuContent }) =>
          respondWithMenu(callback, requestedMenu, {
            mainMenuContent,
            cafeMenuContent,
          })
        )
        .catch(err => {
          console.log({ err });
          return respondWithError(
            callback,
            `Error querying core server: ${err}`
          );
        });
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

// Build and return a 'menu' response to Slack;
const respondWithMenu = (callback, requestedMenu, menuData) =>
  respond(callback, buildPayload(requestedMenu, menuData));
