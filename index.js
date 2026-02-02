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
      const list = data.players.list.slice(0, 8); // 保持你原本的 8 名玩家
      playerCount = list.length;
      playerHtml = list.map(p => `<div style="height:22px; color:#ffffff;">${p.name_html || p.name_clean}</div>`).join("");
    } else {
      playerHtml = '<div style="color:#ffffff; opacity:0.5">No players online</div>';
      playerCount = 1;
    }

    const playerAreaHeight = Math.max(playerCount * 24, 30);
    const cardHeight = 230 + playerAreaHeight;
    const icon = (isOnline && data.icon) ? data.icon : "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAAAAACPAi4CAAAABGdBTUEAALGPC/xhBQAAACBjSFJNAAB6JgAAgIQAAPoAAACA6AAAdTAAAOpgAAA6mAAAF3CculE8AAAAAmJLR0QA/4ePzL8AAAAHdElNRQfmBQIIDisOf7SDAAAB60lEQVRYw+2Wv07DMBTGv7SjCBMTE88D8SAsIAlLpC68SAsv0sqD8EDMPEAkEpS6IDEx8R7IDCSmIDExMTERExO76R0SInX6p07qXpInR7Gv78/n77OfL6Ioiv49pA4UUB8KoD4UQH0ogPpQAPWhAOpDAdSHAqgPBVAfCqA+FEAtpA4877LpOfu+8e67HrvuGfd9j73pOfuB9+7XvjvXv9+8f/35vvuO9963vveee993rN+8937YvPue995733fvvfd9933P+8593/vOu997773vvu+59773vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+973vvWv995679973vu+973vv+973vvfdf8F937vve9/77vvf9/8D933vuv9XvPfuu/997/ve973v/Xf8N9733ve+973vvfd973vv+/8N9733ve+97/9v/wXv/f8A/33/vf8N/73vvve9773vve+973vv/Rfe+89/33/ve99733vve+99733f/xd8N9733ve+973v";
    const statusColor = isOnline ? '#a6e3a1' : '#f38ba8'; // 保持你原本的颜色代码

    const svg = `<svg width="450" height="${cardHeight}" viewBox="0 0 450 ${cardHeight}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <clipPath id="rect-mask"><rect width="450" height="${cardHeight}" rx="40" ry="40" /></clipPath>
      </defs>
      <g clip-path="url(#rect-mask)">
        <image href="${backgroundImage}" width="450" height="${cardHeight}" preserveAspectRatio="xMidYMid slice" />
        <rect width="450" height="${cardHeight}" fill="#000" fill-opacity="0.75" />
      </g>
      <image href="${icon}" x="35" y="35" width="64" height="64" />
      <text x="115" y="75" font-family="sans-serif" font-size="24" fill="#fff" font-weight="bold">${serverIP}</text>
      <rect x="315" y="45" width="100" height="30" rx="15" fill="#ffffff" fill-opacity="0.1" />
      <text x="365" y="65" font-family="sans-serif" font-size="14" fill="${statusColor}" text-anchor="middle" font-weight="bold">
        ${isOnline ? data.players.online + ' / ' + data.players.max : 'OFFLINE'}
      </text>
      <foreignObject x="35" y="120" width="380" height="80">
        <div xmlns="http://www.w3.org/1999/xhtml" style="color:#fff; font-size:16px; font-family:sans-serif;">${motdHtml}</div>
      </foreignObject>
      <text x="35" y="210" font-family="sans-serif" font-size="12" fill="#aaa" font-weight="bold">ONLINE PLAYERS</text>
      <foreignObject x="35" y="220" width="380" height="${playerAreaHeight}">
        <div xmlns="http://www.w3.org/1999/xhtml" style="font-size:14px; font-family:sans-serif; color:#fff; line-height:1.6;">${playerHtml}</div>
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
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>MC Status Card</title>
    <style>
        body { margin:0; padding:20px 0; background:#000; color:#fff; font-family:-apple-system,sans-serif; display:flex; flex-direction:column; align-items:center; }
        .wrap { 
            width: 92%; /* 关键修改：实现手机端左右留空 */
            max-width: 440px; 
            margin: 0 auto;
        }
        .title { font-size:32px; font-weight:800; margin:40px 0 20px; letter-spacing:-1px; }
        textarea { 
            width:100%; height:60px; padding:15px; border-radius:15px; border:none; background:#1c1c1e; 
            color:#fff; font-size:16px; outline:none; box-sizing:border-box; margin-bottom:15px;
        }
        button { 
            width:100%; height:50px; border-radius:15px; border:none; background:#fff; color:#000; 
            font-size:16px; font-weight:bold; cursor:pointer; transition:0.2s;
        }
        button:active { transform:scale(0.98); opacity:0.8; }
        #res { margin-top:30px; width:100%; }
        .card-img { width:100%; border-radius:30px; box-shadow:0 20px 40px rgba(0,0,0,0.5); }
        
        #full-motd-box { 
            display:none; background:#1c1c1e; border-radius:15px; padding:20px; margin-top:20px; width:100%; box-sizing:border-box; 
        }
        .motd-title { font-size:12px; color:#aaa; margin-bottom:10px; font-weight:bold; }
        .footer { margin-top:50px; font-size:12px; opacity:0.3; }
    </style>
</head>
<body>
    <div class="wrap">
        <div class="title">MC Status</div>
        <textarea id="ip" placeholder="输入服务器 IP (例如: play.hypixel.net)"></textarea>
        <button onclick="gen()">生成预览卡片</button>
        
        <div id="res"></div>
        
        <div id="full-motd-box">
            <div class="motd-title">完整 MOTD 信息 (已截断)</div>
            <div id="full-motd-content"></div>
        </div>

        <div class="footer">© 2026 MC Status Card • iOS Style</div>
    </div>
    <script>
        async function gen() {
            const ip = document.getElementById('ip').value.trim();
            if(!ip) return;
            const resDiv = document.getElementById('res');
            const fullMotdBox = document.getElementById('full-motd-box');
            resDiv.innerHTML = '<p style="opacity:0.6; font-size:14px; text-align:center;">正在连接...</p>';
            fullMotdBox.style.display = 'none';

            const imageUrl = window.location.origin + '?server=' + encodeURIComponent(ip);
            const img = new Image();
            img.className = 'card-img';
            img.onload = () => { resDiv.innerHTML = ''; resDiv.appendChild(img); };
            img.src = imageUrl;

            try {
                const infoRes = await fetch(window.location.origin + '?type=info&server=' + encodeURIComponent(ip));
                const infoData = await infoRes.json();
                if (infoData.online) {
                    fullMotdBox.style.display = 'block';
                    document.getElementById('full-motd-content').innerHTML = infoData.motd;
                }
            } catch(e) {}
        }
    </script>
</body>
</html>`;