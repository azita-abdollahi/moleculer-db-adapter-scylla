"use strict";

const ScyllaDbAdapter = require('../../src/index'); 
const { ServiceBroker } = require("moleculer");
const UserModel = require('../models/users');

describe('ScyllaDbAdapter', () => {
   const broker = new ServiceBroker({ logger: false });
   const service = broker.createService({
      name: "user",
      model: UserModel,
   });

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

   let adapter;

   beforeEach(() => {
      adapter = new ScyllaDbAdapter(scyllaOptions);
      adapter.init(broker, service);
      adapter.connect = jest.fn().mockResolvedValue(); 
   });

   afterEach(() => {
      jest.clearAllMocks();
   });

   it("should be created with defined methods", () => {
      expect(adapter).toBeDefined();
      expect(adapter.opts).toBe(scyllaOptions);
      expect(adapter.init).toBeDefined();
      expect(adapter.connect).toBeDefined();
      expect(adapter.disconnect).toBeDefined();
      expect(adapter.insert).toBeDefined();
      expect(adapter.insertMany).toBeDefined();
      expect(adapter.find).toBeDefined();
      expect(adapter.findOne).toBeDefined();
      expect(adapter.findById).toBeDefined();
      expect(adapter.findByIds).toBeDefined();
      expect(adapter.updateById).toBeDefined();
      expect(adapter.updateMany).toBeDefined();
      expect(adapter.removeById).toBeDefined();
      expect(adapter.removeMany).toBeDefined();
      expect(adapter.count).toBeDefined();
      expect(adapter.clear).toBeDefined();
      expect(adapter.stringIdToUuid).toBeDefined();
      expect(adapter.generateUUID).toBeDefined();
   });

   describe("Initialization Tests", () => {
      it("should initialize with broker and service", () => {
         adapter.init(broker, service);
         expect(adapter.broker).toBe(broker);
         expect(adapter.service).toBe(service);
      });

      it("should throw an error when initialized without a model", () => {
         const serviceWithoutModel = broker.createService({ name: "user" });
         const adapterWithoutModel = new ScyllaDbAdapter(scyllaOptions);
         expect(() => adapterWithoutModel.init(broker, serviceWithoutModel)).toThrow();
      });

      it("should initialize with a model", () => {
         const serviceWithModel = broker.createService({
            name: "user",
            model: UserModel,
         });
         const adapterWithModel = new ScyllaDbAdapter(scyllaOptions);
         adapterWithModel.init(broker, serviceWithModel);
         expect(adapterWithModel.modelName).toBe("user");
         expect(adapterWithModel.schema).toBe(UserModel);
      });

      it("should initialize with schema and modelName", () => {
         const serviceWithModelName = broker.createService({
            name: "user",
            model: UserModel,
            modelName: "user",
         });
         const adapterWithModelName = new ScyllaDbAdapter(scyllaOptions);
         adapterWithModelName.init(broker, serviceWithModelName);
         expect(adapterWithModelName.modelName).toBe("user");
         expect(adapterWithModelName.schema).toBe(UserModel);
      });
   });

   describe("Connection Tests", () => {
      it("should connect to the database", async () => {
         adapter.opts = scyllaOptions;
         adapter.model = UserModel;
       
         await adapter.connect();
       
         expect(adapter.client).toBeDefined();
         expect(adapter.model).toBeDefined();
      });

      it("should handle connection errors gracefully", async () => {
         adapter.connect = jest.fn().mockRejectedValue(new Error('Connection failed'));
         await expect(adapter.connect()).rejects.toThrow('Connection failed');
      });
   });

   describe('Disconnection Tests', () => {
      it("should call closeAsync on client when disconnect is invoked", async () => {
         const mockClient = {
            closeAsync: jest.fn().mockResolvedValue(undefined),
         };
         adapter.client = mockClient;

         await adapter.disconnect();

         expect(mockClient.closeAsync).toHaveBeenCalled();
      });
   });

   describe('Insert Tests', () => {
      it("should insert an entity and return it", async () => {
         const entity = { username: "JohnDoe", password: "123456" };
         adapter.insert = jest.fn().mockResolvedValue(entity); 
         const insertedEntity = await adapter.insert(entity);
         expect(insertedEntity).toEqual(entity);
      });
   });

   describe('Insert Many Tests', () => {
      it("should insert multiple entities and return them", async () => {
         const entities = [
            { username: "Alice", password: "1234566" },
            { username: "Bob", password: "12345667" }
         ];
         adapter.insertMany = jest.fn().mockResolvedValue(entities); 
         const result = await adapter.insertMany(entities);
         expect(result).toEqual(entities);
      });
   });

   describe('Find Tests', () => {
      beforeEach(() => {
         adapter.find = jest.fn();
      });
 
      it("should find entities based on filters", async () => {
         const filters = { q: { username: "Alice" }, limit: 1 };
         const mockEntities = [{ username: "Alice" }, { username: "Bob" }];
         adapter.find.mockResolvedValue(mockEntities);
         const result = await adapter.find(filters);
         expect(result).toEqual(mockEntities);
      });
 
      it("should throw an error for unsupported full-text search", async () => {
         const filters = { search: "Alice" };
         adapter.find.mockImplementation(() => {
             throw new Error('Full-text search is not supported in ScyllaDB');
         });
         await expect(adapter.find(filters)).rejects.toThrow('Full-text search is not supported in ScyllaDB');
      });
 
      it("should handle find with search and searchFields gracefully", async () => {
         const filters = { q: {}, search: "Alice", searchFields: ["username"] };
         const mockEntities = [{ username: "Alice" }, { username: "Bob" }];
         adapter.find.mockResolvedValue(mockEntities);
         const result = await adapter.find(filters);
         expect(result).toEqual(mockEntities);
      });
 
      it("should return all entities without filters", async () => {
         const mockEntities = [
             { username: "Alice" },
             { username: "Bob" },
             { username: "JohnDoe" }
         ];
         adapter.find.mockResolvedValue(mockEntities);
         const result = await adapter.find({ q: {} });
         expect(result).toEqual(expect.arrayContaining(mockEntities));
      });
   });

   describe('Find One Tests', () => {
      it("should find one entity based on query", async () => {
         const query = { username: "Alice" };
         const mockEntity = { username: "Alice" };
         adapter.findOne = jest.fn().mockResolvedValue(mockEntity); 
         const result = await adapter.findOne(query);
         expect(result).toEqual(mockEntity);
      });
   });

   describe('Find By ID Tests', () => {
      it("should find an entity by ID", async () => {
          const id = "someUniqueID";
          const mockEntity = { id, username: "JohnDoe" };
          adapter.findById = jest.fn().mockResolvedValue(mockEntity); 
          const foundEntity = await adapter.findById(id);
          expect(foundEntity).toEqual(mockEntity);
      });

      it("should return null for a non-existent entity by ID", async () => {
          const id = "nonExistentID";
          adapter.findById = jest.fn().mockResolvedValue(null); 
          const foundEntity = await adapter.findById(id);
          expect(foundEntity).toBeNull();
      });
   });

   describe('Find By IDs Tests', () => {
      it("should find entities by IDs", async () => {
         const ids = ["someUniqueID1", "someUniqueID2"];
         const mockEntities = [
             { id: ids[0], username: "JohnDoe" },
             { id: ids[1], username: "JaneDoe" }
         ];
         adapter.findByIds = jest.fn().mockResolvedValue(mockEntities); 
         const foundEntities = await adapter.findByIds(ids);
         expect(foundEntities).toEqual(mockEntities);
      });
   });

   describe('Update By ID Tests', () => {
      it("should update an entity by ID", async () => {
          const id = "someUniqueID";
          const originalEntity = { id, username: "JohnDoe" };
          const update = { username: "John" };
          adapter.updateById = jest.fn().mockResolvedValue({ ...originalEntity, ...update });
          const updatedEntity = await adapter.updateById(id, update, { if_exists: true });
          expect(updatedEntity.username).toEqual(update.username);
      });

      it("should return null for a non-existent entity when updating", async () => {
          const id = "nonExistentID";
          const update = { username: "John" };
          adapter.updateById = jest.fn().mockResolvedValue(null);
          const updatedEntity = await adapter.updateById(id, update, { if_exists: true });
          expect(updatedEntity).toBeNull();
      });
   });

   describe('Update Many Tests', () => {
      it("should update multiple entities", async () => {
         const originalEntities = [
            { id: "someUniqueID1", username: "JohnDoe", password: "1234567" },
            { id: "someUniqueID2", username: "JohnDoe", password: "1683342" }
         ];
         const query = { username: "JohnDoe" };
         const update = { username: "John" };
         adapter.updateMany = jest.fn().mockResolvedValue(originalEntities.map(entity => ({ ...entity, ...update })));
         const updatedEntities = await adapter.updateMany(query, update, { if_exists: true });
         expect(updatedEntities).toEqual(originalEntities.map(entity => ({ ...entity, ...update })));
      });
   });

   describe('Remove By ID Tests', () => {
      it("should remove an entity by ID", async () => {
          const id = "someUniqueID";
          const mockEntity = { id, username: "JohnDoe" };
          adapter.removeById = jest.fn().mockResolvedValue(mockEntity);
          const removedEntity = await adapter.removeById(id);
          expect(removedEntity).toEqual(mockEntity);
      });

      it("should return null for a non-existent entity when removing", async () => {
          const id = "nonExistentID";
          adapter.removeById = jest.fn().mockResolvedValue(null);
          const removedEntity = await adapter.removeById(id);
          expect(removedEntity).toBeNull();
      });
   });

   describe('Remove Many Tests', () => {
      it("should remove multiple entities based on query", async () => {
         const query = { username: "JohnDoe" };
         const mockRemovedEntities = [
            { id: "someUniqueID1", username: "JohnDoe" },
            { id: "someUniqueID2", username: "JohnDoe" }
         ];
         adapter.removeMany = jest.fn().mockResolvedValue(mockRemovedEntities);
         const removedEntities = await adapter.removeMany(query);
         expect(removedEntities).toEqual(mockRemovedEntities);
         expect(adapter.removeMany).toHaveBeenCalledWith(query); 
      });
   });

   describe('Count Tests', () => {
      it("should return the count of documents based on filters", async () => {
          const filters = { username: "JohnDoe" };
          const mockDocs = [{ id: "someUniqueID1", username: "JohnDoe" }, { id: "someUniqueID2", username: "JohnDoe" }];
          adapter.find = jest.fn().mockResolvedValue(mockDocs);
          const count = await adapter.count(filters);
          expect(count).toBe(mockDocs.length); 
          expect(adapter.find).toHaveBeenCalledWith(filters); 
      });
   });

   describe('Clear Tests', () => {
      it("should remove all entities from the table", async () => {
         const mockRemovedEntities = [{ id: "someUniqueID1", username: "JohnDoe" }, { id: "someUniqueID2", username: "JohnDoe" }];
         adapter.removeMany = jest.fn().mockResolvedValue(mockRemovedEntities);
         const removedEntities = await adapter.clear();
         expect(removedEntities).toEqual(mockRemovedEntities); 
         expect(adapter.removeMany).toHaveBeenCalledWith({}); 
      });
   });

   describe('Utility Tests', () => {
      it("should convert a string ID to a UUID", () => {
          const stringId = "123e4567-e89b-12d3-a456-426614174000";
          const mockUuid = "some-uuid-value"; 
          adapter.stringIdToUuid = jest.fn().mockReturnValue(mockUuid);
          const result = adapter.stringIdToUuid(stringId);
          expect(result).toBe(mockUuid); 
          expect(adapter.stringIdToUuid).toHaveBeenCalledWith(stringId); 
      });

      it("should generate a new UUID", () => {
          const mockUuid = "new-uuid-value"; 
          adapter.generateUUID = jest.fn().mockReturnValue(mockUuid);
          const result = adapter.generateUUID();
          expect(result).toBe(mockUuid); 
          expect(adapter.generateUUID).toHaveBeenCalled(); 
      });
   });
});
