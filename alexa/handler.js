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

  console.log(event.request);

  // Check request came from our app
  // event.session.application.applicationId === env.applicationId

  let intent;
  if (event.request.type === 'LaunchRequest') intent = 'Launch';
  else intent = event.request.intent.name;

  // const requestType = { event };
  // const { name: intent, slots } = event.request.intent;

  switch (intent) {

    // When the skill is opened without a command
    case 'Launch':
      sendLaunchResponse(callback);
      break;

    // When asked for help
    case 'Help':
      sendHelpResponse(callback);
      break;

    // When asked to stop or cancel
    case 'Stop':
    case 'Cancel':
      sendStopResponse(callback);
      break;

    // When asked for a menu
    default:
      // Default to today's menu
      // const requestedMenu = slots.Menu.value || 'today';
      const requestedMenu = 'today';

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
  let speechOutput = `Here's the menu for ${requestedMenu}: `;
  menuData.locations.forEach(function(option) {
    speechOutput += 'For the ' + option.location + ' option, there is ';
    speechOutput += option.menu.trim() + '. ';
  });

  // SSML doesn't seem to like ampersands
  speechOutput = speechOutput.replace('&', 'and');

  // Create text card output
  let cardOutput = "";
  menuData.locations.forEach(function(option) {
    cardOutput += option.location + ': ';
    cardOutput += option.menu.trim() + '. ';
  });

  sendResponse(callback, speechOutput, {
    title: `Today's menu`,
    content: cardOutput
  });
};


// Explain available commands
const sendHelpResponse = (callback) => {
  const helpText = `You can say, get me the canteen menu, or you can say stop... Now, how can I help?`;
  sendResponse(callback, helpText, {
    title: 'CanteenBot help',
    content: helpText
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
  sendResponse(callback, text, {
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
