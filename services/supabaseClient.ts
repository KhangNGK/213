import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://tyhmnisxudjvecbpanjo.supabase.co';
const SUPABASE_KEY = 'sb_publishable_Ej0VJmIQ5QtSQOMwxLtGIQ_n1Bf0SLb';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);