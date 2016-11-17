var request = require('request');

var menuUrl = 'http://elliotdavies.co.uk/dev/menu/today.json';

request(menuUrl, function (error, response, body) {
  if (!error && response.statusCode == 200) {
    
    var menuData = JSON.parse(body);

    // Create speech output
    var speechOutput = "Here's the menu for today: ";
    menuData.locations.forEach(function(option) {
      speechOutput += 'For the ' + option.location + ' option, there is ';
      speechOutput += option.menu + '. ';
    });

    var cardOutput = "";
    menuData.locations.forEach(function(option) {
      cardOutput += option.location + ': ';
      cardOutput += option.menu + '. ';
    });

    console.log(speechOutput);
    console.log('---');
    console.log(cardOutput);

    // that.emit(':tellWithCard', speechOutput, SKILL_NAME, cardOutput);
  } else {
    // that.emit(':tellWithCard', 'Sorry, there was a problem retrieving the menu.', SKILL_NAME, '');
  }
});
