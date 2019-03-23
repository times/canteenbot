require('isomorphic-fetch');

const aws = require('aws-sdk');

const { getContent } = require('./get-content');

const dataBucketName = process.env.DATA_BUCKET_NAME;
const env = process.env.ENV || 'dev';

const S3 = new aws.S3({
  signatureVersion: 'v4',
  region: 'eu-west-1',
});

const { days } = require('../lib/common');

// Capitalise a string
String.prototype.capitalise = function() {
  return this.charAt(0).toUpperCase() + this.slice(1);
};

// Build menu data into a JSON object
const buildJson = (day, mainMenuContent, cafeMenuContent) => ({
  timestamp: new Date().toUTCString(),
  day: day.capitalise(),
  mainMenuContent,
  cafeMenuContent,
});

// Write a menu JSON object to S3
const writeToS3 = (day, data) =>
  new Promise((resolve, reject) => {
    S3.putObject(
      {
        Bucket: dataBucketName,
        Key: `${env}/${day}.json`,
        ContentType: 'application/json',
        Body: JSON.stringify(data),
        ACL: 'public-read',
      },
      (err, res) => {
        if (err) {
          console.log(`Error writing ${day} to S3:`, err);
          reject(err);
          return;
        }

        console.log(`Wrote ${day} to S3`);
        resolve();
      }
    );
  });

// Serverless entry point
module.exports.handler = (event, context, callback) =>
  Promise.all(
    days.map((day, i) => {
      return getContent(day)
        .then(({ mainMenuContent, cafeMenuContent }) =>
          buildJson(day, mainMenuContent, cafeMenuContent)
        )
        .then(json => {
          // Numbers from 0 (Mon) to 6 (Sun)
          const today = (new Date().getDay() + 6) % 7;
          const tomorrow = (today + 1) % 7;

          return Promise.all(
            [
              writeToS3(day, json),
              i === today && writeToS3('today', json),
              i === tomorrow && writeToS3('tomorrow', json),
            ].filter(Boolean)
          );
        });
    })
  ).then(() => {
    callback(null, 'Written to S3');
  });
