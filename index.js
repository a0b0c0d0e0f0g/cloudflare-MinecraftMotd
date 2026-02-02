export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const serverIP = url.searchParams.get("server");
    if (!serverIP) {
      return new Response(htmlTemplate, { headers: { "Content-Type": "text/html;charset=UTF-8" } });
    }
    return handleImageRequest(serverIP);
  }
};

async function handleImageRequest(serverIP) {
  const apiUrl = `https://api.mcstatus.io/v2/status/java/${encodeURIComponent(serverIP)}`;
  const backgroundImage = `https://other.api.yilx.cc/api/moe?t=${Date.now()}`; 

  try {
    const res = await fetch(apiUrl, { cf: { cacheTtl: 60 } });
    const data = await res.json();
    const isOnline = data.online;
    const motdHtml = isOnline ? (data.motd?.html || "<div>A Minecraft Server</div>") : "<div>Server Offline</div>";
    const version = isOnline ? (data.version?.name_clean || "Java Edition") : "N/A";
    const icon = (isOnline && data.icon) ? data.icon : "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAAAAACPAi4CAAAABGdBTUEAALGPC/xhBQAAACBjSFJNAAB6JgAAgIQAAPoAAACA6AAAdTAAAOpgAAA6mAAAF3CculE8AAAAAmJLR0QA/4ePzL8AAAAHdElNRQfmBQIIDisOf7SDAAAB60lEQVRYw+2Wv07DMBTGv7SjCBMTE88D8SAsIAlLpC68SAsv0sqD8EDMPEAkEpS6IDEx8R7IDCSmIDExMTERExO76R0SInX6p07qXpInR7Gv78/n77OfL6Ioiv49pA4UUB8KoD4UQH0ogPpQAPWhAOpDAdSHAqgPBVAfCqA+FEAtpA4877LpOfu+8e67HrvuGfd9j73pOfuB9+7XvjvXv9+8f/35vvuO9963vveee993rN+8937YvPue995733fvvfd9933P+8593/vOu997773vvu+59773vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vvWv995679973vu+973vv+973vvfdf8F937vve9/77vvf9/8D933vuv9XvPfuu/997/ve973v/Xf8N9733ve+973vvfd973vv+/8N9733ve+97/9v/wXv/f8A/33/vf8N/73vvve9773vve+973vv/Rfe+89/33/ve99733vve+99733f/xd8N9733ve+973v";

    let playerHtml = "";
    let playerCount = 0;
    if (isOnline && data.players.list?.length > 0) {
      const list = data.players.list.slice(0, 6);
      playerCount = list.length;
      playerHtml = list.map(p => `<div style="height:22px; color:#ffffff;">${p.name_clean}</div>`).join("");
    } else {
      playerHtml = '<div style="color:#ffffff; opacity:0.5">No players online</div>';
      playerCount = 1;
    }

    const cardHeight = 240 + Math.max(playerCount * 24, 30);
    const statusColor = isOnline ? '#34C759' : '#FF3B30';

    const svg = `<svg width="450" height="${cardHeight}" viewBox="0 0 450 ${cardHeight}" xmlns="http://www.w3.org/2000/svg">
      <defs><clipPath id="m"><rect width="64" height="64" rx="16"/></clipPath><clipPath id="c"><rect width="450" height="${cardHeight}" rx="45"/></clipPath></defs>
      <g clip-path="url(#c)">
        <image href="${backgroundImage}" width="450" height="${cardHeight}" preserveAspectRatio="xMidYMid slice" />
        <rect width="450" height="${cardHeight}" fill="#000" fill-opacity="0.75" />
      </g>
      <g transform="translate(35, 35)"><image href="${icon}" width="64" height="64" clip-path="url(#m)"/></g>
      <text x="115" y="60" font-family="Arial" font-size="22" fill="#fff" font-weight="bold">${serverIP}</text>
      <text x="115" y="85" font-family="Arial" font-size="13" fill="#98989d">${version}</text>
      <rect x="310" y="40" width="105" height="28" rx="14" fill="#000" fill-opacity="0.5"/>
      <text x="362" y="58" font-family="Arial" font-size="12" fill="${statusColor}" text-anchor="middle" font-weight="bold">${isOnline ? data.players.online+'/'+data.players.max : 'OFFLINE'}</text>
      <foreignObject x="35" y="115" width="380" height="60">
        <div xmlns="http://www.w3.org/1999/xhtml" style="color:#fff; font-size:16px; line-height:1.4; font-family:sans-serif;">${motdHtml}</div>
      </foreignObject>
      <text x="35" y="205" font-family="Arial" font-size="11" fill="#64D2FF" font-weight="bold">ONLINE PLAYERS</text>
      <foreignObject x="35" y="215" width="380" height="150">
        <div xmlns="http://www.w3.org/1999/xhtml" style="font-size:14px; color:#fff; line-height:1.6; font-family:sans-serif;">${playerHtml}</div>
      </foreignObject>
    </svg>`;
    
    return new Response(svg, { headers: { "Content-Type": "image/svg+xml" } });
  } catch (e) {
    return new Response("Error", { status: 500 });
  }
}

