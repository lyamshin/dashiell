# The golden loop — the round log

Every round is measured on the same fixed set: pages one to three of seeds 1–40
at difficulty 2, rendered through the same code path as `npm run read`.

```
python3 scripts/golden-loop.py --label "round N"
```

The harness is `scripts/golden-loop.py` (measurement) over `src/cli/golden.ts`
(the page dump). Nine metrics, each with a target out of `GAP.md`; the
**aggregate distance** is the sum of the normalized distances to those targets,
and it is the number the stopping rule is read off.

Two of the nine targets are printed with the golden's own per-page numbers
beside them, because the golden does not meet them either. `orphan_word_ratio`
and `words_per_paragraph` are functions of a page's length before they are
functions of its style: the golden's office page scores 0.73 orphan and 22.4
words a paragraph, both outside GAP's table, which was measured over the two
golden pages taken together. They are still reported, and still chased where
chasing them is also good writing, but a round is not judged a failure for
missing a number the target itself was never measured at.

---

## Round 0 — the baseline

```
120 pages · 40 seeds · pages 1–3 · round 0

metric                    mean        target    dist     worst  gold p1  gold p2  page
--------------------------------------------------------------------------------------
orphan_word_ratio        0.834       <= 0.68   0.227     0.960     0.73     0.82  seed38-p3.txt
paragraph_cohesion       0.612       >= 0.65   0.058     0.200     0.67     0.80  seed21-p3.txt
sentence_cohesion        0.589       >= 0.55   0.000     0.330     0.53     0.59  seed38-p3.txt
short_share              0.158       >= 0.28   0.434     0.000     0.42     0.17  seed02-p3.txt
long_ratio               0.038 0.0625-0.1875   0.394     0.000     0.09     0.06  seed01-p2.txt
dialogue_share_p1        0.251      0.3-0.45   0.164     0.210     0.39     0.00  seed05-p1.txt
figures                  0.517          <= 1   0.000     2.000     1.00     0.00  seed06-p1.txt
plain_ratio              0.683        >= 0.6   0.000     0.500        —        —  seed01-p3.txt
words_per_paragraph     23.784         30-45   0.207    14.200    22.40    36.00  seed16-p3.txt
--------------------------------------------------------------------------------------
AGGREGATE DISTANCE       1.485
```

### The reading

The page has no rhythm at all: with a median of eleven words and a spread of
almost nothing either side of it, one sentence in six is short where the golden
runs two in five, and there is no long carrying sentence anywhere on the fixed
set to land against. Second: the client's sixteen facts arrive as four blocks
of quoted declaratives with nobody in the room asking anything, so the one page
built entirely out of speech reads as a deposition rather than a scene — the
briefing has no turns in it, and Dashiell says nothing until he names his rate.

### Page one, seeds 3, 7 and 12

**Seed 3**

```
Midnight. Two rooms over a Chinese laundry on Rivington Street, the Lower
East Side.

My knuckle had split open again, the same place as last month. It caught on
the desk drawer every time. Frost had crept across the window glass from the
inside.

Kreuzer shut the door soft, the way careful people do when doors matter to
them. Kreuzer: a crooked little finger, broken once and never reset. Collar
buttoned, no tie, and a smear of green paint at one shoulder.

A woman came up the stairs after midnight, and sat down. Gretchen Kreuzer is
30 years old and a pawnbroker’s clerk. Kreuzer writes the tickets behind the
grille and knows what a thing is worth.

“Sweeney was the reason four places on the street stayed open, and everyone
knew it. Sweeney was found dead at the suite. Sweeney was killed at the
suite, and nothing was carried out of the room afterwards.”

“The coroner puts it between 9:30 PM and 11:00 PM, which is two hours of
nothing useful. It was a blunt object. I found Sweeney at the suite at half
past eleven.”

“The precinct took a statement at the desk and filed it. I am a customer of
Sweeney’s. I came to Sweeney on Domenico Tramonti’s introduction and have
stayed a customer.”

“I have something owing with Sweeney that death did not settle. I am
spending money I was owed and may never see.”

"Start with Grasso. Grasso blamed Sweeney for the ruin of his business. You
know the rate." I did. I held out my hand, and a roll with a rubber band
round it landed in it.

Kreuzer is still in the chair. Two questions on the house — a woman hiring
you answers your questions.

Nothing is settled. If it is anybody yet, it is Grasso.
```

**Seed 7**

```
Midnight. Two rooms over a pawnshop on Great Jones Street, the Bowery.

The landlady's bill was folded under the telephone. I'd see it every time
the thing didn't ring. I decided not to open it until it did.

Salerno knocked twice, waited for the second, and came in only after I
answered. Salerno: a birthmark the shape of a thumbprint, just under the
left ear. A hem taken up an inch, the old line still showing.

A woman came up the stairs after midnight, and sat down. Lucia Salerno is 37
years old and a chambermaid. Salerno does eleven rooms a day and the linen
after.

“Brennan was the one name on the block the papers would have printed. A
japanned cash box was taken from the back lot, which is Brennan’s. Nothing
at the back lot was forced: the lock was turned and the door was shut again
after.”

“The precinct puts it between 10:00 PM and 11:30 PM. Brennan is not saying
much about what was in it. Bledsoe found the door at the back lot shut and a
japanned cash box gone, at 11:30 PM.”

“The precinct came, walked through it, and went. I am Brennan’s tenant.
Brennan put my rent up twice in a year and I paid it twice.”

“I want it established that it was not me, before anybody says otherwise. I
was near enough to it that night to know how it looks, so I am saying it
first.”

"Start with Mosley. Mosley owed Brennan four thousand dollars and was past
due on it, Dashiell, same as always," Salerno said, and kept talking through
the part where twenty dollars landed on my desk. I picked it up without
breaking Salerno's stride.

Salerno is still in the chair. Two questions on the house — a woman hiring
you answers your questions.

That money again. Nothing is settled. If it is anybody yet, it is Mosley.
```

**Seed 12**

```
Midnight. Two rooms over a pawnshop on Eighth Avenue, Chelsea.

My knuckle had split open again, the same place as last month. It caught on
the desk drawer every time. Frost had crept across the window glass from the
inside.

Tillman was talking before the door shut behind her, about the cab, the
weather, anything but the reason she'd come. Tillman: nails bitten to the
quick on the right hand only. A brooch pinned slightly crooked, like it went
on in a hurry.

A woman came up the stairs after midnight, and sat down. Odessa Tillman is
47 years old and a curb broker. Tillman trades on the street for men who
would rather not be seen doing it.

“Grasso could close a building with a signature, and had closed two. Grasso
was found dead at the benches. Grasso was not killed at the benches: there
is no blood there and no sign of a struggle.”

“The coroner puts it between 6:00 PM and 7:30 PM. It was poison in a drink,
and it happened somewhere else. I found Grasso at the benches at seven
o’clock.”

“The precinct wrote it down as a fall and closed the book on it. I am in
Grasso’s debt. Grasso carried me through a bad winter and has been
collecting on it ever since.”

“I want the one who killed Grasso found, because the precinct has stopped
looking. I know that asking questions on this block is a way of being asked
some.”

"Start with Lanza. Lanza blamed Grasso for the ruin of his business, and
here's the rest of it whether you asked or not," Tillman said. I took a
hundred dollars before Tillman had gotten halfway through the second
sentence.

Tillman is still in the chair. Two questions on the house — a woman hiring
you answers your questions.

If I had to put money down tonight, Lanza.
```

---

## Round 1 — the briefing as an exchange

```
120 pages · 40 seeds · pages 1–3 · round 1

metric                    mean        target    dist     worst  gold p1  gold p2  page
--------------------------------------------------------------------------------------
orphan_word_ratio        0.829       <= 0.68   0.219     0.960     0.73     0.82  seed38-p3.txt
paragraph_cohesion       0.595       >= 0.65   0.084     0.200     0.67     0.80  seed21-p3.txt
sentence_cohesion        0.593       >= 0.55   0.000     0.330     0.53     0.59  seed38-p3.txt
short_share              0.146       >= 0.28   0.479     0.000     0.42     0.17  seed02-p3.txt
long_ratio               0.032 0.0625-0.1875   0.496     0.000     0.09     0.06  seed01-p2.txt
dialogue_share_p1        0.269      0.3-0.45   0.103     0.210     0.39     0.00  seed05-p1.txt
figures                  0.517          <= 1   0.000     2.000     1.00     0.00  seed06-p1.txt
plain_ratio              0.696        >= 0.6   0.000     0.500        —        —  seed01-p3.txt
words_per_paragraph     20.498         30-45   0.317    14.200    22.40    36.00  seed16-p3.txt
--------------------------------------------------------------------------------------
AGGREGATE DISTANCE       1.698

gaps: no-fact ×1
```

### The reading

**The change.** The briefing is an exchange now (`golden-loop.md` §3): the client's sentences are grouped by what the case's own fields say each one is about — the standing and the givens, the discovery and the precinct, the tie and its backstory, the purpose and its cost — and Dashiell's short questions go between the groups, chosen by what the *next* group establishes. Two plain narration atoms ride with it: the business of staying in the chair, and one acknowledgement after the turn that carried what happened. New atoms live in `plain.ts` as engine data rather than in a deck, because nothing in the plain register is dealt, motif-scored or burned, and a deck entry would make all three true of them.

**What the numbers did.** The aggregate went the wrong way, 1.485 → 1.698, on two metrics that punish paragraph count: `words_per_paragraph` 23.8 → 20.5 and `paragraph_cohesion` 0.612 → 0.595. Dialogue on the briefing page moved the right way, 0.251 → 0.269. `short_share` did not move, because the sentence splitter in `style-metrics.py` will not break after a closing quotation mark — `object.” I let it stand.` counts as one sentence — so a short quoted question is invisible to it and is glued to whatever narration follows. The golden gets the same treatment, so the measure is fair, but it means the briefing's rhythm cannot be bought in quoted lines alone.

**The reading.** The page is a scene now where it was a deposition: somebody asks, somebody answers, and the facts arrive because they were asked for rather than because a list ran on. What the change exposed is the thing furthest from the golden and it is structural — the engine writes one paragraph per block, so a page of twelve blocks is twelve paragraphs of twenty words each, where the golden alternates a four-sentence paragraph that follows one thing with a two-word line of speech. Fusing what belongs together into single paragraphs is the next fix, and it is the same fix for `words_per_paragraph`, for `paragraph_cohesion` and for the sequential description of rule 3.

### Page one, seeds 3, 7 and 12

**Seed 3**

