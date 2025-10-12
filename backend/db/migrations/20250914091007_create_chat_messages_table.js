/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  // คำสั่งสำหรับ "สร้าง" ตาราง
  return knex.schema.createTable('chat_messages', function(table) {
    table.increments('id').primary(); // ID ของข้อความ
    // เชื่อมโยงไปยังใบแจ้งซ่อม ถ้าใบแจ้งซ่อมถูกลบ ข้อความจะถูกลบตามไปด้วย
    table.integer('ticket_id').unsigned().notNullable().references('id').inTable('tickets').onDelete('CASCADE');
    // เชื่อมโยงไปยังผู้ส่ง
    table.integer('sender_id').unsigned().notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.text('message').notNullable(); // เนื้อหาข้อความ
    table.timestamps(true, true); // สร้างคอลัมน์ created_at และ updated_at
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  // คำสั่งสำหรับ "ยกเลิก" การสร้างตาราง (เผื่อกรณีต้องการย้อนกลับ)
  return knex.schema.dropTable('chat_messages');
};

