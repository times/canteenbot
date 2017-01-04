const fs = require('fs');


/*
 * Parse a string containing POST body arguments into an object of key-value pairs
 */
const parseArgs = data =>
  data
    .split('&')
    .reduce((args, pairString) => {
      const splitString = pairString.split('=');
      const key = splitString[0];
      const value = splitString[1];
      return Object.assign({}, args, {[key]: decodeURIComponent(value)});
    }, {});


/*
 * Return true if the given string ends with '.json'
 */
const endsWithJson = str =>
  str.indexOf('.json', str.length - '.json'.length) !== -1;


/*
 * Attempt to read and parse a JSON file, and return the data
 */
const readJsonFile = path => fileName => {
  const partialPath = `${__dirname}/${path}${fileName}`;
  const fullPath = (endsWithJson(partialPath)) ? partialPath : partialPath + '.json';

  // Try to read the file
  let file;
  try {
    file = fs.readFileSync(fullPath, {
      encoding: 'utf8'
    });
  }
  catch (err) {
    console.log(`Error reading JSON file at "${fullPath}"`);
    console.log(err);
    throw err;
  }

  // Try to parse the file as JSON
  let data;
  try {
    data = JSON.parse(file);
  }
  catch (err) {
    console.log(`Error parsing JSON file at "${fullPath}"`);
    console.log(err);
    throw err;
  }

  // Return successful data
  return data;
};


/*
 * Given a list of days of the week, sort it (and introduce proper capitalisation)
 */
const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const orderDaysOfWeek = list =>
  list
    .map(l => l.toLowerCase())
    .sort((a, b) => days.indexOf(a) > days.indexOf(b))
    .map(l => l.charAt(0).toUpperCase() + l.substr(1));


// Exports
module.exports = {
  parseArgs,
  endsWithJson,
  readJsonFile,
  orderDaysOfWeek
};
