'use strict'

const env = require('env-var')
const redis = require('redis')
const Queue = require('bee-queue')

const toRDF = require('./src/to_rdf')
const { addThingDescription, deleteThingDescription } = require('./src/fuseki')

const RedisUrl = env.get('REDIS_URL').required(true).asString()
const ThingRegistryTopic = 'thing_registry'

const queue = new Queue('thing-description-push', {
  redis: redis.createClient({
    url: RedisUrl,
    pingInterval: 5000
  })
})

queue.process(async (job) => {
  try {
    switch (job.data.eventType) {
      case 'create':
      case 'update': {
        const { publicDescription, description, tenantId } = job.data
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
        const { id, tenantId } = job.data
        await deleteThingDescription(id, `${tenantId}-public`)
        await deleteThingDescription(id, tenantId)
        break
      }
    }
  } catch (e) {
    console.error(e)
  } finally {
    console.log('Jobs done')
    return Promise.resolve()
  }
})

async function onThingEvent (data) {
  try {
    await queue.createJob(JSON.parse(data)).save()
  } catch (e) {
    console.error(e)
  }
}

async function run () {
  const client = redis.createClient({
    url: RedisUrl,
    pingInterval: 5000
  })

  await client.connect()
  await client.subscribe(ThingRegistryTopic, onThingEvent)
}

run()
  .then(() => console.log('Running'))
  .catch((e) => console.error(e))
