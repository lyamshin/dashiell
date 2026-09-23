/**
 * M11 §B.1 — richer dossiers.
 *
 * A dossier used to carry one profession detail, and one detail is two facts,
 * not a person (docs/golden/seed3-people.md). These cards add what a person of
 * each type is like: three or four more details, how they came to the work,
 * and how they talk. Every line is true of the type and says nothing about any
 * case, so the generator can hand any of them to anybody of that type without
 * contradicting the case. The one detail drawn from `professionDetails` stays;
 * these sit beside it, so each one is written to agree with all of that
 * role's details, whichever is drawn.
 *
 * Keys are the suspect archetype ids from `SUSPECT_ARCHETYPES` and the fixture
 * keys from `FIXTURE_CARDS`. Layer 1 is what the person would tell you about
 * themselves; layer 2 is what other people say about them.
 *
 * Slots: `{place}` in fixture lines only (where they are posted); `{year}` in
 * history lines only (a year like ’24); gendered words as `{his|her}`,
 * `{he|she}`, `{him|her}`, `{husband|wife}`, the man's form first.
 */

export type Talk = 'clipped' | 'plain' | 'easy' | 'careful' | 'rough';

export interface CharacterLine {
  /** Third person predicate, written to follow the surname: "keeps the rent book in a drawer she locks". */
  text: string;
  /** The same fact in their own mouth, one to three short sentences, first person, present tense. */
  first: string;
  /** 1: they would say it about themselves when asked. 2: it is what other people say about them. */
  layer: 1 | 2;
}

export interface RoleCharacter {
  /** Three or four extra details, compatible with EVERY one of the role's professionDetails. */
  details: CharacterLine[];
  /** Two alternatives: how long, and how they came to it. Same text/first shape, no layer. */
  history: { text: string; first: string }[];
  /** How they talk. */
  talk: Talk;
}

