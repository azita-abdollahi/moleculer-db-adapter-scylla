module.exports = {
 fields: {
   id: {
     type: "uuid"
   },
   username: {
     type: "text",
   },
   password: {
     type: "text"
   },
   age: {
    type: "int"
   }
 },
 key: ["id"],
 table_name: "users",
 indexes: ["username", "age"],
 options: {
   timestamps: {
     createdAt: 'created_at',
     updatedAt: 'updated_at'
   }
 }
}
