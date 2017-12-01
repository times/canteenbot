const { sendResponse } = require('../lib/helpers');

// Instantiate DB connection
const aws = require('aws-sdk');
const dynamoDB = new aws.DynamoDB();

/**
 * Get the record for a given team from the DB
 */
module.exports.getTeamsFromDB = cb => {
  const dynamoParams = { TableName: 'canteenbot' };

  dynamoDB.scan(dynamoParams, (err, teams) => {
    if (err) {
      console.log(`Error retrieving teams from DynamoDB`, err);
      cb(err);
    } else
      cb(
        // Transform items from { key: { S: value } } to { key: value }
        teams.Items.map(item =>
          Object.keys(item).reduce(
            (acc, k) => Object.assign({}, acc, { [k]: item[k].S }),
            {}
          )
        )
      );
  });
};

/**
 * Store a record for a given team in the DB
 */
module.exports.storeTeamInDB = (
  teamId,
  teamName,
  accessToken,
  webhookUrl,
  cb
) => {
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
      console.log(`Error storing data for ${teamName} in DynamoDB`, err);
      cb(err);
    } else cb(data);
  });
};

// Helper function to return a JSON response to Slack
module.exports.sendSlackResponse = (callback, text = '', attachments = []) => {
  const payload = {
    text,
    attachments,
  };

  sendResponse(callback, payload);
};

// Return an error to Slack
module.exports.sendErrorResponse = (callback, text) => {
  sendSlackResponse(callback, '*Something went wrong*', [
    {
      fallback: text,
      text,
      color: 'danger',
    },
  ]);
};
