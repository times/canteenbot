const request = require('request');

require('dotenv').config();

// The webhook to post to
const webhookUrl = process.env.WEBHOOK_URL;

// Today’s menu data
const menuData = require(process.env.DATA_PATH + 'today.json');
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
  if (err) {
    console.log('Error sending data to Slack');
    console.log(err);
  }
});
