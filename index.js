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
      playerHtml = list.map(p => `<div style="height:22px; color:#ffffff; font-weight:500;">${p.name_clean}</div>`).join("");
    } else {
      playerHtml = '<div style="color:#ffffff; opacity:0.5">No players online</div>';
      playerCount = 1;
    }

    const playerAreaHeight = Math.max(playerCount * 24, 30);
    const cardHeight = 230 + playerAreaHeight;
    const version = isOnline ? (data.version?.name_clean || "Java Edition") : "N/A";
    const icon = (isOnline && data.icon) ? data.icon : "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAAAAACPAi4CAAAABGdBTUEAALGPC/xhBQAAACBjSFJNAAB6JgAAgIQAAPoAAACA6AAAdTAAAOpgAAA6mAAAF3CculE8AAAAAmJLR0QA/4ePzL8AAAAHdElNRQfmBQIIDisOf7SDAAAB60lEQVRYw+2Wv07DMBTGv7SjCBMTE88D8SAsIAlLpC68SAsv0sqD8EDMPEAkEpS6IDEx8R7IDCSmIDExMTERExO76R0SInX6p07qXpInR7Gv78/n77OfL6Ioiv49pA4UUB8KoD4UQH0ogPpQAPWhAOpDAdSHAqgPBVAfCqA+FEAtpA4877LpOfu+8e67HrvuGfd9j73pOfuB9+7XvjvXv9+8f/35vvuO9963vveee993rN+8937YvPue995733fvvfd9933P+8593/vOu997773vvu+59773vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vvWv995679973vu+973vv+973vvfdf8F937vve9/77vvf9/8D933vuv9XvPfuu/997/ve973v/Xf8N9733ve+973vvfd973vv+/8N9733ve+97/9v/wXv/f8A/33/vf8N/73vvve9773vve+973vv/Rfe+89/33/ve99733vve+99733f/xd8N9733ve+973v";
    const statusColor = isOnline ? '#34C759' : '#FF3B30';

    // iPhone Squircle 路径生成
    const svg = `<svg width="450" height="${cardHeight}" viewBox="0 0 450 ${cardHeight}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <clipPath id="iphone-icon"><rect width="64" height="64" rx="14" ry="14" /></clipPath>
        <clipPath id="card-mask"><rect width="450" height="${cardHeight}" rx="42" ry="42" /></clipPath>
        <clipPath id="status-mask"><rect width="105" height="28" rx="14" ry="14" /></clipPath>
      </defs>
      <g clip-path="url(#card-mask)">
        <image href="${backgroundImage}" width="450" height="${cardHeight}" preserveAspectRatio="xMidYMid slice" />
        <rect width="450" height="${cardHeight}" fill="#000000" fill-opacity="0.72" />
      </g>
      <g transform="translate(35, 35)">
        <image href="${icon}" width="64" height="64" clip-path="url(#iphone-icon)" />
      </g>
      <text x="115" y="60" font-family="-apple-system, Arial" font-size="22" fill="#ffffff" font-weight="bold">${serverIP}</text>
      <text x="115" y="85" font-family="-apple-system, Arial" font-size="13" fill="#98989d">${version}</text>
      
      <g transform="translate(310, 40)">
        <rect width="105" height="28" fill="#ffffff" fill-opacity="0.12" clip-path="url(#status-mask)" />
        <text x="52.5" y="18.5" font-family="-apple-system, Arial" font-size="12" font-weight="800" fill="${statusColor}" text-anchor="middle">
          ${isOnline ? data.players.online + ' / ' + data.players.max : 'OFFLINE'}
        </text>
      </g>

      <foreignObject x="35" y="115" width="380" height="60">
        <div xmlns="http://www.w3.org/1999/xhtml" style="color:#ffffff; font-size:16px; font-family: -apple-system; line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
          ${motdHtml}
        </div>
      </foreignObject>
      <text x="35" y="205" font-family="-apple-system, Arial" font-size="11" fill="#64D2FF" font-weight="bold" style="letter-spacing:1px">ONLINE PLAYERS</text>
      <foreignObject x="35" y="215" width="380" height="${playerAreaHeight}">
        <div xmlns="http://www.w3.org/1999/xhtml" style="font-size:14px; font-family: -apple-system; color:#ffffff; line-height: 1.6;">
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
    <title>MC 服务器状态</title>
    <style>
        body { 
            margin: 0; padding: 20px; min-height: 100vh; 
            background: #000; color: white; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            display: flex; flex-direction: column; align-items: center; 
        }
        .container { width: 100%; max-width: 450px; }
        .header-title { font-size: 28px; font-weight: 800; margin: 20px 0; text-align: left; width: 100%; letter-spacing: -1px; }
        
        textarea { 
            width: 100%; height: 60px; padding: 18px; margin-bottom: 15px; 
            border-radius: 20px; border: none; background: #1c1c1e; 
            color: white; font-size: 17px; outline: none; box-sizing: border-box;
            transition: 0.3s; border: 1.5px solid transparent;
        }
        textarea:focus { border-color: #0A84FF; }
        
        .btn { 
            background: #ffffff; color: black; border: none; height: 55px; 
            border-radius: 20px; font-weight: 700; width: 100%; font-size: 17px;
            cursor: pointer; transition: 0.2s cubic-bezier(0.4, 0, 0.2, 1);
            display: flex; align-items: center; justify-content: center; margin-bottom: 12px;
        }
        .btn:active { transform: scale(0.97); opacity: 0.8; }
        .btn-download { background: #1c1c1e; color: #0A84FF; display: none; }

        #res { margin-top: 25px; width: 100%; }
        .card-img { width: 100%; border-radius: 42px; box-shadow: 0 30px 60px rgba(0,0,0,0.5); border: 1px solid rgba(255,255,255,0.1); }
        
        #full-motd-box { 
            display: none; background: #1c1c1e; border-radius: 20px; 
            padding: 20px; margin-top: 20px; width: 100%; box-sizing: border-box;
        }
        .motd-title { font-size: 12px; font-weight: 700; color: #8e8e93; margin-bottom: 10px; text-transform: uppercase; }
        #full-motd-content { line-height: 1.5; font-size: 15px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header-title">MC Status</div>
        <textarea id="ip" placeholder="输入服务器 IP (例如: play.hypixel.net)"></textarea>
        <button class="btn" onclick="gen()">生成预览卡片</button>
        <button id="dl-btn" class="btn btn-download" onclick="downloadCard()">下载卡片图片</button>
        
        <div id="res"></div>
        
        <div id="full-motd-box">
            <div class="motd-title">完整 MOTD 信息</div>
            <div id="full-motd-content"></div>
        </div>
    </div>

    <script>
        let currentImgUrl = '';

        async function gen() {
            const ip = document.getElementById('ip').value.trim();
            if(!ip) return;
            
            const resDiv = document.getElementById('res');
            const dlBtn = document.getElementById('dl-btn');
            const fullMotdBox = document.getElementById('full-motd-box');
            
            resDiv.innerHTML = '<p style="opacity:0.6; text-align:center;">获取状态中...</p>';
            dlBtn.style.display = 'none';

            currentImgUrl = window.location.origin + '?server=' + encodeURIComponent(ip);
            const img = new Image();
            img.className = 'card-img';
            img.onload = () => { 
                resDiv.innerHTML = ''; 
                resDiv.appendChild(img); 
                dlBtn.style.display = 'flex';
            };
            img.src = currentImgUrl;

            try {
                const infoRes = await fetch(window.location.origin + '?type=info&server=' + encodeURIComponent(ip));
                const infoData = await infoRes.json();
                if (infoData.online) {
                    fullMotdBox.style.display = 'block';
                    document.getElementById('full-motd-content').innerHTML = infoData.motd;
                }
            } catch(e) {}
        }

        async function downloadCard() {
            if(!currentImgUrl) return;
            const res = await fetch(currentImgUrl);
            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'mc-server-card.svg';
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        }
    </script>
</body>
</html>`;