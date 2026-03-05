// Small client script for preloader and smooth page transitions
window.addEventListener('DOMContentLoaded',()=>{
    const pre = document.getElementById('preloader');
    // keep preloader for a minimum time then hide
    setTimeout(()=>{pre.classList.add('hidden');setTimeout(()=>pre.remove(),700)},900);

    // fade out links on click to create page transition illusion
    document.querySelectorAll('a[href]').forEach(a=>{
        // ignore external links
        if(a.target==='_blank' || a.href.indexOf(location.origin)===-1) return;
        a.addEventListener('click', (e)=>{
            e.preventDefault();
            const href = a.getAttribute('href');
            document.body.style.transition = 'opacity .45s ease';
            document.body.style.opacity = '0';
            setTimeout(()=>{ location.href = href; },420);
        })
    })
});

// Check live status from a static JSON file (updated by CI/cron or a server)
async function initTwitchEmbed(){
    const twitchArea = document.getElementById('twitch-area');
    if(!twitchArea) return;

    try{
        const res = await fetch('/live.json', {cache: 'no-store'});
        if(!res.ok){
            // network or file missing - quietly fail
            console.debug('live.json not available');
            return;
        }
        const j = await res.json();
        if(j.live){
            // create embed iframe. Twitch requires the "parent" query param to match the host.
            const host = location.hostname;
            const channel = j.channel || '0gwestside';

            // create container
            twitchArea.innerHTML = '';
            const wrap = document.createElement('div');
            wrap.style.maxWidth = '900px';
            wrap.style.margin = '18px auto 0';
            wrap.style.borderRadius = '12px';
            wrap.style.overflow = 'hidden';
            wrap.style.boxShadow = '0 10px 50px rgba(0,0,0,0.6)';

            const iframe = document.createElement('iframe');
            iframe.src = `https://player.twitch.tv/?channel=${encodeURIComponent(channel)}&parent=${encodeURIComponent(host)}&autoplay=false`;
            iframe.style.width = '100%';
            iframe.style.height = '480px';
            iframe.setAttribute('allowfullscreen','true');
            iframe.setAttribute('frameborder','0');
            wrap.appendChild(iframe);
            twitchArea.appendChild(wrap);
        } else {
            // show offline placeholder
            twitchArea.innerHTML = `<div style="max-width:680px;margin:14px auto;padding:14px;border-radius:10px;background:rgba(255,255,255,0.02);text-align:center;color:var(--muted)">Streamer is offline — catch the next stream on <a href=\"https://www.twitch.tv/0gwestside\" style=\"color:var(--accent)\">Twitch</a>.</div>`;
        }

    }catch(err){
        console.debug('Error loading live.json', err);
    }
}

// init after DOM load finished
window.addEventListener('load', ()=>{
    initTwitchEmbed();
});
