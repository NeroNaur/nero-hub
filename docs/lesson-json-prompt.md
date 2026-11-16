# Lesson JSON prompt

Paste everything inside the box into a new Claude chat, then paste your lesson notes.

````
You're helping me turn my lesson notes into JSON files for my study website, nero-hub
(Vue + Supabase, deployed on Vercel, repo NeroNaur/nero-hub). I import each file with the
"+ Add lesson" button (Edit mode ON → subject → Hallway → pick Prelim/Midterm/Finals).
The lesson goes into whichever subject and term I clicked from; "subject" and "term" in
the file are a double-check (a mismatch shows a warning).

## How we work
- Before generating, tell me in plain words what you'll make (title, term, number of note
  sections, number of questions by type), then wait for me to reply "CONFIRM".
- One JSON file per lesson. Send it as a downloadable .json file.
- If I don't say which subject or term (Prelim / Midterm / Finals) the lesson belongs to, ask me.
- Don't be a yes-man: point out problems in my notes (contradictions, missing parts) instead
  of quietly fixing or inventing.

## ACCURACY RULES (most important)
1. Title: use the lesson's own heading exactly (e.g. "Lesson One"). Do not invent a title.
2. Summary/description: copy the lesson's own first introductory sentence verbatim.
   If there is no such sentence, use null. Never write your own description.
3. Notes: keep my exact wording. Only allowed changes:
   - Split into sections using the notes' OWN headings (e.g. "Lecture Notes: Defining Art")
     as each section's title.
   - Turn lists that are already numbered/bulleted in my notes into Markdown lists or
     "### " sub-headings.
   - Paragraph breaks.
   NOT allowed: added headings, bolding, numbering, callouts, emojis, summaries, rewording.
4. Remove LMS leftovers that don't work outside the LMS: "Links to an external site.",
   "Read this article", "Check out this video", image file names, image captions,
   "Image source:" lines, and figure references like "(Fig. 1.1)". Tell me what you removed.
5. Typos: keep them verbatim unless I say to fix them.
6. Questions: every correct answer must come directly from the notes. You may write the
   question wording and the wrong choices (distractors), but nothing outside the notes may
   be the correct answer.
7. Explanations: either a verbatim quote from the notes, or null. Never your own words.
8. No flashcards in the JSON. I make flashcards myself on the site.

## Question mix
Roughly, for a typical lesson: 10 multiple choice, 6 true/false, 5 identification,
3 enumeration. Scale up or down with the lesson's length. Include at least one "tricky"
question where students commonly confuse categories, but only if the notes support it.

## JSON format
{
  "subject": "art-appreciation",
  "modules": [
    {
      "slug": "lesson-1-defining-art",
      "title": "Lesson One",
      "summary": "Verbatim first sentence, or null",
      "order": 1,
      "term": "prelim",
      "notes": [
        { "title": "Introduction", "content": "Markdown, verbatim text" },
        { "title": "Lecture Notes: Defining Art", "content": "..." }
      ],
      "questions": [
        { "type": "mcq", "prompt": "...", "choices": ["A", "B", "C", "D"],
          "answer": "B", "explanation": "verbatim quote or null" },
        { "type": "true_false", "prompt": "...", "answer": true, "explanation": null },
        { "type": "identification", "prompt": "... ______ ...",
          "answer": ["main answer", "accepted alternative"], "explanation": null },
        { "type": "enumeration", "prompt": "Give the three ...",
          "answer": ["Item 1", ["Item 2", "accepted alt"], "Item 3"], "explanation": null }
      ]
    }
  ]
}

Format rules:
- "subject" must be one of: art-appreciation, audio-design, blockchain, rizal,
  contemporary-world (or a new slug I give you; new subjects are added on the Admin page).
- "term" must be exactly "prelim", "midterm" or "finals".
- "slug": lowercase-with-dashes, unique per subject, e.g. "lesson-2-assumptions-of-art".
  Re-importing the same slug replaces that lesson (no duplicate).
- "order": the lesson number.
- mcq: "answer" must match one of "choices" EXACTLY (same spelling and punctuation).
- true_false: "answer" is true or false, without quotes.
- identification: "answer" is a list; the first item is shown as the correct answer,
  and the rest are accepted alternatives (spelling variants, singular/plural, short forms).
- enumeration: "answer" is a list of items in any order; an item can itself be a list
  of accepted alternatives.
- Grading is lenient (ignores case, punctuation and small typos), so alternatives are
  only needed for genuinely different wordings.
- Output must be valid JSON (double quotes, no trailing commas, no comments).
````
