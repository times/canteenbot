const http = require('http');
const request = require('request');

require('dotenv').config();

const helpers = require('../lib/helpers');
const common = require('../lib/common');


/*
 * SERVER
 */

// The server to run
const server = http.createServer((req, res) => {
  console.log(`Received request via ${req.method}`);

  // Slack commands are sent via POST
  if (req.method == 'POST') {
    let data = '';

    req.on('data', function(chunk){
      data += chunk.toString();
    });

    req.on('end', function(){
      const args = helpers.parseArgs(data);
      
      // Recognised service commands
      switch (args.command) {
        case '/canteen':
          canteenHandler(args, res);
          break;
        default:
          defaultHandler(res);
      }
    });
  }
  
  // If we receive something not via POST
  else { 
    returnErrorResponse(res, 'Sorry, only POST requests are accepted');
  }
});


// Go
server.listen(process.env.SLACK_PORT, () => console.log(`Listening on localhost at port ${process.env.SLACK_PORT}`));


/*
 * HANDLERS
 */

// Handle requests that don't match a recognised service
const defaultHandler = res => {
  res.writeHead(405, 'Method not supported', { 'Content-Type': 'text/plain' });
  res.end(`Sorry: that service isn't supported\n`);
}


// Handle CanteenBot requests
const canteenHandler = (args, res) => {
  
  // Valid parameters that can be passed via Slack
  const recognisedParams = [
    '',
    ...common.menuTypes,
    'ingredient',
    'help',
  ];

  // First check this request came from a recognised Slack team
  // const teams = envData.registeredTeams;
  const teams = [ process.env.TIMES_TEAM ];
  if (!teams.includes(args.token)) {
    returnErrorResponse('Invalid token');
    return;
  }

  // Now look at the first parameter the user supplied
  const params =
    args.text
      .split('+')
      .map(a => a.toLowerCase());
  const firstParam = params[0];

  // If we don't recognise the parameter, return an error
  if (!recognisedParams.includes(firstParam)) {
    returnErrorResponse(`Sorry: I didn’t recognise the command "${firstParam}"`);
    return;
  }

  // Otherwise, return information according to the supplied parameter
  switch (firstParam) {
    // For help requests, return a list of valid parameters
    case 'help':
      returnHelpResponse(res, recognisedParams);
      break;

    // For ingredient requests, return a list of days where that ingredient is on the menu
    case 'ingredient':
      const ingredient = params[1];

      // Check the user passed an ingredient to check
      if (!ingredient) {
        returnSlackResponse(res, 'You need to give me an ingredient to check!');
        return;
      }

      // Construct the request to the message server
      const ingredientOptions = {
        uri: process.env.SERVER_URL,
        qs: {
          message_type: common.messageTypes.INGREDIENT,
          message_param: encodeURIComponent(ingredient),
        }
      };

      request(ingredientOptions, handleServerResponse(res, returnIngredientResponse(ingredient)));

      // Make the request
      // request(ingredientOptions, (err, serverRes, body) => {
      //   if (!err && serverRes.statusCode == 200) {

      //     // Try to parse the response JSON
      //     let bodyJson;
      //     try {
      //       bodyJson = JSON.parse(body);
      //     } catch (err) {
      //       console.log(`Error parsing JSON returned from server: ${err}`);
      //       return;
      //     }

      //     // Check whether the response JSON was actually an error
      //     if (bodyJson.error) {
      //       returnErrorResponse(res, bodyJson.error);
      //       return;
      //     }

      //     // Build and return the response to the user
      //     const daysWithIngredient = bodyJson.data;
      //     returnIngredientResponse(res, ingredient, daysWithIngredient);
      //   } else {
      //     console.log(`Error querying server for ingredient "${ingredient}"`);
      //     console.log(err);
      //     return;
      //   }
      // });

      break;

    // Otherwise it must be a menu request
    default:
      // Default to today's menu
      const requestedMenu = params[0] || 'today';

      // Construct the request to the message server
      const menuOptions = {
        uri: process.env.SERVER_URL,
        qs: {
          message_type: common.messageTypes.MENU,
          message_param: requestedMenu,
        }
      };

      // Make the request
      request(menuOptions, handleServerResponse(res, returnMenuResponse(requestedMenu)));


      // request(menuOptions, (err, serverRes, body) => {
      //   if (!err && serverRes.statusCode == 200) {

      //     // Try to parse the response JSON
      //     let bodyJson;
      //     try {
      //       bodyJson = JSON.parse(body);
      //     } catch (err) {
      //       console.log(`Error parsing JSON returned from server: ${err}`);
      //       return;
      //     }

      //     // Check whether the response JSON was actually an error
      //     if (bodyJson.error) {
      //       returnErrorResponse(res, bodyJson.error);
      //       return;
      //     }

      //     // Build and return the response to the user
      //     const menuData = bodyJson.data;
      //     returnMenuResponse(res, requestedMenu, menuData);
      //   } else {
      //     console.log(`Error querying server for menu "${requestedMenu}"`);
      //     console.log(err);
      //     return;
      //   }
      // });
      break;
  }
}


