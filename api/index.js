import { omit, map, flatten, uniq, path, pipe, prop, last, propEq, find, pathEq, filter, pluck } from 'ramda'
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
        }).map(l => {
          l.type = 'rep'
          return l
        })
      } else {
        return sens.filter(sen => {
          const term = getLatestTerm(sen)
          return term.state === leg.state
        }).map(l => {
          l.type = 'sen'
          return l
        })
      }
    }),
    flatten,
    uniq
  )(body.results)
  const legs = legIds.map(l => {
    return Object.assign(l, find(pathEq(['id', 'bioguide'], getId(l)), legSocial))
  })

  const socials = legs.map(s => `@${s.social.twitter}`)
  if (req.query.raw) {
    res.send(map(omit(['terms']), legs))
  } else {
    res.send(socials)
  }
}
