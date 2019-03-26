module.exports = {
  // Titles which will form each object. Add titles to this as appropriate.
  SECTIONS: [
    {
      matcher: /^\s*FROM\s+THE\s+OVEN\s*$/i,
      displayName: 'From the Oven',
      color: '#C41017',
    },
    {
      matcher: /^\s*CHEF(\\u2019|\\u2018|\\u201B|\\u2032|'|’|`|‘)?S\s+THEATRE\s*$/i,
      displayName: 'Chefs Theatre',
      color: '#00BFFF',
    },
    {
      matcher: /^\s*SOUP\s*$/i,
      displayName: 'Soup',
      color: '#e6e600',
    },
    {
      matcher: /^\s*TERRACE CAFE\s*$/i,
      displayName: 'Terrace Cafe',
      color: '#380c87',
    },
    {
      matcher: /^\s*HEALTHY\s+BAR\s*$/i,
      displayName: 'Healthy Bar',
      color: '#007404',
    },
    {
      matcher: /^\s*HEALTHY\s+STATION\s*$/i,
      displayName: 'Healthy Station',
      color: '#007404',
    },
  ],

  // Any lines that match these will be excluded from the contents.
  IGNORE_LIST: [/CANTEEN\s+LUNCH/i],

  // Anything after this matcher (including the matching line itself) will be trimmed from the end.
  END_SECTIONS_MATCHER: /CANTEEN\s+DINNER/i,

  // Matchers to determine if a line is specifying a subsection, e.g. sides, and the name of the subsection.
  SUBSECTION_MATCHERS: [[/^\s*SIDE(S)?:/i, 'sides']],
};
