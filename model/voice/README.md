# The narrator’s voice

Record in sittings of ten to twenty minutes. Close the page whenever you like; it picks up where you left off. A first voice can be trained on about twenty minutes, and improved later as more clips come in.

This is the kit for reading the book’s narrator aloud, so a small local text-to-speech model (Piper-style: 22,050 Hz mono, 16-bit WAV, one clip a line, a `metadata.csv` of `id|text`) can be fine-tuned on your voice.

| | |
|---|---|
| `record.html` | the recorder: one page, no build, nothing fetched from the internet |
| `script.json` | the lines, in the order they’re read: `[{ id, text, section, note? }]` |
| `script.md` | the same lines, numbered and grouped by section, with the notes, to read ahead |
| `scripts/voice-script.ts` | builds the script (`npx tsx scripts/voice-script.ts`) |
| `scripts/voice-check.ts` | checks a folder of recordings, finished or not |

## The script

716 lines, about an hour of reading, in five sections. They come in this order so that a short first sitting is already useful:

| | section | lines | minutes | what’s in it |
|---|---|---|---|---|
| 1 | Warm-up and the fixed lines | 64 | 4 | the title page and its tagline, the six teach lines, the rules, the headings, the clock, the report form and the verdict |
| 2 | Names and places | 115 | 10 | all thirty-three of the neighbourhood’s people, twice each; the eleven places, twice each; the dealt city’s commonest names and streets; the egg tiers. A name that could go two ways has a hint in its note (Wojcik: WOY-chick) |
| 3 | Hours, money and numbers | 45 | 4 | seven to midnight the way the game says them (“at ten”, “half past eleven”, “nine or ten”, “twenty minutes to an hour”), sums and counts |
| 4 | Pages | 430 | 37 | sentences off the game’s own pages, twelve nights of them (both worlds, every tier), narration and speech, every kind of sentence the pages make, and the lines the playtesters quoted back |
| 5 | Phonetic coverage | 62 | 5 | the sounds the rest is thin on, real questions, lists, the period’s harder words |

Most lines are four to twelve words; none is over twenty-two. Numbers are written the way they’re said, quotation marks are curly, and the spelling is American.

## Setting up, once

1. **Chrome** (or another Chromium browser: Edge, Arc, Brave). Safari and Firefox can record, but can’t write into a folder, so every clip would land in Downloads instead.
2. **A USB microphone or a headset microphone**, not the laptop’s own. A hand’s width from your mouth, a little off to one side so the p’s and b’s don’t pop.
3. **A quiet room.** Door shut, fans and the radiator off if you can. A soft room (curtains, a sofa, a bookcase) is better than a bare one.
4. **The same place every sitting:** the same chair, the same microphone, the same distance, the same input level. A strip of tape on the desk where the microphone stands helps.
5. **Open the page**, either way:
   - **From the file:** open `model/voice/record.html` in Chrome (drag it onto the window, or *File → Open File…*). The first time, a page opened from a file can’t read `script.json` by itself, so the page asks you to drop `script.json` on it (or “choose it”); it’s in the same folder. The page remembers it after that.
   - **From a tiny local server**, which loads the script by itself. From the repository:

     ```sh
     python3 -m http.server 8765 --directory model/voice
     # or, with the repository's own tools:
     npx vite model/voice --port 8765
     ```

     and open <http://localhost:8765/record.html>.
6. **Choose the recordings folder.** Press the button and make a new folder *outside* the repository, say `~/Dashiell voice`. The clips go in its `clips/` folder as `clips/<id>.wav`; `progress.json` is written next to them after every kept clip, and `metadata.csv` and `session.json` whenever you write the index. This folder is the recordings: keep it backed up.
7. **Pick the microphone** under “Microphone and settings” if it isn’t the system’s default, and allow it when Chrome asks.
8. **Set the level.** Read a line and watch the meter: the loudest syllables should land in the dashed band, about −18 to −6 dB. Set the microphone’s own gain (or *System Settings → Sound → Input*) so they do, and leave it there for good. The page records with the browser’s echo cancelling, noise suppression and automatic gain all off, so what you set is what you get.

## A sitting

