import fs from 'node:fs';
import {checkPublicConfig} from '../dist/accounts.js';
const file=new URL('../dist/config.json',import.meta.url);
const existing=JSON.parse(fs.readFileSync(file,'utf8'));
const config={supabaseUrl:process.env.SUPABASE_URL||existing.supabaseUrl||'',supabasePublishableKey:process.env.SUPABASE_PUBLISHABLE_KEY||existing.supabasePublishableKey||''};
try{
 const verified=checkPublicConfig(config);
 if(!verified&&process.argv.includes('--require'))throw Error('Set SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY in your hosting configuration first.');
 fs.writeFileSync(file,JSON.stringify(config,null,2)+'\n');
 console.log(verified?'Google account configuration is ready.':'Account service is not configured; scent exploration remains available.');
}catch(error){console.error(error.message);process.exitCode=1}