```
Midnight. Two rooms over a Chinese laundry on Rivington Street, the Lower
East Side.

My knuckle had split open again, the same place as last month. It caught on
the desk drawer every time. Frost had crept across the window glass from the
inside.

Kreuzer shut the door soft, the way careful people do when doors matter to
them. Kreuzer: a crooked little finger, broken once and never reset. Collar
buttoned, no tie, and a smear of green paint at one shoulder.

A woman came up the stairs after midnight, and sat down. Gretchen Kreuzer is
30 years old and a pawnbroker’s clerk. Kreuzer writes the tickets behind the
grille and knows what a thing is worth.

She sat with both hands folded.

“Sweeney was the reason four places on the street stayed open, and everyone
knew it. Sweeney was found dead at the suite. Sweeney was killed at the
suite, and nothing was carried out of the room afterwards.”

“The coroner puts it between 9:30 PM and 11:00 PM, which is two hours of
nothing useful. It was a blunt object.”

I let it stand.

“Tell me how it was found.”

“I found Sweeney at the suite at half past eleven. The precinct took a
statement at the desk and filed it.”

“What was your business with Sweeney?”

“I am a customer of Sweeney’s. I came to Sweeney on Domenico Tramonti’s
introduction and have stayed a customer.”

She stopped there.

“And you want what, out of it?”

“I have something owing with Sweeney that death did not settle. I am
spending money I was owed and may never see.”

“Give me a name.”

"Start with Grasso. Grasso blamed Sweeney for the ruin of his business. You
know the rate." I did. I held out my hand, and a roll with a rubber band
round it landed in it.

Kreuzer is still in the chair. Two questions on the house — a woman hiring
you answers your questions.

Nothing is settled. If it is anybody yet, it is Grasso.
```

**Seed 7**

```
Midnight. Two rooms over a pawnshop on Great Jones Street, the Bowery.

The landlady's bill was folded under the telephone. I'd see it every time
the thing didn't ring. I decided not to open it until it did.

Salerno knocked twice, waited for the second, and came in only after I
answered. Salerno: a birthmark the shape of a thumbprint, just under the
left ear. A hem taken up an inch, the old line still showing.

A woman came up the stairs after midnight, and sat down. Lucia Salerno is 37
years old and a chambermaid. Salerno does eleven rooms a day and the linen
after.

Salerno did not move for a while.

“Brennan was the one name on the block the papers would have printed. A
japanned cash box was taken from the back lot, which is Brennan’s. Nothing
at the back lot was forced: the lock was turned and the door was shut again
after.”

“The precinct puts it between 10:00 PM and 11:30 PM. Brennan is not saying
much about what was in it.”

I took it in.

“And nobody called me until now?”

“Bledsoe found the door at the back lot shut and a japanned cash box gone,
at 11:30 PM. The precinct came, walked through it, and went.”

“How well did you know Brennan?”

“I am Brennan’s tenant. Brennan put my rent up twice in a year and I paid it
twice.”

She stopped there.

“Why come to me with it?”

“I want it established that it was not me, before anybody says otherwise. I
was near enough to it that night to know how it looks, so I am saying it
first.”

“Who do you like for it?”

"Start with Mosley. Mosley owed Brennan four thousand dollars and was past
due on it, Dashiell." Salerno didn't waste breath explaining further. I took
twenty dollars the way I always did from Salerno, without counting it.

Salerno is still in the chair. Two questions on the house — a woman hiring
you answers your questions.

Nothing is settled. If it is anybody yet, it is Mosley.
```

**Seed 12**

```
Midnight. Two rooms over a pawnshop on Eighth Avenue, Chelsea.

My knuckle had split open again, the same place as last month. It caught on
the desk drawer every time. Frost had crept across the window glass from the
inside.

Tillman was talking before the door shut behind her, about the cab, the
weather, anything but the reason she'd come. Tillman: nails bitten to the
quick on the right hand only. A brooch pinned slightly crooked, like it went
on in a hurry.

A woman came up the stairs after midnight, and sat down. Odessa Tillman is
47 years old and a curb broker. Tillman trades on the street for men who
would rather not be seen doing it.

She did not lean back.

“Grasso could close a building with a signature, and had closed two. Grasso
was found dead at the benches. Grasso was not killed at the benches: there
is no blood there and no sign of a struggle.”

“The coroner puts it between 6:00 PM and 7:30 PM. It was poison in a drink,
and it happened somewhere else.”

I believed it.

“Who else was there?”

“I found Grasso at the benches at seven o’clock. The precinct wrote it down
as a fall and closed the book on it.”

“How do you come into it?”

“I am in Grasso’s debt. Grasso carried me through a bad winter and has been
collecting on it ever since.”

She took a moment.

“Say what you want.”

“I want the one who killed Grasso found, because the precinct has stopped
looking. I know that asking questions on this block is a way of being asked
some.”

“Who do you want looked at?”

"Start with Lanza. Lanza blamed Grasso for the ruin of his business,
Dashiell, same as always," Tillman said, and kept talking through the part
where a hundred dollars landed on my desk. I picked it up without breaking
Tillman's stride.

Tillman is still in the chair. Two questions on the house — a woman hiring
you answers your questions.

The money had not changed its mind about anything. If I had to put money
down tonight, Lanza.
```

---

## Round 2 — a block is not a paragraph

```
120 pages · 40 seeds · pages 1–3 · round 2

metric                    mean        target    dist     worst  gold p1  gold p2  page
--------------------------------------------------------------------------------------
orphan_word_ratio        0.829       <= 0.68   0.219     0.960     0.73     0.82  seed38-p3.txt
paragraph_cohesion       0.567       >= 0.65   0.128     0.000     0.67     0.80  seed21-p3.txt
sentence_cohesion        0.593       >= 0.55   0.000     0.330     0.53     0.59  seed38-p3.txt
short_share              0.146       >= 0.28   0.479     0.000     0.42     0.17  seed02-p3.txt
long_ratio               0.032 0.0625-0.1875   0.496     0.000     0.09     0.06  seed01-p2.txt
dialogue_share_p1        0.269      0.3-0.45   0.103     0.210     0.39     0.00  seed05-p1.txt
figures                  0.517          <= 1   0.000     2.000     1.00     0.00  seed06-p1.txt
plain_ratio              0.696        >= 0.6   0.000     0.500        —        —  seed01-p3.txt
words_per_paragraph     26.926         30-45   0.102    18.500    22.40    36.00  seed40-p1.txt
--------------------------------------------------------------------------------------
AGGREGATE DISTANCE       1.528

gaps: no-fact ×1
```

### The reading

**The change.** A block is not a paragraph. Every `say` used to be its own paragraph, which is how a page of twelve blocks came out as twelve paragraphs of twenty words. Blocks now carry a paragraph tag and adjacent blocks sharing it are fused at the end of assembly, while the paragraph stays under fifty-five words: the walk and the room it ends in; the entrance, the portrait and what she is; the note that names a room and the first thing found in it; each find with the fact that rode along on it; the thinking; and the plain top-ups at the foot of a thin page, which were three one-line paragraphs and are now one coda. The coherence number §A.2 is judged on is measured before the fusion, because the adjacency it scores is line to line and a paragraph break is not a line.

**What the numbers did.** Aggregate 1.698 → 1.528, ten per cent. `words_per_paragraph` 20.5 → 26.9, which takes its distance from 0.317 to 0.102 and is the whole of the gain. `paragraph_cohesion` went the other way again, 0.595 → 0.567, and the reason is arithmetic: the boundaries the fusion removed were the cohesive ones — a paragraph that went on following its own subject — and what is left are the hard joins between one subject and the next. Nothing else moved.

**The reading.** Seed 40's office page now reads as a scene from the first line to the last, and seed 3's suite page has a room in it rather than a list of blocks about a room. What is left is exactly what round 0 said was furthest and what two rounds have not touched: rhythm. One sentence in seven is short where the golden runs two in five, and across a hundred and twenty pages there are four long carrying sentences in total. Every sentence the engine prints is eleven words, and a page of nothing but eleven-word sentences has no shape for a fact to land in.

### Page one, seeds 3, 7 and 12

**Seed 3**

```
Midnight. Two rooms over a Chinese laundry on Rivington Street, the Lower
East Side. My knuckle had split open again, the same place as last month. It
caught on the desk drawer every time. Frost had crept across the window
glass from the inside.

Kreuzer shut the door soft, the way careful people do when doors matter to
them. Kreuzer: a crooked little finger, broken once and never reset. Collar
buttoned, no tie, and a smear of green paint at one shoulder.

A woman came up the stairs after midnight, and sat down. Gretchen Kreuzer is
30 years old and a pawnbroker’s clerk. Kreuzer writes the tickets behind the
grille and knows what a thing is worth. She sat with both hands folded.

“Sweeney was the reason four places on the street stayed open, and everyone
knew it. Sweeney was found dead at the suite. Sweeney was killed at the
suite, and nothing was carried out of the room afterwards.”

“The coroner puts it between 9:30 PM and 11:00 PM, which is two hours of
nothing useful. It was a blunt object.”

I let it stand.

“Tell me how it was found.”

“I found Sweeney at the suite at half past eleven. The precinct took a
statement at the desk and filed it.”

“What was your business with Sweeney?”

“I am a customer of Sweeney’s. I came to Sweeney on Domenico Tramonti’s
introduction and have stayed a customer.”

She stopped there.

“And you want what, out of it?”

“I have something owing with Sweeney that death did not settle. I am
spending money I was owed and may never see.”

“Give me a name.”

"Start with Grasso. Grasso blamed Sweeney for the ruin of his business. You
know the rate." I did. I held out my hand, and a roll with a rubber band
round it landed in it.

Kreuzer is still in the chair. Two questions on the house — a woman hiring
you answers your questions.

Nothing is settled. If it is anybody yet, it is Grasso.
```

**Seed 7**

```
Midnight. Two rooms over a pawnshop on Great Jones Street, the Bowery. The
landlady's bill was folded under the telephone. I'd see it every time the
thing didn't ring. I decided not to open it until it did.

Salerno knocked twice, waited for the second, and came in only after I
answered. Salerno: a birthmark the shape of a thumbprint, just under the
left ear. A hem taken up an inch, the old line still showing.

A woman came up the stairs after midnight, and sat down. Lucia Salerno is 37
years old and a chambermaid. Salerno does eleven rooms a day and the linen
after. Salerno did not move for a while.

“Brennan was the one name on the block the papers would have printed. A
japanned cash box was taken from the back lot, which is Brennan’s. Nothing
at the back lot was forced: the lock was turned and the door was shut again
after.”

“The precinct puts it between 10:00 PM and 11:30 PM. Brennan is not saying
much about what was in it.”

I took it in.

“And nobody called me until now?”

“Bledsoe found the door at the back lot shut and a japanned cash box gone,
at 11:30 PM. The precinct came, walked through it, and went.”

“How well did you know Brennan?”

“I am Brennan’s tenant. Brennan put my rent up twice in a year and I paid it
twice.”

She stopped there.

“Why come to me with it?”

“I want it established that it was not me, before anybody says otherwise. I
was near enough to it that night to know how it looks, so I am saying it
first.”

“Who do you like for it?”

"Start with Mosley. Mosley owed Brennan four thousand dollars and was past
due on it, Dashiell." Salerno didn't waste breath explaining further. I took
twenty dollars the way I always did from Salerno, without counting it.

Salerno is still in the chair. Two questions on the house — a woman hiring
you answers your questions.

Nothing is settled. If it is anybody yet, it is Mosley.
```