const htmlTemplate = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>MC Status Card</title>
    <style>
        :root { --px: 0px; --py: 0px; }
        body { margin: 0; height: 100vh; display: flex; align-items: center; justify-content: center; background: #000; font-family: -apple-system, sans-serif; overflow: hidden; }
        #bg { position: fixed; top: -10%; left: -10%; width: 120%; height: 120%; background: url('https://other.api.yilx.cc/api/moe') center/cover; z-index: -1; transform: translate(calc(var(--px)*-1.2), calc(var(--py)*-1.2)); transition: 0.1s; }
        .box { 
            background: rgba(255,255,255,0.1); backdrop-filter: blur(25px) saturate(160%); -webkit-backdrop-filter: blur(25px) saturate(160%);
            padding: 30px; border-radius: 40px; width: 85%; max-width: 380px; 
            border: 1px solid rgba(255,255,255,0.15); transform: translate(var(--px), var(--py)); color: #fff; text-align: center;
        }
        textarea { width: 100%; padding: 15px; margin-bottom: 15px; border-radius: 15px; border: none; background: rgba(0,0,0,0.3); color: #fff; font-size: 16px; box-sizing: border-box; outline: none; }
        button { background: #fff; color: #000; border: none; padding: 15px; border-radius: 15px; font-weight: 700; width: 100%; font-size: 16px; cursor: pointer; }
        #res img { width: 100%; border-radius: 25px; margin-top: 20px; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
        .dl-btn { 
            display: none; background: rgba(255,255,255,0.15); color: #fff; margin-top: 15px; padding: 12px; 
            border-radius: 15px; font-weight: 600; text-decoration: none; font-size: 14px;
        }
        .dl-btn.show { display: block; }
    </style>
</head>
<body onmousemove="m(event)">
    <div id="bg"></div>
    <div class="box">
        <textarea id="ip" placeholder="输入服务器 IP..."></textarea>
        <button onclick="gen()">生成卡片</button>
        <div id="res"></div>
        <a id="dl" class="dl-btn" onclick="save()">点击下载卡片</a>
    </div>
    <script>
        let url = '';
        function m(e) { 
            const x = (window.innerWidth/2 - e.pageX)/40; 
            const y = (window.innerHeight/2 - e.pageY)/40;
            document.documentElement.style.setProperty('--px', x+'px');
            document.documentElement.style.setProperty('--py', y+'px');
        }
        async function gen() {
            const ip = document.getElementById('ip').value.trim();
            if(!ip) return;
            url = window.location.origin + '?server=' + encodeURIComponent(ip);
            const res = document.getElementById('res');
            const btn = document.getElementById('dl');
            res.innerHTML = '<p>加载中...</p>';
            const img = new Image();
            img.onload = () => { res.innerHTML = ''; res.appendChild(img); btn.classList.add('show'); };
            img.src = url;
        }
        async function save() {
            const r = await fetch(url);
            const b = await r.blob();
            const u = window.URL.createObjectURL(b);
            const a = document.createElement('a');
            a.href = u; a.download = 'mc-status.svg';
            a.click();
        }
    </script>
</body>
</html>`;