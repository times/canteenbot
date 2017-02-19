'use strict';

require('babel-polyfill');

const fetch = require('node-fetch');
const common = require('../lib/common');
const { buildCoreQuery } = require('../lib/helpers');

const coreUrl = process.env.CORE_URL;


/**
 * Entry point
 */
module.exports.handler = (event, context, callback) => {

  const { request } = event;

  console.log(JSON.stringify(request));

  // Check request came from our app
  // event.session.application.applicationId === env.applicationId

  const intent = (request.type === 'LaunchRequest') ? 'Launch' : request.intent.name;

  switch (intent) {
    // When the skill is opened without a command
    case 'Launch':
      sendLaunchResponse(callback);
      break;

    // When asked for help
    case 'AMAZON.HelpIntent':
      sendHelpResponse(callback);
      break;

    // When asked to stop or cancel
    case 'AMAZON.StopIntent':
    case 'AMAZON.CancelIntent':
      sendStopResponse(callback);
      break;

    case 'GetIngredient':
      const ingredientSlots = request.intent.slots;
      const ingredient = ingredientSlots && ingredientSlots.IngredientType.value;

      if (!ingredient) {
        sendErrorResponse(callback, `You need to give me an ingredient to check!`);
        return;
      }

      // Query the core server
      fetch(buildCoreQuery(coreUrl, common.messageTypes.INGREDIENT, ingredient))
        .then(res => res.json())
        .then(body => {
          if (body.error) sendErrorResponse(callback, body.error);
          else if (body.data) sendIngredientResponse(callback, ingredient, body.data);
          else throw new Error('Response from core server did not contain error or data');
        })
        .catch(err => sendErrorResponse(callback, `Sorry, there was a problem retrieving the menu.`));
      break;

    // When asked for a menu
    case 'GetMenu':
    default:
      // Default to today's menu
      const menuSlots = request.intent.slots;
      const slotMenuType = (menuSlots && menuSlots.MenuType.value) || 'today';

      const requestedMenu = slotMenuType.replace(`'s`, '').toLowerCase();

      if (!common.menuTypes.includes(requestedMenu)) {
        sendErrorResponse(callback, `I didn't recognise the menu type "${requestedMenu}"`);
        return;
      }

      // Query the core server
      fetch(buildCoreQuery(coreUrl, common.messageTypes.MENU, requestedMenu))
        .then(res => res.json())
        .then(body => {
          if (body.error) sendErrorResponse(callback, body.error);
          else if (body.data) sendMenuResponse(callback, requestedMenu, body.data);
          else throw new Error('Response from core server did not contain error or data');
        })
        .catch(err => sendErrorResponse(callback, `Sorry, there was a problem retrieving the menu.`));
      break;
  }
};


// Launching is the same as asking for help, for now
const sendLaunchResponse = callback => sendHelpResponse(callback);


// Return a menu
const sendMenuResponse = (callback, requestedMenu, menuData) => {

  // Create speech output
  const speechStarter = `Here's the menu for ${requestedMenu}:`;
  const speechOutput = menuData.locations.reduce((str, opt) => {
    return str + ` For the ${opt.location} option, there is ${opt.menu.trim()}.`
  }, speechStarter);

  // SSML doesn't seem to like ampersands
  const speechOutputSSML = speechOutput.replace('&', 'and');

  // Create text card output
  const cardContent = menuData.locations.reduce((str, opt) => {
    return str + `${opt.location}: ${opt.menu.trim()}.\n`;
  }, '');

  const day = requestedMenu.charAt(0).toUpperCase() + requestedMenu.slice(1);

  sendResponse(callback, speechOutputSSML, {
    title: `${day}'s menu`,
    content: cardContent
  });
};


// Ingredients
const sendIngredientResponse = (callback, ingredient, daysWithIngredient) => {

  let responseText;

  // If we didn't find the ingredient
  if (daysWithIngredient.length === 0) {
    responseText = `Sorry, I couldn’t find "${ingredient}" in the menu this week`;
  }
  // If we did find it
  else {
    const daysText = daysWithIngredient.reduce((str, d, i, arr) => {
      if (i === 0) return d;
      if (i === arr.length - 1) return `${str} and ${d}`;
      return `${str}, ${d}`;
    }, '');
    responseText = `Looks like the canteen are serving ${ingredient} on ${daysText} this week`;
  }

  sendResponse(callback, responseText, {
    title: `Ingredients`,
    content: responseText
  });
};


// Explain available commands
const sendHelpResponse = (callback) => {
  const speechOutput = `Try asking for the menu for a particular day, or say "stop" to quit. Now, what can I do for you?`;

  const cardContent =
  `Hungry? Here are some examples of things you can say:
  • "Give me the menu for today"
  • "Give me Sunday's menu"
  `;

  sendResponse(callback, speechOutput, {
    title: 'CanteenBot help',
    content: cardContent
  }, false);
};


// Stop / cancel
const sendStopResponse = (callback) => {
  sendResponse(callback, 'Goodbye!', {
    title: 'Goodbye!',
    content: 'Goodbye!'
  });
};


// Send a response when an error occurred
const sendErrorResponse = (callback, text) => {
  const speechOutput = `Uh oh, I encountered an error: ${text}`;
  sendResponse(callback, speechOutput, {
    title: 'Uh oh',
    content: text
  });
};


// Send a response to Alexa
const sendResponse = (callback, speech, card, shouldEnd = true) => {

  callback(null, {
    version: '1.0',
    response: {
      outputSpeech: {
        type: 'PlainText',
        text: speech
      },
      card: {
        type: 'Simple',
        title: card.title,
        content: card.content
      },
      shouldEndSession: shouldEnd
    }
  });
};
