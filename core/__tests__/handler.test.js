jest.mock('../../lib/helpers');
const { handler } = require('../handler');
const helpers = require('../../lib/helpers');
const { messageTypes, menuTypes } = require('../../lib/common');

describe('handler', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    fetch.resetMocks();
  });

  it('should trigger an error if a non-GET HTTP method is used', () => {
    helpers.sendResponse.mockImplementation = () => {};

    const callback = () => {};
    handler(
      {
        httpMethod: 'POST',
      },
      {},
      callback
    );

    expect(helpers.sendResponse).toHaveBeenCalledWith(
      callback,
      { error: 'Invalid HTTP method. Method should be GET.' },
      405
    );
  });

  it('should trigger an error if no arguments are supplied in the event', () => {
    helpers.sendResponse.mockImplementation = () => {};

    const callback = () => {};
    handler(
      {
        httpMethod: 'GET',
        queryStringParameters: null,
      },
      {},
      callback
    );

    expect(helpers.sendResponse).toHaveBeenCalledWith(
      callback,
      { error: 'No arguments provided.' },
      400
    );
  });

  it('should trigger an error if the required arguments are not supplied in the event', () => {
    helpers.sendResponse.mockImplementation = () => {};

    const callback = () => {};
    handler(
      {
        httpMethod: 'GET',
        queryStringParameters: {
          not: 'valid',
        },
      },
      {},
      callback
    );

    expect(helpers.sendResponse).toHaveBeenCalledWith(
      callback,
      { error: 'Both message_type and message_param must be provided.' },
      400
    );
  });

  it('should trigger an error if an invalid message type is supplied', () => {
    helpers.sendResponse.mockImplementation = () => {};

    const callback = () => {};
    handler(
      {
        httpMethod: 'GET',
        queryStringParameters: {
          message_type: 'invalid-type',
          message_param: {},
        },
      },
      {},
      callback
    );

    expect(helpers.sendResponse).toHaveBeenCalledWith(
      callback,
      { error: 'Invalid message_type invalid-type.' },
      400
    );
  });

  it('should trigger an error if an invalid menu message type is supplied', () => {
    helpers.sendResponse.mockImplementation = () => {};

    const callback = () => {};
    handler(
      {
        httpMethod: 'GET',
        queryStringParameters: {
          message_type: messageTypes.MENU,
          message_param: 'invalid-menu-type',
        },
      },
      {},
      callback
    );

    expect(helpers.sendResponse).toHaveBeenCalledWith(
      callback,
      { error: 'Invalid menu type invalid-menu-type.' },
      400
    );
  });

  it('should trigger an error if an the menu fetch fails', async () => {
    helpers.sendResponse.mockImplementation = () => {};

    fetch.mockReject(new Error('Some error message'));

    const callback = () => {};
    await handler(
      {
        httpMethod: 'GET',
        queryStringParameters: {
          message_type: messageTypes.MENU,
          message_param: menuTypes[0],
        },
      },
      {},
      callback
    );

    expect(helpers.sendResponse).toHaveBeenCalledWith(callback, {
      data: `Couldn't read menu file for "${menuTypes[0]}"`,
    });
  });

  it('should trigger the menu handler if the MENU message type is passed', async () => {
    helpers.sendResponse.mockImplementation = () => {};

    const callback = () => {};
    fetch.mockResponse(
      JSON.stringify({
        day: 'tuesday',
        locations: [
          {
            menu: 'Beef burgers',
            location: 'Main',
          },
        ],
      })
    );
    await handler(
      {
        httpMethod: 'GET',
        queryStringParameters: {
          message_type: messageTypes.MENU,
          message_param: menuTypes[0],
        },
      },
      {},
      callback
    );

    expect(helpers.sendResponse).toHaveBeenCalledWith(callback, {
      data: {
        day: 'tuesday',
        locations: [{ location: 'Main', menu: 'Beef burgers' }],
      },
    });
  });

  it('should trigger an error if an ingredient fetch fails', async () => {
    helpers.sendResponse.mockImplementation = () => {};

    const error = new Error('Some error message');
    fetch.mockReject(error);

    const callback = () => {};
    await handler(
      {
        httpMethod: 'GET',
        queryStringParameters: {
          message_type: messageTypes.INGREDIENT,
          message_param: 'beef',
        },
      },
      {},
      callback
    );

    expect(helpers.sendResponse).toHaveBeenCalledWith(
      callback,
      {
        error,
      },
      400
    );
  });

  it('should trigger the ingredient handler if the INGREDIENT message type is passed', async () => {
    helpers.sendResponse.mockImplementation = () => {};
    fetch.mockResponse(
      JSON.stringify({
        day: 'tuesday',
        locations: [
          { location: 'The beef station', menu: 'Also contains cow' },
        ],
      })
    );
    const callback = () => {};
    await handler(
      {
        httpMethod: 'GET',
        queryStringParameters: {
          message_type: messageTypes.INGREDIENT,
          message_param: 'beef',
        },
      },
      {},
      callback
    );

    expect(helpers.sendResponse).toHaveBeenCalledWith(callback, {
      data: [
        'tuesday',
        'tuesday',
        'tuesday',
        'tuesday',
        'tuesday',
        'tuesday',
        'tuesday',
      ],
    });
  });
});
