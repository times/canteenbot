const { sendResponse, buildCoreQuery } = require('../helpers');

describe('helpers', () => {
  describe('#sendResponse()', () => {
    it('should call the callback with the correct body and statusCode', () => {
      const callback = jest.fn();
      sendResponse(
        callback,
        {
          foo: 'bar',
        },
        404
      );

      expect(callback).toHaveBeenCalledWith(null, {
        statusCode: 404,
        body: JSON.stringify({ foo: 'bar' }),
      });
    });

    it('should use the default status code if one is not supplied', () => {
      const callback = jest.fn();
      sendResponse(callback, {
        foo: 'baz',
      });

      expect(callback).toHaveBeenCalledWith(null, {
        statusCode: 200,
        body: JSON.stringify({ foo: 'baz' }),
      });
    });
  });

  describe('#buildCoreQuery()', () => {
    it('shoould return a URL with the correct structure', () => {
      expect(
        buildCoreQuery('https://www.example.com/', 'foo', 'bar baz')
      ).toEqual(
        'https://www.example.com/?message_type=foo&message_param=bar%20baz'
      );
    });
  });
});
