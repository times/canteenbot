'use strict';

require('babel-polyfill');

// const helpers = require('../lib/helpers');
const helpers = {
  readJsonFile: () => ''
}
const common = require('../lib/common');

const fetch = require('node-fetch');

const menuDir = process.env.DATA_PATH;

module.exports.handler = (event, context, callback) => {

  const { httpMethod, queryStringParameters: args } = event;

  console.log(`Received request via ${httpMethod}`);

  let response = {
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

    const sendData = (data) => {
      const finalResponse = Object.assign({}, response, {body: JSON.stringify(data)});
      console.log(finalResponse);
      callback(null, finalResponse);
    };

    const { MENU, INGREDIENT } = common.messageTypes;
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
const menuHandler = (cb, menu) => {
  console.log('requested menu for ' + menu);

  // First validate the requested menu
  if (!common.menuTypes.includes(menu)) return { error: `Invalid menu type ${menu}` };

  // Try to read the menu file
  let menuData;
  // try {
  const url = `http://elliotdavies.co.uk/dev/menu/${menu}.json`;
  console.log(url);

  fetch(url)
    .then(res => res.json())
    .then(body => {
      cb({ data: body });
    })
    .catch(err => {
      console.log(err);
      cb({ error: `Couldn't read menu file for "${menu}"` });
    })
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
const ingredientHandler = (cb, ingredient) => {
  console.log('requested ingredient ' + ingredient);

  // Try to read the menu files
  let files;
  try {
    files =
      fs.readdirSync(__dirname + '/' + menuDir)
        // Only look at the JSON files
        .filter(f => helpers.endsWithJson)
        // Read the actual file data
        .map(helpers.readJsonFile(menuDir));
  } catch (err) {
    return { error: `Couldn't read menu file: ${err}` };
  }

  // Check the menu data in each day's file to see if it contains the ingredient
  const daysWithIngredient =
    files
      .reduce((days, menu) => {
        const ingredientOnMenu = menu.locations.some(hasIngredient(ingredient));
        return (ingredientOnMenu) ? [...days, menu.day] : days;
      }, [])
      // Filter out duplicate days
      .filter((day, i, arr) => arr.indexOf(day) === i);

  console.log(daysWithIngredient);

  return {
    data: daysWithIngredient
  };
};

// Helper function to check whether a given ingredient exists within a given menu
const hasIngredient = ingredient => ({menu, location}) => {
  const ingredientLC = ingredient.toLowerCase();
  return menu.toLowerCase().includes(ingredientLC) || location.toLowerCase().includes(ingredientLC);
}


/*
 * Handle invalid requests
 */
const errorHandler = (cb, type, param) => {
  const errorMsg = `Received message of type ${type} with parameter ${param}`;
  console.log('Error: ' + errorMsg);
  cb({
    error: errorMsg
  });
}
