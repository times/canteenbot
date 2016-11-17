const http = require('http');
const fs = require('fs');
const port = 8080;

const envData = require('../env.json');

// Given a list of days of the week, sort it
function sortDaysOfWeek(list) {
  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  
  return list
    .map(function(l){
      return l.toLowerCase();
    })
    .sort(function(a, b){
      return days.indexOf(a) > days.indexOf(b);
    })
    .map(function(l){
      return l.charAt(0).toUpperCase() + l.substr(1);
    });
}


// Handle CanteenBot requests
function canteenHandler(args, res) {
  
  // Where to find the menus
  const menuDir = envData.dataPathDev;

  // Valid parameters
  const recognisedParams = [
    '',
    'today',
    'tomorrow',
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday',
    'sunday',
    'ingredient',
    'help'
  ];

  // First check this request came from a recognised Slack team
  const teams = envData.registeredTeams;

  if (!teams.includes(args.token)) {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Invalid token');
  }

  // Now look at the parameter the user supplied
  const params =
    args.text
      .split('+')
      .map(a => a.toLowerCase());

  // If we don't recognise the parameter, return an error
  if (recognisedParams.indexOf(params[0]) === -1) {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Sorry: I didn’t recognise the command "' + params[0] + '"');
  }
  // If we do recognise it...
  else {
    // We'll be returning JSON
    res.writeHead(200, { 'Content-Type': 'application/json' });

    const payload = {
      'text': '',
      'attachments': []
    }

    switch (params[0]) {
      // For help requests, return a list of valid parameters
      case 'help':
        payload.text = '*Hungry? Type* `/canteen` *, optionally followed by one of these commands, to see what’s on offer:*';
        recognisedParams.forEach(p => payload.text += '\n' + p);
        break;

      // For ingredient requests, return a list of days where that ingredient is on the menu
      case 'ingredient':
        // If the user passed an ingredient to check
        if (params[1]) {

          const ingredient = params[1];

          // Try to read the menu files
          try {
            const daysToReturn = new Set();

            const files = fs.readdirSync(menuDir);

            files
              // Only look at the JSON files
              .filter(f => f.indexOf('.json', f.length - '.json'.length) !== -1)

              // Check the menu data in each day's file to see if it contains the ingredient
              .forEach(f => {
                const menuData = require(menuDir + f);

                menuData.locations.forEach(l => {
                  if (l.menu.toLowerCase().indexOf(ingredient) > -1) {
                    daysToReturn.add(menuData.day); // Keep track of days that do contain the ingredient
                  }
                });
            });

            // Clear the require cache
            Object.keys(require.cache).forEach(key => delete require.cache[key]);

            daysToReturn = sortDaysOfWeek(Array.from(daysToReturn));

            if (daysToReturn.length === 0) {
              payload.text = 'Sorry, I couldn’t find "' + ingredient + '" in the menu this week';
            } else {
              const daysText = daysToReturn.reduce((str, d, i, arr) => {
                if (i === 0) return d;
                if (i === arr.length - 1) return str + ' and ' + d;
                return str + ', ' + d;
              }, '');
              payload.text = 'Looks like the canteen are serving ' + ingredient + ' on ' + daysText + ' this week';
            }
          } catch (err) {
            console.log('Error reading files');
            console.log(err);
            return;
          }
        }
        // If there was no ingredient to check
        else {
          payload.text = 'You need to give me an ingredient to check!';
        }

        break;

      // Default to today's menu if nothing more specific was provided
      case '':
        params[0] = 'today';

      // Return a menu for all other cases
      default:
        // Try to read the menu file
        try {
          const menuData = require(menuDir + params[0] + '.json');
          Object.keys(require.cache).forEach(key => delete require.cache[key]);
        } catch (err) {
          console.log('Error reading file ' + params[0] + ' from ' + menuDir);
          console.log(err);
          return;
        }

        // Structure the response text and attachments
        const menuText = '';
        menuData.locations.forEach((loc, i) => {
          menuText += '*' + loc.location + '*\n';
          menuText += loc.menu + '\n';
        });

        const menuUrl = menuData.url;

        const day = params[0].charAt(0).toUpperCase() + params[0].slice(1);

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
    }

    // Return the response to Slack
    res.end(JSON.stringify(payload));
  }
}


// Handle requests that don't match a recognised service
function defaultHandler(res) {
  res.writeHead(405, 'Method not supported', {'Content-Type':'text/plain'});
  res.end('Sorry: that service isn\'t supported\n');
}


// Parse POST body arguments
function parseArgs(data) {
  const args = {};

  const parts = data.split('&');
  parts.forEach((part, i) => {
    const key = part.split('=')[0];
    const value = part.split('=')[1];
    args[key] = decodeURIComponent(value);
  });

  return args;
}


// The server to run
const server = http.createServer((req, res) => {
  console.log('Received request via ' + req.method);

  // Slack commands are sent via POST
  if (req.method == 'POST') {
    const data = '';

    req.on('data', function(chunk){
      data += chunk.toString();
    });

    req.on('end', function(){
      const args = parseArgs(data);
      
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
    res.writeHead(200, {'Content-Type':'text/plain'});
    res.end('Boo!\n');
  }
});


// Go
server.listen(port, function(){
  console.log('Listening on localhost at port ' + port);
});
