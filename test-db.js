import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function test() {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: 'admin@telelab.tn',
    password: '12341234'
  })
    
  console.log("Auth Data:", data.user ? "Success" : "Failed")
  console.log("Auth Error:", error)
}

test()