**Seed 12**

```
Midnight. Two rooms over a pawnshop on Eighth Avenue, Chelsea. My knuckle
had split open again, the same place as last month. It caught on the desk
drawer every time. Frost had crept across the window glass from the inside.

Tillman was talking before the door shut behind her, about the cab, the
weather, anything but the reason she'd come. Tillman: nails bitten to the
quick on the right hand only. A brooch pinned slightly crooked, like it went
on in a hurry.

A woman came up the stairs after midnight, and sat down. Odessa Tillman is
47 years old and a curb broker. Tillman trades on the street for men who
would rather not be seen doing it. She did not lean back.

“Grasso could close a building with a signature, and had closed two. Grasso
was found dead at the benches. Grasso was not killed at the benches: there
is no blood there and no sign of a struggle.”

“The coroner puts it between 6:00 PM and 7:30 PM. It was poison in a drink,
and it happened somewhere else.”

I believed it.

“Who else was there?”

“I found Grasso at the benches at seven o’clock. The precinct wrote it down
as a fall and closed the book on it.”

“How do you come into it?”

“I am in Grasso’s debt. Grasso carried me through a bad winter and has been
collecting on it ever since.”

She took a moment.

“Say what you want.”

“I want the one who killed Grasso found, because the precinct has stopped
looking. I know that asking questions on this block is a way of being asked
some.”

“Who do you want looked at?”

"Start with Lanza. Lanza blamed Grasso for the ruin of his business,
Dashiell, same as always," Tillman said, and kept talking through the part
where a hundred dollars landed on my desk. I picked it up without breaking
Tillman's stride.

Tillman is still in the chair. Two questions on the house — a woman hiring
you answers your questions.

The money had not changed its mind about anything. If I had to put money
down tonight, Lanza.
```

---

## Round 3 — rhythm

```
120 pages · 40 seeds · pages 1–3 · round 3

metric                    mean        target    dist     worst  gold p1  gold p2  page
--------------------------------------------------------------------------------------
orphan_word_ratio        0.828       <= 0.68   0.217     0.960     0.73     0.82  seed38-p3.txt
paragraph_cohesion       0.612       >= 0.65   0.059     0.170     0.67     0.80  seed08-p2.txt
sentence_cohesion        0.608       >= 0.55   0.000     0.330     0.53     0.59  seed04-p3.txt
short_share              0.204       >= 0.28   0.272     0.077     0.42     0.17  seed37-p3.txt
long_ratio               0.067 0.0625-0.1875   0.000     0.000     0.09     0.06  seed01-p2.txt
dialogue_share_p1        0.267      0.3-0.45   0.109     0.220     0.39     0.00  seed05-p1.txt
figures                  0.475          <= 1   0.000     2.000     1.00     0.00  seed06-p1.txt
plain_ratio              0.707        >= 0.6   0.000     0.500        —        —  seed03-p3.txt
words_per_paragraph     26.880         30-45   0.104    18.000    22.40    36.00  seed38-p3.txt
--------------------------------------------------------------------------------------
AGGREGATE DISTANCE       0.761

gaps: no-fact ×1
```

### The reading

**The change.** Rhythm, which GAP.md says is not a card but an assembly decision, in two parts. First, two pools of short plain atoms — the notebook after something is found, and taking stock of a room without saying what is in it — placed at fixed joints: one inside the room's own paragraph, one at the head of the thinking. Two to six words each, carrying no image and asserting nothing about the case, because the assembler puts them wherever the rhythm wants one. Second, the carrying sentence: once a page, the two adjacent sentences in one paragraph whose combined length lands between twenty-two and thirty-four words are joined with a comma and an "and". No deck can hand the page a long sentence, because every card and every generated fact is written short to mid; the only way to have the one sentence in eight that carries the weight is for the assembler to make it out of two the page already says.

**What the numbers did.** Aggregate 1.528 → 0.761, a halving, and the first target met that was not met at round 0: `long_ratio` 0.032 → 0.067, inside the band. `short_share` 0.146 → 0.204, `paragraph_cohesion` 0.567 → 0.612 — the short atoms open on "I" and "That" and hand the next paragraph a reference — and `sentence_cohesion` 0.593 → 0.608. Two guards cost the round some of its long sentences and are not negotiable: a block carrying a clue is never joined, because a record reaches the page verbatim or it has not reached the page, and the block hosting the page's simile is never joined, because §A.3 already made a clause of those words. The checker caught the one real hazard — a card that opens "The parlour held two boarders" becomes ", and the parlour held…", which is the same phrase the writer wrote, spelled the way the place templates spell it — and the engine's vocabulary now harvests a card's lower-cased opening the same way it already harvests its capitalized one.

**The reading.** Seed 3's suite page has the long-then-short move on it now — thirty-one words of coming into an empty room, and then "So much for the suite." — which is the single most identifiable thing in the corpus and the engine had never once produced it. What is left furthest from the golden is still shortness, at 0.204 against 0.42 on the golden's office page, and behind it the density: five content words in six on a page appear once and never again, because nothing the engine writes picks a noun back up. Those are one problem, not two — a page that reuses its nouns says "the coat" in three words where a page that does not needs eleven to introduce something new.

### Page one, seeds 3, 7 and 12

**Seed 3**

```
Midnight. Two rooms over a Chinese laundry on Rivington Street, the Lower
East Side. My knuckle had split open again, the same place as last month. It
caught on the desk drawer every time. Frost had crept across the window
glass from the inside.

Kreuzer shut the door soft, the way careful people do when doors matter to
them. Kreuzer: a crooked little finger, broken once and never reset. Collar
buttoned, no tie, and a smear of green paint at one shoulder.

A woman came up the stairs after midnight, and sat down. Gretchen Kreuzer is
30 years old and a pawnbroker’s clerk. Kreuzer writes the tickets behind the
grille and knows what a thing is worth. She sat with both hands folded.

“Sweeney was the reason four places on the street stayed open, and everyone
knew it. Sweeney was found dead at the suite. Sweeney was killed at the
suite, and nothing was carried out of the room afterwards.”

“The coroner puts it between 9:30 PM and 11:00 PM, which is two hours of
nothing useful. It was a blunt object.”

I let it stand.

“Tell me how it was found.”

“I found Sweeney at the suite at half past eleven. The precinct took a
statement at the desk and filed it.”

“What was your business with Sweeney?”

“I am a customer of Sweeney’s. I came to Sweeney on Domenico Tramonti’s
introduction and have stayed a customer.”

She stopped there.

“And you want what, out of it?”

“I have something owing with Sweeney that death did not settle. I am
spending money I was owed and may never see.”

“Give me a name.”

"Start with Grasso. Grasso blamed Sweeney for the ruin of his business. You
know the rate." I did. I held out my hand, and a roll with a rubber band
round it landed in it.

Kreuzer is still in the chair. Two questions on the house — a woman hiring
you answers your questions.

The book took it. Nothing is settled. If it is anybody yet, it is Grasso.
```

**Seed 7**

```
Midnight. Two rooms over a pawnshop on Great Jones Street, the Bowery. The
landlady's bill was folded under the telephone. I'd see it every time the
thing didn't ring. I decided not to open it until it did.

Salerno knocked twice, waited for the second, and came in only after I
answered. Salerno: a birthmark the shape of a thumbprint, just under the
left ear, and a hem taken up an inch, the old line still showing.

A woman came up the stairs after midnight, and sat down. Lucia Salerno is 37
years old and a chambermaid. Salerno does eleven rooms a day and the linen
after. Salerno did not move for a while.

“Brennan was the one name on the block the papers would have printed. A
japanned cash box was taken from the back lot, which is Brennan’s. Nothing
at the back lot was forced: the lock was turned and the door was shut again
after.”

“The precinct puts it between 10:00 PM and 11:30 PM. Brennan is not saying
much about what was in it.”

I took it in.

“And nobody called me until now?”

“Bledsoe found the door at the back lot shut and a japanned cash box gone,
at 11:30 PM. The precinct came, walked through it, and went.”

“How well did you know Brennan?”

“I am Brennan’s tenant. Brennan put my rent up twice in a year and I paid it
twice.”

She stopped there.

“Why come to me with it?”

“I want it established that it was not me, before anybody says otherwise. I
was near enough to it that night to know how it looks, so I am saying it
first.”

“Who do you like for it?”

"Start with Mosley. Mosley owed Brennan four thousand dollars and was past
due on it, Dashiell." Salerno didn't waste breath explaining further. I took
twenty dollars the way I always did from Salerno, without counting it.

Salerno is still in the chair. Two questions on the house — a woman hiring
you answers your questions.

I had it on paper. Nobody had moved the money. Nothing is settled. If it is
anybody yet, it is Mosley.
```

**Seed 12**

```
Midnight. Two rooms over a pawnshop on Eighth Avenue, Chelsea. My knuckle
had split open again, the same place as last month. It caught on the desk
drawer every time. Frost had crept across the window glass from the inside.

Tillman was talking before the door shut behind her, about the cab, the
weather, anything but the reason she'd come. Tillman: nails bitten to the
quick on the right hand only, and a brooch pinned slightly crooked, like it
went on in a hurry.

A woman came up the stairs after midnight, and sat down. Odessa Tillman is
47 years old and a curb broker. Tillman trades on the street for men who
would rather not be seen doing it. She did not lean back.

“Grasso could close a building with a signature, and had closed two. Grasso
was found dead at the benches. Grasso was not killed at the benches: there
is no blood there and no sign of a struggle.”

“The coroner puts it between 6:00 PM and 7:30 PM. It was poison in a drink,
and it happened somewhere else.”

I believed it.

“Who else was there?”

“I found Grasso at the benches at seven o’clock. The precinct wrote it down
as a fall and closed the book on it.”

“How do you come into it?”

“I am in Grasso’s debt. Grasso carried me through a bad winter and has been
collecting on it ever since.”

She took a moment.

“Say what you want.”

“I want the one who killed Grasso found, because the precinct has stopped
looking. I know that asking questions on this block is a way of being asked
some.”

“Who do you want looked at?”

"Start with Lanza. Lanza blamed Grasso for the ruin of his business,
Dashiell, same as always," Tillman said, and kept talking through the part
where a hundred dollars landed on my desk. I picked it up without breaking
Tillman's stride.

Tillman is still in the chair. Two questions on the house — a woman hiring
you answers your questions.

I put it in the book. If I had to put money down tonight, Lanza.
```

