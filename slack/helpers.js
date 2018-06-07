require('isomorphic-fetch');
const aws = require('aws-sdk');

const { sendResponse, buildCoreQuery } = require('../lib/helpers');
const common = require('../lib/common');

const dynamoDB = new aws.DynamoDB();

const coreUrl = process.env.CORE_URL;

/**
 * Get the record for a given team from the DB
 */
module.exports.getTeamsFromDB = () =>
  new Promise((resolve, reject) => {
    const dynamoParams = { TableName: 'canteenbot' };

    dynamoDB.scan(dynamoParams, (err, rows) => {
      if (err) {
        const errMsg = `Error retrieving teams from DynamoDB: ${err}`;
        console.log(errMsg);
        return reject(errMsg);
      } else {
        // Transform items from { key: { S: value } } to { key: value }
        const teams = rows.Items.map(item =>
          Object.keys(item).reduce(
            (acc, k) => Object.assign({}, acc, { [k]: item[k].S }),
            {}
          )
        );

        return resolve(teams);
      }
    });
  });

/**
 * Store a record for a given team in the DB
 */
module.exports.storeTeamInDB = (teamId, teamName, accessToken, webhookUrl) =>
  new Promise((resolve, reject) => {
    const dynamoParams = {
      Item: {
        id: { S: teamId },
        teamName: { S: teamName },
        accessToken: { S: accessToken },
        webhookUrl: { S: webhookUrl },
      },
      TableName: 'canteenbot',
    };

    dynamoDB.putItem(dynamoParams, (err, data) => {
      if (err) {
        const errMsg = `Error storing data for ${teamName} in DynamoDB: ${err}`;
        console.log(errMsg);
        return reject(errMsg);
      }

      return resolve(data);
    });
  });

// Helper function to return a JSON response to Slack
const respond = (module.exports.respond = (
  callback,
  text = '',
  attachments = [],
  statusCode = 200
) => {
  const payload = {
    text,
    attachments,
  };

  return sendResponse(callback, payload, statusCode);
});

// Return an error to Slack
module.exports.respondWithError = (callback, text) =>
  respond(
    callback,
    '*Something went wrong*',
    [
      {
        fallback: text,
        text,
        color: 'danger',
      },
    ],
    500
  );

// Query the core server for a menu
module.exports.fetchMenu = (menu = 'today') =>
  fetch(buildCoreQuery(coreUrl, common.messageTypes.MENU, menu))
    .then(res => res.json())
    .then(body => {
      if (body.error) throw new Error(body.error);
      else if (!body.data)
        throw new Error(
          'Response from core server did not contain error or data'
        );

      return body.data;
    });

// Query the core server for an ingredient
module.exports.fetchIngredient = ingredient =>
  fetch(buildCoreQuery(coreUrl, common.messageTypes.INGREDIENT, ingredient))
    .then(res => res.json())
    .then(body => {
      if (body.error) throw new Error(body.error);
      else if (!body.data)
        throw new Error(
          'Response from core server did not contain error or data'
        );

      return body.data;
    });

// Construct Slack `attachments` field for a menu
module.exports.buildMenuAttachments = (requestedMenu, menuData) => {
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

  return attachments;
};
