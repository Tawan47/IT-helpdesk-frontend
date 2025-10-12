// backend/knexfile.js
require('dotenv').config();

module.exports = {
  development: {
    // 1. เปลี่ยน client เป็น 'pg'
    client: 'pg',

    // 2. เปลี่ยน object 'connection' ทั้งหมด
    connection: {
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_DATABASE,
      
      // 3. (สำคัญมาก) เพิ่ม ssl สำหรับการเชื่อมต่อกับ Cloud Database
      ssl: { rejectUnauthorized: false } 
    },

    // ส่วน migrations และ seeds ให้คงไว้เหมือนเดิม
    migrations: {
      directory: './db/migrations' 
    },
    seeds: {
      directory: './db/seeds'
    }
  },

  // ถ้ามี production environment ก็แก้ไขในลักษณะเดียวกัน
  production: {
    // ...
  }
};