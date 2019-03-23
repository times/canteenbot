require('isomorphic-fetch');

const { buildPayload, fetchMenu } = require('./helpers');

/**
 * Get today's canteen menu and post to the given URLs
 */
module.exports = webhookUrls => {
  const requestedMenu = 'today';

  return fetchMenu(requestedMenu)
    .then(({ mainMenuContent, cafeMenuContent }) =>
      sendMenus(webhookUrls, requestedMenu, {
        mainMenuContent,
        cafeMenuContent,
      })
    )
    .catch(err =>
      sendErrors(webhookUrls, `Error querying core server: ${err}`)
    );
};

// Build and return a 'menu' response to Slack
const sendMenus = (webhookUrls, requestedMenu, menuData) =>
  postToSlackUrls(webhookUrls, buildPayload(requestedMenu, menuData));

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
const postToSlackUrls = (webhookUrls, payload) => {
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