---

## Round 4 — a quarter of the sentences, short

```
120 pages · 40 seeds · pages 1–3 · round 4

metric                    mean        target    dist     worst  gold p1  gold p2  page
--------------------------------------------------------------------------------------
orphan_word_ratio        0.827       <= 0.68   0.217     0.960     0.73     0.82  seed38-p3.txt
paragraph_cohesion       0.598       >= 0.65   0.080     0.170     0.67     0.80  seed08-p2.txt
sentence_cohesion        0.616       >= 0.55   0.000     0.330     0.53     0.59  seed26-p3.txt
short_share              0.248       >= 0.28   0.114     0.083     0.42     0.17  seed38-p3.txt
long_ratio               0.064 0.0625-0.1875   0.000     0.000     0.09     0.06  seed01-p2.txt
dialogue_share_p1        0.268      0.3-0.45   0.106     0.210     0.39     0.00  seed05-p1.txt
figures                  0.475          <= 1   0.000     2.000     1.00     0.00  seed06-p1.txt
plain_ratio              0.731        >= 0.6   0.000     0.500        —        —  seed07-p3.txt
words_per_paragraph     26.977         30-45   0.101    17.000    22.40    36.00  seed40-p1.txt
--------------------------------------------------------------------------------------
AGGREGATE DISTANCE       0.617

gaps: no-fact ×1
```

### The reading

**The change.** §5's first half, stated as a rule and enforced as one: a finished page counts its own sentences and, while fewer than a quarter of them are six words or shorter, appends a beat of five words or fewer to the end of a paragraph that is not dialogue — at most three, one to a paragraph, never past the word ceiling. The beats assert nothing about the case because the pass puts them where the arithmetic wants one and cannot know what the page has established. With it, two smaller things: "Sit down." in the client's face before she starts talking, which is the golden's own second line and the shortest thing on page one; and a fix to a repetition the round exposed — the plain register avoided only the connective it had just used, so a page could say "Nobody stopped me at the door of the cab stand" twice, once as the arrival and once as a top-up. It now walks past everything the page has already spent.

**What the numbers did.** Aggregate 0.761 → 0.617. `short_share` 0.204 → 0.248 against a target of 0.28, which takes the largest remaining distance from 0.272 to 0.114, and `plain_ratio` 0.707 → 0.731. `paragraph_cohesion` fell 0.612 → 0.598 and the cause is the opener: a line of dialogue is its own paragraph, it opens on a quotation mark and a verb, and it shares no word with what came before it. The golden's page pays the same price and earns it back, because its questions pick up a noun from the answer before them. `dialogue_share_p1` did not move at all, 0.267 → 0.268, because the beats this round adds are not dialogue and they dilute the share as fast as the opener raises it.

**The reading.** Page three of a run is the page that has changed most: seed 37's cab stand used to be nine sentences of the same length in a row and now has "I gave the cab stand a look. I had time." in the middle of it and a thirty-four word sentence carrying the stand itself. What is left furthest, now that rhythm is inside its band, is the thing the golden's fifth rule is about and no round has touched: nothing on an engine page picks up a noun from the paragraph before it. Dashiell's questions are drawn by what the *next* turn establishes and not by what the last one said, which is half a joiner; the other half is what would make the briefing read as two people in a room rather than a questionnaire.

### Page one, seeds 3, 7 and 12

**Seed 3**

```
Midnight. Two rooms over a Chinese laundry on Rivington Street, the Lower
East Side. My knuckle had split open again, the same place as last month. It
caught on the desk drawer every time. Frost had crept across the window
glass from the inside.

Kreuzer shut the door soft, the way careful people do when doors matter to
them. Kreuzer: a crooked little finger, broken once and never reset. Collar
buttoned, no tie, and a smear of green paint at one shoulder.

A woman came up the stairs after midnight, and sat down. Gretchen Kreuzer is
30 years old and a pawnbroker’s clerk. Kreuzer writes the tickets behind the
grille and knows what a thing is worth. She sat with both hands folded.

“Go ahead.”

“Sweeney was the reason four places on the street stayed open, and everyone
knew it. Sweeney was found dead at the suite. Sweeney was killed at the
suite, and nothing was carried out of the room afterwards.”

“The coroner puts it between 9:30 PM and 11:00 PM, which is two hours of
nothing useful. It was a blunt object.”

I had heard worse.

“Where was it found?”

“I found Sweeney at the suite at half past eleven. The precinct took a
statement at the desk and filed it.”

“How do you come into it?”

“I am a customer of Sweeney’s. I came to Sweeney on Domenico Tramonti’s
introduction and have stayed a customer.”

She did not finish the sentence.

“What do you want done?”

“I have something owing with Sweeney that death did not settle. I am
spending money I was owed and may never see.”

“Who comes to mind?”

"Start with Grasso. Grasso blamed Sweeney for the ruin of his business. You
know the rate." I did. I held out my hand, and a roll with a rubber band
round it landed in it.

Kreuzer is still in the chair. Two questions on the house — a woman hiring
you answers your questions.

Down it went. Nothing is settled. If it is anybody yet, it is Grasso.
```

**Seed 7**

```
Midnight. Two rooms over a pawnshop on Great Jones Street, the Bowery. The
landlady's bill was folded under the telephone. I'd see it every time the
thing didn't ring. I decided not to open it until it did.

Salerno knocked twice, waited for the second, and came in only after I
answered. Salerno: a birthmark the shape of a thumbprint, just under the
left ear, and a hem taken up an inch, the old line still showing.

A woman came up the stairs after midnight, and sat down. Lucia Salerno is 37
years old and a chambermaid. Salerno does eleven rooms a day and the linen
after. Salerno did not move for a while.

“I am listening.”

“Brennan was the one name on the block the papers would have printed. A
japanned cash box was taken from the back lot, which is Brennan’s. Nothing
at the back lot was forced: the lock was turned and the door was shut again
after.”

“The precinct puts it between 10:00 PM and 11:30 PM. Brennan is not saying
much about what was in it.”

I took it in.

“What did you see first?”

“Bledsoe found the door at the back lot shut and a japanned cash box gone,
at 11:30 PM. The precinct came, walked through it, and went.”

“What brought you to the back lot?”

“I am Brennan’s tenant. Brennan put my rent up twice in a year and I paid it
twice.”

Salerno did not go on right away.

“Why me?”

“I want it established that it was not me, before anybody says otherwise. I
was near enough to it that night to know how it looks, so I am saying it
first.”

“Name somebody.”

"Start with Mosley. Mosley owed Brennan four thousand dollars and was past
due on it. You know the rate." I did. I held out my hand, and twenty dollars
landed in it.

Salerno is still in the chair. Two questions on the house — a woman hiring
you answers your questions.

I put it in the book. Nothing is settled. If it is anybody yet, it is
Mosley.
```

**Seed 12**

```
Midnight. Two rooms over a pawnshop on Eighth Avenue, Chelsea. My knuckle
had split open again, the same place as last month. It caught on the desk
drawer every time. Frost had crept across the window glass from the inside.

Tillman was talking before the door shut behind her, about the cab, the
weather, anything but the reason she'd come. Tillman: nails bitten to the
quick on the right hand only, and a brooch pinned slightly crooked, like it
went on in a hurry.

A woman came up the stairs after midnight, and sat down. Odessa Tillman is
47 years old and a curb broker. Tillman trades on the street for men who
would rather not be seen doing it. She did not lean back.

“Take your time.”

“Grasso could close a building with a signature, and had closed two. Grasso
was found dead at the benches. Grasso was not killed at the benches: there
is no blood there and no sign of a struggle.”

“The coroner puts it between 6:00 PM and 7:30 PM. It was poison in a drink,
and it happened somewhere else.”

I let it stand.

“What time was that?”

“I found Grasso at the benches at seven o’clock. The precinct wrote it down
as a fall and closed the book on it.”

“What brought you to the suite?”

“I am in Grasso’s debt. Grasso carried me through a bad winter and has been
collecting on it ever since.”

Neither of us spoke.

“Why come to me with it?”

“I want the one who killed Grasso found, because the precinct has stopped
looking. I know that asking questions on this block is a way of being asked
some.”

“Where would you have me start?”

"Start with Lanza. Lanza blamed Grasso for the ruin of his business,
Dashiell, same as always," Tillman said, and kept talking through the part
where a hundred dollars landed on my desk. I picked it up without breaking
Tillman's stride.

Tillman is still in the chair. Two questions on the house — a woman hiring
you answers your questions.

I had it on paper. If I had to put money down tonight, Lanza.
```

---

## Round 5 — joiners

```
120 pages · 40 seeds · pages 1–3 · round 5

metric                    mean        target    dist     worst  gold p1  gold p2  page
--------------------------------------------------------------------------------------
orphan_word_ratio        0.828       <= 0.68   0.218     0.960     0.73     0.82  seed38-p3.txt
paragraph_cohesion       0.653       >= 0.65   0.000     0.170     0.67     0.80  seed08-p2.txt
sentence_cohesion        0.632       >= 0.55   0.000     0.330     0.53     0.59  seed26-p3.txt
short_share              0.248       >= 0.28   0.114     0.080     0.42     0.17  seed14-p1.txt
long_ratio               0.065 0.0625-0.1875   0.000     0.000     0.09     0.06  seed01-p2.txt
dialogue_share_p1        0.268      0.3-0.45   0.106     0.210     0.39     0.00  seed05-p1.txt
figures                  0.475          <= 1   0.000     2.000     1.00     0.00  seed06-p1.txt
plain_ratio              0.731        >= 0.6   0.000     0.500        —        —  seed07-p3.txt
words_per_paragraph     26.946         30-45   0.102    17.200    22.40    36.00  seed40-p1.txt
--------------------------------------------------------------------------------------
AGGREGATE DISTANCE       0.539

gaps: no-fact ×1
```

### The reading

**The change.** §2's joiners, in the two places a diagnostic said the cohesion was actually being lost. Of four hundred and ninety paragraph openings that picked up nothing from the paragraph above them, a hundred and thirty were Dashiell's own questions: they were chosen by what the *next* turn establishes and by nothing the last turn said, which is half a joiner. They now pick up a noun from what she has just told him — of the shapes that fit, the one naming something she has just named wins — and the pools were given shapes with the page's own nouns in them for the joiner to reach for. `{dead}` is filled on a murder and left empty on a robbery or a disappearance, where the owner is alive and the missing person was never found, so "Who found Brennan?" is a shape that is simply skipped. The second fix is an ordering one that has been wrong since round 1: the generator's "A woman came up the stairs after midnight, and sat down" arrived two paragraphs after the door had shut and the portrait had been read. It goes in front now — stairs, knock, coat, hand, which is the golden's order — and it hands the entrance paragraph the word "midnight", which is what the paragraph above it opens on.

