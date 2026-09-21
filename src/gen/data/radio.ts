/**
 * What the bar radio carried. `content` is public knowledge; `outcome` is what
 * only somebody actually in the bar could tell you.
 */
export interface BroadcastTemplate {
  content: string;
  outcome: string;
}

export const BROADCASTS: BroadcastTemplate[] = [
  { content: 'a fight card from the Garden', outcome: 'the challenger went down in the fourth and the crowd booed' },
  { content: 'a serial about a lost heiress', outcome: 'the episode ended with the lawyer arrested, not the brother' },
  { content: 'a dance band from the Roseland', outcome: 'the band broke off twice and the announcer filled with a soap advertisement' },
  { content: 'the returns from the ward elections', outcome: 'the Ninth went the other way and the announcer said so twice' },
  { content: 'a talk on the tariff by a congressman', outcome: 'the congressman lost his place and had to start a page over' },
  { content: 'a six-day bicycle race from the Velodrome', outcome: 'a rider fell at the bank and the lead changed hands' },
];
