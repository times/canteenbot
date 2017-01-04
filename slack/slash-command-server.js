const http = require('http');

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
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Boo!\n');
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
  
  // Valid parameters
  const recognisedParams = [
    '',
    'ingredient',
    'help',
    ...common.menuTypes,
  ];

  // First check this request came from a recognised Slack team
  // const teams = envData.registeredTeams;
  const teams = [ process.env.TIMES_TEAM ];
  if (!teams.includes(args.token)) {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Invalid token');
  }

  // Now look at the first parameter the user supplied
  const params =
    args.text
      .split('+')
      .map(a => a.toLowerCase());

  const firstParam = params[0];

  // If we don't recognise the parameter, return an error
  if (!recognisedParams.includes(firstParam)) {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end(`Sorry: I didn’t recognise the command "${firstParam}"`);
  }

  // If we do recognise it...
  else {
    // We'll be returning JSON
    res.writeHead(200, { 'Content-Type': 'application/json' });

    // The object we'll eventually return to Slack
    const payload = {
      'text': '',
      'attachments': []
    }

    // Depending on the parameter, return different information
    switch (firstParam) {
      // For help requests, return a list of valid parameters
      case 'help':
        const helpText = '*Hungry? Type* `/canteen` *, optionally followed by one of these commands, to see what’s on offer:*';
        const menusText = recognisedParams.reduce((str, p) => `${str}\n${p}`);
        payload.text = helpText + paramsText;
        break;

      // For ingredient requests, return a list of days where that ingredient is on the menu
      case 'ingredient':
        // If the user didn't pass an ingredient to check
        if (!params[1]) {
          payload.text = 'You need to give me an ingredient to check!';
        }
        else {
          const ingredient = params[1];

          // TODO - hook this up and handle async
          const daysWithIngredient = queryServer({
            message_type: common.messageTypes.INGREDIENT,
            message_param: ingredient
          });

          // If we didn't find the ingredient
          if (daysWithIngredient.length === 0) {
            payload.text = `Sorry, I couldn’t find "${ingredient}" in the menu this week`;
          }
          // If we did find it
          else {
            const orderedDays = helpers.orderDaysOfWeek(daysWithIngredient);
            const daysText = orderedDays.reduce((str, d, i, arr) => {
              if (i === 0) return d;
              if (i === arr.length - 1) return `${str} and ${d}`;
              return `${str}, ${d}`;
            }, '');
            payload.text = `Looks like the canteen are serving ${ingredient} on ${daysText} this week`;
          }
        }
        break;

      // Return a menu for all other cases
      default:
        // Default to today's menu if nothing more specific was provided
        const requestedMenu = params[0] || 'today';

        // TODO - hook this up and handle async
        const menuData = queryServer({
          message_type: common.messageTypes.MENU,
          message_param: requestedMenu
        });

        // Structure the response text and attachments;
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

        payload.attachments = attachments;
        break;
    }

    // Return the response to Slack
    res.end(JSON.stringify(payload));
  }
}
