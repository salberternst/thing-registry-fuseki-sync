'use strict'

const env = require('env-var')
const redis = require('redis')
const Queue = require('bee-queue')

const toRDF = require('./src/to_rdf')
const { addThingDescription, deleteThingDescription } = require('./src/fuseki')

const RedisUrl = env.get('REDIS_URL').required(true).asString()
const ThingRegistryTopic = 'thing_registry'

const queue = new Queue('thing-description-push', {
  redis: {
    url: RedisUrl,
    pingInterval: 5000
  }
})

queue.process(async (job) => {
  try {
    switch (job.data.eventType) {
      case 'create':
      case 'update': {
        console.log(job.data)
        const { publicDescription, description, tenantId, customerId } =
          job.data
        // build public and private rdf triples from thing description
        const rdfTriplesPublicThing = await toRDF(publicDescription)
        const rdfTriplesThing = await toRDF(description)

        console.log(rdfTriplesPublicThing)
        console.log(rdfTriplesThing)

        await addThingDescription(
          publicDescription.id,
          rdfTriplesPublicThing,
          `${tenantId}-public`
        )

        // add thing description to tenant
        await addThingDescription(description.id, rdfTriplesThing, tenantId)

        // add thing description to customer endpoint
        if (customerId) {
          await addThingDescription(
            description.id,
            rdfTriplesThing,
            `${tenantId}-${customerId}`
          )
        }

        break
      }

      case 'remove': {
        const { id, tenantId, customerId } = job.data

        await deleteThingDescription(id, `${tenantId}-public`)
        await deleteThingDescription(id, tenantId)

        if (customerId) {
          await deleteThingDescription(id, `${tenantId}-${customerId}`)
        }

        break
      }
    }
  } catch (e) {
    console.error(e)
  }

  return Promise.resolve()
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
