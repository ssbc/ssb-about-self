// SPDX-FileCopyrightText: 2021 Anders Rune Jensen
//
// SPDX-License-Identifier: Unlicense

const test = require('tape')
const ssbKeys = require('ssb-keys')
const path = require('path')
const rimraf = require('rimraf')
const pull = require('pull-stream')
const mkdirp = require('mkdirp')
const SecretStack = require('secret-stack')
const caps = require('ssb-caps')

const dir = '/tmp/ssb-about-self'

rimraf.sync(dir)
mkdirp.sync(dir)

const keys = ssbKeys.loadOrCreateSync(path.join(dir, 'secret'))

let sbot = SecretStack({ appKey: caps.shs })
  .use(require('ssb-db2'))
  .use(require('../'))
  .call(null, {
    keys,
    path: dir,
  })
const db = sbot.db

test('get self assigned', (t) => {
  const about = {
    type: 'about',
    about: sbot.id,
    name: 'arj',
    image: '&blob',
    publicWebHosting: true,
  }
  const aboutOther = { type: 'about', about: '@other', name: 'staltz' }

  db.publish(about, (err, postMsg) => {
    t.error(err, 'no err')

    db.publish(aboutOther, (err) => {
      t.error(err, 'no err')

      sbot.aboutSelf.get(sbot.id, (err, profile) => {
        t.error(err, 'no err')
        t.equal(profile.name, about.name)
        t.equal(profile.image, about.image)

        const newAbout = {
          type: 'about',
          about: sbot.id,
          name: 'arj2',
          image: {
            link: '&blob',
            size: 1024,
          },
        }

        db.publish(newAbout, (err) => {
          t.error(err, 'no err')

          sbot.aboutSelf.get(sbot.id, (err, profile) => {
            t.error(err, 'no err')
            t.equal(profile.name, newAbout.name)
            t.equal(profile.image, newAbout.image.link)

            t.end()
          })
        })
      })
    })
  })
})

test('get live profile', (t) => {
  const about = {
    type: 'about',
    about: sbot.id,
    name: 'arj',
    image: '&blob',
    publicWebHosting: true,
  }
  const aboutOther = { type: 'about', about: '@other', name: 'staltz' }

  db.publish(about, (err, postMsg) => {
    t.error(err, 'no err')

    db.publish(aboutOther, (err) => {
      t.error(err, 'no err')

      sbot.aboutSelf.get(sbot.id, (err, profile) => {
        t.error(err, 'no err')
        t.equal(profile.name, about.name)
        t.equal(profile.image, about.image)

        const newAbout = {
          type: 'about',
          about: sbot.id,
          name: 'arj03',
          publicWebHosting: false
        }

        const expected = [
          { name: 'arj', image: '&blob', publicWebHosting: true },
          { name: 'arj03', image: '&blob', publicWebHosting: false }
        ]
        pull(
          sbot.aboutSelf.stream(sbot.id),
          pull.drain((profile) => {
            const e = expected.shift()
            t.ok(e)
            t.deepEqual(profile, e, e)

            if (expected.length === 0) {
              t.end()
              return false // abort the drain
            }
          })
        )

        db.publish(newAbout, (err) => {
          t.error(err, 'no err')
        })
      })
    })
  })
})

test('should load about-self from disk', (t) => {
  sbot.close((err) => {
    t.error(err)
    t.pass('closed sbot')
    sbot = SecretStack({ appKey: caps.shs })
      .use(require('ssb-db2'))
      .use(require('../'))
      .call(null, {
        keys,
        path: dir,
      })

    sbot.aboutSelf.get(sbot.id, (err, profile) => {
      t.error(err, 'no err')
      t.equal(profile.name, 'arj03')
      t.end()
    })
  })
})

test('teardown sbot', (t) => {
  sbot.close(() => t.end())
})
