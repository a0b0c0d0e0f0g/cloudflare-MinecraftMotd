export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const serverIP = url.searchParams.get("server");
    if (!serverIP) {
      return new Response(htmlTemplate, { headers: { "Content-Type": "text/html;charset=UTF-8" } });
    }
    if (url.searchParams.get("type") === "info") {
        return handleInfoRequest(serverIP);
    }
    return handleImageRequest(serverIP);
  }
};

async function handleInfoRequest(serverIP) {
    const apiUrl = `https://api.mcstatus.io/v2/status/java/${encodeURIComponent(serverIP)}`;
    const res = await fetch(apiUrl);
    const data = await res.json();
    return new Response(JSON.stringify({ 
        motd: data.motd?.html || "No MOTD",
        online: data.online 
    }), { headers: { "Content-Type": "application/json" } });
}

async function handleImageRequest(serverIP) {
  const apiUrl = `https://api.mcstatus.io/v2/status/java/${encodeURIComponent(serverIP)}`;
  const backgroundImage = `https://other.api.yilx.cc/api/moe?t=${Date.now()}`; 

  try {
    const res = await fetch(apiUrl, { cf: { cacheTtl: 60 } });
    const data = await res.json();
    const isOnline = data.online;
    const motdHtml = isOnline ? (data.motd?.html || "<div>A Minecraft Server</div>") : "<div>Server Offline</div>";

    let playerHtml = "";
    let playerCount = 0;
    if (isOnline && data.players.list?.length > 0) {
      const list = data.players.list.slice(0, 8);
      playerCount = list.length;
      playerHtml = list.map(p => `<div style="height:24px; color:#ffffff; font-weight:500;">• ${p.name_clean}</div>`).join("");
    } else {
      playerHtml = '<div style="color:#ffffff; opacity:0.5">无玩家在线</div>';
      playerCount = 1;
    }

    const cardHeight = 240 + Math.max(playerCount * 24, 40);
    const version = isOnline ? (data.version?.name_clean || "Java Edition") : "Unknown";
    const icon = (isOnline && data.icon) ? data.icon : "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAAAAACPAi4CAAAABGdBTUEAALGPC/xhBQAAACBjSFJNAAB6JgAAgIQAAPoAAACA6AAAdTAAAOpgAAA6mAAAF3CculE8AAAAAmJLR0QA/4ePzL8AAAAHdElNRQfmBQIIDisOf7SDAAAB60lEQVRYw+2Wv07DMBTGv7SjCBMTE88D8SAsIAlLpC68SAsv0sqD8EDMPEAkEpS6IDEx8R7IDCSmIDExMTERExO76R0SInX6p07qXpInR7Gv78/n77OfL6Ioiv49pA4UUB8KoD4UQH0ogPpQAPWhAOpDAdSHAqgPBVAfCqA+FEAtpA4877LpOfu+8e67HrvuGfd9j73pOfuB9+7XvjvXv9+8f/35vvuO9963vveee993rN+8937YvPue995733fvvfd9933P+8593/vOu997773vvu+59773vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vvWv995679973vu+973vv+973vvfdf8F937vve9/77vvf9/8D933vuv9XvPfuu/997/ve973v/Xf8N9733ve+973vvfd973vv+/8N9733ve+97/9v/wXv/f8A/33/vf8N/73vvve9773vve+973vv/Rfe+89/33/ve99733vve+99733f/xd8N9733ve+973v";
    const statusColor = isOnline ? '#34C759' : '#FF3B30';

    const svg = `<svg width="450" height="${cardHeight}" viewBox="0 0 450 ${cardHeight}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <clipPath id="iphone-card"><rect width="450" height="${cardHeight}" rx="48" ry="48" /></clipPath>
        <clipPath id="iphone-icon"><rect width="64" height="64" rx="16" ry="16" /></clipPath>
        <clipPath id="iphone-tag"><rect width="105" height="28" rx="14" ry="14" /></clipPath>
      </defs>
      <g clip-path="url(#iphone-card)">
        <image href="${backgroundImage}" width="450" height="${cardHeight}" preserveAspectRatio="xMidYMid slice" />
        <rect width="450" height="${cardHeight}" fill="#000000" fill-opacity="0.75" />
      </g>
      <g transform="translate(35, 35)">
        <image href="${icon}" width="64" height="64" clip-path="url(#iphone-icon)" />
      </g>
      <text x="115" y="62" font-family="-apple-system, sans-serif" font-size="22" fill="#ffffff" font-weight="bold">${serverIP}</text>
      <text x="115" y="86" font-family="-apple-system, sans-serif" font-size="13" fill="#98989d">${version}</text>
      
      <g transform="translate(310, 42)">
        <rect width="105" height="28" fill="#ffffff" fill-opacity="0.12" clip-path="url(#iphone-tag)" />
        <text x="52.5" y="19" font-family="-apple-system, sans-serif" font-size="12" font-weight="800" fill="${statusColor}" text-anchor="middle">
          ${isOnline ? data.players.online + ' / ' + data.players.max : 'OFFLINE'}
        </text>
      </g>

      <foreignObject x="35" y="125" width="380" height="60">
        <div xmlns="http://www.w3.org/1999/xhtml" style="color:#ffffff; font-size:16px; font-family:-apple-system, sans-serif; line-height:1.4; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden;">
          ${motdHtml}
        </div>
      </foreignObject>
      <text x="35" y="215" font-family="-apple-system, sans-serif" font-size="11" fill="#64D2FF" font-weight="bold" style="letter-spacing:1px">在线玩家</text>
      <foreignObject x="35" y="225" width="380" height="180">
        <div xmlns="http://www.w3.org/1999/xhtml" style="font-size:14px; font-family:-apple-system, sans-serif; color:#ffffff; line-height:1.7;">
          ${playerHtml}
        </div>
      </foreignObject>
    </svg>`;
    
    return new Response(svg, { headers: { "Content-Type": "image/svg+xml" } });
  } catch (e) {
    return new Response("Error", { status: 500 });
  }
}

