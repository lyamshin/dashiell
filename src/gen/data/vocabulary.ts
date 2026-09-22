/**
 * Every capitalized word the corpus may print that is not the name of a
 * person in the case.
 *
 * The correspondence checker (M5 §3) treats a capitalized token as a claim
 * that somebody exists. Most of them are the first word of a sentence, and a
 * few are the proper nouns the period furniture is made of — a street, a
 * theatre, a typewriter, a wood in France. Everything else has to be a person
 * in the case, a mention the case invented, or a place that was dealt.
 *
 * This list is closed on purpose. A new template that puts a new proper noun
 * on the page fails the checker until the noun is added here or made into a
 * mention, which is the whole point: a name nobody can trace is a bug.
 */
export const KNOWN_WORDS: Set<string> = new Set([
  /* Sentence openers and ordinary words that start sentences. */
  'A', 'About', 'Above', 'According', 'Across', 'After', 'Against', 'All',
  'Almost', 'Along', 'Already', 'Also', 'Although', 'An', 'And', 'Another',
  'Any', 'Anybody', 'Anything', 'Around', 'As', 'Asked', 'At', 'Away',
  'Back', 'Because', 'Before', 'Behind', 'Below', 'Beside', 'Betting',
  'Between', 'Both', 'Business', 'But', 'By',
  'Cash', 'Chloral', 'Come', 'Confirmed', 'Could',
  'Death', 'Down', 'During',
  'Each', 'Eight', 'El', 'Eighteen', 'Either', 'Eleven', 'Enough', 'Even', 'Every',
  'Everybody', 'Everyone', 'Everything',
  'Few', 'Fifteen', 'Five', 'For', 'Forty', 'Found', 'Four', 'Fractures',
  'From',
  'Half', 'He', 'Her', 'Here', 'His', 'How', 'However',
  'I', 'If', 'In', 'Inside', 'Into', 'It', 'Its',
  'Just',
  'Ledger', 'Left', 'Like', 'Little',
  'Many', 'Marks', 'May', 'More', 'Most', 'Much', 'My',
  'Near', 'Neither', 'Never', 'Nine', 'No', 'Nobody', 'None', 'Not',
  'Nothing', 'Now',
  'Of', 'Off', 'On', 'Once', 'One', 'Only', 'Or', 'Other', 'Out', 'Outside',
  'Over',
  'Past', 'Perhaps', 'Plenty', 'Powder',
  'Rows', 'Rent',
  'Seven', 'She', 'Since', 'Six', 'So', 'Some', 'Somebody', 'Someone',
  'Something', 'Sometimes', 'Start', 'Still', 'Such',
  'Ten', 'That', 'The', 'Their', 'Them', 'Then', 'There', 'These', 'They',
  'Third', 'Thirty', 'This', 'Those', 'Three', 'Through', 'Till', 'Time',
  'To', 'Together', 'Too', 'Twelve', 'Twenty', 'Two', 'Under', 'Until',
  'Up', 'Upon', 'Us',
  'Very',
  'Was', 'We', 'Wedged', 'What', 'When', 'Where', 'Whether', 'Which', 'While',
  'Who', 'Whoever', 'Whose', 'Why', 'With', 'Within', 'Without', 'Wrapping',

  /* Days, which the corpus names. */
  'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday',
  'Sunday', 'Mondays', 'Tuesdays', 'Wednesdays', 'Thursdays', 'Fridays',
  'Saturdays', 'Sundays',

  /* Months. */
  'January', 'February', 'March', 'April', 'June', 'July', 'August',
  'September', 'October', 'November', 'December',

  /* Titles and abbreviations. */
  'Mr', 'Mrs', 'Miss', 'St', 'Dr',

  /* The furniture: streets, houses and makes the period is built out of. */
  'Albany', 'Army', 'Avenue', 'Belleau', 'Canal', 'Christmas', 'Easter',
  'Eighth', 'Elizabeth', 'Exchange', 'Flushing', 'Hill', 'Murray', 'Nassau',
  'Newark', 'Ninth', 'Selwyn', 'Street', 'Underwood', 'Wood',

  /* The clock. */
  'AM', 'PM',
]);
