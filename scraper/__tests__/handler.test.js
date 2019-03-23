const menuFixtures = require('../fixtures/main-menu-html');
const cafeMenuFixtures = require('../fixtures/cafe-menu-html');

const mockPutObject = jest.fn((data, callback) => {
  callback();
});

class mockS3 {
  putObject(...args) {
    return mockPutObject(...args);
  }
}

jest.mock('aws-sdk', () => ({
  S3: mockS3,
}));

const MockDate = require('mockdate');
const { handler } = require('../handler');

const flatten = arr =>
  arr.reduce((acc, a) => {
    if (Array.isArray(a)) return [...acc, ...a];

    return [...acc, a];
  }, []);

describe('scraper', () => {
  it('should write to S3 with the correct data once for each day', async () => {
    const responses = [
      [
        JSON.stringify({
          mainContent: menuFixtures[0],
        }),
        { status: 200 },
      ],
      [
        JSON.stringify({
          collection: {
            collections: [
              {
                title: 'Terrace Cafe',
                mainContent: cafeMenuFixtures[0],
              },
            ],
          },
        }),
        { status: 200 },
      ],
    ];

    fetch.mockResponses(
      ...flatten(new Array(7).fill(null).map(() => responses))
    );

    MockDate.set('2018-06-05');

    const expectedJson = {
      timestamp: 'Tue, 05 Jun 2018 00:00:00 GMT',
      day: 'Monday',
      mainMenuContent: [
        {
          title: 'From the Oven',
          subsections: {
            sides: [
              'SMASHED SWEDE, BRAISED RED CABBAGE, PICKLED VEG SALAD OR GLAZED PAK CHOY',
            ],
          },
          color: '#C41017',
          body: [
            'CRISPY PORK BELLY STRIP WITH CIDER GRAVY',
            'SALMON & TOFU ZEN BOWL',
          ],
        },
        {
          title: 'Chefs Theatre',
          subsections: { sides: ['GREEN BEAN WITH SESAME AND CHARD BROCCOLI'] },
          color: '#00BFFF',
          body: [
            'SOFT TACO FILLED WITH COURGETTE CORN OR CHICKEN MOLE WITH RICE VERDE',
          ],
        },
        {
          title: 'Soup',
          subsections: {},
          color: '#e6e600',
          body: ['CARROT & CORIANDER', 'CHICKEN, SWEET POTATO & COCONUT'],
        },
      ],
      cafeMenuContent: [
        {
          title: 'monday',
          subsections: {
            breakfast: ['Virgin Radio Bap Give Away'],
            lunch: ['Open club sandwich'],
          },
          color: '#3126A2',
        },
        {
          title: 'tuesday',
          subsections: {
            breakfast: ['Poached egg Florentine'],
            lunch: ['Baked chorizo hens egg, garlic bread and salad'],
          },
          color: '#3126A2',
        },
        {
          title: 'wednesday',
          subsections: {
            breakfast: ['Smoked bacon frittata'],
            lunch: ['Roasted aubergine and Parma ham on focaccia'],
          },
          color: '#3126A2',
        },
        {
          title: 'thursday',
          subsections: {
            breakfast: ['Baked Smoked haddock Arnold Bennett'],
            lunch: [
              'Harissa salmon, roasted chick peas lemon yoghurt on khobez',
            ],
          },
          color: '#3126A2',
        },
        {
          title: 'friday',
          subsections: {
            breakfast: ['Smashed avocado, chilli and tomato on sourdough'],
            lunch: ['Loaded wedges'],
          },
          color: '#3126A2',
        },
      ],
    };

    await handler({}, {}, () => {});

    expect(mockPutObject).toHaveBeenCalledTimes(9);
    expect(mockPutObject.mock.calls[0][0].Body).toEqual(
      JSON.stringify(expectedJson)
    );
  });
});
