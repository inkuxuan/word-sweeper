# Word Sweeper

A static word guessing game inspired by a Japanese kana minesweeper puzzle. The interface and word list are in English.

## Play

Before starting, choose a field and difficulty. The QWERTY field keeps `ASDFGHJKL` in column 1 and starts `ZXCVBNM` in column 2. The 7 × 4 alphabet field places A–Z in reading order, leaving opposite corner cells empty. You can return to setup to change fields or difficulty; doing so starts a new puzzle.

Open a letter on your chosen field. Right-click an unopened tile to flag it or remove a flag; a flagged tile stays closed when clicked or reached by a zero-cell chain. Keyboard users can press `F` while a tile is focused. A safe letter shows the total number of answer-letter occurrences in its eight neighboring cells. Opening a zero also opens its connected zero cells and their numbered borders, without opening mines. An answer letter shows a mine. For example, both `P` occurrences in `APPLE` count toward nearby numbers, and opening `P` shows `×2`. Mines do not end the round. Guess the word using the category and word length; wrong guesses can be retried. **Give up & reveal answer** ends the round, shows the word, and reveals its letter mines.

Inspired by QuizKnock's [【企画大爆発】パズルを解いて言葉を当てろ！五十音表マインスイーパ](https://www.youtube.com/watch?v=jDikQq1W5eY).

## Word list

Edit the file for the relevant level: `words-a1.csv`, `words-a2.csv`, `words-b1.csv`, `words-b2.csv`, `words-c1.csv`, or `words-c2.csv`. Each file starts with `word,category,level`; each following row contains one candidate word, its category, and the level matching that file. Words use English letters A–Z, with no spaces or punctuation. Categories may contain spaces; quote a category if it contains a comma. Invalid rows are ignored. The game loads all six files, randomly chooses a word from the selected level, and avoids repeating the immediately previous row when possible.

The included word list has at least 100 words at each of the six levels. The levels are approximate groups made for this game, inspired by the [CEFR's six levels](https://www.coe.int/en/web/common-european-framework-reference-languages/introduction-and-context). They are not official word-by-word CEFR ratings. A word's learning level can also vary by meaning, as described by the [English Vocabulary Profile](https://englishprofile.org/?menu=english-vocabulary-profile).
