'use strict';

const request = require('request');

// Secret env data
const envData = require('../env.json');

// The webhook to post to
const webhookUrl = envData.webhookUrl;

// Today’s menu data
const menuData = require(envData.dataPathDev + 'today.json');
const menuUrl = menuData.url;

// Build the menu data into a formatted string
const menuText =
  menuData.locations
    .map(({menu, location}, i) => `*${location}*\n${menu}`)
    .join('\n');

// Slack attachments
const attachments = [{
  fallback: 'Today’s menu',
  color: 'good',
  title: 'Today’s menu',
  title_link: menuUrl,
  fields: [
    {
      value: menuText,
      short: false
    }
  ],
  mrkdwn_in: [ 'fields' ]
}];

// Request options
const options = {
  method: 'post',
  body: { attachments },
  json: true,
  url: webhookUrl
};

// Send the data
request(options, (err, res) => {
  // Error handling here
});
