'use strict';

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

require('babel-polyfill');

// const helpers = require('../lib/helpers');
var helpers = {
  readJsonFile: function readJsonFile() {
    return '';
  }
};
var common = require('../lib/common');

var fetch = require('node-fetch');

var menuDir = process.env.DATA_PATH;

module.exports.handler = function (event, context, callback) {
  var httpMethod = event.httpMethod,
      args = event.queryStringParameters;


  console.log('Received request via ' + httpMethod);

  var response = {
    statusCode: 200
  };

  // Requests for data
  if (httpMethod == 'GET') {

    if (!args.message_type || !args.message_param) {
      response.body = 'Error: both message_type and message_param must be provided and valid';
      callback(null, response);
    }

    // Data to return
    // let data;

    var sendData = function sendData(data) {
      var finalResponse = Object.assign({}, response, { body: JSON.stringify(data) });
      console.log(finalResponse);
      callback(null, finalResponse);
    };

    var _common$messageTypes = common.messageTypes,
        MENU = _common$messageTypes.MENU,
        INGREDIENT = _common$messageTypes.INGREDIENT;

    switch (args.message_type) {
      case MENU:
        // data = menuHandler(sendData, args.message_param);
        menuHandler(sendData, args.message_param);
        break;
      case INGREDIENT:
        // data = ingredientHandler(sendData, args.message_param);
        ingredientHandler(sendData, args.message_param);
        break;
      default:
        // data = errorHandler(sendData, args.message_type, args.message_param);
        errorHandler(sendData, args.message_type, args.message_param);
        break;
    }

    // response.body = JSON.stringify(data);
  }

  // If we receive something not via GET
  else {
      response.body = 'Error: invalid HTTP method';
      callback(null, response);
    }
};

/*
 * Handle menu requests - returns menu data for the given day
 */
var menuHandler = function menuHandler(cb, menu) {
  console.log('requested menu for ' + menu);

  // First validate the requested menu
  if (!common.menuTypes.includes(menu)) return { error: 'Invalid menu type ' + menu };

  // Try to read the menu file
  var menuData = undefined;
  // try {
  var url = 'http://elliotdavies.co.uk/dev/menu/' + menu + '.json';
  console.log(url);

  fetch(url).then(function (res) {
    return res.json();
  }).then(function (body) {
    cb({ data: body });
  }).catch(function (err) {
    console.log(err);
    cb({ error: 'Couldn\'t read menu file for "' + menu + '"' });
  });
  // menuData = helpers.readJsonFile(menuDir)(menu);
  // } catch (err) {

  // }

  // return {
  //   data: menuData
  // };
};

/*
 * Handle ingredient requests - returns a list of days on which a given ingredient is available
 */
var ingredientHandler = function ingredientHandler(cb, ingredient) {
  console.log('requested ingredient ' + ingredient);

  // Try to read the menu files
  var files = undefined;
  try {
    files = fs.readdirSync(__dirname + '/' + menuDir)
    // Only look at the JSON files
    .filter(function (f) {
      return helpers.endsWithJson;
    })
    // Read the actual file data
    .map(helpers.readJsonFile(menuDir));
  } catch (err) {
    return { error: 'Couldn\'t read menu file: ' + err };
  }

  // Check the menu data in each day's file to see if it contains the ingredient
  var daysWithIngredient = files.reduce(function (days, menu) {
    var ingredientOnMenu = menu.locations.some(hasIngredient(ingredient));
    return ingredientOnMenu ? [].concat(_toConsumableArray(days), [menu.day]) : days;
  }, [])
  // Filter out duplicate days
  .filter(function (day, i, arr) {
    return arr.indexOf(day) === i;
  });

  console.log(daysWithIngredient);

  return {
    data: daysWithIngredient
  };
};

// Helper function to check whether a given ingredient exists within a given menu
var hasIngredient = function hasIngredient(ingredient) {
  return function (_ref) {
    var menu = _ref.menu,
        location = _ref.location;

    var ingredientLC = ingredient.toLowerCase();
    return menu.toLowerCase().includes(ingredientLC) || location.toLowerCase().includes(ingredientLC);
  };
};

/*
 * Handle invalid requests
 */
var errorHandler = function errorHandler(cb, type, param) {
  var errorMsg = 'Received message of type ' + type + ' with parameter ' + param;
  console.log('Error: ' + errorMsg);
  cb({
    error: errorMsg
  });
};