const handleServerResponse = (res, cb) => (err, serverRes, body) => {

  console.log(res, cb, err, serverRes, body);

  if (!err && serverRes.statusCode == 200) {
    // Try to parse the response JSON
    let bodyJson;
    try {
      bodyJson = JSON.parse(body);
    } catch (err) {
      console.log(`Error parsing JSON returned from server: ${err}`);
      return;
    }

    // Check whether the response JSON was actually an error
    if (bodyJson.error) {
      returnErrorResponse(res, bodyJson.error);
      return;
    }

    // Build and return the response to the user
    cb(res)(bodyJson.data);
  } else {
    console.log(`Error querying server:\n${err}`);
    return;
  }
}


// Helper function to return a plaintext error message
const returnErrorResponse = (res, text) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end(text);
}


// Helper function to return a JSON response to Slack
const returnSlackResponse = (res, text = '', attachments = []) => {
  const payload = {
    text,
    attachments
  };

  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(payload));
}


// Build and return a 'help' response to Slack
const returnHelpResponse = (res, recognisedParams) => {
  const helpText = '*Hungry? Type* `/canteen` *, optionally followed by one of these commands, to see what’s on offer:*';
  const paramsText = recognisedParams.reduce((str, p) => `${str}\n${p}`);
  
  returnSlackResponse(res, helpText + paramsText);
}


// Build and return an 'ingredient' response to Slack
const returnIngredientResponse = ingredient => res => daysWithIngredient => {
  let responseText;

  // If we didn't find the ingredient
  if (daysWithIngredient.length === 0) {
    responseText = `Sorry, I couldn’t find "${ingredient}" in the menu this week`;
  }
  // If we did find it
  else {
    const orderedDays = helpers.orderDaysOfWeek(daysWithIngredient);
    const daysText = orderedDays.reduce((str, d, i, arr) => {
      if (i === 0) return d;
      if (i === arr.length - 1) return `${str} and ${d}`;
      return `${str}, ${d}`;
    }, '');
    responseText = `Looks like the canteen are serving ${ingredient} on ${daysText} this week`;
  }

  returnSlackResponse(res, responseText);
}


// Build and return a 'menu' response to Slack;
const returnMenuResponse = requestedMenu => res => menuData => {
  const menuText = menuData.locations.reduce((str, loc) => {
    return str + '*' + loc.location + '*\n' + loc.menu + '\n';
  }, '');
  const menuUrl = menuData.url;
  const day = requestedMenu.charAt(0).toUpperCase() + requestedMenu.slice(1);

  const attachments = [{
    'fallback': day + '’s menu',
    'color': 'good',
    'title': day + '’s menu',
    'title_link': menuUrl,
    'fields': [
      {
        'value': menuText,
        'short': false
      }
    ],
    'mrkdwn_in': [ 'fields' ]
  }];

  returnSlackResponse(res, '', attachments);
}