**What the numbers did.** Aggregate 0.617 → 0.539. `paragraph_cohesion` 0.598 → 0.652, which meets its target, and `sentence_cohesion` 0.616 → 0.632. Five of the nine targets are met now: paragraph cohesion, sentence cohesion, long sentences, figures and the plain ratio. Nothing regressed.

**The reading.** Seed 3's office page now reads in the order the scene happens in, and the questions sound like a man listening: "Where was Sweeney found?" gets "I found Sweeney at the suite at half past eleven", and "What brought you to the suite?" gets what she was doing there. That is rule 2 of the golden doing what it is for — the detective's turns are one line each and they force the next fact out. What is left is small and stubborn: the briefing page is still only a quarter dialogue against the golden's two fifths, because four questions and four long answers is a ratio the generator's sentence count decides and not the assembler; and the orphan-word figure has not moved a point in five rounds, which is the one number on the table that no assembly decision can reach.

### Page one, seeds 3, 7 and 12

**Seed 3**

```
Midnight. Two rooms over a Chinese laundry on Rivington Street, the Lower
East Side. My knuckle had split open again, the same place as last month. It
caught on the desk drawer every time. Frost had crept across the window
glass from the inside.

A woman came up the stairs after midnight, and sat down. Kreuzer shut the
door soft, the way careful people do when doors matter to them. Kreuzer: a
crooked little finger, broken once and never reset. Collar buttoned, no tie,
and a smear of green paint at one shoulder.

Gretchen Kreuzer is 30 years old and a pawnbroker’s clerk. Kreuzer writes
the tickets behind the grille and knows what a thing is worth. She sat with
both hands folded.

“Go ahead.”

“Sweeney was the reason four places on the street stayed open, and everyone
knew it. Sweeney was found dead at the suite. Sweeney was killed at the
suite, and nothing was carried out of the room afterwards.”

“The coroner puts it between 9:30 PM and 11:00 PM, which is two hours of
nothing useful. It was a blunt object.”

I had heard worse.

“Where was Sweeney found?”

“I found Sweeney at the suite at half past eleven. The precinct took a
statement at the desk and filed it.”

“What brought you to the suite?”

“I am a customer of Sweeney’s. I came to Sweeney on Domenico Tramonti’s
introduction and have stayed a customer.”

I let Kreuzer sit with it.

“You could have let it alone.”

“I have something owing with Sweeney that death did not settle. I am
spending money I was owed and may never see.”

“Who would do that to Sweeney?”

"Start with Grasso. Grasso blamed Sweeney for the ruin of his business. You
know the rate." I did. I held out my hand, and a roll with a rubber band
round it landed in it.

Kreuzer is still in the chair. Two questions on the house — a woman hiring
you answers your questions.

Down it went. Nothing is settled. If it is anybody yet, it is Grasso.
```

**Seed 7**

```
Midnight. Two rooms over a pawnshop on Great Jones Street, the Bowery. The
landlady's bill was folded under the telephone. I'd see it every time the
thing didn't ring. I decided not to open it until it did.

A woman came up the stairs after midnight, and sat down. Salerno knocked
twice, waited for the second, and came in only after I answered. Salerno: a
birthmark the shape of a thumbprint, just under the left ear, and a hem
taken up an inch, the old line still showing.

Lucia Salerno is 37 years old and a chambermaid. Salerno does eleven rooms a
day and the linen after. Salerno did not move for a while.

“I am listening.”

“Brennan was the one name on the block the papers would have printed. A
japanned cash box was taken from the back lot, which is Brennan’s. Nothing
at the back lot was forced: the lock was turned and the door was shut again
after.”

“The precinct puts it between 10:00 PM and 11:30 PM. Brennan is not saying
much about what was in it.”

I took it in.

“What about the back lot?”

“Bledsoe found the door at the back lot shut and a japanned cash box gone,
at 11:30 PM. The precinct came, walked through it, and went.”

“What brought you to the back lot?”

“I am Brennan’s tenant. Brennan put my rent up twice in a year and I paid it
twice.”

Salerno did not go on right away.

“What is Brennan to you now?”

“I want it established that it was not me, before anybody says otherwise. I
was near enough to it that night to know how it looks, so I am saying it
first.”

“Who would do that to Brennan?”

"Start with Mosley. Mosley owed Brennan four thousand dollars and was past
due on it. You know the rate." I did. I held out my hand, and twenty dollars
landed in it.

Salerno is still in the chair. Two questions on the house — a woman hiring
you answers your questions.

I put it in the book. Nothing is settled. If it is anybody yet, it is
Mosley.
```

**Seed 12**

```
Midnight. Two rooms over a pawnshop on Eighth Avenue, Chelsea. My knuckle
had split open again, the same place as last month. It caught on the desk
drawer every time. Frost had crept across the window glass from the inside.

A woman came up the stairs after midnight, and sat down. Tillman was talking
before the door shut behind her, about the cab, the weather, anything but
the reason she'd come. Tillman: nails bitten to the quick on the right hand
only, and a brooch pinned slightly crooked, like it went on in a hurry.

Odessa Tillman is 47 years old and a curb broker. Tillman trades on the
street for men who would rather not be seen doing it. She did not lean back.

“Take your time.”

“Grasso could close a building with a signature, and had closed two. Grasso
was found dead at the benches. Grasso was not killed at the benches: there
is no blood there and no sign of a struggle.”

“The coroner puts it between 6:00 PM and 7:30 PM. It was poison in a drink,
and it happened somewhere else.”

I let it stand.

“Who else was there?”

“I found Grasso at the benches at seven o’clock. The precinct wrote it down
as a fall and closed the book on it.”

“How well did you know Grasso?”

“I am in Grasso’s debt. Grasso carried me through a bad winter and has been
collecting on it ever since.”

Neither of us spoke.

“What is Grasso to you now?”

“I want the one who killed Grasso found, because the precinct has stopped
looking. I know that asking questions on this block is a way of being asked
some.”

“Who wanted this of Grasso?”

"Start with Lanza. Lanza blamed Grasso for the ruin of his business,
Dashiell, same as always," Tillman said, and kept talking through the part
where a hundred dollars landed on my desk. I picked it up without breaking
Tillman's stride.

Tillman is still in the chair. Two questions on the house — a woman hiring
you answers your questions.

I had it on paper. If I had to put money down tonight, Lanza.
```

---

## Round 6 — the briefing gets interrupted

```
120 pages · 40 seeds · pages 1–3 · round 6

metric                    mean        target    dist     worst  gold p1  gold p2  page
--------------------------------------------------------------------------------------
orphan_word_ratio        0.825       <= 0.68   0.214     0.960     0.73     0.82  seed38-p3.txt
paragraph_cohesion       0.660       >= 0.65   0.000     0.170     0.67     0.80  seed08-p2.txt
sentence_cohesion        0.637       >= 0.55   0.000     0.330     0.53     0.59  seed26-p3.txt
short_share              0.247       >= 0.28   0.116     0.083     0.42     0.17  seed38-p3.txt
long_ratio               0.074 0.0625-0.1875   0.000     0.000     0.09     0.06  seed01-p2.txt
dialogue_share_p1        0.323      0.3-0.45   0.000     0.260     0.39     0.00  seed15-p1.txt
figures                  0.475          <= 1   0.000     2.000     1.00     0.00  seed06-p1.txt
plain_ratio              0.733        >= 0.6   0.000     0.500        —        —  seed07-p3.txt
words_per_paragraph     26.670         30-45   0.111    15.200    22.40    36.00  seed40-p1.txt
--------------------------------------------------------------------------------------
AGGREGATE DISTANCE       0.441

gaps: no-fact ×1
```

### The reading

**The change.** The briefing gets interrupted. Her sentences go two to a paragraph rather than three, with a prod between — "And?", "Go on about Sweeney.", "And the suite?" — where the page has the words to spare, which the opening checks before it spends them. The prods take the same joiner the questions took in round 5, so a prod picks up a noun from the sentence it interrupts, and the joiner is now capped: a word is worth two the first time a question hands it over, one the second time and nothing the third. Without the cap every question on the page named the victim, because she says his name in every sentence she has, and five questions in a row naming the same man is a tic and not a joint. The paragraph ceiling also went from fifty-five words to sixty, which is under the golden's longest paragraph and buys a word a paragraph.

**What the numbers did.** Aggregate 0.539 → 0.441, the largest single-round gain since rhythm. `dialogue_share_p1` 0.268 → 0.323, which meets its target and is the sixth of nine met; `paragraph_cohesion` held at 0.660 through a change that adds five one-line paragraphs to page one, which is what the capped joiner bought; `long_ratio` 0.065 → 0.074, further inside the band; `words_per_paragraph` slipped 27.5 → 26.7, which is the price of the prods and was paid on purpose.

**The reading.** Seed 3's briefing alternates now — the victim, the room, the victim, the room — and reads as two people rather than one person reading a statement into the record. The three targets left are the three the loop cannot reach by assembling: the orphan-word ratio has not moved a point in six rounds and will not, the words-a-paragraph figure is within a word of where the golden's own office page sits, and the short-sentence share is two thirds of the way and the rest of it is padding rather than writing. The next round is the last honest one.

### Page one, seeds 3, 7 and 12

**Seed 3**

```
Midnight. Two rooms over a Chinese laundry on Rivington Street, the Lower
East Side. My knuckle had split open again, the same place as last month. It
caught on the desk drawer every time. Frost had crept across the window
glass from the inside.

A woman came up the stairs after midnight, and sat down. Kreuzer shut the
door soft, the way careful people do when doors matter to them. Kreuzer: a
crooked little finger, broken once and never reset. Collar buttoned, no tie,
and a smear of green paint at one shoulder.

Gretchen Kreuzer is 30 years old and a pawnbroker’s clerk. Kreuzer writes
the tickets behind the grille and knows what a thing is worth. She sat with
both hands folded.

“Go ahead.”

“Sweeney was the reason four places on the street stayed open, and everyone
knew it. Sweeney was found dead at the suite.”

“And Sweeney?”

“Sweeney was killed at the suite, and nothing was carried out of the room
afterwards. The coroner puts it between 9:30 PM and 11:00 PM, which is two
hours of nothing useful.”

“And the suite?”

“It was a blunt object.”

That fit.

“Where was Sweeney found?”

“I found Sweeney at the suite at half past eleven. The precinct took a
statement at the desk and filed it.”

“What brought you to the suite?”

“I am a customer of Sweeney’s. I came to Sweeney on Domenico Tramonti’s
introduction and have stayed a customer.”

She stopped there.

“You could have let it alone.”

“I have something owing with Sweeney that death did not settle. I am
spending money I was owed and may never see.”

“Who would you start with?”

"Start with Grasso. Grasso blamed Sweeney for the ruin of his business. You
know the rate." I did. I held out my hand, and a roll with a rubber band
round it landed in it.

Kreuzer is still in the chair. Two questions on the house — a woman hiring
you answers your questions.

I noted it. Nothing is settled. If it is anybody yet, it is Grasso.
```

