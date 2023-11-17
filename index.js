'use strict'

const env = require('env-var')
const redis = require('redis')
const toRDF = require('./src/to_rdf')
const { addThingDescription, deleteThingDescription } = require('./src/fuseki')

const RedisUrl = env.get('REDIS_URL').required(true).asString()
const ThingRegistryTopic = 'thing_registry'

async function onThingEvent (data) {
  const event = JSON.parse(data)
  switch (event.eventType) {
    case 'create':
    case 'update': {
      const { publicDescription, description, tenantId } = event
      const rdfTriplesPublicThing = await toRDF(publicDescription)
      const rdfTriplesThing = await toRDF(description)

      await addThingDescription(
        publicDescription.id,
        rdfTriplesPublicThing,
        `${tenantId}-public`
      )
      await addThingDescription(description.id, rdfTriplesThing, tenantId)
      break
    }

    case 'remove': {
      const { id, tenantId } = event
      await deleteThingDescription(id, `${tenantId}-public`)
      await deleteThingDescription(id, tenantId)
      break
    }
  }
}

const client = redis.createClient({
  url: RedisUrl
})
client.connect()
client.subscribe(ThingRegistryTopic, onThingEvent)
