'use strict'

const env = require('env-var')
const urlencode = require('form-urlencoded')

const FusekiUrl = env.get('FUSEKI_URL').required(true).asString()
const FusekiUsername = env.get('FUSEKI_USERNAME').default('admin').asString()
const FusekiPassword = env.get('FUSEKI_PASSWORD').required(true).asString()

const Authorization =
  'Basic ' +
  Buffer.from(FusekiUsername + ':' + FusekiPassword).toString('base64')

async function update (query, dataset) {
  const response = await fetch(`${FusekiUrl}/${dataset}/update`, {
    method: 'POST',
    body: urlencode({
      update: query
    }),
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization
    }
  })

  if (!response.ok) {
    throw new Error('Error running update query')
  }

  return response
}

async function addThingDescription (id, triples, dataset) {
  const query = `
    DROP GRAPH <${id}> ;
    INSERT DATA {
      GRAPH <${id}> {
        ${triples}
      }
    } 
  `
  return update(query, dataset)
}

async function deleteThingDescription (id, dataset) {
  const query = `
    DROP GRAPH <${id}> ;
  `
  return update(query, dataset)
}

exports = module.exports = {
  addThingDescription,
  deleteThingDescription
}
