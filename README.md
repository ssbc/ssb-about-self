<!--
SPDX-FileCopyrightText: 2021 Anders Rune Jensen

SPDX-License-Identifier: CC0-1.0
-->

# ssb-about-self

> An SSB secret-stack plugin for *profile data* using ssb-db2

## Install

```
npm install ssb-about-self
```

## Usage

- Requires **Node.js 12** or higher
- Requires `secret-stack@^6.2.0`
- Requires `ssb-db2@>=3.4.0`

```diff
 SecretStack({appKey: require('ssb-caps').shs})
   .use(require('ssb-master'))
+  .use(require('ssb-db2'))
+  .use(require('ssb-search2'))
   .use(require('ssb-conn'))
   .use(require('ssb-blobs'))
   .call(null, config)
```

Now, just pluck the ssb-db2 operator at `ssb.search2.operator` and use it like this:

```js
// Pluck the operator and name it whatever you want, e.g. `containsWords`
const containsWords = sbot.search2.operator;

sbot.db.query(
  where(containsWords('secure scuttlebutt')),
  toCallback((err, msgs) => {
    console.log(msgs) // all messages containing "secure" and "scuttlebutt"
                      // somewhere inside `msg.value.content.text`
  })
),
```

"But I get wrong results! I get messages that have 'secure' somewhere and 'scuttlebutt' somewhere else, while in reality I really want 'secure scuttlebutt' together!"

No problem! Just add a post-processing step that ensures the exact expression is together:

```js
pull(
  sbot.db.query(
    where(containsWords('secure scuttlebutt')),
    toPullStream()
  ),
  pull.filter((msg) =>
    msg.value.content.text.toLowerCase().includes('secure scuttlebutt'),
  ),
  pull.collect((err, msgs) => {
    console.log(msgs); // all messages containing exactly the expression
                       // "secure scuttlebutt" inside `msg.value.content.text`
  }),
);
```

## License

LGPL-3.0
