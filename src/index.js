"use strict";

const _ = require("lodash");
const { ServiceSchemaError } = require("moleculer").Errors;
const scylla = require('express-cassandra');

// Define the ScyllaDB adapter class
class ScyllaDbAdapter {
    constructor(opts) {
        this.opts = opts;
        this.client = null;
    }

    init(broker, service) {
        this.broker = broker;
        this.service = service;

        // Access the schema and the model name from the service settings
        this.schema = this.service.schema.model;
        this.modelName = this.service.schema.modelName || this.service.schema.name;
        // Throw an error if the model name is missing
        if (!this.modelName || !this.schema) {
            throw new ServiceSchemaError("Missing `modelName` or `name` definition in schema of service!");
        }
    }

    connect() {
        this.client = scylla.createClient({
            clientOptions: {
                contactPoints: this.opts.contactPoints,
                localDataCenter: this.opts.localDataCenter,
                protocolOptions: { port: 9042 },
                keyspace: this.opts.keyspace,
                queryOptions: { consistency: scylla.consistencies.one },
                socketOptions: { readTimeout: 60000 },
                authProvider: new scylla.driver.auth.PlainTextAuthProvider(this.opts.authProvider.username, this.opts.authProvider.password)
            },
            ormOptions: this.opts.ormOptions
        });

        // Define a model using the client.loadSchema method and the schema
        this.model = this.client.loadSchema(this.modelName, this.schema);

        // Assign the client and the model to this.client and this.model
        this.client = this.client;
        this.model = this.model;
        return new Promise((resolve, reject) => {
          this.model.syncDB(function(err, result) {
            if (err) reject(err);
              else resolve(result);
            });
        })
        .then(() => {
            // Call the afterConnected method from the service if it exists
            if (this.service.afterConnected)
                this.service.afterConnected();

            if (!this.client) {
                throw new MoleculerError("ScyllaDB connection failed to get DB object");
            }

            this.service.logger.info("ScyllaDB adapter has connected successfully.");
        });
    }

    // Disconnect from the database
    disconnect() {
        return this.client.closeAsync();
    }

    // Create an entity
    insert(entity) {
        const id = this.generateUUID();
        const entityWithId = { ...entity, id: id };
        const item = new this.model(entityWithId);
        return item.saveAsync().then(() => this.findById(id));
    }

    // Insert many entities
    insertMany(entities) {
        const promises = entities.map(entity => this.insert(entity));
        return Promise.all(promises);
    }

    // Find all entities by filters.
    find(filters) {
        return this.createCursor(filters);
    }

    // Find an entity by query
    findOne(query) {
        return this.model.findOneAsync(query, { raw: true, allow_filtering: true });
    }

    // Find an entity by ID
    findById(id) {
        return this.model.findOneAsync({ id });
    }

    // Find any entities by IDs
    findByIds(idList) {
        return this.model.findAsync({
            id: {
                $in: idList
            }
        });
    }

    // Update an entity by ID
    updateById(id, update, options = {}) {
        return this.model.updateAsync({ id }, update, options).then(() => this.findById(id));
    }

    // Update many entities by `query` and `update`
    updateMany(query, update, options = {}) {
        const filters = {};
        filters.q = query;
        return this.find(filters).then(records => {
            const promises = records.map(record => this.updateById(record.id, update, options));
            return Promise.all(promises);
        });
    }

    // Remove an entity by ID
    removeById(id) {
      this.model.deleteAsync({ id });
      return this.findById(id)
    }

    // Remove entities which are matched by `query`
    removeMany(query) {
        const filters = {};
        filters.q = query;
        return this.find(filters).then(records => {
            const promises = records.map(record => this.removeById(record.id));
            return Promise.all(promises);
        });
    }

    // Count entities by query
    count(filters = {}) {
        return this.find(filters).then(docs => docs.length);
    }

    // Clear all entities from table
    clear() {
        return this.removeMany({});
    }

    // Create a filtered query
    createCursor(params) {
        try {
            if (params) {
                let query = {};
                if (params.q) {
                    Object.keys(params.q).forEach(key => {
                        query[key] = params.q[key];
                    });
                }

                // Search
                if (_.isString(params.search) && params.search !== "") {
                    if (params.searchFields && params.searchFields.length > 0) {
                        params.searchFields.forEach(f => {
                            query[f] = { $like: params.search };
                        });
                    } else {
                        // Full-text search is not supported in ScyllaDB
                        throw new Error('Full-text search is not supported in ScyllaDB');
                    }
                }

                // Limit
                if (_.isNumber(params.limit) && params.limit > 0) {
                    query.$limit = params.limit;
                }

                return this.model.findAsync(query, { raw: true, allow_filtering: true });
            }

            return this.model.findAsync({}, { raw: true, allow_filtering: true });

        } catch (error) {
            console.error(`Error while creating cursor: ${error}`);
            throw error;
        }
    }

    // Cast String Id to UUID 
    stringIdToUuid(id) {
        return scylla.uuidFromString(id);
    }

    // Generate UUID
    generateUUID() {
        return scylla.uuid();
    }

    // Convert DB entity to JSON object
    entityToObject(entity) {
        return entity;
    }

    // For compatibility only.
    beforeSaveTransformID(entity, idField) {
        return entity;
    }

    // For compatibility only.
    afterRetrieveTransformID(entity, idField) {
        return entity;
    }
}

module.exports = ScyllaDbAdapter;