export const ROLE_CHARACTER: Record<string, RoleCharacter> = {
  /* ------------------------------------------------------------------ money */
  'arch-heir': {
    details: [
      {
        text: 'keeps his evening clothes at his club and changes there more nights than not',
        first: 'I keep my evening clothes at the club. I change there more nights than not. It saves going home.',
        layer: 1,
      },
      {
        text: 'sleeps late and takes breakfast in a hotel dining room because the coffee is better',
        first: 'I sleep late. I take breakfast at a hotel, because the coffee there is better than anything at home.',
        layer: 1,
      },
      {
        text: 'signs for things instead of paying cash and lets the bills go to the family lawyer',
        first: 'I sign for things. I don’t carry much cash. The bills go to the family lawyer, and he sends them on.',
        layer: 1,
      },
      {
        text: 'is liked by headwaiters for tipping large and disliked by shopkeepers for paying late',
        first: 'Headwaiters like me. I tip well. Shopkeepers are another matter, and I can’t say I blame them.',
        layer: 2,
      },
    ],
    history: [
      {
        text: 'left college in his second year and has been waiting on the family money since',
        first: 'I left college in my second year. I’ve been waiting on the family money since. It’s slow work.',
      },
      {
        text: 'came into an allowance at twenty-one and has lived on it since, more or less',
        first: 'I came into an allowance at twenty-one. I’ve lived on it since, more or less.',
      },
    ],
    talk: 'easy',
  },

  'arch-widow': {
    details: [
      {
        text: 'still wears black on Sundays and grey the rest of the week',
        first: 'I still wear black on Sundays. Grey the rest of the week. It seems right to me.',
        layer: 1,
      },
      {
        text: 'writes her letters every morning at a small desk by the window and answers every one she gets',
        first: 'I write my letters in the morning, at the desk by the window. I answer every one I get. Nobody does that now.',
        layer: 1,
      },
      {
        text: 'goes over the household accounts herself every Friday, to the penny',
        first: 'I go over the household accounts myself on Fridays. To the penny. My husband never did, and I learned why.',
        layer: 1,
      },
      {
        text: 'is thought by her neighbours to be better off than she lets on',
        first: 'The neighbours think I have more than I let on. Let them think it.',
        layer: 2,
      },
    ],
    history: [
      {
        text: 'has been a widow since {year} and has kept up the same household on less',
        first: 'Since {year}. I’ve kept the same household on less money, and nobody has noticed.',
      },
      {
        text: 'married young to an older man and has now been a widow longer than she was a wife',
        first: 'I married young. He was a good deal older. I’ve been a widow longer than I was a wife.',
      },
    ],
    talk: 'careful',
  },

  'arch-broker': {
    details: [
      {
        text: 'talks prices across the street by hand signals to a telephone clerk in an upstairs window',
        first: 'I talk prices across the street with my hands. A clerk in an upstairs window reads them. It’s faster than shouting.',
        layer: 1,
      },
      {
        text: 'wears a loud hat so the clerks upstairs can pick {him|her} out of the crowd',
        first: 'I wear a loud hat. The clerks upstairs have to find me in a crowd, and they find me quick.',
        layer: 1,
      },
      {
        text: 'eats lunch standing up off a cart and never sits down before the closing bell',
        first: 'I eat lunch standing up, off a cart. I don’t sit down till the closing bell.',
        layer: 1,
      },
      {
        text: 'is said on the street to be good for a quick trade and no questions',
        first: 'They say I’m good for a quick trade and no questions. That’s about right. Questions slow a trade down.',
        layer: 2,
      },
    ],
    history: [
      {
        text: 'started as a messenger running orders between offices and has traded on the street since {year}',
        first: 'Since {year}. I started as a messenger, running orders between offices. I watched how it was done.',
      },
      {
        text: 'left a bank job that paid less and bored {him|her} more, and has been out on the street nearly ten years',
        first: 'I had a bank job. It paid less and bored me more. I’ve been out here nearly ten years.',
      },
    ],
    talk: 'easy',
  },

  'arch-society': {
    details: [
      {
        text: 'dresses for dinner every night, whether or not there is a dinner to go to',
        first: 'I dress for dinner every night. Whether there’s a dinner or not. You never know who’ll telephone.',
        layer: 1,
      },
      {
        text: 'writes in pencil in a small notebook and never in front of the people {he|she} is writing about',
        first: 'I write in pencil, in a little notebook. Never in front of anyone I’m writing about. That’s the whole trick of it.',
        layer: 1,
      },
      {
        text: 'is said by the other columnists to read their columns before they do',
        first: 'The other columnists say I read their columns before they do. I read all of them before breakfast. I like to know what I’ve missed.',
        layer: 2,
      },
      {
        text: 'is asked to parties by hostesses who would rather be written up than left out',
        first: 'Hostesses ask me because they’d rather be written up than left out. I’m not fooled by it. I go anyway.',
        layer: 2,
      },
    ],
    history: [
      {
        text: 'started on the wedding notices for a newspaper and asked for the column the day it came open',
        first: 'I started on weddings. Two years of other people’s weddings. Then the column came open and I asked for it.',
      },
      {
        text: 'was born into the set {he|she} writes about and lost the money but kept the invitations',
        first: 'I was born into the people I write about. The money went. The invitations didn’t, so I made a living of them.',
      },
    ],
    talk: 'easy',
  },

  'arch-blockowner': {
    details: [
      {
        text: 'goes down to the boilers in the cold months to see the coal is not wasted',
        first: 'I go down to the boilers in winter. Coal costs money. I watch it.',
        layer: 1,
      },
      {
        text: 'carries one ring of keys that opens every door {he|she} owns',
        first: 'I carry a key to every door I own. All on one ring.',
        layer: 1,
      },
      {
        text: 'fixes what the city orders fixed and nothing sooner',
        first: 'I fix what the city tells me to fix. Nothing sooner.',
        layer: 1,
      },
      {
        text: 'has a name with the tenants for turning the heat off on the first warm day of spring',
        first: 'The tenants say I turn the heat off on the first warm day. They’re right. Spring is spring.',
        layer: 2,
      },
    ],
    history: [
      {
        text: 'bought the first building out of a grocery’s savings and has been buying since',
        first: 'The first one came out of a grocery. Twenty years of canned peas. I’ve been buying since.',
      },
      {
        text: 'inherited the buildings from {his|her} father and has run them without help since {year}',
        first: 'They were my father’s. I’ve run them without help since {year}.',
      },
    ],
    talk: 'clipped',
  },

  /* ----------------------------------------------------------- professional */
  'arch-lawyer': {
    details: [
      {
        text: 'writes every letter out in longhand before it is typed and reads it twice before signing',
        first: 'I write every letter out in longhand first. Then it is typed. I read it twice before I sign.',
        layer: 1,
      },
      {
        text: 'spends most mornings in the courts and the afternoons at a desk',
        first: 'I am in court most mornings. The afternoons are for the desk, and the desk is most of the work.',
        layer: 1,
      },
      {
        text: 'owns the law books {he|she} can afford and borrows the rest from the bar association library',
        first: 'I own the law books I can afford. The rest I borrow from the bar association library.',
        layer: 1,
      },
      {
        text: 'is thought in the building to charge less than {he|she} should and to collect less than {he|she} charges',
        first: 'People say I charge too little and collect less than that. They are not wrong. It is a fault I can afford, most years.',
        layer: 2,
      },
    ],
    history: [
      {
        text: 'clerked for an older lawyer for years and took over the rooms when he retired',
        first: 'I clerked for an older man for years. When he retired I took the rooms, and whatever clients would stay.',
      },
      {
        text: 'read law at night while working days in an insurance office, and has had {his|her} own door since {year}',
        first: 'I read law at night. In the daytime I worked in an insurance office. I have had my own door since {year}.',
      },
    ],
    talk: 'careful',
  },

  'arch-bookkeeper': {
    details: [
      {
        text: 'wears sleeve protectors at the desk because ink does not come out of a cuff',
        first: 'I wear sleeve protectors at the desk. Ink does not come out of a cuff.',
        layer: 1,
      },
      {
        text: 'adds every column twice, once down and once up',
        first: 'I add every column twice. Down, then up. If the two agree, I go on.',
        layer: 1,
      },
      {
        text: 'eats a sandwich from home at the desk rather than go out at midday',
        first: 'I eat at the desk. A sandwich from home. Going out in the middle of a column is how mistakes happen.',
        layer: 1,
      },
      {
        text: 'is said by the people {he|she} works for never to have been a penny out',
        first: 'They say I have never been a penny out. That is nearly true. I have been a penny out, but only overnight.',
        layer: 2,
      },
    ],
    history: [
      {
        text: 'learned bookkeeping at a business school at night and has kept books since {year}',
        first: 'I learned it at a business school, at night. I have kept books since {year}.',
      },
      {
        text: 'started as an office junior copying invoices and worked up to the ledgers',
        first: 'I started as an office junior. I copied invoices for two years. Then they let me near the ledgers.',
      },
    ],
    talk: 'careful',
  },

  'arch-nurse': {
    details: [
      {
        text: 'irons her own uniforms because the laundry starches the collars wrong',
        first: 'I iron my own uniforms. The laundry never gets the collar right.',
        layer: 1,
      },
      {
        text: 'carries a small black bag with a thermometer, a watch with a second hand and a spare cap',
        first: 'I carry my own bag. A thermometer, a watch with a second hand, and a spare cap.',
        layer: 1,
      },
      {
        text: 'sleeps when the case allows and can sleep sitting up in a chair',
        first: 'I sleep when the case lets me. I can sleep sitting up in a chair. You learn that early.',
        layer: 1,
      },
      {
        text: 'is asked for by name by doctors who want a patient kept to the orders',
        first: 'Doctors ask for me by name. I keep a patient to the orders. Not every nurse will.',
        layer: 2,
      },
    ],
    history: [
      {
        text: 'trained at a hospital school at eighteen and has never done any other work',
        first: 'I trained at eighteen, at a hospital school. I have never done any other work. I never wanted to.',
      },
      {
        text: 'went into nursing after her mother and has done it her whole working life',
        first: 'My mother was a nurse. So I am a nurse. It was never much of a question.',
      },
    ],
    talk: 'careful',
  },

  'arch-dentist': {
    details: [
      {
        text: 'boils the instruments after every patient and tells every patient so',
        first: 'I boil my instruments after every patient. I tell them so. It calms them more than the gas does.',
        layer: 1,
      },
      {
        text: 'works a drill run by a foot pedal because the electric kind cost more than {he|she} had',
        first: 'My drill runs off a foot pedal. The electric kind cost more than I had. My leg does the work.',
        layer: 1,
      },
      {
        text: 'keeps a jar of pulled teeth on the shelf to show the children it is soon over',
        first: 'I keep a jar of pulled teeth on the shelf. The children count them and forget to be frightened.',
        layer: 1,
      },
      {
        text: 'is said to have gentle hands and no patience with a patient who cancels',
        first: 'People say I have gentle hands. They also say I have no patience with a patient who cancels. Both are true.',
        layer: 2,
      },
    ],
    history: [
      {
        text: 'has had {his|her} own chair since {year} and worked another dentist’s chair before that',
        first: 'I have had my own chair since {year}. Before that I worked another man’s, for less than I was worth.',
      },
      {
        text: 'was a dentist’s assistant for years before going to dental college',
        first: 'I was a dentist’s assistant first. I held the tray for years. Then I went to college and got my licence.',
      },
    ],
    talk: 'careful',
  },

  'arch-secretary': {
    details: [
      {
        text: 'takes shorthand faster than most people talk and has it typed before lunch',
        first: 'I take shorthand faster than most people talk. It is typed before lunch.',
        layer: 1,
      },
      {
        text: 'keeps a typewriter ribbon, two pens and a clean handkerchief in the top drawer',
        first: 'My top drawer has a typewriter ribbon, two pens and a clean handkerchief. Somebody always needs one of them.',
        layer: 1,
      },
      {
        text: 'answers the telephone with the employer’s name and never {his|her} own',
        first: 'I answer the telephone with his name, not mine. Nobody is calling for me.',
        layer: 1,
      },
      {
        text: 'is the one the rest of the office asks before going in to the boss',
        first: 'People come to me before they go in to him. I tell them whether it is a good day.',
        layer: 2,
      },
    ],
    history: [
      {
        text: 'learned typing and shorthand at a commercial school after high school',
        first: 'I went to a commercial school after high school. Typing and shorthand. I have been at a desk since.',
      },
      {
        text: 'started in a typing pool and was picked out of it for a private office',
        first: 'I started in a typing pool. Forty machines in one room. I was picked out of it, and I have not been back.',
      },
    ],
    talk: 'careful',
  },

  'arch-reporter': {
    details: [
      {
        text: 'keeps copy paper folded in {his|her} hat band and three pencils sharpened at both ends',
        first: 'I keep copy paper folded in my hat band. Three pencils, sharp at both ends. A pencil always breaks at the worst moment.',
        layer: 1,
      },
      {
        text: 'phones stories in from drugstore booths and knows which ones work on every block',
        first: 'I phone my stories in from drugstore booths. I know which booths work and which eat your nickel. That’s half the job.',
        layer: 1,
      },
      {
        text: 'sleeps in the afternoons and eats when a story is filed',
        first: 'I sleep afternoons. I eat when a story’s filed and not before. Some days that’s a late breakfast.',
        layer: 1,
      },
      {
        text: 'is trusted by the city desks to spell a name right, which is rarer than it sounds',
        first: 'The desks buy from me because I spell the names right. You’d be surprised how rare that is.',
        layer: 2,
      },
    ],
    history: [
      {
        text: 'ran copy in a newsroom at sixteen and sold a first story at nineteen',
        first: 'I ran copy in a newsroom at sixteen. I sold my first story at nineteen. Eleven dollars, and I spent it the same night.',
      },
      {
        text: 'was on the staff of a morning newspaper until it closed and has sold by the piece since',
        first: 'I was on staff at a morning newspaper. It closed. I’ve sold by the piece since, and I eat about as well.',
      },
    ],
    talk: 'easy',
  },

  'arch-piano-teacher': {
    details: [
      {
        text: 'keeps a metronome on the piano and a jar of pennies for the pupils who practise',
        first: 'I keep a metronome on the piano. There’s a jar of pennies for the ones who practise. It stays mostly full.',
        layer: 1,
      },
      {
        text: 'can tell from the first four bars whether a pupil has practised that week',
        first: 'I can tell from the first four bars if they’ve practised. They always say they have.',
        layer: 1,
      },
      {
        text: 'plays for an hour after the last pupil goes, with the window shut',
        first: 'When the last pupil goes, I play for an hour. For me. With the window shut.',
        layer: 1,
      },
      {
        text: 'is thought by the parents on the street to be strict and worth the money',
        first: 'The parents say I’m strict. They pay me anyway. I’d say that’s the same thing.',
        layer: 2,
      },
    ],
    history: [
      {
        text: 'trained for the concert stage and began teaching when the concerts did not come',
        first: 'I trained for the concert stage. The concerts didn’t come. The pupils did, and I’ve had them for years.',
      },
      {
        text: 'has taught piano since {year}, when {his|her} own teacher retired and passed the pupils on',
        first: 'Since {year}. My own teacher retired and passed the pupils on to me. Most of them left. I found more.',
      },
    ],
    talk: 'plain',
  },

  'arch-adjuster': {
    details: [
      {
        text: 'carries a folding rule, a flashlight and a camera in a case',
        first: 'I carry a folding rule, a flashlight and a camera. Most of the job is measuring.',
        layer: 1,
      },
      {
        text: 'writes everything down while the claimant watches, so nobody can say later it was put differently',
        first: 'I write it all down while they watch. Nobody can tell me later they said it different.',
        layer: 1,
      },
      {
        text: 'spends more of the day on streetcars than at a desk',
        first: 'I spend more of the day on streetcars than at a desk. The claims don’t come to me.',
        layer: 1,
      },
      {
        text: 'is disliked by claimants for asking the same question three ways',
        first: 'People don’t like me. I ask the same question three ways. The answer should come out the same each time.',
        layer: 2,
      },
    ],
    history: [
      {
        text: 'was a clerk in the company office for years until they sent {him|her} out to see for {him|her}self',
        first: 'I was a clerk in the company office for years. They sent me out when they saw I didn’t believe anybody.',
      },
      {
        text: 'has adjusted claims since {year} and came to it from a bank’s loan desk',
        first: 'Since {year}. Before that I sat at a bank’s loan desk. People lie to banks too. Now I get to see where they live.',
      },
    ],
    talk: 'plain',
  },

  /* ---------------------------------------------------------------- working */
  'arch-chambermaid': {
    details: [
      {
        text: 'carries her own soap in her apron because the hotel’s is too harsh on her hands',
        first: 'I carry my own soap in my apron. The hotel’s is too harsh on my hands.',
        layer: 1,
      },
      {
        text: 'knocks twice and says “Maid” before she uses her key, at every door, every time',
        first: 'I knock twice and say “Maid” before I use the key. Every door. You learn why the first week.',
        layer: 1,
      },
      {
        text: 'is trusted by the housekeeper with whatever guests leave behind, because she has never kept a thing',
        first: 'The housekeeper trusts me with what guests leave behind. I’ve never kept a thing. Not a hairpin.',
        layer: 2,
      },
      {
        text: 'is said by the other maids to finish her floors faster than any of them without ever hurrying',
        first: 'The other girls say I finish faster than any of them and never hurry. I just don’t stop to talk.',
        layer: 2,
      },
    ],
    history: [
      {
        text: 'went to work at fifteen and has worked in hotels from the start',
        first: 'I went to work at fifteen, and it’s been hotels from the start. I’d take a hotel over a private house. Nobody watches you.',
      },
      {
        text: 'came over from the old country with a sister and found hotel work the first week',
        first: 'I came over with my sister. I had hotel work the first week. I’ve had it since.',
      },
    ],
    talk: 'plain',
  },

  'arch-longshoreman': {
    details: [
      {
        text: 'keeps his hook on a nail by the door and his pay in his boot',
        first: 'My hook hangs on a nail by the door. My pay goes in my boot.',
        layer: 1,
      },
      {
        text: 'can carry a hundred-pound sack up a gangplank without a hand on the rail',
        first: 'I can carry a hundred-pound sack up a gangplank and never touch the rail. Most can’t.',
        layer: 1,
      },
      {
        text: 'spends the days without work at the union hall playing cards for pennies',
        first: 'Days there’s no work, I’m at the union hall. Cards for pennies. Beats sitting home.',
        layer: 1,
      },
      {
        text: 'has a name along the piers for never missing a morning in the hiring line',
        first: 'They say along the piers I never miss a morning. Miss one and the boss forgets your face.',
        layer: 2,
      },
    ],
    history: [
      {
        text: 'followed his father onto the piers at sixteen and has worked them since',
        first: 'My old man worked the piers. I followed him on at sixteen. Been there since.',
      },
      {
        text: 'shipped out as a deckhand for a few years and then came ashore for good',
        first: 'I shipped out as a deckhand a few years. Then I came ashore for good. Same bed every night, that’s worth something.',
      },
    ],
    talk: 'rough',
  },

  'arch-seamstress': {
    details: [
      {
        text: 'keeps pins in her mouth while she sews and talks around them',
        first: 'I keep pins in my mouth when I sew. I can talk around them. Most of us can.',
        layer: 1,
      },
      {
        text: 'wears a thimble worn through at the top from years on the same finger',
        first: 'My thimble’s worn through at the top. Same finger, all those years.',
        layer: 1,
      },
      {
        text: 'owns a pair of good shears nobody else is allowed to cut with',
        first: 'I own good shears. Nobody else cuts with them. Nobody.',
        layer: 1,
      },
      {
        text: 'is said by the other women to sew the straightest seam of any of them',
        first: 'The other women say my seams are the straightest. I don’t argue. I just don’t let them see me unpick.',
        layer: 2,
      },
    ],
    history: [
      {
        text: 'learned to sew from her mother on a treadle machine and has sewn for money since she was fourteen',
        first: 'My mother taught me on a treadle machine. I’ve sewn for money since I was fourteen.',
      },
      {
        text: 'came to sewing from a laundry and has been at it near eight years',
        first: 'I worked in a laundry first. The pay was worse and the heat was worse. Near eight years I’ve been sewing, and I don’t miss the steam.',
      },
    ],
    talk: 'plain',
  },

  'arch-hackman': {
    details: [
      {
        text: 'keeps a blanket in the back for fares in winter and a flask of coffee for himself',
        first: 'There’s a blanket in the back for fares in the winter. The coffee’s for me.',
        layer: 1,
      },
      {
        text: 'knows the short way between any two hotels in town and takes the long way only with rude fares',
        first: 'I know the short way between any two hotels in town. I know the long way too. I only take it when they’re rude.',
        layer: 1,
      },
      {
        text: 'washes the cab himself once a week because a clean cab gets the better fares',
        first: 'I wash the cab myself, once a week. A clean cab gets the good fares. The doormen pick you by it.',
        layer: 1,
      },
      {
        text: 'is the driver the doormen send out to fares who want quiet, because he never says who rode where',
        first: 'The doormen send me the fares that want quiet. I don’t talk about who rode where. Not to anybody.',
        layer: 2,
      },
    ],
    history: [
      {
        text: 'drove a bakery truck for years before he bought a cab of his own',
        first: 'I drove a bakery truck for years. Then I bought the cab. Now I’m my own boss, and he’s a hard one.',
      },
      {
        text: 'swept a garage floor as a youngster, learned to drive from the mechanics, and has driven for pay since he was twenty',
        first: 'I swept a garage floor as a kid. The mechanics taught me to drive. I’ve driven for pay since I was twenty.',
      },
    ],
    talk: 'easy',
  },

  'arch-tailor': {
    details: [
      {
        text: 'wears the tape measure round {his|her} neck from opening until closing',
        first: 'The tape stays round my neck all day. Take it off and a customer walks in.',
        layer: 1,
      },
      {
        text: 'sews sitting cross-legged on the bench, the old way',
        first: 'I sew sitting cross-legged on the bench. The old way. My knees don’t like it any more.',
        layer: 1,
      },
      {
        text: 'can tell a man’s work from where his suit wears through',
        first: 'I can tell a man’s work from where his suit wears through. Elbows is a clerk. Knees is a man who scrubs floors or prays.',
        layer: 1,
      },
      {
        text: 'is said to press a crease that lasts through a rainstorm',
        first: 'They say my creases last through a rainstorm. That’s the steam and the weight of the iron. And practice.',
        layer: 2,
      },
    ],
    history: [
      {
        text: 'was apprenticed at fourteen in the old country and came over with {his|her} needles and not much else',
        first: 'I was apprenticed at fourteen, back in the old country. I came over with my needles and not much else.',
      },
      {
        text: 'worked on a factory cutting floor for years and saved until {he|she} could open alone',
        first: 'I worked in a factory, on the cutting floor. I saved for years. I’ve had my own shop a good while now.',
      },
    ],
    talk: 'plain',
  },

  'arch-stagehand': {
    details: [
      {
        text: 'wears soft-soled shoes so {he|she} makes no sound during a performance',
        first: 'Soft shoes. You don’t make a sound during a show, not one, or you’re out.',
        layer: 1,
      },
      {
        text: 'has rope burns on both palms and will not wear gloves',
        first: 'Got rope burns on both hands. Gloves slip. I’d rather the burns.',
        layer: 1,
      },
      {
        text: 'eats in the alley between the acts and is back before the bell',
        first: 'I eat in the alley between acts. Sandwich and a smoke. Back before the bell.',
        layer: 1,
      },
      {
        text: 'is said on the crew never to have missed a cue',
        first: 'The crew says I never missed a cue. I missed one. Nobody saw but me.',
        layer: 2,
      },
    ],
    history: [
      {
        text: 'was a carpenter before the theatre and came over for the better pay and the night work',
        first: 'I was a carpenter. The theatre paid better and the work was at night. I came over and I stayed.',
      },
      {
        text: 'swept stages in vaudeville as a youngster and was let up on the ropes at seventeen',
        first: 'I swept stages as a kid. Vaudeville. They let me up on the ropes when I was seventeen.',
      },
    ],
    talk: 'rough',
  },

  'arch-switchboard': {
    details: [
      {
        text: 'wears the headset so many hours it leaves a dent over her ear',
        first: 'I wear the headset so long it leaves a dent over my ear. Look. Right there.',
        layer: 1,
      },
      {
        text: 'says “Number, please” in her sleep, by her sister’s account',
        first: 'My sister says I say “Number, please” in my sleep. I believe her. I say it forty times an hour awake.',
        layer: 1,
      },
      {
        text: 'loses pay for any call the supervisor catches left waiting too long',
        first: 'The supervisor times us. A call left waiting too long comes off my pay. So nothing waits with me.',
        layer: 1,
      },
      {
        text: 'has a name among the other operators for the quickest hands on the board',
        first: 'The girls say I’ve got the quickest hands on the board. I don’t even look at the plugs. I know where they are.',
        layer: 2,
      },
    ],
    history: [
      {
        text: 'answered an advertisement for young women with clear voices and has been on the board since',
        first: 'The company advertised for girls with clear voices. I had one. I’ve been on the board since.',
      },
      {
        text: 'went to the telephone company straight out of school and trained six weeks before they sat her down',
        first: 'Straight out of school. Six weeks of training, and they sat me down at the board. That was a while ago now.',
      },
    ],
    talk: 'easy',
  },

  'arch-nightman': {
    details: [
      {
        text: 'drinks the kitchen’s coffee through the night and eats breakfast when the day staff comes on',
        first: 'I drink the kitchen’s coffee all night. I eat breakfast when the day staff comes on. It is the one meal I take sitting down.',
        layer: 1,
      },
      {
        text: 'keeps a list of guests who left without paying and knows them again when they come back',
        first: 'I keep a list of guests who left without paying. I know them again when they come back. They do come back.',
        layer: 1,
      },
      {
        text: 'walks every corridor once a night and notes any door left open',
        first: 'I walk every corridor once a night. A door left open goes in the log. So does anything else.',
        layer: 1,
      },
      {
        text: 'is thought by the staff to see more from the desk than the house detective sees from the halls',
        first: 'The staff say I see more from the desk than the house detective does from the halls. That is not hard. He sleeps.',
        layer: 2,
      },
    ],
    history: [
      {
        text: 'started as a bellhop and carried bags for years before being let behind the desk',
        first: 'I started as a bellhop. I carried bags for years before they let me behind the desk.',
      },
      {
        text: 'has kept hotel nights since {year} and sees little daylight',
        first: 'I have kept nights since {year}. I see about an hour of daylight a day, going home.',
      },
    ],
    talk: 'careful',
  },

  'arch-chorus': {
    details: [
      {
        text: 'stretches on the floor of her room every morning, show or no show',
        first: 'I stretch every morning on the floor of my room. Show or no show. If you stop, it shows.',
        layer: 1,
      },
      {
        text: 'keeps her dancing shoes in a hatbox and her photographs in the lid',
        first: 'My shoes live in a hatbox. My photographs go in the lid, ready for any agent who asks.',
        layer: 1,
      },
      {
        text: 'eats one real meal a day and makes it a good one',
        first: 'One real meal a day. I make it a good one. The rest is coffee.',
        layer: 1,
      },
      {
        text: 'is said by the other girls to learn a routine faster than anyone in the line',
        first: 'The girls say I learn a routine faster than anybody. Show me twice. The third time I’ll show you.',
        layer: 2,
      },
    ],
    history: [
      {
        text: 'left home at seventeen with one suitcase and a letter from her dancing teacher',
        first: 'I left home at seventeen. One suitcase and a letter from my dancing teacher. Nobody ever asked to see the letter.',
      },
      {
        text: 'won a dance contest back home and came to the city on the prize money',
        first: 'I won a dance contest back home. Fifty dollars. I spent it on the train fare, and I’ve been here since.',
      },
    ],
    talk: 'easy',
  },

  /* ------------------------------------------------------------- underworld */
  'arch-bookmaker': {
    details: [
      {
        text: 'keeps the bets in {his|her} head and writes down no more than {he|she} has to',
        first: 'I keep the bets in my head. I write down what I have to and not a line more.',
        layer: 1,
      },
      {
        text: 'reads the racing pages front to back every morning',
        first: 'Racing pages, front to back, every morning. Then I know what I’m up against.',
        layer: 1,
      },
      {
        text: 'pays winners in cash the same day and expects the same when it goes the other way',
        first: 'I pay the same day. Cash. I expect the same back when it goes the other way.',
        layer: 1,
      },
      {
        text: 'is said on the corner to give fair odds and no credit',
        first: 'Word is I give fair odds and no credit. That’s how I like it said.',
        layer: 2,
      },
    ],
    history: [
      {
        text: 'clerked at a racetrack for years, learned the odds there, and has worked for {him|her}self since {year}',
        first: 'I clerked at a racetrack for years. Learned the odds there. Been on my own since {year}.',
      },
      {
        text: 'took bets for an uncle as a youngster and has had customers of {his|her} own for years',
        first: 'I took bets for my uncle when I was a kid. Now I take my own. Have for years.',
      },
    ],
    talk: 'rough',
  },

  'arch-heeler': {
    details: [
      {
        text: 'goes to every wake and every wedding in the district and brings something to both',
        first: 'I go to every wake and every wedding in the district. I bring something to both. People remember who came.',
        layer: 1,
      },
      {
        text: 'knows which families on the block need a job, which need a doctor and which need a lawyer',
        first: 'I know who on the block needs a job, who needs a doctor, and who needs a lawyer. Usually in that order.',
        layer: 1,
      },
      {
        text: 'keeps his hat on indoors and his door open to anybody',
        first: 'My hat stays on and my door stays open. Anybody can come in. Most of them want something, and that’s fine by me.',
        layer: 1,
      },
      {
        text: 'is said in the district never to forget a favour, done or owed',
        first: 'They say I never forget a favour, done or owed. Why would I? It’s the whole job.',
        layer: 2,
      },
    ],
    history: [
      {
        text: 'carried messages for the club as a youngster and was given the district in {year}',
        first: 'I ran messages for the club as a kid. They gave me the district in {year}. I’ve held onto it.',
      },
      {
        text: 'came up through a union and was taken on by the club for knowing everybody',
        first: 'I was with the union first. The club took me on because I knew everybody. That was years back, and I still do.',
      },
    ],
    talk: 'easy',
  },

  'arch-pawnman': {
    details: [
      {
        text: 'tests gold with a drop of acid on a black stone and trusts nothing else',
        first: 'A drop of acid on a black stone. That’s gold or it isn’t. Nothing else tells me.',
        layer: 1,
      },
      {
        text: 'wears a jeweller’s eyeglass on a string round {his|her} neck',
        first: 'Jeweller’s eyeglass, on a string round my neck. Always.',
        layer: 1,
      },
      {
        text: 'enters every item in the ledger down to the scratches',
        first: 'Every item goes in the ledger. Scratches and all. People forget what they brought in.',
        layer: 1,
      },
      {
        text: 'is said by customers to pay the least on the block and to say so first',
        first: 'Customers say I pay the least on the block. Fair. I tell them so before they sign.',
        layer: 2,
      },
    ],
    history: [
      {
        text: 'came into the shop at fifteen to sweep and learned the trade across the counter',
        first: 'Came in at fifteen to sweep. Learned it across the counter. Still here.',
      },
      {
        text: 'worked for a jeweller until he closed and has been behind the grille since {year}',
        first: 'Worked for a jeweller. He closed. Behind the grille since {year}.',
      },
    ],
    talk: 'clipped',
  },

  'arch-bouncer': {
    details: [
      {
        text: 'looks at every visitor through a slot in the door before he opens it',
        first: 'There’s a slot in the door. I look before I open. Every time.',
        layer: 1,
      },
      {
        text: 'has had his nose broken twice and stopped minding after the first',
        first: 'Nose is broke twice. I stopped minding after the first.',
        layer: 1,
      },
      {
        text: 'stands with his back to the wall and never sits down on the job',
        first: 'Back to the wall. I don’t sit. A sitting man can’t move.',
        layer: 1,
      },
      {
        text: 'is said by the regulars to be polite right up until he isn’t',
        first: 'Regulars say I’m polite. I am. Till I’m not.',
        layer: 2,
      },
    ],
    history: [
      {
        text: 'boxed for pay in small clubs for a few years before he took up door work',
        first: 'I boxed. Small clubs, a few years. Then the door. The door pays steady.',
      },
      {
        text: 'worked the door at a dance hall first and has stood doors since he was twenty',
        first: 'Dance hall first. Doors since I was twenty.',
      },
    ],
    talk: 'clipped',
  },

  'arch-runner': {
    details: [
      {
        text: 'carries the slips inside his hat and the cash in an inside pocket sewn shut at the bottom',
        first: 'Slips in my hat. Cash in an inside pocket, sewn up so nothing falls out.',
        layer: 1,
      },
      {
        text: 'is counted on along his route to come by in the same order every day',
        first: 'People count on me. Same route, same order, every day. They got their bet ready when they see me coming.',
        layer: 2,
      },
      {
        text: 'knows every customer’s lucky number without looking',
        first: 'I know everybody’s lucky number. Some bet the same one for years and it never hits. They keep at it.',
        layer: 1,
      },
      {
        text: 'is liked on the corners for paying winners before they have to ask',
        first: 'People like me on the corners. I pay a winner before he asks. Makes him bet again.',
        layer: 2,
      },
    ],
    history: [
      {
        text: 'started carrying slips at fourteen for a man on the corner and got a route of his own a couple of years ago',
        first: 'Started at fourteen. Carried slips for a man on the corner. Got my own route a couple years back.',
      },
      {
        text: 'delivered groceries on a bicycle until a collector’s route came open and he took it',
        first: 'I delivered groceries on a bike. Paid nothing. This came open and I took it. Been a few years now.',
      },
    ],
    talk: 'rough',
  },

  /* --------------------------------------------------------------- fixtures */
  bartender: {
    details: [
      {
        text: 'polishes glasses at {place} whenever {his|her} hands are empty, whether they need it or not',
        first: 'I polish glasses when my hands are empty. The glasses don’t need it. My hands do.',
        layer: 1,
      },
      {
        text: 'keeps the tips in a cigar box under the bar and counts them only at home',
        first: 'Tips go in a cigar box under the bar. I count it at home. Never in front of the customers.',
        layer: 1,
      },
      {
        text: 'pours every drink at {place} as it comes from the bottle and says so to anybody who asks',
        first: 'Nothing gets watered here. I tell anybody who asks. Some places can’t say that.',
        layer: 1,
      },
      {
        text: 'is known around {place} for never saying a customer’s name out loud',
        first: 'I don’t say names across the bar. People come here not to be named. I let them.',
        layer: 2,
      },
    ],
    history: [
      {
        text: 'washed glasses in a hotel bar before the country went dry and has poured ever since, in quieter places',
        first: 'I washed glasses in a hotel bar before the country went dry. When it went dry I kept pouring. Just somewhere quieter.',
      },
      {
        text: 'learned the trade from an uncle who kept a saloon and has worked behind a bar all {his|her} working life',
        first: 'My uncle kept a saloon. I washed glasses for him as a kid. I’ve been behind a bar all my working life.',
      },
    ],
    talk: 'plain',
  },

  doorman: {
    details: [
      {
        text: 'polishes the brass on the door at {place} and the buttons on {his|her} coat with the same rag',
        first: 'I polish the brass on the door and the buttons on my coat. Same rag. Both shine.',
        layer: 1,
      },
      {
        text: 'whistles up cabs from the curb and knows every driver who works the block by his first name',
        first: 'I whistle up the cabs. I know every driver who works this block by his first name.',
        layer: 1,
      },
      {
        text: 'keeps a spare umbrella inside the door at {place} for people caught in the rain',
        first: 'There’s a spare umbrella inside the door. Somebody’s always caught in the rain. I get it back, mostly.',
        layer: 1,
      },
      {
        text: 'is said around {place} to know who is in and who is out before anybody asks',
        first: 'People here say I know who’s in and who’s out before they ask. I do. It’s what I’m paid for.',
        layer: 2,
      },
    ],
    history: [
      {
        text: 'carried bags as a hotel porter for years before coming to the door',
        first: 'I carried bags in a hotel for years. The door’s better. Nobody tips a porter enough.',
      },
      {
        text: 'came to the door from a factory floor and has worn a doorman’s coat most of {his|her} working life',
        first: 'I was on a factory floor first. This is easier on the back and harder on the feet. I’ve worn a coat like this most of my life.',
      },
    ],
    talk: 'plain',
  },

  newsstand: {
    details: [
      {
        text: 'keeps the change in a canvas apron and can make it without looking down',
        first: 'I keep the change in my apron. I can make change without looking down. Years of nickels will teach you that.',
        layer: 1,
      },
      {
        text: 'has the regulars’ newspapers folded and ready before they reach the stand at {place}',
        first: 'My regulars get their paper folded before they’re at the stand. They don’t break stride. They like that.',
        layer: 1,
      },
      {
        text: 'weights the stacks down with bricks on windy days',
        first: 'Windy days, bricks on the stacks. Lose a stack down the street and there goes the day’s profit.',
        layer: 1,
      },
      {
        text: 'is the one everybody around {place} asks for directions and for yesterday’s news',
        first: 'Everybody asks me the way somewhere, or what happened yesterday. I tell them both for free. The newspapers cost two cents.',
        layer: 2,
      },
    ],
    history: [
      {
        text: 'took over the stand from {his|her} uncle when the old man’s eyes went, and has not taken a week off since',
        first: 'It was my uncle’s stand. When his eyes went I took it over. I haven’t taken a week off since.',
      },
      {
        text: 'sold newspapers on the corner from the age of ten and was handed the stand when its old owner gave it up',
        first: 'I sold papers on the corner from ten years old. The old man who had the stand gave it up, and he gave it to me.',
      },
    ],
    talk: 'easy',
  },

  counterman: {
    details: [
      {
        text: 'pours the coffee at {place} without being asked and cuts every pie into six even slices',
        first: 'Coffee comes without asking. Pie’s cut in six. Nobody’s slice is bigger than anybody’s.',
        layer: 1,
      },
      {
        text: 'eats {his|her} own supper standing at the end of the counter between customers',
        first: 'I eat standing at the end of the counter. Between customers. I haven’t sat at a table for a meal in years.',
        layer: 1,
      },
      {
        text: 'is trusted by the owner of {place} to count the till alone at closing',
        first: 'The owner lets me count the till alone. To the cent. If it’s short, it comes out of me.',
        layer: 2,
      },
      {
        text: 'is said by the regulars at {place} to make the best coffee on the street and the least conversation',
        first: 'They say my coffee’s the best on the street. They also say I don’t talk. I’m working.',
        layer: 2,
      },
    ],
    history: [
      {
        text: 'started out washing dishes in the back at {place} and moved out front when the counter came open',
        first: 'I started in the back, washing dishes. The man out front quit. I’ve been out front since.',
      },
      {
        text: 'has worked lunch counters since {he|she} left school',
        first: 'I’ve worked lunch counters since I left school. Only work I ever had where I get fed.',
      },
    ],
    talk: 'plain',
  },

  'ticket-taker': {
    details: [
      {
        text: 'counts the torn halves at the end of each performance against the money in the drawer',
        first: 'I count the torn halves after every show. They have to match the money. They always do.',
        layer: 1,
      },
      {
        text: 'has seen every show at {place} from the back, a few minutes at a time',
        first: 'I’ve seen every show here from the back. A few minutes at a time. Never the ending.',
        layer: 1,
      },
      {
        text: 'can tell a forged ticket by the feel of it',
        first: 'I can tell a fake ticket by the feel. The paper’s wrong. Nobody’s tried it on me in a year.',
        layer: 1,
      },
      {
        text: 'is said by the ushers to be impossible to get past without a ticket',
        first: 'The ushers say you can’t get past me without a ticket. You can’t. I’ve been offered money, and it doesn’t work.',
        layer: 2,
      },
    ],
    history: [
      {
        text: 'ushered at another theatre when {he|she} was young and has taken tickets since',
        first: 'I ushered at another theatre when I was young. Flashlight and a uniform. Then this job came along.',
      },
      {
        text: 'took the job to see the shows for nothing and stayed for the steady pay',
        first: 'I took this job to see the shows for nothing. I stayed for the pay, which is steady. The shows I’ve mostly seen.',
      },
    ],
    talk: 'plain',
  },

  'elevator-man': {
    details: [
      {
        text: 'is said by the people who ride with {him|her} never to stop the car an inch off the floor',
        first: 'They say I never stop her an inch off. I don’t. Every floor, every time.',
        layer: 2,
      },
      {
        text: 'wears white gloves in the car and changes them at midday',
        first: 'White gloves. Clean pair at midday.',
        layer: 1,
      },
      {
        text: 'stands facing the door and hears everything said behind {him|her}',
        first: 'I face the door. I hear what’s said behind me. I don’t turn around.',
        layer: 1,
      },
      {
        text: 'is said around {place} to have an opinion of everybody and to share it with nobody',
        first: 'They say I’ve got an opinion of everybody here. I do. You won’t get it.',
        layer: 2,
      },
    ],
    history: [
      {
        text: 'was a doorman at a smaller building before moving inside to the car',
        first: 'Doorman first. Smaller building. Moved inside, out of the weather.',
      },
      {
        text: 'has run elevators most of {his|her} life, starting on a freight car',
        first: 'Running elevators most of my life. Started on the freight car. Worked up to people.',
      },
    ],
    talk: 'clipped',
  },

  landlady: {
    details: [
      {
        text: 'keeps the rent book in a drawer she locks and the key on her',
        first: 'The rent book’s in a drawer. The drawer’s locked. The key’s on me.',
        layer: 1,
      },
      {
        text: 'scrubs the front steps herself because no girl she ever paid did the corners',
        first: 'I scrub the front steps myself. I’ve paid girls to do it. They leave the corners.',
        layer: 1,
      },
      {
        text: 'takes no tenant without a reference and has kept every reference she was ever given',
        first: 'I take nobody without a reference. I’ve kept every one I was ever given. There’s a box of them.',
        layer: 1,
      },
      {
        text: 'is said by her tenants to be hard about the rent and soft about everything else',
        first: 'My tenants say I’m hard about the rent and soft about the rest. That’s fair. Rent is rent.',
        layer: 2,
      },
    ],
    history: [
      {
        text: 'came to the house through her marriage and kept it on after her husband died',
        first: 'It was my husband’s house. When he went, I kept it. People said I’d sell inside a year.',
      },
      {
        text: 'grew up in a rooming house her mother kept and took it on when her mother stopped',
        first: 'My mother kept a rooming house. I grew up carrying towels up the stairs. When she stopped, I took it on.',
      },
    ],
    talk: 'plain',
  },

  'beat-cop': {
    details: [
      {
        text: 'carries a nightstick, a whistle and a notebook, and uses the notebook most',
        first: 'Stick, whistle, notebook. The notebook gets the most use.',
        layer: 1,
      },
      {
        text: 'rings in to the station house from the call box on every round',
        first: 'I ring in from the call box every round. Miss one and the sergeant comes looking.',
        layer: 1,
      },
      {
        text: 'knows which shops on the post leave a light on at night and which forget',
        first: 'I know which shops leave a light on. And which forget. The ones that forget, I check twice.',
        layer: 1,
      },
      {
        text: 'is said by the shopkeepers on the post to be hard to argue with and harder to fool',
        first: 'People on the post say I’m hard to fool. I’d rather that than liked.',
        layer: 2,
      },
    ],
    history: [
      {
        text: 'joined the force at twenty-two because {his|her} father wore the same uniform',
        first: 'Joined at twenty-two. My father wore the same coat. Wasn’t much of a choice.',
      },
      {
        text: 'drove a delivery wagon until {he|she} passed the police examination on the first try',
        first: 'Drove a delivery wagon. Took the police examination. Passed it first try.',
      },
    ],
    talk: 'clipped',
  },

  cabbie: {
    details: [
      {
        text: 'does the crossword in the front seat between fares and takes three fares to finish one',
        first: 'I do the crossword between fares. Takes me three fares to finish one. Sometimes four.',
        layer: 1,
      },
      {
        text: 'talks to every fare whether they want it or not and hears the news before the evening newspapers',
        first: 'I talk to every fare. Some don’t want it. I hear more in a night than the evening papers print in a week.',
        layer: 1,
      },
      {
        text: 'can fix a flat tyre in the rain in ten minutes and has timed it',
        first: 'I can fix a flat in the rain in ten minutes. I’ve timed it. Fares never believe me.',
        layer: 1,
      },
      {
        text: 'is the driver the others on the stand at {place} wave over when they are lost',
        first: 'The other drivers ask me when they’re lost. They won’t say so in front of the fare. They just wave me over.',
        layer: 2,
      },
    ],
    history: [
      {
        text: 'drove a brewery truck until the country went dry and bought a cab with what was left',
        first: 'I drove a brewery truck. Prohibition closed the brewery. I bought a cab with what was left.',
      },
      {
        text: 'got {his|her} licence the week {he|she} was old enough and has driven for pay since',
        first: 'I got my licence the week I was old enough. I’ve driven for pay since, and I wouldn’t know what else to do.',
      },
    ],
    talk: 'easy',
  },

  druggist: {
    details: [
      {
        text: 'weighs out every dose on a brass scale to the grain',
        first: 'I weigh out every dose on the brass scale. To the grain. Guessing is for careless people.',
        layer: 1,
      },
      {
        text: 'mixes {his|her} own cough syrup in the back room from {his|her} own recipe',
        first: 'I mix my own cough syrup in the back. My own recipe. The children do not mind the taste.',
        layer: 1,
      },
      {
        text: 'runs a soda fountain at {place} as well and would rather not',
        first: 'There is a soda fountain as well. It pays the rent. I would rather it did not have to.',
        layer: 1,
      },
      {
        text: 'is asked for advice by people on the block who cannot pay a doctor, and gives it carefully',
        first: 'People come to me who cannot pay a doctor. I tell them what I can. When it is more than I can, I say so.',
        layer: 2,
      },
    ],
    history: [
      {
        text: 'went to the college of pharmacy at seventeen and has filled prescriptions since the day {he|she} finished',
        first: 'I went to the college of pharmacy at seventeen. I have filled prescriptions since the day I finished.',
      },
      {
        text: 'grew up over a drugstore where {his|her} father filled prescriptions before {him|her}',
        first: 'My father was a druggist. I grew up over his shop. I was rolling pills before I could spell their names.',
      },
    ],
    talk: 'careful',
  },
};

/** The character card for a suspect archetype id or a fixture key, if there is one. */
export function characterFor(key: string): RoleCharacter | undefined {
  return ROLE_CHARACTER[key];
}
