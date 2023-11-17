'use strict'

const jsonld = require('jsonld')
const td11Context = require('./td-context-1.1.json')

const contexts = {
  'https://www.w3.org/2022/wot/td/v1.1': {
    '@context': td11Context['@context']
  }
}
const nodeDocumentLoader = jsonld.documentLoaders.node()

async function documentLoader (url) {
  if (url in contexts) {
    return {
      contextUrl: null,
      document: contexts[url],
      documentUrl: url
    }
  }
  nodeDocumentLoader(url)
}

function fixUris (description, id) {
  // a bug in jsonld prevents the usage of urns as base uris
  // we need to traverse over all @id and replace all urn:/

  // instead of traversing the whole object we convert it to a string and fix all urns there.
  const str = JSON.stringify(description).replace(/uri:\//g, `${id}/`)
  return JSON.parse(str)
}

async function toRDF (description) {
  const expanded = await jsonld.expand(description, {
    documentLoader,
    base: description.id
  })

  return jsonld.toRDF(fixUris(expanded, description.id), {
    format: 'application/n-quads'
  })
}

exports = module.exports = toRDF
