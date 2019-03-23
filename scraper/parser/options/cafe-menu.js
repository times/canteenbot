module.exports = {
  // Titles which will form each object. Add titles to this as appropriate.
  SECTIONS: [
    {
      matcher: /^\s*monday\s*$/i,
      displayName: 'monday',
    },
    {
      matcher: /^\s*tuesday\s*$/i,
      displayName: 'tuesday',
    },
    {
      matcher: /^\s*wednesday\s*$/i,
      displayName: 'wednesday',
    },
    {
      matcher: /^\s*thursday\s*$/i,
      displayName: 'thursday',
    },
    {
      matcher: /^\s*friday\s*$/i,
      displayName: 'friday',
    },
  ].map(x => ({ ...x, color: '#3126A2' })),

  // Any lines that match these will be excluded from the contents.
  IGNORE_LIST: [/^SOUP:.+/i],

  // Anything after this matcher (including the matching line itself) will be trimmed from the end.
  END_SECTIONS_MATCHER: null,

  // Matchers to determine if a line is specifying a subsection, e.g. sides, and the name of the subsection.
  SUBSECTION_MATCHERS: [
    [/^\s*breakfast:/i, 'breakfast'],
    [/^\s*lunch:/i, 'lunch'],
  ],
};
