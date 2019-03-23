require('isomorphic-fetch');
const aws = require('aws-sdk');

const { sendResponse, buildCoreQuery } = require('../lib/helpers');
const common = require('../lib/common');

const dynamoDB = new aws.DynamoDB();

const coreUrl = process.env.CORE_URL;
const canteenUrl = process.env.CANTEEN_URL;
const env = process.env.ENV || 'dev';

// Capitalise a string
String.prototype.capitalise = function() {
  return this.charAt(0).toUpperCase() + this.slice(1);
};

/**
 * Get the record for a given team from the DB
 */
module.exports.getTeamsFromDB = () =>
  new Promise((resolve, reject) => {
    const dynamoParams = { TableName: `canteenbot_${env}` };

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
      TableName: `canteenbot_${env}`,
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
  payload,
  statusCode = 200
) => sendResponse(callback, payload, statusCode));

// Return an error to Slack
module.exports.respondWithError = (callback, text) =>
  respond(
    callback,
    {
      text: '*Something went wrong*',
      attachments: [
        {
          fallback: text,
          text,
          color: 'danger',
        },
      ],
    },
    200
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

const sentenceCase = line => {
  const trimmed = line.trim();
  return `${trimmed[0].toUpperCase()}${trimmed.slice(1).toLowerCase()}`;
};

const formatSubsection = (key, content) => `${sentenceCase(key)}: ${content}`;

// Format the menu content as a Slack web hook post payload.
module.exports.buildPayload = (day, { mainMenuContent, cafeMenuContent }) => {
  // For cafe, the section titles are days of the week.
  const todaysCafeMenuContent = cafeMenuContent.find(x => x.title === day);

  const payloadContent = [
    ...mainMenuContent,
    todaysCafeMenuContent && {
      // Don't want the day as the title, so override it.
      ...todaysCafeMenuContent,
      title: 'Café',
    },
  ]
    .filter(Boolean)
    .map(section => {
      // For each section, we want to generate the lines of text.
      // First the main body content (if any), then each subsection text.
      const lines = [];
      if (section.body) {
        lines.push(...section.body);
      }
      lines.push(
        ...Object.keys(section.subsections).reduce((acc, key) => {
          acc.push(formatSubsection(key, section.subsections[key]));
          return acc;
        }, [])
      );

      // Each section output as a Slack attachment object (these will be sent as part of payload).
      return {
        title: section.title,
        color: section.color,
        text: lines.map(line => sentenceCase(line)).join('\n'),
        mrkdwn_in: ['text'],
      };
    });

  return {
    username: 'Canteen on 14',
    icon_emoji: ':fork_and_knife:',
    text: `Menu for ${day.capitalise()}`,
    attachments: [
      ...payloadContent,
      {
        text: [
          `Menu taken from <${canteenUrl}#canteen|Canteen on 14 website>.`,
        ].join('\n'),
      },
    ],
  };
};
