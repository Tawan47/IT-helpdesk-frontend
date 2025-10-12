/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('inventory', function(table) {
    table.increments('id').primary();
    table.string('name').notNullable();
    table.string('code').unique();
    table.string('location');
    table.date('purchase_date');
    table.string('status').defaultTo('In Use');
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTable('inventory');
};
