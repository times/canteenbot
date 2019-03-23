const url = require('url');

const canteenUrl = process.env.CANTEEN_URL;

const { mainMenuParser, cafeMenuParser } = require('./parser');

const get = u => fetch(`${u}?format=json`).then(res => res.json());

// Get the json from the canteen website and run it through the parsers.
const getContent = async day => {
  const [mainMenuContent, cafeMenuContent] = await Promise.all([
    get(url.resolve(canteenUrl, `/canteen-${day}`)).then(res => {
      return mainMenuParser(res.mainContent);
    }),
    get(canteenUrl).then(res => {
      const collection = res.collection.collections.find(
        x => x.title === 'Terrace Cafe'
      );
      return collection ? cafeMenuParser(collection.mainContent) : undefined;
    }),
  ]);

  return { mainMenuContent, cafeMenuContent };
};

module.exports = { getContent };
