// backend/db/migrations/..._add_logs_to_tickets.js
exports.up = function(knex) {
  return knex.schema.table('tickets', function(table) {
    // เพิ่มคอลัมน์ logs ชนิด text และกำหนดค่าเริ่มต้นเป็น JSON array ว่าง
    table.text('logs').defaultTo('[]'); 
  });
};

exports.down = function(knex) {
  return knex.schema.table('tickets', function(table) {
    table.dropColumn('logs');
  });
};