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
 * Get today's canteen menu and post to the given URLs
 */
module.exports.handler = webhookUrls => {
  const requestedMenu = 'today';

  // Query the core server
  fetch(buildCoreQuery(coreUrl, common.messageTypes.MENU, requestedMenu))
    .then(res => res.json())
    .then(body => {
      if (body.error) sendErrorResponses(webhookUrls, body.error);
      else if (body.data)
        sendMenuResponse(webhookUrls, requestedMenu, body.data);
      else
        throw new Error(
          'Response from core server did not contain error or data'
        );
    })
    .catch(err =>
      sendErrorResponses(webhookUrls, `Error querying core server: ${err}`)
    );
};

// Helper function to return a JSON response to Slack
const sendSlackResponses = (webhookUrls, text = '', attachments = []) => {
  const payload = {
    text,
    attachments,
  };

  // sendResponse(callback, payload);
  const send = webhookUrl =>
    fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

  Promise.all(webhookUrls.map(send))
    .then(responses => console.log(responses))
    .catch(errs => console.log(`Errors posting to Slack: ${errs}`));
};

// Return an error to Slack
const sendErrorResponses = (webhookUrls, text) => {
  sendSlackResponses(webhookUrls, '*Something went wrong*', [
    {
      fallback: text,
      text,
      color: 'danger',
    },
  ]);
};

// Build and return a 'menu' response to Slack;
const sendMenuResponse = (webhookUrls, requestedMenu, menuData) => {
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

  sendSlackResponses(webhookUrls, '', attachments);
};
