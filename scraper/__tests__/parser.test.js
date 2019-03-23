const menuFixtures = require('../fixtures/main-menu-html');
const cafeMenuFixtures = require('../fixtures/cafe-menu-html');

const { mainMenuParser, cafeMenuParser } = require('../parser');

describe('parser/index.js', () => {
  describe('mainMenuParser', () => {
    menuFixtures.forEach(fixture => {
      it('should parse the html snippet', () => {
        const actual = mainMenuParser(fixture);

        expect(actual).toMatchSnapshot();
      });
    });
  });

  describe('cafeMenuParser', () => {
    cafeMenuFixtures.forEach(fixture => {
      it('should parse the html snippet', () => {
        const actual = cafeMenuParser(fixture);

        expect(actual).toMatchSnapshot();
      });
    });
  });
});
