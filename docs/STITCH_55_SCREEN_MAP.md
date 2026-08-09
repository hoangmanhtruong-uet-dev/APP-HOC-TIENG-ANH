# Google Stitch: 55-screen implementation map

The Stitch board contains both navigable screens and transient UI states. A transient state is implemented inside its owning route instead of creating a duplicate URL.

| # | Stitch screen/state | Implementation |
|---:|---|---|
| 1 | Indigo Scholar design system | `src/app/globals.css`, shared UI components |
| 2 | Welcome & sign-in | `/login`, `/register` |
| 3 | Learning goals | `/onboarding` steps 2–7 |
| 4 | Placement test intro | `/placement-test` |
| 5 | Placement test questions | `/placement-test?attempt=...` |
| 6 | Placement test complete | `/placement-test?result=...` |
| 7 | Onboarding review | `/onboarding` step 8 |
| 8 | Profile & settings | `/profile`, `/settings` |
| 9 | Student dashboard | `/dashboard` |
| 10 | Today's study plan | `/dashboard` current-learning section |
| 11 | Learning path | `/roadmap` |
| 12 | Learning path level | `/roadmap/[levelId]` |
| 13 | Progress dashboard | `/progress` |
| 14 | Vocabulary dashboard | `/learn/vocabulary` |
| 15 | Vocabulary learning session | `/learn/vocabulary/[slug]` |
| 16 | Vocabulary practice | `/practice/[exerciseSlug]` |
| 17 | Vocabulary result | `/practice/[exerciseSlug]/result/[attemptId]` |
| 18 | Grammar dashboard | `/learn/grammar` |
| 19 | Grammar lesson overview | `/learn/grammar/[slug]` |
| 20 | Grammar practice question | `/practice/[exerciseSlug]` |
| 21 | Grammar fill-in-the-blank | practice runner question state |
| 22 | Grammar sentence builder | practice runner ordering state |
| 23 | Grammar hint | practice runner hint state |
| 24 | Grammar correct answer | practice result question state |
| 25 | Grammar incorrect answer | practice result question state |
| 26 | Grammar lesson complete | lesson reader completed state |
| 27 | Review your mistakes | `/practice/[exerciseSlug]/result/[attemptId]` |
| 28 | Mistakes notebook | `/learn/mistakes` |
| 29 | Mistake review complete | `/learn/mistakes` empty/completed state |
| 30 | Listening lesson overview | `/practice/listening/[exerciseSlug]` pre-start state |
| 31 | Listening dashboard | `/practice/listening` |
| 32 | Main listening player | `/practice/listening/[exerciseSlug]` |
| 33 | Listening question | listening runner question state |
| 34 | Listening result | `/practice/listening/[exerciseSlug]/result/[attemptId]` |
| 35 | Reading lesson overview | `/practice/reading/[exerciseSlug]` pre-start state |
| 36 | Reading dashboard | `/practice/reading` |
| 37 | Reading passage | reading runner passage tab/pane |
| 38 | Reading question | reading runner question tab/pane |
| 39 | Reading result | `/practice/reading/[exerciseSlug]/result/[attemptId]` |
| 40 | Writing dashboard | `/practice/writing` |
| 41 | Writing lesson overview | `/practice/writing/[taskSlug]` pre-start state |
| 42 | Writing editor | `/practice/writing/[taskSlug]` active draft |
| 43 | Analyzing writing | writing feedback pending state |
| 44 | Writing feedback | `/practice/writing/[taskSlug]/submission/[submissionId]` |
| 45 | Correction detail | writing review priority-issue state |
| 46 | Improved version | writing review corrected-example state |
| 47 | Writing improvement summary | writing review revision-plan state |
| 48 | Writing practice complete | submitted writing review state |
| 49 | Writing history | `/practice/writing/history` |
| 50 | Speaking dashboard | `/practice/speaking` |
| 51 | Recording yourself | `/practice/speaking/[setSlug]` |
| 52 | Speaking progress | `/practice/speaking/progress` |
| 53 | Speaking AI feedback | `/practice/speaking/[setSlug]/attempt/[attemptId]` |
| 54 | Pronunciation feedback | speaking review pronunciation criterion/state |
| 55 | Mock test flow & summary | `/mock-tests`, session and summary routes |
