'use strict';

require('babel-polyfill');

const fetch = require('node-fetch');
const common = require('../lib/common');
const { buildCoreQuery } = require('../lib/helpers');

// The webhook to post to
const webhookUrl = process.env.WEBHOOK_URL;

// Today's menu data
const coreUrl = process.env.CORE_URL;

/**
 * Entry point
 */
module.exports.handler = (event, context, callback) => {
  const requestedMenu = 'today';

  // Query the core server
  fetch(buildCoreQuery(coreUrl, common.messageTypes.MENU, requestedMenu))
    .then(res => res.json())
    .then(body => {
      if (body.error) sendErrorResponse(callback, body.error);
      else if (body.data) sendMenuResponse(callback, requestedMenu, body.data);
      else throw new Error(
          'Response from core server did not contain error or data'
        );
    })
    .catch(err =>
      sendErrorResponse(callback, `Error querying core server: ${err}`));
};

// Helper function to return a JSON response to Slack
const sendSlackResponse = (callback, text = '', attachments = []) => {
  const payload = {
    text,
    attachments,
  };

  // sendResponse(callback, payload);
  fetch(webhookUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })
    .then(res => console.log(res))
    .catch(err => console.log(`Error posting to Slack: ${err}`));
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
