// =================================================================
// 📁 backend/supabaseClient.js
// Supabase client สำหรับ Storage operations
// =================================================================
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.warn('⚠️ SUPABASE_URL or SUPABASE_SERVICE_KEY is not set. Storage upload will fail.');
}

const supabase = createClient(supabaseUrl || '', supabaseServiceKey || '', {
    auth: {
        autoRefreshToken: false,
        persistSession: false,
    },
});

module.exports = supabase;
