/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  // เติม return ตรงนี้
  return knex.schema
    .createTable('users', function (table) {
      // ... โค้ดส่วนที่เหลือเหมือนเดิม ...
      table.increments('id').primary();
      table.string('name', 255).notNullable();
      table.string('email', 255).notNullable().unique();
      table.string('password', 255).notNullable();
      table.string('role', 50).notNullable().defaultTo('User');
    })
    .createTable('tickets', function (table) {
      // ... โค้dส่วนที่เหลือเหมือนเดิม ...
      table.increments('id').primary();
      table.string('title', 255).notNullable();
      table.text('description').notNullable();
      table.string('status', 50).notNullable().defaultTo('Submitted');
      table.string('building', 255);
      table.string('floor', 255);
      table.string('room', 255);
      table.string('image_url', 255);
      table.integer('rating');
      table.text('feedback');
      table.integer('user_id').unsigned().references('id').inTable('users');
      table.integer('technician_id').unsigned().references('id').inTable('users').nullable();
      table.timestamps(true, true);
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  // เติม return ตรงนี้ด้วย
  return knex.schema
    .dropTable('tickets')
    .dropTable('users');
};