**Seed 7**

```
Midnight. Two rooms over a pawnshop on Great Jones Street, the Bowery. The
landlady's bill was folded under the telephone. I'd see it every time the
thing didn't ring. I decided not to open it until it did.

A woman came up the stairs after midnight, and sat down. Salerno knocked
twice, waited for the second, and came in only after I answered. Salerno: a
birthmark the shape of a thumbprint, just under the left ear, and a hem
taken up an inch, the old line still showing.

Lucia Salerno is 37 years old and a chambermaid. Salerno does eleven rooms a
day and the linen after. Salerno did not move for a while.

“I am listening.”

“Brennan was the one name on the block the papers would have printed. A
japanned cash box was taken from the back lot, which is Brennan’s.”

“Go back to the back lot.”

“Nothing at the back lot was forced: the lock was turned and the door was
shut again after. The precinct puts it between 10:00 PM and 11:30 PM.”

“And the back lot?”

“Brennan is not saying much about what was in it.”

That fit.

“What about Brennan, then?”

“Bledsoe found the door at the back lot shut and a japanned cash box gone,
at 11:30 PM. The precinct came, walked through it, and went.”

“What were you doing there?”

“I am Brennan’s tenant. Brennan put my rent up twice in a year and I paid it
twice.”

Neither of us spoke.

“What is Brennan to you now?”

“I want it established that it was not me, before anybody says otherwise. I
was near enough to it that night to know how it looks, so I am saying it
first.”

“Who would do that to Brennan?”

"Start with Mosley. Mosley owed Brennan four thousand dollars and was past
due on it, Dashiell." Salerno didn't waste breath explaining further. I took
twenty dollars the way I always did from Salerno, without counting it.

Salerno is still in the chair. Two questions on the house — a woman hiring
you answers your questions.

I marked it down. I kept coming back to the money. Nothing is settled. If it
is anybody yet, it is Mosley.
```

**Seed 12**

```
Midnight. Two rooms over a pawnshop on Eighth Avenue, Chelsea. My knuckle
had split open again, the same place as last month. It caught on the desk
drawer every time. Frost had crept across the window glass from the inside.

A woman came up the stairs after midnight, and sat down. Tillman was talking
before the door shut behind her, about the cab, the weather, anything but
the reason she'd come. Tillman: nails bitten to the quick on the right hand
only, and a brooch pinned slightly crooked, like it went on in a hurry.

Odessa Tillman is 47 years old and a curb broker. Tillman trades on the
street for men who would rather not be seen doing it. She did not lean back.

“Take your time.”

“Grasso could close a building with a signature, and had closed two. Grasso
was found dead at the benches.”

“Go on about Grasso.”

“Grasso was not killed at the benches: there is no blood there and no sign
of a struggle. The coroner puts it between 6:00 PM and 7:30 PM.”

“What else about Grasso?”

“It was poison in a drink, and it happened somewhere else.”

I believed it.

“Who else was there?”

“I found Grasso at the benches at seven o’clock. The precinct wrote it down
as a fall and closed the book on it.”

“How do you come into it?”

“I am in Grasso’s debt. Grasso carried me through a bad winter and has been
collecting on it ever since.”

I did not press Tillman.

“Why me?”

“I want the one who killed Grasso found, because the precinct has stopped
looking. I know that asking questions on this block is a way of being asked
some.”

“Who do you want looked at?”

"Start with Lanza. Lanza blamed Grasso for the ruin of his business,
Dashiell, same as always," Tillman said, and kept talking through the part
where a hundred dollars landed on my desk. I picked it up without breaking
Tillman's stride.

Tillman is still in the chair. Two questions on the house — a woman hiring
you answers your questions.

I set it down. I kept coming back to the money. If I had to put money down
tonight, Lanza.
```

---

## Round 7 — calibrating the short floor

```
120 pages · 40 seeds · pages 1–3 · round 7

metric                    mean        target    dist     worst  gold p1  gold p2  page
--------------------------------------------------------------------------------------
orphan_word_ratio        0.822       <= 0.68   0.209     0.960     0.73     0.82  seed38-p3.txt
paragraph_cohesion       0.661       >= 0.65   0.000     0.170     0.67     0.80  seed08-p2.txt
sentence_cohesion        0.647       >= 0.55   0.000     0.360     0.53     0.59  seed38-p3.txt
short_share              0.271       >= 0.28   0.031     0.083     0.42     0.17  seed38-p3.txt
long_ratio               0.072 0.0625-0.1875   0.000     0.000     0.09     0.06  seed01-p2.txt
dialogue_share_p1        0.323      0.3-0.45   0.000     0.260     0.39     0.00  seed15-p1.txt
figures                  0.475          <= 1   0.000     2.000     1.00     0.00  seed06-p1.txt
plain_ratio              0.743        >= 0.6   0.000     0.500        —        —  seed07-p3.txt
words_per_paragraph     27.018         30-45   0.099    15.200    22.40    36.00  seed40-p1.txt
--------------------------------------------------------------------------------------
AGGREGATE DISTANCE       0.340

gaps: no-fact ×1
```

### The reading

**The change.** One number and one pool. §5 says "at least a quarter" and GAP.md asks for a mean of 0.28 across the fixed set; a page floor of a quarter produced a mean of 0.25, because almost every page sits exactly on the floor and there is no tail above it to pull the mean up. The floor is set at 0.30 to land the mean where the target is, with a fourth beat allowed, and not a point higher: past that the beats stop being rhythm and a page of four-word sentences is as flat as a page of eleven-word ones. The beat pool also lost the three atoms that imply somebody else is in the room — "Nobody said anything" on the end of a paragraph about chalk marks in an empty flat is a beat placed where the pass could not know better.

**What the numbers did.** Aggregate 0.441 → 0.340. `short_share` 0.247 → 0.271 against 0.28, which takes the largest remaining distance to 0.031; `sentence_cohesion` 0.638 → 0.647 and `plain_ratio` 0.733 → 0.743 came with it, and `words_per_paragraph` went up rather than down because a beat is words inside a paragraph rather than a paragraph of its own. Six of nine targets met, and a seventh within a hundredth.

**What was tried and reverted.** §6 allows the image budget to be lowered to two a page. It was, and the aggregate went the wrong way — 0.340 to 0.354 — while the orphan ratio moved by a single thousandth. That is the round's real finding: the density GAP.md measures is not the deck's doing and cannot be fixed by dealing fewer cards. It is that a two-hundred-word page made of a generator's facts and a writer's images has almost no room to say anything twice, which is why the golden's own office page scores 0.73 and its suite page 0.82 against a target of 0.68 that was measured on the two of them together.

**The reading.** Seed 12's suite page reads at the corpus's own cadence now — a long sentence about the El, a short one after it, a morgue note, "I moved on." The three targets outstanding are the orphan ratio, which six rounds and a reverted experiment say no assembly decision can reach; words a paragraph, which is within a word of where the golden's own office page sits and is pulled down by dialogue that the page is better for having; and the short share, which is a hundredth away and would cost padding to close. The loop has nothing honest left to spend a round on.

### Page one, seeds 3, 7 and 12

**Seed 3**

```
Midnight. Two rooms over a Chinese laundry on Rivington Street, the Lower
East Side. My knuckle had split open again, the same place as last month. It
caught on the desk drawer every time. Frost had crept across the window
glass from the inside.

A woman came up the stairs after midnight, and sat down. Kreuzer shut the
door soft, the way careful people do when doors matter to them. Kreuzer: a
crooked little finger, broken once and never reset. Collar buttoned, no tie,
and a smear of green paint at one shoulder.

Gretchen Kreuzer is 30 years old and a pawnbroker’s clerk. Kreuzer writes
the tickets behind the grille and knows what a thing is worth. She sat with
both hands folded.

“Go ahead.”

“Sweeney was the reason four places on the street stayed open, and everyone
knew it. Sweeney was found dead at the suite.”

“And Sweeney?”

“Sweeney was killed at the suite, and nothing was carried out of the room
afterwards. The coroner puts it between 9:30 PM and 11:00 PM, which is two
hours of nothing useful.”

“And the suite?”

“It was a blunt object.”

That fit.

“Where was Sweeney found?”

“I found Sweeney at the suite at half past eleven. The precinct took a
statement at the desk and filed it.”

“What brought you to the suite?”

“I am a customer of Sweeney’s. I came to Sweeney on Domenico Tramonti’s
introduction and have stayed a customer.”

She stopped there.

“You could have let it alone.”

“I have something owing with Sweeney that death did not settle. I am
spending money I was owed and may never see.”

“Who would you start with?”

"Start with Grasso. Grasso blamed Sweeney for the ruin of his business. You
know the rate." I did. I held out my hand, and a roll with a rubber band
round it landed in it.

Kreuzer is still in the chair. Two questions on the house — a woman hiring
you answers your questions.

I noted it. Nothing is settled. If it is anybody yet, it is Grasso.
```

**Seed 7**

```
Midnight. Two rooms over a pawnshop on Great Jones Street, the Bowery. The
landlady's bill was folded under the telephone. I'd see it every time the
thing didn't ring. I decided not to open it until it did.

A woman came up the stairs after midnight, and sat down. Salerno knocked
twice, waited for the second, and came in only after I answered. Salerno: a
birthmark the shape of a thumbprint, just under the left ear, and a hem
taken up an inch, the old line still showing.

Lucia Salerno is 37 years old and a chambermaid. Salerno does eleven rooms a
day and the linen after. Salerno did not move for a while.

“I am listening.”

“Brennan was the one name on the block the papers would have printed. A
japanned cash box was taken from the back lot, which is Brennan’s.”

“Go back to the back lot.”

“Nothing at the back lot was forced: the lock was turned and the door was
shut again after. The precinct puts it between 10:00 PM and 11:30 PM.”

“And the back lot?”

“Brennan is not saying much about what was in it.”

That fit.

“What about Brennan, then?”

“Bledsoe found the door at the back lot shut and a japanned cash box gone,
at 11:30 PM. The precinct came, walked through it, and went.”

“What were you doing there?”

“I am Brennan’s tenant. Brennan put my rent up twice in a year and I paid it
twice.”

Neither of us spoke.

“What is Brennan to you now?”

“I want it established that it was not me, before anybody says otherwise. I
was near enough to it that night to know how it looks, so I am saying it
first.”

“Who would do that to Brennan?”

"Start with Mosley. Mosley owed Brennan four thousand dollars and was past
due on it, Dashiell." Salerno didn't waste breath explaining further. I took
twenty dollars the way I always did from Salerno, without counting it.

Salerno is still in the chair. Two questions on the house — a woman hiring
you answers your questions.

I marked it down. I kept coming back to the money. Nothing is settled. If it
is anybody yet, it is Mosley.
```

