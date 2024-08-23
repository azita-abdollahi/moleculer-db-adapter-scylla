# ![moleculer](https://camo.githubusercontent.com/ec4bc4b38405ab01741c0a8dbed6a6a80431c0c1d1727eb0ff36f4b8831654fa/687474703a2f2f6d6f6c6563756c65722e73657276696365732f696d616765732f62616e6e65722e706e67)

# ScyllaDB Adapter for MoleculerJS



## Overview

The **ScyllaDB Adapter for MoleculerJS** is a powerful and efficient adapter that allows you to seamlessly integrate ScyllaDB with your Moleculer microservices. This adapter provides a simple and intuitive API for performing CRUD operations, making it easy to manage your data in a ScyllaDB database.

This adapter is built using the [express-cassandra](https://express-cassandra.readthedocs.io/en/latest/) package, which simplifies interactions with Cassandra and ScyllaDB.

## Features

- **CRUD Operations**: Easily perform Create, Read, Update, and Delete operations on your ScyllaDB collections.
- **Connection Management**: Automatically handle connections to your ScyllaDB instance.
- **Model Support**: Define your data models using a schema and interact with them through the adapter.
- **Error Handling**: Gracefully handle connection and operation errors.
- **UUID Support**: Convert string IDs to UUIDs and generate new UUIDs for your entities.
- **Testing**: Comprehensive unit tests to ensure the reliability of the adapter.

## Install

```sh
$ npm install moleculer-db moleculer-db-adapter-scylla --save
```

## Usage

 **Create a Moleculer Service**: Define a service that uses the ScyllaDB adapter.

 ```javascript
const { ServiceBroker } = require("moleculer");
const ScyllaDbAdapter = require("moleculer-db-adapter-scylla");
const users = require('./users.model'); // Import your model

const scyllaOptions = {
    contactPoints: ["127.0.0.1"],
    localDataCenter: "datacenter1",
    keyspace: "test",
    authProvider: { username: "cassandra", password: "cassandra" },
};

const adapter = new ScyllaDbAdapter(scyllaOptions);

const broker = new ServiceBroker();

broker.createService({
    name: "users",
    mixins: [DbService],
    adapter: adapter,
    model: users,
    settings: {
        // Define any additional settings here
    },
});

broker.start()
// Create a new user
.then(() => broker.call("users.create", {
	username: "Alice", password: "1234566", age: 21
}))

// Get all users
.then(() => broker.call("users.find", {q: {}}).then(console.log));
 ```

## Options

**Example with scylla options**

```js
const scyllaOptions = {
    contactPoints: ["127.0.0.1"],
    localDataCenter: "datacenter1",
    keyspace: "test",
    authProvider: { username: "cassandra", password: "cassandra" },
};

const adapter = new ScyllaDbAdapter(scyllaOptions);
```

## Testing

```bash 
$ npm test 
```

In development with watching

```sh
$ npm run ci
```

## Acknowledgments

- [Moleculer](https://moleculer.services/) - A modern microservices framework for Node.js.
- [ScyllaDB](https://scylladb.com/) - A high-performance NoSQL database compatible with Apache Cassandra.
- [express-cassandra](https://www.npmjs.com/package/express-cassandra) - A package that simplifies interactions with Cassandra and ScyllaDB.

## License

This project is licensed under the [MIT License](https://tldrlegal.com/license/mit-license). 

## Contact

Copyright (c) 2024 Azita  Abdollahi

---