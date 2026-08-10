import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://jqimvdazwqcfqhxsksqv.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpxaW12ZGF6d3FjZnFoeHNrc3F2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU3MjgxNzAsImV4cCI6MjEwMTMwNDE3MH0.s0Enb1LhbDQEZhVeZ3anGDF4SX5D3r6gBFql1Uc7Jhw'

export const supabase = createClient(supabaseUrl, supabaseKey)