// SPDX-FileCopyrightText: 2022 Andre 'Staltz' Medeiros
//
// SPDX-License-Identifier: LGPL-3.0-only

const bipf = require('bipf')
const pull = require('pull-stream')
const pl = require('pull-level')
const clarify = require('clarify-error')
const Plugin = require('ssb-db2/indexes/plugin')

const BIPF_AUTHOR = bipf.allocAndEncode('author')
const BIPF_CONTENT = bipf.allocAndEncode('content')
const BIPF_ABOUT = bipf.allocAndEncode('about')
const BIPF_TYPE = bipf.allocAndEncode('type')
const B_ABOUT = Buffer.from('about')

// feedId => hydratedAboutObj
module.exports = class AboutSelf extends Plugin {
  constructor(log, dir) {
    super(log, dir, 'aboutSelf', 3, 'json', 'json')
    this.profiles = new Map()
  }

  onLoaded(cb) {
    pull(
      pl.read(this.level, {
        gte: '',
        lte: undefined,
        keyEncoding: this.keyEncoding,
        valueEncoding: this.valueEncoding,
        keys: true,
      }),
      pull.drain(
        (data) => {
          this.profiles.set(data.key, data.value)
        },
        (err) => {
          if (err && err !== true) {
            cb(clarify(err, 'AboutSelf.onLoaded() failed'))
          } else cb()
        }
      )
    )
  }

  processRecord(record, seq, pValue) {
    const buf = record.value

    const pAuthor = bipf.seekKey2(buf, pValue, BIPF_AUTHOR, 0)
    const pContent = bipf.seekKey2(buf, pValue, BIPF_CONTENT, 0)
    if (pContent < 0) return
    const pType = bipf.seekKey2(buf, pContent, BIPF_TYPE, 0)
    if (pType < 0) return
    const pContentAbout = bipf.seekKey2(buf, pContent, BIPF_ABOUT, 0)
    if (pContentAbout < 0) return

    if (bipf.compareString(buf, pType, B_ABOUT) === 0) {
      const author = bipf.decode(buf, pAuthor)
      const content = bipf.decode(buf, pContent)
      if (bipf.compareString(buf, pContentAbout, author) !== 0) return

      this.batch.push({
        type: 'put',
        key: author,
        value: this.updateProfileData(author, content),
      })
    }
  }

  indexesContent() {
    return true
  }

  reset() {
    this.profiles.clear()
  }

  updateProfileData(author, content) {
    let profile = this.profiles.has(author) ? this.profiles.get(author) : {}

    if (content.name) profile.name = content.name

    if (content.description) profile.description = content.description

    if (content.image && typeof content.image.link === 'string')
      profile.image = content.image.link
    else if (typeof content.image === 'string') profile.image = content.image

    this.profiles.set(author, profile)
    return profile
  }

  getProfile(feedId) {
    return this.profiles.get(feedId) || {}
  }

  getLiveProfile(feedId) {
    return pl.read(this.level, {
      gte: feedId,
      lte: feedId,
      keyEncoding: this.keyEncoding,
      valueEncoding: this.valueEncoding,
      keys: false,
      live: true,
      old: false,
    })
  }

  getProfiles() {
    return this.profiles
  }
}
