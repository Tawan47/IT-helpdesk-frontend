// backend/db/migrations/..._create_notifications_table.js
exports.up = function(knex) {
  return knex.schema.createTable('notifications', function(table) {
    table.increments('id').primary();
    table.integer('user_id').unsigned().notNullable().references('id').inTable('users');
    table.integer('ticket_id').unsigned().references('id').inTable('tickets');
    table.string('message').notNullable();
    table.boolean('is_read').defaultTo(false);
    table.timestamps(true, true);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('notifications');
};