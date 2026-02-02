export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const serverIP = url.searchParams.get("server");
    if (!serverIP) {
      return new Response(htmlTemplate, { headers: { "Content-Type": "text/html;charset=UTF-8" } });
    }
    // 增加一个内部接口用于前端获取纯文本/HTML MOTD
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
      playerHtml = list.map(p => `<div style="height:20px; overflow:hidden; color:#ffffff;">${p.name_html || p.name_clean}</div>`).join("");
      if (data.players.list.length > 8) playerHtml += '<div style="color:#ffffff; opacity:0.5; font-size:10px;">...</div>';
    } else {
      playerHtml = '<div style="color:#ffffff; opacity:0.5">No players</div>';
      playerCount = 1;
    }

    const baseHeight = 175;
    const playerAreaHeight = Math.max(playerCount * 22, 30);
    const cardHeight = baseHeight + playerAreaHeight;
    const version = isOnline ? (data.version?.name_clean || "Java Edition") : "N/A";
    const icon = (isOnline && data.icon) ? data.icon : "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAAAAACPAi4CAAAABGdBTUEAALGPC/xhBQAAACBjSFJNAAB6JgAAgIQAAPoAAACA6AAAdTAAAOpgAAA6mAAAF3CculE8AAAAAmJLR0QA/4ePzL8AAAAHdElNRQfmBQIIDisOf7SDAAAB60lEQVRYw+2Wv07DMBTGv7SjCBMTE88D8SAsIAlLpC68SAsv0sqD8EDMPEAkEpS6IDEx8R7IDCSmIDExMTERExO76R0SInX6p07qXpInR7Gv78/n77OfL6Ioiv49pA4UUB8KoD4UQH0ogPpQAPWhAOpDAdSHAqgPBVAfCqA+FEAtpA4877LpOfu+8e67HrvuGfd9j73pOfuB9+7XvjvXv9+8f/35vvuO9963vveee993rN+8937YvPue995733fvvfd9933P+8593/vOu997773vvu+59773vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vvWv995679973vu+973vv+973vvfdf8F937vve9/77vvf9/8D933vuv9XvPfuu/997/ve973v/Xf8N9733ve+973vvfd973vv+/8N9733ve+97/9v/wXv/f8A/33/vf8N/73vvve9773vve+973vv/Rfe+89/33/ve99733vve+99733f/xd8N9733ve+973v";
    const statusColor = isOnline ? '#a6e3a1' : '#f38ba8';

    const svg = `<svg width="450" height="${cardHeight}" viewBox="0 0 450 ${cardHeight}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <style>
          .shadow { text-shadow: 1px 1px 2px rgba(0,0,0,0.8); }
          .motd-container div { 
            display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
            overflow: hidden; white-space: pre-wrap; word-break: break-all; 
            text-shadow: 1px 1px 2px rgba(0,0,0,1); font-family: Arial, sans-serif; line-height: 1.4;
          }
          .player-container div { display: block; font-family: Arial, sans-serif; text-shadow: 1px 1px 2px rgba(0,0,0,1); }
        </style>
      </defs>
      <clipPath id="radius"><rect width="450" height="${cardHeight}" rx="16" /></clipPath>
      <g clip-path="url(#radius)">
        <image href="${backgroundImage}" width="450" height="${cardHeight}" preserveAspectRatio="xMidYMid slice" />
        <rect width="450" height="${cardHeight}" fill="#181825" fill-opacity="0.75" />
      </g>
      <rect width="450" height="${cardHeight}" rx="16" fill="none" stroke="#ffffff" stroke-opacity="0.1" stroke-width="2"/>
      <image href="${icon}" x="25" y="25" width="64" height="64" />
      <text x="105" y="45" font-family="Arial" font-size="20" fill="#ffffff" font-weight="bold" class="shadow">${serverIP}</text>
      <text x="105" y="62" font-family="Arial" font-size="12" fill="#fab387" font-weight="bold" class="shadow">${version}</text>
      <rect x="330" y="25" width="100" height="26" rx="13" fill="#000000" fill-opacity="0.4"/>
      <text x="380" y="42" font-family="Arial" font-size="13" font-weight="bold" fill="${statusColor}" text-anchor="middle" class="shadow">
        ${isOnline ? data.players.online + ' / ' + data.players.max : 'OFFLINE'}
      </text>
      <foreignObject x="105" y="75" width="320" height="50">
        <div xmlns="http://www.w3.org/1999/xhtml" class="motd-container" style="color:#ffffff; font-size:14px;">${motdHtml}</div>
      </foreignObject>
      <text x="105" y="155" font-family="Arial" font-size="11" fill="#94e2d5" font-weight="bold" style="letter-spacing:1px" class="shadow">ONLINE PLAYERS</text>
      <foreignObject x="105" y="165" width="320" height="${playerAreaHeight}">
        <div xmlns="http://www.w3.org/1999/xhtml" class="player-container" style="font-size:13px; line-height:1.4;">${playerHtml}</div>
      </foreignObject>
    </svg>`;
    
    return new Response(svg, { headers: { "Content-Type": "image/svg+xml", "Cache-Control": "no-cache" } });
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
    <title>Minecraft Motd 获取</title>
    <style>
        body { margin: 0; padding: 0; min-height: 100vh; display: flex; align-items: center; justify-content: center; font-family: 'Segoe UI', system-ui, sans-serif; background: url('https://other.api.yilx.cc/api/moe') no-repeat center center fixed; background-size: cover; }
        body::before { content: ''; position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0, 0, 0, 0.2); z-index: -1; }
        .box { background: rgba(255, 255, 255, 0.1); backdrop-filter: blur(20px) saturate(180%); -webkit-backdrop-filter: blur(20px) saturate(180%); padding: 40px 25px; border-radius: 24px; width: 85%; max-width: 420px; text-align: center; box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.37); border: 1px solid rgba(255, 255, 255, 0.2); color: white; }
        .logo { width: 70px; height: 70px; margin-bottom: 15px; border-radius: 16px; }
        h2 { margin: 0; font-size: 22px; }
        p.desc { color: rgba(255, 255, 255, 0.9); font-size: 13px; margin: 12px 0 25px; }
        textarea { width: 100%; min-height: 48px; padding: 14px; margin-bottom: 15px; border-radius: 12px; border: 1px solid rgba(255, 255, 255, 0.3); background: rgba(0, 0, 0, 0.3); color: white; box-sizing: border-box; font-size: 15px; font-family: inherit; outline: none; resize: none; overflow: hidden; display: block; }
        button { background: #89b4fa; color: #11111b; border: none; height: 48px; border-radius: 12px; font-weight: bold; cursor: pointer; width: 100%; font-size: 15px; transition: 0.3s; display: block; }
        button:hover { background: #b4befe; transform: scale(1.01); }
        #res { margin-top: 30px; width: 100%; }
        #full-motd-box { margin-top: 20px; padding: 15px; background: rgba(0,0,0,0.4); border-radius: 12px; text-align: left; font-size: 13px; display: none; border-left: 4px solid #fab387; }
        .motd-title { font-weight: bold; color: #fab387; margin-bottom: 8px; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; }
        #full-motd-content { line-height: 1.5; white-space: pre-wrap; word-break: break-all; }
        img { width: 100%; border-radius: 12px; box-shadow: 0 10px 20px rgba(0,0,0,0.3); }
        .footer { margin-top: 25px; font-size: 11px; color: rgba(255,255,255,0.7); }
    </style>
</head>
<body>
    <div class="box">
        <img src="https://ib.a0b.de5.net/file/1770001024571_2307052_Mvie09JU.png" class="logo">
        <h2>Minecraft Motd 获取</h2>
        <p class="desc">输入Minecraft服务器URL，获取服务器状态卡片</p>
        <textarea id="ip" placeholder="例如: play.hypixel.net" rows="1" oninput="this.style.height = ''; this.style.height = this.scrollHeight + 'px'"></textarea>
        <button onclick="gen()">生成预览卡片</button>
        
        <div id="res"></div>
        
        <div id="full-motd-box">
            <div class="motd-title">完整 MOTD 信息 (已截断预览)</div>
            <div id="full-motd-content"></div>
        </div>

        <div class="footer">© 2026 MC Card Tool • Cloudflare Workers</div>
    </div>
    <script>
        async function gen() {
            const ip = document.getElementById('ip').value.trim();
            if(!ip) return;
            const resDiv = document.getElementById('res');
            const fullMotdBox = document.getElementById('full-motd-box');
            const fullMotdContent = document.getElementById('full-motd-content');
            
            resDiv.innerHTML = '<p style="font-size:12px;">正在解析...</p>';
            fullMotdBox.style.display = 'none';

            // 1. 获取图片
            const imageUrl = window.location.origin + '?server=' + encodeURIComponent(ip);
            const img = new Image();
            img.onload = () => { resDiv.innerHTML = ''; resDiv.appendChild(img); };
            img.src = imageUrl;

            // 2. 获取完整信息用于下方展示
            try {
                const infoRes = await fetch(window.location.origin + '?type=info&server=' + encodeURIComponent(ip));
                const infoData = await infoRes.json();
                if (infoData.online) {
                    fullMotdBox.style.display = 'block';
                    fullMotdContent.innerHTML = infoData.motd;
                }
            } catch(e) {}
        }
    </script>
</body>
</html>
`;