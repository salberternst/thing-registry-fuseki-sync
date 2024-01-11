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

function ensureTrailingSlash (str) {
  if (str.endsWith('/')) {
    return str
  } else {
    return str + '/'
  }
}

async function toRDF (description, base) {
  const expanded = await jsonld.expand(description, {
    documentLoader,
    base: ensureTrailingSlash(base)
  })

  return jsonld.toRDF(expanded, {
    format: 'application/n-quads'
  })
}

exports = module.exports = toRDF