- **Space** starts recording; read the line; **Space** again stops. Leave a breath of quiet before and after: the take comes back trimmed to your voice with 150 ms to spare either side, with its waveform, its length and its peak.
- **Enter** keeps it and moves on. (Enter while still recording stops and keeps in one go.) **R** throws it away and records again. **P** plays it back. **←** and **→** move a line either way. **S** skips a line. **Esc** throws a take away.
- **Start every sitting by going back five lines** with ← and recording them again, so this sitting sounds like the last one. Space on a line already recorded records it again; Enter keeps the new take over the old.
- Ten to twenty minutes, then stop. Water, not coffee. When your voice goes tired or rough, that’s the end of the sitting.
- When you come back, the page says how far you got (“312 lines done, 404 to go, about 25 minutes recorded so far”) and opens at the first line you haven’t recorded.
- **Write the index** whenever you like, as often as you like: it writes `metadata.csv` and `session.json` for whatever is done so far. (The page also does it by itself every twenty clips.)
- A take that clipped, ran over twelve seconds or came out under half a second needs a second Enter to keep, since the checker would refuse it. R is usually the better answer.

If the page asks for the folder again (Chrome forgets the permission when the page closes, unless you chose “Allow on every visit”), press “Reconnect”, or choose the same folder again. The page reads the folder’s own `progress.json` and looks at the clips in it, so a browser whose data was cleared loses nothing, and even a lost `progress.json` is rebuilt from the clips and the script.

## How to read it

> “Our aim isn’t authentic era writing. It’s what people *think* authentic era writing and dialogue sounded like.” (docs/53)

That goes for the voice as much as the words: legible noir pastiche, the noir everybody already has in their head, not Hammett.

- **A narrator reading a book aloud.** Unhurried, dry, warm. Every word clear: the plain sentence is the spine, and the voice is there to carry it, not to decorate it.
- **Speech gets a light character shift, not an impression.** A little rounder for the landlady, a little clipped for the janitor, and back to the narrator for “he said”. The note under a line says who’s talking.
- **No gravel, no whisper.** Your own voice at an easy, conversational level, the same at the end of a sitting as at the start.
- **Say awkward lines as written**, slips and all, **or press S.** A line you can’t say naturally is worth less than a line skipped.
- A note under a line is for that line only: a name’s pronunciation, a question to let rise. If you already say a name another way, say it your way and keep saying it that way.

## Checking a folder

```sh
npx tsx scripts/voice-check.ts ~/"Dashiell voice"
```

It holds every clip to the format (RIFF WAVE, 16-bit PCM, mono, 22,050 Hz), the length (0.5 to 12 seconds) and the level (nothing clipped), and `metadata.csv` to the clips (a row for every clip, a clip for every row), and reports the minutes so far in all and by section, how many lines are left, and any clip much louder or quieter than the rest (a sitting that didn’t match). It works on a half-finished folder, and exits 1 if anything would trip the fine-tune.

## What happens next

- **The fine-tune.** Once there’s about twenty minutes (the first two hundred and fifty lines or so), and the checker is happy, a Piper voice is fine-tuned from a pretrained English checkpoint at 22,050 Hz on these clips: a few hours on a GPU, here or rented. Piper’s preprocessing reads `metadata.csv` as single-speaker LJSpeech (`id|text`) and wants the audio in a `wavs/` folder beside it, so the recordings folder gets a link, `ln -s clips wavs`, and nothing is copied. The first voice is a draft; it gets better each time it’s trained again on more clips.
- **Where the files go.** The recordings stay in your folder and never go into git (about 2.6 MB a minute, 160 MB for the lot). Checkpoints live outside the repository too, like the tiny model’s (`model/README.md`). What comes out is a voice: an ONNX file and its JSON config, tens of megabytes.
- **In the game,** the narrator’s voice will be an optional download: off by default, fetched only by a player who turns it on, and run on their own machine.
- **Period texture is added at playback**, not in the recording: an old-radio band, a little hiss and crackle, applied by the game as it plays the voice, so it can be turned up, down or off. So record clean: no effects, no EQ, no reverb, no compression, no noise removal. The recorder only takes out the rumble under 50 Hz and trims the silence.

## If the script changes

Don’t edit `script.json` by hand: rebuild it with `npx tsx scripts/voice-script.ts`, and only between sittings. Each line’s id is its section’s prefix and a hash of its words (`pg-3fa9c2d1`), so a rebuilt script keeps every recording whose words didn’t change. A line whose words did change shows up as not recorded; its old clip still goes into `metadata.csv` with the words it was read from, since a clip is good training whatever script it came from.

The generator reads the pages off twelve nights rendered in process (the same pages `npm run read -- --no-choices` prints), so a rebuilt script follows the game’s cards and voicings as they are that day. Every line passes the game’s jargon lint (docs/53), the prose lint’s phrases, the plain-terms list and docs/56’s hard gates; `test/voice.test.ts` holds the generator to its sections, sizes, coverage and lints, and the recorder’s WAV encoder and trimmer to the checker.
