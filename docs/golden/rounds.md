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
