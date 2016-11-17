'use strict';
var Alexa = require('alexa-sdk');
var request = require('request');

var APP_ID = undefined; //OPTIONAL: replace with "amzn1.echo-sdk-ams.app.[your-unique-value-here]";
var SKILL_NAME = 'TNB Canteen';

var menuUrl = 'http://elliotdavies.co.uk/dev/menu/today.json';

exports.handler = function(event, context, callback) {
    var alexa = Alexa.handler(event, context);
    alexa.APP_ID = APP_ID;
    alexa.registerHandlers(handlers);
    alexa.execute();
};

var handlers = {
    'LaunchRequest': function () {
        this.emit('GetMenu');
    },
    'GetNewMenuIntent': function () {
        this.emit('GetMenu');
    },
    'GetMenu': function () {
        var that = this;

        // Get the menu
        request(menuUrl, function (error, response, body) {
          if (!error && response.statusCode == 200) {
            
            var menuData = JSON.parse(body);

            // Create speech output
            var speechOutput = "Here's the menu for today: ";
            menuData.locations.forEach(function(option) {
              speechOutput += 'For the ' + option.location + ' option, there is ';
              speechOutput += option.menu.trim() + '. ';
            });

            // SSML doesn't seem to like ampersands
            speechOutput = speechOutput.replace('&', 'and');

            // Create text card output
            var cardOutput = "";
            menuData.locations.forEach(function(option) {
              cardOutput += option.location + ': ';
              cardOutput += option.menu.trim() + '. ';
            });

            that.emit(':tellWithCard', speechOutput, SKILL_NAME, cardOutput);
          } else {
            that.emit(':tellWithCard', 'Sorry, there was a problem retrieving the menu.', SKILL_NAME, '');
          }
        });
    },
    'AMAZON.HelpIntent': function () {
        var speechOutput = "You can say, get me the canteen menu, or you can say stop... Now, how can I help?";
        var reprompt = "What can I help you with?";
        this.emit(':ask', speechOutput, reprompt);
    },
    'AMAZON.CancelIntent': function () {
        this.emit(':tell', 'Goodbye!');
    },
    'AMAZON.StopIntent': function () {
        this.emit(':tell', 'Goodbye!');
    }
};
