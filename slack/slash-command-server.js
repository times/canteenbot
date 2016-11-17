var http = require('http');
var fs = require('fs');
var port = 8080;

var envData = require('../env.json');

// Given a list of days of the week, sort it
function sortDaysOfWeek(list) {
  var days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  return list.map(function(l){
    return l.toLowerCase();
  }).sort(function(a, b){
    return days.indexOf(a) > days.indexOf(b);
  }).map(function(l){
    return l.charAt(0).toUpperCase() + l.substr(1);
  });
}


// Handle CanteenBot requests
function canteenHandler(args, res) {
  
  // Where to find the menus
  var menuDir = envData.dataPathDev;

  // Valid parameters
  var recognisedParams = ['', 'today', 'tomorrow', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday', 'ingredient', 'help'];

  // First check this request came from the Times Slack channel
  var teams = envData.registeredTeams;

  if (!teams.includes(args.token)) {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Invalid token');
  }

  // Now look at the parameter the user supplied
  var params = args.text.split('+').map(function(a){
    return a.toLowerCase();
  });

  // If we don't recognise the parameter, return an error
  if (recognisedParams.indexOf(params[0]) === -1) {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Sorry: I didn\'t recognise the command "' + params[0] + '"');
  }
  // If we do recognise it...
  else {
    // We'll be returning JSON
    res.writeHead(200, { 'Content-Type': 'application/json' });

    var payload = {
      'text': '',
      'attachments': []
    }

    switch (params[0]) {
      // For help requests, return a list of valid parameters
      case 'help':
        payload.text = '*Hungry? Type* `/canteen` *, optionally followed by one of these commands, to see what’s on offer:*';
        recognisedParams.forEach(function(p){
          payload.text += '\n' + p;
        });
        break;

      // For ingredient requests, return a list of days where that ingredient is on the menu
      case 'ingredient':
        // If the user passed an ingredient to check
        if (params[1]) {

          var ingredient = params[1];

          // Try to read the menu files
          try {
            var daysToReturn = new Set();

            var files = fs.readdirSync(menuDir);

            // Only look at the JSON files
            files.filter(function(f){
              return f.indexOf('.json', f.length - '.json'.length) !== -1;
            })
            // Check the menu data in each day's file to see if it contains the ingredient
            .forEach(function(f){
              var menuData = require(menuDir + f);

              menuData.locations.forEach(function(l){
                if (l.menu.toLowerCase().indexOf(ingredient) > -1) {
                  daysToReturn.add(menuData.day); // Keep track of days that do contain the ingredient
                }
              });
            });

            // Clear the require cache
            Object.keys(require.cache).forEach(function(key) {
              delete require.cache[key];
            });

            daysToReturn = sortDaysOfWeek(Array.from(daysToReturn));

            if (daysToReturn.length === 0) {
              payload.text = 'Sorry, I couldn’t find "' + ingredient + '" in the menu this week';
            } else {
              var daysText = daysToReturn.reduce(function(str, d, i, arr){
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
          var menuData = require(menuDir + params[0] + '.json');
          Object.keys(require.cache).forEach(function(key) {
            delete require.cache[key];
          }); 
        } catch (err) {
          console.log('Error reading file ' + params[0] + ' from ' + menuDir);
          console.log(err);
          return;
        }

        // Structure the response text and attachments
        var menuText = '';
        menuData.locations.forEach(function(loc, i) {
          menuText += '*' + loc.location + '*\n';
          menuText += loc.menu + '\n';
        });

        var menuUrl = menuData.url;

        var day = params[0].charAt(0).toUpperCase() + params[0].slice(1);

        var attachments = [{
          'fallback': day + '\'s menu',
          'color': 'good',
          'title': day + '\'s menu',
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
  var args = {}

  var parts = data.split('&');
  parts.forEach(function(part, i){
    var key = part.split('=')[0];
    var value = part.split('=')[1];
    args[key] = decodeURIComponent(value);
  });

  return args;
}


// The server to run
var server = http.createServer(function(req, res){
  console.log('Received request via ' + req.method);

  // Slack commands are sent via POST
  if (req.method == 'POST') {
    var data = '';

    req.on('data', function(chunk){
      data += chunk.toString();
    });

    req.on('end', function(){
      var args = parseArgs(data);
      
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
