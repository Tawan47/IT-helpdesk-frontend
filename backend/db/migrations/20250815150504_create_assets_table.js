// backend/db/migrations/..._create_assets_table.js
exports.up = function(knex) {
  return knex.schema.createTable('assets', function(table) {
    table.increments('id').primary();
    table.string('name').notNullable();
    table.string('building').notNullable();
    table.string('floor');
    table.string('room');
    table.timestamps(true, true);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('assets');
};