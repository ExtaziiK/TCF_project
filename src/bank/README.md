# Banque de questions

Drop files here and they appear on the website automatically (the dev server
picks them up live; production builds bundle whatever is present).

## Quiz files (JSON)

Put each quiz JSON in the folder of its section:

```
src/bank/
├── co/   Compréhension orale
├── ce/   Compréhension écrite
├── ee/   Expression écrite
└── eo/   Expression orale
```

Two accepted formats:

1. **Attempt/result exports** (like `Quiz_1_CO.json`) — the site reads
   `exam_title` and `detailed_answers[]` (question_text, all_options,
   audio_url, image_url, explanation). User-specific fields (scores,
   answers) are ignored.
2. **Plain question arrays** — `[{ "question", "alternatives",
   "answer_index", "explanation", "audio", "level" }, ...]` (same format as
   the admin import screen).

Corrupted-encoding exports (Ã©, â€™, etc.) are repaired automatically at
load time — drop them in as-is.

## Media files (bulk)

Drop **all** audio files into `media/audio/` and images into
`media/images/` — no subfolders needed. They are matched to questions by
file name, which must follow the source convention:

```
Comprehension_Orale_quiz_1_question_24.mp3
Comprehension_Orale_quiz_1_question_24.webp
```

Matching is case-insensitive and works in two ways:
- the file name matches the basename of the question's `audio_url` /
  `image_url`, or
- it matches `<Section>_quiz_<quizNumber>_question_<order>` built from the
  quiz file itself.

A local media file always wins over the remote URL in the JSON. Questions
with no audio simply show no player.
