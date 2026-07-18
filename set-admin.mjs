import { applicationDefault, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
const email=process.argv[2];if(!email){console.error('Usage: node scripts/set-admin.mjs you@example.com');process.exit(1)}
initializeApp({credential:applicationDefault()});const auth=getAuth(),user=await auth.getUserByEmail(email);await auth.setCustomUserClaims(user.uid,{...(user.customClaims||{}),admin:true});console.log(`Admin claim granted to ${email}. Sign out and back in to refresh the token.`);
