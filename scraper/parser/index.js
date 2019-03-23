const cheerio = require('cheerio');

const { sanitiseHtml, sanitiseLine } = require('./sanitiser');

const mainMenuOptions = require('./options/main-menu');
const cafeMenuOptions = require('./options/cafe-menu');

const push = (obj, key, data) => {
  if (!obj[key]) {
    // eslint-disable-next-line no-param-reassign
    obj[key] = [data];
  } else {
    obj[key].push(data);
  }
};

const getSubsection = (SUBSECTION_MATCHERS, line) =>
  SUBSECTION_MATCHERS.find(([matcher]) => matcher.test(line));

const createParser = ({
  SECTIONS,
  IGNORE_LIST,
  END_SECTIONS_MATCHER,
  SUBSECTION_MATCHERS = [],
}) => {
  // Util for checking if text matches against an entry in the ignore list.
  const isIgnored = txt => IGNORE_LIST.some(matcher => matcher.test(txt));

  // Either create a section object based on the line being an expected title,
  // or return null (i.e. if a content line).
  const createSection = line => {
    const SECTION = SECTIONS.find(({ matcher }) => matcher.test(line));
    return SECTION
      ? { title: SECTION.displayName, subsections: {}, color: SECTION.color }
      : null;
  };

  // Create a new section from existing one - this is when we have two meal options under one
  // section heading, e.g. two choices "From the Oven" with their own respective sides e.t.c.
  const duplicateSection = ({ title, color }) => ({
    title,
    subsections: {},
    color,
  });

  // Take the html string and return an array of strings (the menu lines).
  const getContents = menuHtml => {
    const $ = cheerio.load(sanitiseHtml(menuHtml));
    const arr = [];
    $('*').each((i, element) => {
      // Go through each element, if it has no children (i.e. only text)...
      const el = $(element);

      if (!el.children().length) {
        // Get the text, trim it and make it lowercase.
        // If not empty and is not in ignore list then keep it.
        const txt = el.text().trim();
        if (txt !== '' && !isIgnored(txt)) {
          arr.push(txt);
        }
      }
    });

    // Look for our terminator section matcher, we exclude that line and everything after it.
    const finalIndex = END_SECTIONS_MATCHER
      ? arr.findIndex(txt => END_SECTIONS_MATCHER.test(txt))
      : undefined;

    return arr.slice(0, finalIndex === -1 ? undefined : finalIndex);
  };

  const parse = menuHtml =>
    getContents(menuHtml).reduce((acc, line, i, lines) => {
      const newSection = createSection(line);
      const currentSection = acc[acc.length - 1];
      const lineIsAnOrBreak = line.toLowerCase() === 'or';

      if (newSection) {
        // We've hit a section title so add the new section to the list.
        acc.push(newSection);
      } else if (
        currentSection &&
        lineIsAnOrBreak &&
        getSubsection(SUBSECTION_MATCHERS, lines[i - 1])
      ) {
        // We've hit a duplicate section.
        // (i.e. prev line is "SIDES: xyz" and current line is "or"; two "From the Oven" options for example).
        acc.push(duplicateSection(currentSection));
      } else if (currentSection && !lineIsAnOrBreak) {
        // We're not on a section title, so we're dealing with the section content.
        // If we don't have a section then just ignore and continue.
        const subsection = getSubsection(SUBSECTION_MATCHERS, line);
        if (subsection) {
          const [subsectionMatcher, subsectionName] = subsection;
          // Subsection line, strip the matcher and store.
          push(
            currentSection.subsections,
            subsectionName,
            sanitiseLine(line.replace(subsectionMatcher, ''))
          );
        } else {
          // Append the line to the current section body.
          push(currentSection, 'body', sanitiseLine(line));
        }
      }
      return acc;
    }, []);

  return parse;
};

module.exports = {
  mainMenuParser: createParser(mainMenuOptions),
  cafeMenuParser: createParser(cafeMenuOptions),
};
