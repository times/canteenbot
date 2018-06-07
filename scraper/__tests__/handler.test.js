const mockPutObject = jest.fn((data, callback) => {
  callback();
});
class mockS3 {
  putObject = mockPutObject;
}
jest.mock('aws-sdk', () => ({
  S3: mockS3,
}));
const MockDate = require('mockdate');
const { handler } = require('../handler');

describe('scraper', () => {
  it('should write to S3 with the correct data once for each day', async () => {
    fetch.mockResponse(`
      <html><body>
        <div id="content-wrapper">
          <div class="sqs-block-content">
            <h2>Location</h2>
            <h3>
              <strong>First item</strong>
              <br>
              <strong>Second item</strong>
            </h3>
          </div>
        </body></html>`);

    MockDate.set('2018-06-05');

    const expectedJson = {
      url: 'http://5438cpa251hgt.co.uk/canteen-monday',
      timestamp: 'Tue, 05 Jun 2018 00:00:00 GMT',
      day: 'Monday',
      locations: [
        {
          location: 'Location',
          menu: 'First item second item',
        },
      ],
    };

    await handler();

    expect(mockPutObject).toHaveBeenCalledTimes(9);
    expect(mockPutObject.mock.calls[0][0].Body).toEqual(
      JSON.stringify(expectedJson)
    );
  });
});
