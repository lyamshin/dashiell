import type { FixtureRole, Id, PlaceKind } from '../types.js';

/**
 * The place deck. Six cards are dealt per case and there is no adjacency
 * between them: anybody can be anywhere, and moving costs a simulated
 * character nothing. What matters about a place is whether somebody is posted
 * there who sees everyone, and what the place can host.
 *
 * `murderMethods` empty means the place is never a scene. A place can only
 * host a secret, or carry an anchor, if it says so.
 */
export interface PlaceTemplate {
  id: Id;
  name: string;
  kind: PlaceKind;
  /** Posted here and sees everyone. Absent means unwatched. */
  watcher?: FixtureRole;
  /** Methods that can happen here. Empty means never a scene. */
  murderMethods: Id[];
  /** Candidate evidence objects. */
  objects: Id[];
  /** Which secret activities can take place here. */
  secretsHosted: string[];
  /** Which anchors can attach here. */
  anchorsHosted: Id[];
  /** The victim's own address. Exactly one of these is drawn per case. */
  isResidence?: boolean;
}

export const PLACE_TEMPLATES: PlaceTemplate[] = [
  /* ---------------------------------------------------- the victim's address */
  {
    id: 'res-apartment',
    name: 'the victim’s apartment on the fourth floor',
    kind: 'private',
    murderMethods: ['poison', 'blunt', 'strangle', 'shot', 'stab'],
    objects: ['obj-revolver', 'obj-bookend', 'obj-cord', 'obj-chloral', 'obj-cashbox', 'obj-photograph'],
    secretsHosted: ['embezzling', 'blackmail'],
    anchorsHosted: ['fuse', 'dumbwaiter', 'piano-lesson', 'drunk-singing'],
    isResidence: true,
  },
  {
    id: 'res-brownstone',
    name: 'the victim’s rooms in the brownstone',
    kind: 'private',
    murderMethods: ['poison', 'blunt', 'strangle', 'shot', 'stab'],
    objects: ['obj-bookend', 'obj-chloral', 'obj-cord', 'obj-photograph', 'obj-telephone'],
    secretsHosted: ['embezzling', 'blackmail', 'affair'],
    anchorsHosted: ['fuse', 'piano-lesson', 'drunk-singing'],
    isResidence: true,
  },
  {
    id: 'res-walkup',
    name: 'the victim’s walk-up over the drugstore',
    kind: 'private',
    murderMethods: ['poison', 'blunt', 'strangle', 'shot', 'stab'],
    objects: ['obj-cord', 'obj-bookend', 'obj-chloral', 'obj-hatbox', 'obj-suitcase'],
    secretsHosted: ['embezzling', 'blackmail', 'hidden-family'],
    anchorsHosted: ['dumbwaiter', 'piano-lesson', 'fuse'],
    isResidence: true,
  },
  {
    id: 'res-suite',
    name: 'the victim’s suite at the residential hotel',
    kind: 'private',
    murderMethods: ['poison', 'blunt', 'strangle', 'shot', 'stab'],
    objects: ['obj-revolver', 'obj-chloral', 'obj-ledger', 'obj-cigarette-case', 'obj-overcoat'],
    secretsHosted: ['embezzling', 'blackmail', 'affair'],
    anchorsHosted: ['fuse', 'dumbwaiter', 'drunk-singing'],
    isResidence: true,
  },
  {
    id: 'res-backhouse',
    name: 'the victim’s house on the back lot',
    kind: 'private',
    murderMethods: ['poison', 'blunt', 'strangle', 'shot', 'stab', 'fall'],
    objects: ['obj-cord', 'obj-toolbox', 'obj-bookend', 'obj-roofkey', 'obj-photograph'],
    secretsHosted: ['embezzling', 'blackmail', 'hidden-family'],
    anchorsHosted: ['drunk-singing', 'fuse', 'piano-lesson'],
    isResidence: true,
  },

  /* ------------------------------------------------- private, not the address */
  {
    id: 'rooftop',
    name: 'the roof over the Dover',
    kind: 'private',
    murderMethods: ['fall', 'blunt', 'strangle', 'shot'],
    objects: ['obj-roofkey', 'obj-flowerpot', 'obj-cord'],
    secretsHosted: ['affair', 'secret-drinking', 'dope'],
    anchorsHosted: ['drunk-singing'],
  },
  {
    id: 'back-alley',
    name: 'the alley behind the delicatessen',
    kind: 'private',
    murderMethods: ['blunt', 'strangle', 'shot', 'stab'],
    objects: ['obj-icepick', 'obj-cord', 'obj-mop-bucket'],
    secretsHosted: ['fence', 'gambling-debt', 'dope'],
    anchorsHosted: ['drunk-singing'],
  },
  {
    id: 'office-over-tailor',
    name: 'the office over the tailor’s shop',
    kind: 'private',
    murderMethods: ['poison', 'blunt', 'strangle', 'shot', 'stab'],
    objects: ['obj-typewriter', 'obj-ledger', 'obj-bookend', 'obj-revolver', 'obj-cashbox'],
    secretsHosted: ['embezzling', 'blackmail', 'affair', 'union-organizing'],
    anchorsHosted: ['fuse', 'piano-lesson', 'dumbwaiter'],
  },
  {
    id: 'pier-shed',
    name: 'Pier 46, under the shed',
    kind: 'private',
    murderMethods: ['blunt', 'strangle', 'shot', 'stab', 'fall'],
    objects: ['obj-cord', 'obj-icepick', 'obj-toolbox'],
    secretsHosted: ['fence', 'union-organizing', 'dope'],
    anchorsHosted: ['drunk-singing'],
  },
  {
    id: 'laundry-yard',
    name: 'the drying yard behind the laundry',
    kind: 'private',
    murderMethods: ['blunt', 'strangle', 'stab'],
    objects: ['obj-cord', 'obj-mop-bucket', 'obj-icepick'],
    secretsHosted: ['fence', 'hidden-family', 'dope'],
    anchorsHosted: ['drunk-singing', 'dumbwaiter'],
  },
  {
    id: 'walkup-flat',
    name: 'the third-floor walk-up on Ninth',
    kind: 'private',
    watcher: 'landlady',
    murderMethods: ['poison', 'blunt', 'strangle', 'shot', 'stab'],
    objects: ['obj-roofkey', 'obj-cord', 'obj-bookend', 'obj-chloral', 'obj-hatbox'],
    secretsHosted: ['affair', 'hidden-family', 'embezzling'],
    anchorsHosted: ['piano-lesson', 'dumbwaiter', 'fuse'],
  },
  {
    id: 'hallam-vestibule',
    name: 'the vestibule of the Hallam apartments',
    kind: 'private',
    watcher: 'elevator-man',
    murderMethods: [],
    objects: ['obj-roofkey', 'obj-revolver', 'obj-umbrella', 'obj-ledger', 'obj-overcoat'],
    secretsHosted: ['affair', 'blackmail'],
    anchorsHosted: ['fuse', 'last-edition', 'dumbwaiter'],
  },
  {
    id: 'rooming-house-room',
    name: 'the back room at Mrs. Teague’s',
    kind: 'private',
    watcher: 'landlady',
    murderMethods: ['poison', 'blunt', 'strangle', 'stab'],
    objects: ['obj-roofkey', 'obj-bookend', 'obj-photograph', 'obj-cord', 'obj-suitcase'],
    secretsHosted: ['affair', 'secret-drinking', 'hidden-family'],
    anchorsHosted: ['piano-lesson', 'dumbwaiter', 'drunk-singing'],
  },

  /* ------------------------------------------------------- watched, in public */
  {
    id: 'dolans-bar',
    name: 'Dolan’s Bar',
    kind: 'semi',
    watcher: 'bartender',
    murderMethods: [],
    objects: ['obj-chloral', 'obj-icepick', 'obj-seltzer', 'obj-cigarette-case'],
    secretsHosted: ['secret-drinking', 'fence', 'gambling-debt'],
    anchorsHosted: ['bar-radio', 'regular-stool', 'drunk-singing', 'ice-delivery'],
  },
  {
    id: 'speakeasy',
    name: 'the speakeasy under the hat shop',
    kind: 'semi',
    watcher: 'bartender',
    murderMethods: [],
    objects: ['obj-chloral', 'obj-seltzer', 'obj-revolver', 'obj-cigarette-case'],
    secretsHosted: ['secret-drinking', 'gambling-debt', 'fence'],
    anchorsHosted: ['bar-radio', 'regular-stool', 'drunk-singing'],
  },
  {
    id: 'hotel-lobby',
    name: 'the lobby of the Wyckoff',
    kind: 'semi',
    watcher: 'doorman',
    murderMethods: [],
    objects: ['obj-roofkey', 'obj-revolver', 'obj-bookend', 'obj-ledger', 'obj-umbrella', 'obj-overcoat'],
    secretsHosted: ['blackmail', 'affair'],
    anchorsHosted: ['last-edition', 'theater-out', 'regular-stool', 'fuse'],
  },
  {
    id: 'corner-newsstand',
    name: 'the newsstand on the corner',
    kind: 'public',
    watcher: 'newsstand',
    murderMethods: [],
    objects: ['obj-roofkey', 'obj-newspapers', 'obj-pawn-ticket', 'obj-timetable'],
    secretsHosted: ['gambling-debt', 'fence'],
    anchorsHosted: ['last-edition', 'regular-stool', 'ice-delivery'],
  },
  {
    id: 'automat',
    name: 'the Automat on the corner',
    kind: 'public',
    watcher: 'counterman',
    murderMethods: [],
    objects: ['obj-chloral', 'obj-icepick', 'obj-newspapers'],
    secretsHosted: ['affair', 'hidden-family', 'gambling-debt'],
    anchorsHosted: ['regular-stool', 'theater-out', 'last-edition', 'ice-delivery'],
  },
  {
    id: 'movie-house',
    name: 'the Bijou picture house',
    kind: 'public',
    watcher: 'ticket-taker',
    murderMethods: [],
    objects: ['obj-cord', 'obj-cigarette-case', 'obj-ashtray'],
    secretsHosted: ['affair', 'secret-drinking', 'dope'],
    anchorsHosted: ['theater-out', 'last-edition'],
  },
  {
    id: 'dance-hall',
    name: 'the Arcadia dance hall',
    kind: 'public',
    watcher: 'ticket-taker',
    murderMethods: [],
    objects: ['obj-cigarette-case', 'obj-chloral', 'obj-ashtray'],
    secretsHosted: ['affair', 'secret-drinking', 'dope'],
    anchorsHosted: ['theater-out', 'bar-radio', 'ice-delivery'],
  },
  {
    id: 'drugstore',
    name: 'Kaplan’s drugstore with the soda fountain',
    kind: 'public',
    watcher: 'druggist',
    murderMethods: [],
    objects: ['obj-chloral', 'obj-icepick', 'obj-telephone'],
    secretsHosted: ['dope', 'gambling-debt', 'hidden-family'],
    anchorsHosted: ['regular-stool', 'last-edition', 'ice-delivery'],
  },
  {
    id: 'cab-stand',
    name: 'the cab stand outside the Hippodrome',
    kind: 'public',
    watcher: 'cabbie',
    murderMethods: [],
    objects: ['obj-revolver', 'obj-timetable', 'obj-newspapers'],
    secretsHosted: ['gambling-debt', 'fence', 'dope'],
    anchorsHosted: ['theater-out', 'last-edition', 'ice-delivery'],
  },
  {
    id: 'tenement-stairwell',
    name: 'the stairwell of the Mott Street tenement',
    kind: 'semi',
    watcher: 'landlady',
    murderMethods: ['blunt', 'strangle', 'stab'],
    objects: ['obj-roofkey', 'obj-cord', 'obj-mop-bucket', 'obj-bookend'],
    secretsHosted: ['affair', 'fence', 'hidden-family'],
    anchorsHosted: ['dumbwaiter', 'piano-lesson', 'fuse', 'drunk-singing'],
  },
  {
    id: 'pool-hall',
    name: 'Mancuso’s pool hall',
    kind: 'semi',
    watcher: 'counterman',
    murderMethods: [],
    objects: ['obj-icepick', 'obj-cigarette-case', 'obj-revolver', 'obj-ashtray'],
    secretsHosted: ['gambling-debt', 'fence', 'secret-drinking'],
    anchorsHosted: ['bar-radio', 'regular-stool', 'drunk-singing'],
  },
  {
    id: 'pawnshop',
    name: 'Zelinsky’s pawnshop, the back room',
    kind: 'semi',
    watcher: 'counterman',
    murderMethods: [],
    objects: ['obj-roofkey', 'obj-revolver', 'obj-pawn-ticket', 'obj-cigarette-case', 'obj-bookend'],
    secretsHosted: ['fence', 'gambling-debt', 'dope'],
    anchorsHosted: ['last-edition', 'ice-delivery', 'regular-stool'],
  },
  {
    id: 'chop-suey',
    name: 'the chop suey place over the laundry',
    kind: 'semi',
    watcher: 'counterman',
    murderMethods: [],
    objects: ['obj-chloral', 'obj-icepick', 'obj-telephone'],
    secretsHosted: ['affair', 'fence', 'dope'],
    anchorsHosted: ['regular-stool', 'theater-out', 'drunk-singing'],
  },
  {
    id: 'boarding-parlor',
    name: 'the parlour of Mrs. Teague’s boarding house',
    kind: 'semi',
    watcher: 'landlady',
    murderMethods: [],
    objects: ['obj-roofkey', 'obj-bookend', 'obj-photograph', 'obj-cord', 'obj-telephone'],
    secretsHosted: ['affair', 'secret-drinking', 'hidden-family'],
    anchorsHosted: ['piano-lesson', 'dumbwaiter', 'drunk-singing'],
  },
  {
    id: 'barber-shop',
    name: 'Ruggiero’s barber shop',
    kind: 'semi',
    watcher: 'counterman',
    murderMethods: [],
    objects: ['obj-cord', 'obj-icepick', 'obj-newspapers'],
    secretsHosted: ['gambling-debt', 'fence', 'union-organizing'],
    anchorsHosted: ['last-edition', 'regular-stool', 'ice-delivery'],
  },
  {
    id: 'hotel-garage',
    name: 'the garage on Eleventh Avenue',
    kind: 'semi',
    watcher: 'counterman',
    murderMethods: ['blunt', 'strangle', 'shot', 'stab'],
    objects: ['obj-roofkey', 'obj-toolbox', 'obj-cord', 'obj-icepick', 'obj-revolver'],
    secretsHosted: ['fence', 'gambling-debt', 'union-organizing'],
    anchorsHosted: ['garage-shift', 'ice-delivery'],
  },

  /* ------------------------------------------------------ unwatched and open */
  {
    id: 'el-platform',
    name: 'the El platform at Twenty-Third Street',
    kind: 'public',
    murderMethods: [],
    objects: ['obj-timetable', 'obj-newspapers'],
    secretsHosted: ['gambling-debt', 'fence', 'hidden-family'],
    anchorsHosted: ['last-edition'],
  },
  {
    id: 'square-benches',
    name: 'the benches at the north end of the square',
    kind: 'public',
    murderMethods: [],
    objects: ['obj-newspapers', 'obj-umbrella'],
    secretsHosted: ['affair', 'gambling-debt', 'hidden-family'],
    anchorsHosted: ['drunk-singing', 'theater-out'],
  },
  {
    id: 'ferry-slip',
    name: 'the ferry slip at the foot of the street',
    kind: 'public',
    murderMethods: [],
    objects: ['obj-timetable', 'obj-suitcase', 'obj-newspapers'],
    secretsHosted: ['fence', 'union-organizing', 'hidden-family'],
    anchorsHosted: ['theater-out'],
  },
  {
    id: 'subway-kiosk',
    name: 'the subway kiosk at the corner',
    kind: 'public',
    murderMethods: [],
    objects: ['obj-newspapers', 'obj-timetable', 'obj-umbrella'],
    secretsHosted: ['gambling-debt', 'dope', 'fence'],
    anchorsHosted: ['last-edition', 'drunk-singing'],
  },
  {
    id: 'side-chapel',
    name: 'the side chapel at St. Malachy’s',
    kind: 'semi',
    murderMethods: [],
    objects: ['obj-cord', 'obj-photograph'],
    secretsHosted: ['hidden-family', 'affair', 'blackmail'],
    anchorsHosted: ['piano-lesson', 'drunk-singing'],
  },
  {
    id: 'union-hall',
    name: 'the local’s hall over the bakery',
    kind: 'semi',
    murderMethods: ['blunt', 'strangle', 'stab'],
    objects: ['obj-ledger', 'obj-cashbox', 'obj-typewriter'],
    secretsHosted: ['union-organizing', 'embezzling', 'gambling-debt'],
    anchorsHosted: ['garage-shift', 'piano-lesson', 'fuse'],
  },
];

export const PLACE_BY_ID: Record<Id, PlaceTemplate> = Object.fromEntries(
  PLACE_TEMPLATES.map((p) => [p.id, p]),
);

export const NEIGHBORHOODS: string[] = [
  'the Tenderloin',
  'Hell’s Kitchen',
  'Yorkville',
  'the Lower East Side',
  'Chelsea',
  'Harlem',
  'the Bowery',
  'Gramercy',
  'the Gas House District',
  'Greenwich Village',
  'the Upper West Side',
  'Little Italy',
];
