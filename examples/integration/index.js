"use strict";

const { ServiceBroker } = require("moleculer");
const StoreService = require("../../../moleculer-db/index");
const ScyllaAdapter = require("../../src/index");
const UserModel = require("../models/users");
const ModuleChecker = require("../../../moleculer-db/test/checker");
const Promise = require("bluebird");

// Create broker
const broker = new ServiceBroker({
    logger: console,
    logLevel: "debug"
});

let adapter;

// ScyllaDB connection options
const scyllaOptions = {
    contactPoints: ["127.0.0.1"],
    localDataCenter: "datacenter1",
    keyspace: "test",
    authProvider: { username: "cassandra", password: "cassandra" },
    ormOptions: {
        defaultReplicationStrategy: {
            class: 'SimpleStrategy',
            replication_factor: 1
        },
        migration: 'safe'
    }
};

// Load user service
broker.createService(StoreService, {
    name: "user",
    adapter: new ScyllaAdapter(scyllaOptions),
    model: UserModel,
    afterConnected() {
        this.logger.info("Connected successfully");
        adapter = this.adapter;
        return this.adapter.clear().then(() => start());
    },
    settings: {
		fields: ["id", "username", "password", "age", "createdAt", "updatedAt"]
	},
});


const checker = new ModuleChecker(7);

// Start checks
function start() {
    Promise.resolve()
        .delay(500)
        .then(() => checker.execute())
        .catch(console.error)
        .then(() => broker.stop())
        .then(() => checker.printTotal());
}

// --- TEST CASES ---

let userIds = [];

// Count of users
checker.add("COUNT", () => broker.call("user.count"), res => {
    console.log(res);
    return res === 0;
});

// Create new user
checker.add("--- CREATE ---", () => broker.call("user.create", {
	username: "Alice", password: "1234566", age: 21
}), doc => {
	userIds[0] = doc.id;
	console.log("Saved: ", doc);
	return doc.id && doc.username === "Alice" && doc.password === "1234566" && doc.age === 21;
});

// List users
checker.add("--- FIND ---", () => broker.call("user.find", {q: {}}), res => {
    console.log(res);
    return res.length === 1 && res[0].id.toString() === userIds[0].toString();
});

// Update user
checker.add("--- UPDATE ---", () => broker.call("user.update", {id: userIds[0], username: "AliceUpdated"}), res => {
    console.log(res);
    return res.id.toString() === userIds[0].toString();
});

// Count of users
checker.add("--- COUNT ---", () => broker.call("user.count"), res => {
    console.log(res);
    return res === 1;
});

// Remove user
checker.add("--- REMOVE ---", () => broker.call("user.remove", {id: userIds[0]}), res => {
    console.log(res);
    return res.id.toString() === userIds[0].toString();
});

// Count of users
checker.add("--- COUNT ---", () => broker.call("user.count"), res => {
    console.log(res);
    return res === 0;
});

broker.start();
