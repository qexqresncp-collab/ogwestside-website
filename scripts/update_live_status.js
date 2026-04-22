/*
 Node script for GitHub Actions to update live.json with Twitch live status.
 Requires environment variables:
   TWITCH_CLIENT_ID
   TWITCH_CLIENT_SECRET
   GITHUB_TOKEN (provided by actions automatically)
   GITHUB_REPOSITORY (provided automatically, e.g. owner/repo)

 The script will obtain an app access token, query the Helix streams endpoint
 for the configured channel, write live.json and commit if changed.
*/

const fs = require('fs');
const {execSync} = require('child_process');

const CHANNEL = process.env.TWITCH_CHANNEL || '0gwestside';
const CLIENT_ID = process.env.TWITCH_CLIENT_ID;
const CLIENT_SECRET = process.env.TWITCH_CLIENT_SECRET;
const REPO = process.env.GITHUB_REPOSITORY; // owner/repo

if(!CLIENT_ID || !CLIENT_SECRET){
    console.error('TWITCH_CLIENT_ID and TWITCH_CLIENT_SECRET must be set');
    process.exit(1);
}

async function getAppToken(){
    const url = `https://id.twitch.tv/oauth2/token?client_id=${CLIENT_ID}&client_secret=${CLIENT_SECRET}&grant_type=client_credentials`;
    const res = await fetch(url, {method:'POST'});
    if(!res.ok) throw new Error('Failed to get token: '+res.statusText);
    const j = await res.json();
    return j.access_token;
}

async function checkLive(token){
    const url = `https://api.twitch.tv/helix/streams?user_login=${CHANNEL}`;
    const res = await fetch(url, {headers:{'Client-Id':CLIENT_ID,'Authorization':'Bearer '+token}});
    if(!res.ok) throw new Error('Failed to query streams: '+res.statusText);
    const j = await res.json();
    const live = Array.isArray(j.data) && j.data.length>0;
    const started_at = live ? j.data[0].started_at : null;
    return {live, started_at};
}

(async ()=>{
    try{
        console.log('Getting app access token...');
        const token = await getAppToken();
        console.log('Checking live status for', CHANNEL);
        const status = await checkLive(token);
        const newObj = { live: status.live, channel: CHANNEL, started_at: status.started_at };
        const path = 'live.json';
        const old = fs.existsSync(path) ? JSON.parse(fs.readFileSync(path,'utf8')) : {};
        const same = JSON.stringify(old) === JSON.stringify(newObj);
        if(same){
            console.log('No change to live.json');
            return;
        }
        fs.writeFileSync(path, JSON.stringify(newObj, null, 2));
        console.log('Wrote live.json:', newObj);

        // commit and push
        const githubToken = process.env.GITHUB_TOKEN;
        if(!githubToken){
            console.log('GITHUB_TOKEN not provided, skipping commit');
            return;
        }

        // configure git
        execSync('git config user.name "github-actions[bot]"');
        execSync('git config user.email "41898282+github-actions[bot]@users.noreply.github.com"');
        execSync('git add live.json');
        execSync('git commit -m "ci: update live.json (automated)" || true');

        // push using token
        const remote = `https://${githubToken}@github.com/${REPO}.git`;
        execSync(`git push ${remote} HEAD:${process.env.GITHUB_REF_NAME || 'main'}`);
        console.log('Pushed live.json');

    }catch(err){
        console.error('Error updating live status', err);
        process.exit(1);
    }
})();