const htmlTemplate = `
<!DOCTYPE html>
<html lang="zh">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>MC Status</title>
    <style>
        body { margin:0; padding:20px; background:#000; color:#fff; font-family:-apple-system, sans-serif; display:flex; flex-direction:column; align-items:center; }
        .wrap { width:100%; max-width:440px; }
        .title { font-size:32px; font-weight:800; margin:30px 0 20px; letter-spacing:-1px; }
        textarea { 
            width:100%; height:60px; padding:18px; border-radius:20px; border:none; background:#1c1c1e; 
            color:#fff; font-size:17px; outline:none; box-sizing:border-box; margin-bottom:12px;
        }
        .btn { 
            width:100%; height:55px; border-radius:20px; border:none; font-size:17px; font-weight:700;
            cursor:pointer; transition:0.2s; display:flex; align-items:center; justify-content:center; margin-bottom:12px;
        }
        .btn-main { background:#fff; color:#000; }
        .btn-dl { background:#1c1c1e; color:#0A84FF; display:none; }
        .btn:active { transform:scale(0.97); opacity:0.8; }
        #res img { width:100%; border-radius:48px; margin-top:20px; box-shadow:0 30px 60px rgba(0,0,0,0.5); border:1px solid rgba(255,255,255,0.1); }
        #info-box { display:none; background:#1c1c1e; border-radius:20px; padding:20px; margin-top:20px; width:100%; box-sizing:border-box; }
        .label { font-size:12px; font-weight:700; color:#8e8e93; margin-bottom:10px; }
    </style>
</head>
<body>
    <div class="wrap">
        <div class="title">MC Status</div>
        <textarea id="ip" placeholder="输入服务器 IP..."></textarea>
        <button class="btn btn-main" onclick="gen()">生成预览卡片</button>
        <button id="dl-btn" class="btn btn-dl" onclick="dl()">下载卡片图片</button>
        <div id="res"></div>
        <div id="info-box"><div class="label">FULL MOTD</div><div id="motd"></div></div>
    </div>
    <script>
        let curUrl = '';
        async function gen() {
            const ip = document.getElementById('ip').value.trim();
            if(!ip) return;
            curUrl = window.location.origin + '?server=' + encodeURIComponent(ip);
            const res = document.getElementById('res');
            const dlBtn = document.getElementById('dl-btn');
            res.innerHTML = '<p style="text-align:center; opacity:0.5; font-size:14px; margin-top:20px;">正在获取数据...</p>';
            
            const img = new Image();
            img.onload = () => { res.innerHTML = ''; res.appendChild(img); dlBtn.style.display = 'flex'; };
            img.src = curUrl;

            try {
                const info = await fetch(window.location.origin + '?type=info&server=' + encodeURIComponent(ip)).then(r=>r.json());
                if(info.online) {
                    document.getElementById('info-box').style.display = 'block';
                    document.getElementById('motd').innerHTML = info.motd;
                }
            } catch(e) {}
        }
        async function dl() {
            if(!curUrl) return;
            const r = await fetch(curUrl);
            const b = await r.blob();
            const a = document.createElement('a');
            a.href = URL.createObjectURL(b);
            a.download = 'mc-server-card.svg';
            a.click();
        }
    </script>
</body>
</html>`;