**Seed 12**

```
Midnight. Two rooms over a pawnshop on Eighth Avenue, Chelsea. My knuckle
had split open again, the same place as last month. It caught on the desk
drawer every time. Frost had crept across the window glass from the inside.

A woman came up the stairs after midnight, and sat down. Tillman was talking
before the door shut behind her, about the cab, the weather, anything but
the reason she'd come. Tillman: nails bitten to the quick on the right hand
only, and a brooch pinned slightly crooked, like it went on in a hurry.

Odessa Tillman is 47 years old and a curb broker. Tillman trades on the
street for men who would rather not be seen doing it. She did not lean back.

“Take your time.”

“Grasso could close a building with a signature, and had closed two. Grasso
was found dead at the benches.”

“Go on about Grasso.”

“Grasso was not killed at the benches: there is no blood there and no sign
of a struggle. The coroner puts it between 6:00 PM and 7:30 PM.”

“What else about Grasso?”

“It was poison in a drink, and it happened somewhere else.”

I believed it.

“Who else was there?”

“I found Grasso at the benches at seven o’clock. The precinct wrote it down
as a fall and closed the book on it.”

“How do you come into it?”

“I am in Grasso’s debt. Grasso carried me through a bad winter and has been
collecting on it ever since.”

I did not press Tillman.

“Why me?”

“I want the one who killed Grasso found, because the precinct has stopped
looking. I know that asking questions on this block is a way of being asked
some.”

“Who do you want looked at?”

"Start with Lanza. Lanza blamed Grasso for the ruin of his business,
Dashiell, same as always," Tillman said, and kept talking through the part
where a hundred dollars landed on my desk. I picked it up without breaking
Tillman's stride.

Tillman is still in the chair. Two questions on the house — a woman hiring
you answers your questions.

I set it down. I kept coming back to the money. If I had to put money down
tonight, Lanza.
```

---

## Round 8 — a floor as well as a ceiling

```
120 pages · 40 seeds · pages 1–3 · round 8

metric                    mean        target    dist     worst  gold p1  gold p2  page
--------------------------------------------------------------------------------------
orphan_word_ratio        0.823       <= 0.68   0.210     0.960     0.73     0.82  seed38-p3.txt
paragraph_cohesion       0.667       >= 0.65   0.000     0.170     0.67     0.80  seed08-p2.txt
sentence_cohesion        0.650       >= 0.55   0.000     0.360     0.53     0.59  seed38-p3.txt
short_share              0.268       >= 0.28   0.042     0.083     0.42     0.17  seed38-p3.txt
long_ratio               0.072 0.0625-0.1875   0.000     0.000     0.09     0.06  seed01-p2.txt
dialogue_share_p1        0.323      0.3-0.45   0.000     0.260     0.39     0.00  seed15-p1.txt
figures                  0.475          <= 1   0.000     2.000     1.00     0.00  seed06-p1.txt
plain_ratio              0.743        >= 0.6   0.000     0.500        —        —  seed07-p3.txt
words_per_paragraph     29.288         30-45   0.024    15.200    22.40    36.00  seed40-p1.txt
--------------------------------------------------------------------------------------
AGGREGATE DISTANCE       0.275

gaps: no-fact ×1
```

### The reading

**The change.** A paragraph floor to go with the ceiling. A one-sentence paragraph of nine words is not a paragraph, it is a block that got left out of one — "Nobody in here but the furniture." standing between the room and what was found in it — and the golden's short paragraphs are all dialogue while its narration runs three and four sentences. Two adjacent blocks of prose, neither of them anybody speaking, now fuse when either is under twenty words, whatever movement they were tagged as belonging to. Two guards came with it. A fused paragraph keeps the voice of whichever block carries the clue, because a record is excused for being flat only under the two voices where flatness is the point. And the generator's own sentences are marked as they go onto the page, so §5's join steps over any pair whose second half is one of them: it is the pair that is spared and not the paragraph, which is worth the extra bookkeeping — sparing whole paragraphs cost the page a third of its long sentences and took `long_ratio` out of its band.

**What the numbers did.** Aggregate 0.340 → 0.275. `words_per_paragraph` 27.0 → 29.3, a hair under the target and up from 23.8 at round 0; `paragraph_cohesion` 0.661 → 0.667 and `sentence_cohesion` 0.647 → 0.650 came with it, which says the fusions were joining things that belonged together. `short_share` gave back three thousandths, which is the arithmetic of the same sentences in fewer paragraphs.

**The reading.** This is the eighth round and the spec's cap, and it is the right place to stop for a second reason: the two numbers still outstanding are a hundredth and a fiftieth from their targets, and the third — the orphan-word ratio — has moved four thousandths in eight rounds against a distance of 0.21, which no assembly decision has touched and none will. Read against the golden's eight rules the pages now keep seven of them. The one they do not keep is the third: description is still three details listed rather than one detail followed, because the portrait deck is written as three separate cards and following one of them is a writing job and not an assembly one.

### Page one, seeds 3, 7 and 12

**Seed 3**

```
Midnight. Two rooms over a Chinese laundry on Rivington Street, the Lower
East Side. My knuckle had split open again, the same place as last month. It
caught on the desk drawer every time. Frost had crept across the window
glass from the inside.

A woman came up the stairs after midnight, and sat down. Kreuzer shut the
door soft, the way careful people do when doors matter to them. Kreuzer: a
crooked little finger, broken once and never reset. Collar buttoned, no tie,
and a smear of green paint at one shoulder.

Gretchen Kreuzer is 30 years old and a pawnbroker’s clerk. Kreuzer writes
the tickets behind the grille and knows what a thing is worth. She sat with
both hands folded.

“Go ahead.”

“Sweeney was the reason four places on the street stayed open, and everyone
knew it. Sweeney was found dead at the suite.”

“And Sweeney?”

“Sweeney was killed at the suite, and nothing was carried out of the room
afterwards. The coroner puts it between 9:30 PM and 11:00 PM, which is two
hours of nothing useful.”

“And the suite?”

“It was a blunt object.”

That fit.

“Where was Sweeney found?”

“I found Sweeney at the suite at half past eleven. The precinct took a
statement at the desk and filed it.”

“What brought you to the suite?”

“I am a customer of Sweeney’s. I came to Sweeney on Domenico Tramonti’s
introduction and have stayed a customer.”

She stopped there.

“You could have let it alone.”

“I have something owing with Sweeney that death did not settle. I am
spending money I was owed and may never see.”

“Who would you start with?”

"Start with Grasso. Grasso blamed Sweeney for the ruin of his business. You
know the rate." I did. I held out my hand, and a roll with a rubber band
round it landed in it.

Kreuzer is still in the chair. Two questions on the house — a woman hiring
you answers your questions.

I noted it. Nothing is settled. If it is anybody yet, it is Grasso.
```

**Seed 7**

```
Midnight. Two rooms over a pawnshop on Great Jones Street, the Bowery. The
landlady's bill was folded under the telephone. I'd see it every time the
thing didn't ring. I decided not to open it until it did.

A woman came up the stairs after midnight, and sat down. Salerno knocked
twice, waited for the second, and came in only after I answered. Salerno: a
birthmark the shape of a thumbprint, just under the left ear, and a hem
taken up an inch, the old line still showing.

Lucia Salerno is 37 years old and a chambermaid. Salerno does eleven rooms a
day and the linen after. Salerno did not move for a while.

“I am listening.”

“Brennan was the one name on the block the papers would have printed. A
japanned cash box was taken from the back lot, which is Brennan’s.”

“Go back to the back lot.”

“Nothing at the back lot was forced: the lock was turned and the door was
shut again after. The precinct puts it between 10:00 PM and 11:30 PM.”

“And the back lot?”

“Brennan is not saying much about what was in it.”

That fit.

“What about Brennan, then?”

“Bledsoe found the door at the back lot shut and a japanned cash box gone,
at 11:30 PM. The precinct came, walked through it, and went.”

“What were you doing there?”

“I am Brennan’s tenant. Brennan put my rent up twice in a year and I paid it
twice.”

Neither of us spoke.

“What is Brennan to you now?”

“I want it established that it was not me, before anybody says otherwise. I
was near enough to it that night to know how it looks, so I am saying it
first.”

“Who would do that to Brennan?”

"Start with Mosley. Mosley owed Brennan four thousand dollars and was past
due on it, Dashiell." Salerno didn't waste breath explaining further. I took
twenty dollars the way I always did from Salerno, without counting it.

Salerno is still in the chair. Two questions on the house — a woman hiring
you answers your questions.

I marked it down. I kept coming back to the money. Nothing is settled. If it
is anybody yet, it is Mosley.
```

**Seed 12**

```
Midnight. Two rooms over a pawnshop on Eighth Avenue, Chelsea. My knuckle
had split open again, the same place as last month. It caught on the desk
drawer every time. Frost had crept across the window glass from the inside.

A woman came up the stairs after midnight, and sat down. Tillman was talking
before the door shut behind her, about the cab, the weather, anything but
the reason she'd come. Tillman: nails bitten to the quick on the right hand
only, and a brooch pinned slightly crooked, like it went on in a hurry.

Odessa Tillman is 47 years old and a curb broker. Tillman trades on the
street for men who would rather not be seen doing it. She did not lean back.

“Take your time.”

“Grasso could close a building with a signature, and had closed two. Grasso
was found dead at the benches.”

“Go on about Grasso.”

“Grasso was not killed at the benches: there is no blood there and no sign
of a struggle. The coroner puts it between 6:00 PM and 7:30 PM.”

“What else about Grasso?”

“It was poison in a drink, and it happened somewhere else.”

I believed it.

“Who else was there?”

“I found Grasso at the benches at seven o’clock. The precinct wrote it down
as a fall and closed the book on it.”

“How do you come into it?”

“I am in Grasso’s debt. Grasso carried me through a bad winter and has been
collecting on it ever since.”

I did not press Tillman.

“Why me?”

“I want the one who killed Grasso found, because the precinct has stopped
looking. I know that asking questions on this block is a way of being asked
some.”

“Who do you want looked at?”

"Start with Lanza. Lanza blamed Grasso for the ruin of his business,
Dashiell, same as always," Tillman said, and kept talking through the part
where a hundred dollars landed on my desk. I picked it up without breaking
Tillman's stride.

Tillman is still in the chair. Two questions on the house — a woman hiring
you answers your questions.

I set it down. I kept coming back to the money. If I had to put money down
tonight, Lanza.
```


