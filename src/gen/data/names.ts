/**
 * Period-appropriate names for a Manhattan residential hotel, 1900s–1930s.
 *
 * Grouped by community only so that a given name and a family name land
 * together plausibly. Nobody's community is stored on the generated Person and
 * nothing in the generator treats one pool differently from another: the
 * grouping exists to avoid pairing e.g. "Giuseppe Lefkowitz" by accident.
 *
 * To extend: add entries to any list, or add a whole community with the same
 * shape. Nothing else needs to change.
 */

export interface NamePool {
  community: string;
  given: { male: string[]; female: string[] };
  family: string[];
}

export const NAME_POOLS: NamePool[] = [
  {
    community: 'Irish',
    given: {
      male: ['Patrick', 'Michael', 'Thomas', 'James', 'Daniel', 'Cornelius', 'Edward', 'Francis', 'Martin', 'Dennis'],
      female: ['Mary', 'Bridget', 'Kathleen', 'Nora', 'Margaret', 'Eileen', 'Agnes', 'Rose', 'Delia', 'Maureen'],
    },
    family: ['Callahan', 'Donnelly', 'Mulcahy', 'Feeney', 'Kavanagh', 'Rafferty', 'Doyle', 'Brennan', 'Hanrahan', 'Sweeney', 'Corrigan', 'Quill'],
  },
  {
    community: 'Italian',
    given: {
      male: ['Salvatore', 'Vincenzo', 'Antonio', 'Domenico', 'Rocco', 'Giuseppe', 'Carmine', 'Emilio', 'Pasquale', 'Nunzio'],
      female: ['Assunta', 'Concetta', 'Rosaria', 'Filomena', 'Angelina', 'Carmela', 'Lucia', 'Domenica', 'Teresa', 'Giovanna'],
    },
    family: ['Carbone', 'Marchetti', 'Alfano', 'Petrosino', 'Ruggiero', 'Tramonti', 'Bellucci', 'Salerno', 'Vitale', 'Grasso', 'Lanza', 'Moretti'],
  },
  {
    community: 'Jewish',
    given: {
      male: ['Meyer', 'Isidore', 'Nathan', 'Hyman', 'Sol', 'Abraham', 'Louis', 'Morris', 'Jacob', 'Bernard'],
      female: ['Fannie', 'Rivka', 'Esther', 'Sadie', 'Bella', 'Minnie', 'Ida', 'Gittel', 'Rachel', 'Hannah'],
    },
    family: ['Rosenbaum', 'Shapiro', 'Lefkowitz', 'Bernstein', 'Kessler', 'Hurwitz', 'Abramowitz', 'Zeldin', 'Feldman', 'Margolis', 'Sirkin', 'Weisglass'],
  },
  {
    community: 'German',
    given: {
      male: ['Otto', 'Heinrich', 'Konrad', 'Ernst', 'Gustav', 'Wilhelm', 'Rudolf', 'Karl', 'Albrecht', 'Friedrich'],
      female: ['Elsa', 'Hedwig', 'Gretchen', 'Ilse', 'Anneliese', 'Margarethe', 'Frieda', 'Wilhelmina', 'Lotte', 'Klara'],
    },
    family: ['Brauer', 'Hochstetter', 'Vogel', 'Reinhardt', 'Schilling', 'Kreuzer', 'Lindemann', 'Wehrle', 'Obermann', 'Steinbach', 'Dettweiler', 'Hauck'],
  },
  {
    community: 'Black',
    given: {
      male: ['Elijah', 'Booker', 'Percival', 'Ezekiel', 'Wendell', 'Augustus', 'Rufus', 'Isaiah', 'Roscoe', 'Alonzo'],
      female: ['Odessa', 'Willa', 'Lurline', 'Eunice', 'Bernice', 'Clementine', 'Althea', 'Hattie', 'Vivian', 'Lorraine'],
    },
    family: ['Bledsoe', 'Tillman', 'Hargrove', 'Prentiss', 'Dandridge', 'Whitfield', 'Cheatham', 'Mosley', 'Ashby', 'Renfro', 'Colquitt', 'Broadnax'],
  },
  {
    community: 'WASP',
    given: {
      male: ['Thaddeus', 'Winthrop', 'Chandler', 'Sterling', 'Ellsworth', 'Harrison', 'Prescott', 'Grafton', 'Lyman', 'Rutherford'],
      female: ['Constance', 'Prudence', 'Verity', 'Adelaide', 'Marion', 'Edith', 'Lavinia', 'Millicent', 'Beatrice', 'Harriet'],
    },
    family: ['Ainsworth', 'Pickering', 'Lathrop', 'Winslow', 'Fairbanks', 'Crowninshield', 'Bidwell', 'Thorndike', 'Havemeyer', 'Stannard', 'Coffin', 'Ellery'],
  },
];
