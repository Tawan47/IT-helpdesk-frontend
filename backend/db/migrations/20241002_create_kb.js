// backend/db/migrations/20241002_create_kb.js
exports.up = async function(knex) {
  const hasArticles = await knex.schema.hasTable('kb_articles');
  if (!hasArticles) {
    await knex.schema.createTable('kb_articles', (t) => {
      t.increments('id').primary();
      t.string('title').notNullable();
      t.text('content').notNullable();
      t.string('category').defaultTo('ทั่วไป');
      t.timestamps(true, true);
    });
  }

  const hasEmb = await knex.schema.hasTable('kb_embeddings');
  if (!hasEmb) {
    await knex.schema.createTable('kb_embeddings', (t) => {
      t.increments('id').primary();
      t.integer('article_id').references('kb_articles.id').onDelete('CASCADE');
      // เก็บ embedding เป็น JSON (ตัวเลข float[]), ง่ายและพอสำหรับ SQLite
      t.json('vector').notNullable();
      t.timestamps(true, true);
    });
  }
};

exports.down = async function(knex) {
  await knex.schema.dropTableIfExists('kb_embeddings');
  await knex.schema.dropTableIfExists('kb_articles');
};