---

# Hone 1

Not a round of the loop: a separate pass, `docs/12-hone-1.md`, with the
generator open. Three things the loop's report said it could not do from the
engine alone — the client's questions written with their answers, the spoken
hours, and a breath form for her sentences — plus the prod cap, the portrait
pairs and the two content bugs.

**The targets moved under it.** §B.5 recomputed them against golden v2 one page
at a time and repaired a fault in `style-metrics.py` at the same time: the
sentence splitter did not break after a closing quotation mark, so on a page of
dialogue most sentences were measured glued to the one after them. Both tables
below are measured with the repaired ruler against the new targets, so both are
comparable to each other and neither is comparable to rounds 0 to 8.

## Before — `main` at 9a12cef

```
120 pages · 40 seeds · pages 1–3 · Hone 1 before — main at 9a12cef

metric                    mean        target    dist     worst  gold p1  gold p2  page
--------------------------------------------------------------------------------------
orphan_word_ratio        0.823       <= 0.82   0.003     0.960     0.77     0.89  seed38-p3.txt
paragraph_cohesion       0.667       >= 0.66   0.000     0.170     0.53     0.80  seed08-p2.txt
sentence_cohesion        0.627       >= 0.59   0.000     0.250     0.58     0.61  seed38-p3.txt
short_share              0.352       >= 0.36   0.021     0.231     0.56     0.16  seed14-p3.txt
long_ratio               0.041       <= 0.06   0.000     0.176     0.00     0.05  seed37-p3.txt
dialogue_share_p1        0.392     0.33-0.53   0.000     0.330     0.43     0.00  seed15-p1.txt
figures                  0.475        <= 0.5   0.000     2.000     1.00     0.00  seed06-p1.txt
plain_ratio              0.743        >= 0.6   0.000     0.500        —        —  seed07-p3.txt
words_per_paragraph     29.288         22-35   0.000    15.200    22.10    34.70  seed40-p1.txt
--------------------------------------------------------------------------------------
AGGREGATE DISTANCE       0.025

gaps: no-fact ×1
```

## After

```
120 pages · 40 seeds · pages 1–3 · Hone 1 after

metric                    mean        target    dist     worst  gold p1  gold p2  page
--------------------------------------------------------------------------------------
orphan_word_ratio        0.809       <= 0.82   0.000     0.930     0.77     0.89  seed32-p3.txt
paragraph_cohesion       0.657       >= 0.66   0.004     0.170     0.53     0.80  seed08-p2.txt
sentence_cohesion        0.626       >= 0.59   0.000     0.400     0.58     0.61  seed10-p3.txt
short_share              0.372       >= 0.36   0.000     0.269     0.56     0.16  seed07-p2.txt
long_ratio               0.040       <= 0.06   0.000     0.167     0.00     0.05  seed02-p3.txt
dialogue_share_p1        0.330     0.33-0.53   0.000     0.280     0.43     0.00  seed03-p1.txt
figures                  0.450        <= 0.5   0.000     2.000     1.00     0.00  seed06-p1.txt
plain_ratio              0.755        >= 0.6   0.000     0.500        —        —  seed01-p3.txt
words_per_paragraph     30.132         22-35   0.000    16.400    22.10    34.70  seed40-p1.txt
--------------------------------------------------------------------------------------
AGGREGATE DISTANCE       0.004

gaps: missing-pair ×41
```

Eight of the nine are met and the ninth is four thousandths away. What moved,
and why:

| metric | before | after | why |
|---|---|---|---|
| orphan word ratio | 0.823 | **0.809** ✓ | the only target main missed. The spoken hours put words the page already has back into it — "half past eleven" twice is two words repeated where "11:30 PM" was a token that occurred once |
| paragraph cohesion | 0.667 ✓ | 0.657 | the prods went. A prod was chosen to pick up a noun from the answer before it, so every one of them was a cohesive paragraph opening; the beats that replaced them open on the pronoun, which is cohesive too, but there are fewer of them |
| sentence cohesion | 0.627 ✓ | 0.626 ✓ | unchanged |
| short sentences | 0.352 | **0.372** ✓ | the breath form, and the rhythm floor following the target to 0.36 |
| long sentences | 0.041 ✓ | 0.040 ✓ | unchanged |
| dialogue share, page one | 0.392 ✓ | 0.330 ✓ | five of Dashiell's lines came off page one and three stayed. The golden's own attribution move — "I found Sweeney," she said. "Half past eleven, at the suite." — is what keeps it inside the band |
| figures | 0.475 ✓ | 0.450 ✓ | unchanged |
| plain ratio | 0.743 ✓ | 0.755 ✓ | the prompts are plain sentences |
| words per paragraph | 29.3 ✓ | 30.1 ✓ | unchanged |
| **aggregate** | **0.025** | **0.004** | |

## Page one of seeds 3, 7 and 12, after

```
Midnight. Two rooms over a Chinese laundry on Rivington Street, the Lower
East Side. My knuckle had split open again, the same place as last month. It
caught on the desk drawer every time. Frost had crept across the window
glass from the inside.

A woman came up the stairs after midnight, and sat down. Kreuzer shut the
door soft, the way careful people do when doors matter to them. Kreuzer: a
crooked little finger, broken once and never reset. Collar buttoned, no tie,
and a smear of green paint at one shoulder.

Gretchen Kreuzer is 30 years old and a pawnbroker’s clerk. Kreuzer writes
the tickets behind the grille and knows what a thing is worth. She sat with
both hands folded.

“Sweeney was the reason four places on the street stayed open,” she said.
“Everyone knew it. Sweeney was found dead at the suite.”

She went straight on.

“Sweeney was killed at the suite. Nothing was carried out of the room
afterwards. The coroner puts it between half past nine and eleven. Two hours
of nothing useful.”

She was not done.

“It was a blunt object.”

I said nothing.

“Where did you find Sweeney, and when?”

“I found Sweeney,” Kreuzer said. “Half past eleven, at the suite. The
precinct took a statement at the desk and filed it.”

She was not finished.

“I am a customer of Sweeney’s. I came to Sweeney on Domenico Tramonti’s
introduction and have stayed a customer.”

I let Kreuzer sit with it.

“Why come to me instead of the precinct?”

“I want the one who killed Sweeney found. Because the precinct has stopped
looking. I know that asking questions on this block is a way of being asked
some.”

“Who was no friend of Sweeney?”

"Start with Grasso. Grasso blamed Sweeney for the ruin of his business. You
know the rate." I did. I held out my hand, and a roll with a rubber band
round it landed in it.

Kreuzer is still in the chair. Two questions on the house — a woman hiring
you answers your questions.

I wrote that down. Nothing is settled. If it is anybody yet, it is Grasso.
```

```
Midnight. Two rooms over a pawnshop on Great Jones Street, the Bowery. The
landlady's bill was folded under the telephone. I'd see it every time the
thing didn't ring. I decided not to open it until it did.

A woman came up the stairs after midnight, and sat down. Salerno knocked
twice, waited for the second, and came in only after I answered. Salerno: a
birthmark the shape of a thumbprint, just under the left ear, and a hem
taken up an inch, the old line still showing.

Lucia Salerno is 37 years old and a chambermaid. Salerno does eleven rooms a
day and the linen after. Salerno did not move for a while.

“I am listening.”

“Brennan was the one name on the block the papers would have printed,” she
said. “A japanned cash box was taken from the back lot, which is Brennan’s.”

She kept talking.

“Nothing at the back lot was forced: the lock was turned and the door was
shut again after. The precinct puts it between ten o’clock and half past
eleven.”

She went straight on.

“Brennan is not saying much about what was in it. Bledsoe found the door at
the back lot shut and a japanned cash box gone, at half past eleven.”

She was not finished.

“The precinct came, walked through it, and went. I am Brennan’s tenant.”

She had more of it.

“Brennan put my rent up twice in a year and I paid it twice.”

I knew it.

“What is it you are afraid will be said?”

“I want it established that it was not me, before anybody says otherwise,”
Salerno said. “I was near enough to it that night to know how it looks. So I
am saying it first.”

“Who did Brennan cross?”

"Start with Mosley. Mosley owed Brennan four thousand dollars and was past
due on it, Dashiell." Salerno didn't waste breath explaining further. I took
twenty dollars the way I always did from Salerno, without counting it.

Salerno is still in the chair. Two questions on the house — a woman hiring
you answers your questions.

I had it on paper. Nobody had moved the money. Nothing is settled. If it is
anybody yet, it is Mosley.
```

```
Midnight. Two rooms over a pawnshop on Eighth Avenue, Chelsea. My knuckle
had split open again, the same place as last month. It caught on the desk
drawer every time. Frost had crept across the window glass from the inside.

A woman came up the stairs after midnight, and sat down. Tillman was talking
before the door shut behind her, about the cab, the weather, anything but
the reason she'd come. Tillman: nails bitten to the quick on the right hand
only, and a brooch pinned slightly crooked, like it went on in a hurry.

Odessa Tillman is 47 years old and a curb broker. Tillman trades on the
street for men who would rather not be seen doing it. She did not lean back.

“Grasso could close a building with a signature, and had closed two,” she
said. “Grasso was found dead at the benches.”

She had more of it.

“Grasso was not killed at the benches: there is no blood there and no sign
of a struggle. The coroner puts it between six o’clock and half past seven.”

She went straight on.

“It was poison in a drink. It happened somewhere else.”

I said nothing.

“Where did you find Grasso, and when?”

“I found Grasso,” Tillman said. “Seven o’clock, at the benches. The precinct
wrote it down as a fall and closed the book on it.”

She did not stop there.

“I am in Grasso’s debt. Grasso carried me through a bad winter and has been
collecting on it ever since.”

Neither of us spoke.

“And you want it settled without a word said.”

“I want it settled quietly, before it is settled loudly. I am paying to have
something found and then not said.”

“Who was no friend of Grasso?”

"Start with Dandridge. Dandridge wanted Grasso out of the lease and the
lease in his name, Dashiell, same as always," Tillman said, and kept talking
through the part where a hundred dollars landed on my desk. I picked it up
without breaking Tillman's stride.

Tillman is still in the chair. Two questions on the house — a woman hiring
you answers your questions.

I marked it down. The money had not changed its mind about anything. If I
had to put money down tonight, Dandridge.
```
