// Clean up bad tags which will break things before we run through cheerio
// e.g. <strong>sides</strong> (see test fixtures).
const sanitiseHtml = html =>
  html.replace(
    /<(\/?)strong>|<(\/?)b>|<noscript>.*<\/noscript>|<br\s*\/?>/g,
    '',
  );

// Formatters are run through in order on each line, [0] is search, [1] is replace value.
const LINE_SANITISERS = [
  // Remove excess spaces around commas
  [/\s+,\s+/g, ', '],
  // Remove the word OR from the start and end of lines (but not if line is only "OR")
  [/(?!^or$)(^or\s+|\s+or$)/gi, ''],
  // Remove excess spaces
  [/\s{2,}/g, ' '],
];

const sanitiseLine = line =>
  LINE_SANITISERS.reduce(
    (acc, [searchValue, replaceValue]) =>
      acc.replace(searchValue, replaceValue),
    line.trim(),
  ).trim();

module.exports = { sanitiseHtml, sanitiseLine };
