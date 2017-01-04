const http = require('http');
const fs = require('fs');

require('dotenv').config();

const helpers = require('../lib/helpers');
const common = require('../lib/common');

// Where to find the menus
const menuDir = process.env.DATA_PATH;


// The server to run
const server = http.createServer((req, res) => {
  console.log(`Received request via ${req.method}`);

  // Requests for data
  if (req.method == 'GET') {
    const parameterString = req.url.split('?')[1];
    const args = helpers.parseArgs(parameterString);
    console.log(args);

    if (!args.message_type || !args.message_param) {
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end('Error: both type and parameter must be provided and valid\n');
    }

    const { MENU, INGREDIENT } = common.messageTypes;
    let data;
    switch (args.message_type) {
      case MENU:
        data = menuHandler(args.message_param);
        break;
      case INGREDIENT:
        data = ingredientHandler(args.message_param);
        break;
      default:
        data = errorHandler(args.message_type, args.message_param);
        break;
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data));
  }
  
  // If we receive something not via GET
  else { 
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Error: invalid HTTP method\n');
  }
});


// Go
server.listen(process.env.SERVER_PORT, () => console.log(`Listening on localhost at port ${process.env.SERVER_PORT}`));


/*
 * Handle menu requests - returns menu data for the given day
 */
const menuHandler = menu => {
  console.log('requested menu for ' + menu);

  // First validate the requested menu
  if (!common.menuTypes.includes(menu)) return { error: `Invalid menu type ${menu}` };

  // Try to read the menu file
  let menuData;
  try {
    menuData = helpers.readJsonFile(menuDir, menu);
  } catch (err) {
    return { error: `Couldn't read menu file for "${menu}"` };
  }

  console.log(menuData);

  return menuData;
};


/*
 * Handle ingredient requests - returns a list of days on which a given ingredient is available
 */
const ingredientHandler = ingredient => {
  console.log('requested ingredient ' + ingredient);

  // Try to read the menu files
  let files;
  try {
    files =
      fs.readdirSync(__dirname + '/' + menuDir)
        // Only look at the JSON files
        .filter(f => helpers.endsWithJson)
        // Read the actual file data
        .map(helpers.readJsonFile.bind(null, menuDir));
  } catch (err) {
    return { error: `Couldn't read menu file: ${err}` };
  }

  const strContainsIngredient = str => str.toLowerCase().includes(ingredient);
  const hasIngredient = ({menu, location}) => strContainsIngredient(menu) || strContainsIngredient(location);

  // Check the menu data in each day's file to see if it contains the ingredient
  const daysWithIngredient =
    files
      .reduce((days, menu) => {
        const ingredientOnMenu = menu.locations.some(hasIngredient);
        return (ingredientOnMenu) ? [...days, menu.day] : days;
      }, [])
      // Filter out duplicate days
      .filter((day, i, arr) => arr.indexOf(day) === i);

  console.log(daysWithIngredient);

  return {
    data: daysWithIngredient
  };
};


/*
 * Handle invalid requests
 */
const errorHandler = (type, param) => {
  const errorMsg = `Received message of type ${type} with parameter ${param}`;
  console.log('Error: ' + errorMsg);
  return {
    error: errorMsg
  };
}
