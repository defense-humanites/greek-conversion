---
title: "Performance"
description: "How fast the Python package converts on each engine, what a call costs, which engine to choose, and how to keep conversions fast on many short strings, on long texts, and across processes."
---

A conversion runs in the JavaScript engine that the package embeds
([How the package works](/python/package/)). Its time is that of the
conversion in the engine, and a cost that every call pays to cross into it,
with the text and the options, and back, with the result. The two engines
share this time out differently: QuickJS converts more slowly than Node.js,
and calls quickly; V8 converts almost as fast as Node.js, and calls slowly.

|                                       | QuickJS       | V8           |
| ------------------------------------- | ------------- | ------------ |
| Start: the package and a first call   | ~70 ms        | ~130 ms      |
| One word, one call                    | ~50 µs        | ~0.4 ms      |
| A text of 10,000 characters           | 15 to 50 ms   | 3 to 4 ms    |
| The 1,671 words of that text, at once | ~40 µs a word | ~4 µs a word |

QuickJS is the quicker for a word or a sentence at a time, V8 for anything
longer, and for lists of strings given at once.

## Measures

Thucydides 1.1–10, the input of the library's benchmark (10,555
characters, 1,671 words), with `convert()` unless the row says otherwise.
Node.js, the library itself, is measured on the same machine by its own
benchmark:

| Conversion                                    | QuickJS | V8      | Node.js |
| --------------------------------------------- | ------- | ------- | ------- |
| Greek → Beta Code                             | 15 ms   | 2.8 ms  | 1.6 ms  |
| Beta Code → Greek                             | 37 ms   | 3.0 ms  | 1.5 ms  |
| Greek → transliteration                       | 29 ms   | 3.7 ms  | 2.4 ms  |
| Transliteration → Greek                       | 47 ms   | 3.8 ms  | 2.8 ms  |
| Greek → transliteration, `convert_detailed()` | 111 ms  | 19 ms   | 6.2 ms  |

One word, `Ἕλλησιν`, a call, where Node.js takes 1 to 5 µs:

| Call                                                     | QuickJS | V8      |
| -------------------------------------------------------- | ------- | ------- |
| `convert()` into Beta Code                               | 45 µs   | 0.41 ms |
| `convert()` into transliteration                         | 65 µs   | 0.38 ms |
| `convert()` into transliteration, with other options     | 99 µs   | 0.42 ms |
| `convert()` into transliteration, with prepared options  | 65 µs   | 0.41 ms |
| `convert_detailed()` into transliteration                | 200 µs  | 0.43 ms |
| `convert()` of a converter from `create_converter()`     | 80 µs   | 0.40 ms |

The 1,671 words of the text, Greek → transliteration:

| Call                                  | QuickJS | V8     |
| ------------------------------------- | ------- | ------ |
| `convert()`, one call a word          | 107 ms  | 636 ms |
| `convert_many()`, one call            | 67 ms   | 6.7 ms |
| `convert_detailed_many()`, one call   | 241 ms  | 32 ms  |

These times were measured with Python 3.13, quickjs-ng 0.18, and
mini-racer 0.14, on one core of a cloud server (Intel Xeon), during the
development of `1.0.0`. Another machine gives other times, but the ratios
between the rows and between the engines hold better;
`python python/scripts/bench.py`, in a clone of the repository, with the
package installed, measures them on yours.

## Choosing an engine

- **QuickJS**, installed with the package, for strings converted one at a
  time as they come: a form, a request, a loop that cannot gather its
  strings first. A call costs it a few tens of microseconds, about six
  times less than V8 for `convert()`. It suits, too, where a wheel of 22 MB is unwelcome.
- **V8**, installed with `pip install "greek-conversion[v8]"`, for long
  texts and corpora. It converts five to twelve times faster than QuickJS,
  in 1.4 to 3 times the time of Node.js, but a call costs it
  0.1 to 0.5 ms, more than converting a word: give it long texts, or lists
  of strings through the functions that take many at once.

The two cross where a call carries a sentence or two: from about 150
characters a call into transliteration, and 300 into Beta Code, V8 is the
quicker. When `mini-racer` is installed, the package uses V8;
`set_engine()`, or the environment variable `GREEK_CONVERSION_ENGINE`,
chooses otherwise, for the whole process:

```python
from greek_conversion import engine_name, set_engine

set_engine("quickjs")
engine_name()  # → quickjs
set_engine(None)
```

## Many strings in one call

`convert_many()`, `reencode_many()`, and `convert_detailed_many()` convert
a list of strings in one call into the engine, and give a list of results
in its order. With V8, they convert the words of a text a hundred times
faster than one call a word; with
QuickJS, whose cost lies more in the conversion itself, about a third
faster. Each string is converted on its own, as by one call:

```python
from greek_conversion import convert_many

lines = ["ἄνδρα μοι ἔννεπε", "Μοῦσα πολύτροπον"]
convert_many(lines, "greek", "beta-code")
# → ['a)/ndra moi e)/nnepe', '*mou=sa polu/tropon']
```

The list and its results are held whole, in Python and in the engine: give
a corpus of millions of words in batches of some thousands of strings.

## What costs what

- **The call.** V8 runs on a thread of its own, which each call waits for:
  some 0.1 to 0.5 ms, whatever it converts, an empty string included.
  QuickJS runs in the calling thread: an empty string costs it about
  20 µs, and the rest of a call is the conversion itself.
- **The text and the result.** They cross as JSON, each way: a cost that
  grows with their length, and that `convert_detailed()` pays the most,
  with a span for every token and its losses. On a text, it costs 4 to 5
  times what `convert()` does on either engine: call it where the losses
  or the positions are wanted.
- **Options.** As in the library, the defaults and the presets are
  resolved once, and options of any other form at each call. With QuickJS,
  a word takes half again as long under such options; prepare them once
  with `prepare_options()`, and give the prepared options in their place:

  ```python
  from greek_conversion import convert, prepare_options

  scheme = prepare_options(transliteration={"chi": "kh", "upsilon": "u"})
  convert("ψυχή", "greek", "transliteration", scheme)  # → psukhḗ
  ```

- **Converters.** A call to a converter from `create_converter()` costs a
  word some 15 µs more with QuickJS, and one bound to a preset with a
  repertoire checks each letter against it, as in the library. Create one
  to check or extend a repertoire, and not to bind a preset alone:
  `convert()` given the preset's name costs less.
- **The first call.** Each process loads the package and starts its engine
  at its first call: some 70 ms with QuickJS, 130 ms with V8. A child
  process created by `fork` starts an engine of its own at its first call.

## Processes and threads

An engine converts one call at a time: threads that convert at once wait
for one another, and gain nothing. To convert a corpus on several cores,
use processes, with `multiprocessing` or `concurrent.futures`: each has an
engine of its own, which it starts once, and converts its share in batches
with the functions that take many strings.

## Long texts and memory

The time of a conversion grows with the length of its text, and no faster,
on either engine. While it converts, the library holds about 100 bytes for
each character of the text in the engine, and `convert_detailed()` two to
three times as much, besides the text and its result in Python: convert a
corpus by paragraphs or in batches, a call costing little.

One input is slow, as in the library: thousands of combining marks on one
letter, which no text has. Limit the length of untrusted input accordingly,
as [Guarantees and limits](/python/reference/guarantees/) says.
