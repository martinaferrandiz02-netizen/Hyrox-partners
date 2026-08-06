import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://ekvzcrdebryeqqhjlnfl.supabase.co'
const supabaseKey = 'sb_publishable_SqjcHoJU-oh1yVKg2N6L5g_nNI01DpR'

export const supabase = createClient(supabaseUrl, supabaseKey)
