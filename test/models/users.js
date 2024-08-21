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
   }
 },
 key: ["id"],
 table_name: "users",
 indexes: ["username"],
 options: {
   timestamps: {
     createdAt: 'created_at',
     updatedAt: 'updated_at'
   }
 }
}
