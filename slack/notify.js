const fetch = require('node-fetch');

const { buildMenuAttachments } = require('./helpers');

/**
 * Get today's canteen menu and post to the given URLs
 */
module.exports = webhookUrls => {
  const requestedMenu = 'today';

  fetchMenu(requestedMenu)
    .then(menu => sendMenus(webhookUrls, requestedMenu, menu))
    .catch(err =>
      sendErrors(webhookUrls, `Error querying core server: ${err}`)
    );
};

// Build and return a 'menu' response to Slack
const sendMenus = (webhookUrls, requestedMenu, menuData) =>
  postToSlackUrls(
    webhookUrls,
    '',
    buildMenuAttachments(requestedMenu, menuData)
  );

// Return an error to Slack
const sendErrors = (webhookUrls, text) =>
  postToSlackUrls(webhookUrls, '*Something went wrong*', [
    {
      fallback: text,
      text,
      color: 'danger',
    },
  ]);

// Helper function to return a JSON response to Slack
const postToSlackUrls = (webhookUrls, text = '', attachments = []) => {
  const payload = {
    text,
    attachments,
  };

  const send = webhookUrl =>
    fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

  return Promise.all(webhookUrls.map(send)).catch(errs =>
    console.log(`Errors posting to Slack: ${errs}`)
  );
};
