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
    }
});

const checker = new ModuleChecker(23);

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

let userId = [];

// Count of users
checker.add("--- COUNT ---", () => adapter.count({ 
    username: "JohnDoe" 
}), res => {
    console.log(res);
    return res === 0;
});

// Create new User
checker.add("--- INSERT ---", () => adapter.insert({
    username: "JohnDoe",
    password: "123456",
    age: 34
}), doc => {
    userId[0] = doc.id; 
    console.log("Saved: ", doc);
    return doc.id && doc.username === "JohnDoe" && doc.password === "123456" && doc.age === 34;
});

// Find
checker.add("--- FIND ---", () => adapter.find({q: {}, allow_filtering: true}), res => { 
    console.log(res);
    return res.length === 1 && res[0].id.toString() === userId[0].toString(); 
});

// Find by ID
checker.add("GET", () => adapter.findById(userId[0]), res => {
	console.log(res);
	return res.id.toString() === userId[0].toString();
});

// Count of users
checker.add("COUNT", () => adapter.count(), res => {
	console.log(res);
	return res === 1;
});

// Insert many new users
checker.add("INSERT MANY", () => adapter.insertMany([
	{ username: "Alice", password: "1234566", age: 21 },
    { username: "JohnDoe", password: "12345667", age: 24 }
]), docs => {
	console.log("Saved: ", docs);
	userId[1] = docs[0].id;
	userId[2] = docs[1].id;

	return [
		docs.length === 2,
		userId[1] && docs[0].username === "Alice" && docs[0].password === "1234566" && docs[0].age === 21,
		userId[1] && docs[1].username === "JohnDoe" && docs[1].password === "12345667" && docs[1].age === 24
	];
});

// Count of users
checker.add("COUNT", () => adapter.count(), res => {
	console.log(res);
	return res === 3;
});

// Find
checker.add("FIND by selector", () => adapter.find({q: {}, select: ['username as name', 'age'] }), res => {
	console.log(res);
	return res.length === 3;
});

// Find
checker.add("FIND by limit, groupby, query", () => adapter.find({ q: { age: { $in: [24, 21]}, $groupby: [ 'age' ]}, limit: 1}), res => {
	console.log(res);
	return res.length === 1;
});

// Find
checker.add("FIND by query ($gt)", () => adapter.find({q: {age : { '$gt':20, '$lte':24 }}}), res => {
	console.log(res);
	return res.length === 2;
});

// Find
checker.add("COUNT by query ($in)", () => adapter.find({q: {age : { '$in': [24, 21] }}}), res => {
	console.log(res);
	return res.length === 2;
});

// Find
checker.add("Find by search and searchField", () => adapter.find({q: {}, search: "Alice", searchFields:['username']}), res => {
	console.log(res);
	return res.length === 1 && res[0].id.toString() === userId[1].toString();
});

// FindOne
checker.add("Find One", () => adapter.findOne({"username": "Alice"}), res => {
	console.log(res);
	return res.username === "Alice";
});

// Find by IDs
checker.add("GET BY IDS", () => adapter.findByIds([userId[2], userId[0]]), res => {
    console.log(res);
    return res.length === 2;
});

// Update a user
checker.add("--- UPDATE ---", () => adapter.updateById(userId[0], { 
    password: "1239248374"
}), res => {
    console.log(res);
    return res.id.toString() === userId[0].toString() && res.password === "1239248374";
});

// Update by query
checker.add("UPDATE BY QUERY", () => adapter.updateMany({username: "JohnDoe"},
	{
		password: "1235056873"
	}), count => {
	console.log("Updated: ", count);
	return count.length === 2;
});

// Remove by query
checker.add("REMOVE BY QUERY", () => adapter.removeMany({username: "JohnDoe"}), count => {
	console.log("Removed: ", count);
	return count.length === 2;
});

// Count of posts
checker.add("COUNT", () => adapter.count(), res => {
	console.log(res);
	return res === 1;
});

// Remove by ID
checker.add("REMOVE BY ID", () => adapter.removeById(userId[1]), doc => {
	console.log("Removed: ", doc);
	return doc && doc.id.toString() === userId[1].toString();
});

// Count of posts
checker.add("COUNT", () => adapter.count(), res => {
	console.log(res);
	return res === 0;
});

// Clear
checker.add("CLEAR", () => adapter.clear(), res => {
	console.log(res);
	return res.length === 0;
});

broker.start();
