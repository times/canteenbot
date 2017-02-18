'use strict';

require('babel-polyfill');

const fetch = require('node-fetch');
const common = require('../lib/common');
const { days, buildCoreQuery } = require('../lib/helpers');

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

    // When asked for a menu
    case 'GetMenu':
    default:
      // Default to today's menu
      const slots = request.intent.slots;
      const requestedMenu = (slots && slots.MenuType.value) || 'today';

      if (!common.menuTypes.includes(requestedMenu)) {
        sendErrorResponse(callback, `I didn't recognise the menu type "${requestedMenu}"`);
        return;
      }

      // Query the core server
      fetch(buildCoreQuery(coreUrl, common.messageTypes.MENU, requestedMenu.toLowerCase()))
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
