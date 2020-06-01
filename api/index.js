import { map, flatten, uniq, path, pipe, prop, last, propEq, find, pathEq, filter, pluck } from 'ramda'
const got = require('got')
const legCurrent = require('./legislators-current.json')
const legSocial = require('./legislators-social-media.json')

module.exports = async (req, res) => {
  let body
  try {
    const reps = await got.get(`http://whoismyrepresentative.com/getall_mems.php?zip=${req.query.zipcode}&output=json`, {
      https: {
        rejectUnauthorized: false
      },
      responseType: 'json'
    })
    body = reps.body
  } catch (e) {
    return res.send([])
  }
  const getId = path(['id', 'bioguide'])
  const getLatestTerm = pipe(
    prop('terms'),
    last
  )
  const sens = filter(pipe(
    getLatestTerm,
    propEq('type', 'sen')
  ), legCurrent)
  const reps = filter(pipe(
    getLatestTerm,
    propEq('type', 'rep')
  ), legCurrent)
  const legIds = pipe(
    map(leg => {
      const district = parseInt(leg.district, 10)
      if (district) {
        return reps.filter(rep => {
          const term = getLatestTerm(rep)
          return term.state === leg.state && parseInt(term.district, 10) === district
        })
      } else {
        return sens.filter(sen => {
          const term = getLatestTerm(sen)
          return term.state === leg.state
        })
      }
    }),
    flatten,
    uniq,
    map(getId)
  )(body.results)
  const socials = legIds.map(lId => find(pathEq(['id', 'bioguide'], lId), legSocial).social.twitter).map(s => `@${s}`)
  res.send(socials)
}
