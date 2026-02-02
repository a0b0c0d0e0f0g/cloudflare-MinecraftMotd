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
  // 给 API 加个随机参数，确保每次刷新背景都可能不同
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
      playerHtml = list.map(p => `<div style="height:20px; overflow:hidden;">${p.name_html || `<span style="color:#ffffff">${p.name_clean}</span>`}</div>`).join("");
      if (data.players.list.length > 8) playerHtml += '<div style="color:#ffffff; opacity:0.6; font-size:10px;">... and more</div>';
    } else {
      playerHtml = '<div style="color:#ffffff; opacity:0.6">No players online</div>';
      playerCount = 1;
    }

    const baseHeight = 165;
    const playerAreaHeight = Math.max(playerCount * 22, 30);
    const cardHeight = baseHeight + playerAreaHeight;
    
    const version = isOnline ? (data.version?.name_clean || "Java Edition") : "N/A";
    const icon = (isOnline && data.icon) ? data.icon : "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAAAAACPAi4CAAAABGdBTUEAALGPC/xhBQAAACBjSFJNAAB6JgAAgIQAAPoAAACA6AAAdTAAAOpgAAA6mAAAF3CculE8AAAAAmJLR0QA/4ePzL8AAAAHdElNRQfmBQIIDisOf7SDAAAB60lEQVRYw+2Wv07DMBTGv7SjCBMTE88D8SAsIAlLpC68SAsv0sqD8EDMPEAkEpS6IDEx8R7IDCSmIDExMTERExO76R0SInX6p07qXpInR7Gv78/n77OfL6Ioiv49pA4UUB8KoD4UQH0ogPpQAPWhAOpDAdSHAqgPBVAfCqA+FEAtpA4877LpOfu+8e67HrvuGfd9j73pOfuB9+7XvjvXv9+8f/35vvuO9963vveee993rN+8937YvPue995733fvvfd9933P+8593/vOu997773vvu+59773vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vvWv995679973vu+973vv+973vvfdf8F937vve9/77vvf9/8D933vuv9XvPfuu/997/ve973v/Xf8N9733ve+973vvfd973vv+/8N9733ve+97/9v/wXv/f8A/33/vf8N/73vvve9773vve+973vv/Rfe+89/33/ve99733vve+99733f/xd8N9733ve+973v";
    const statusColor = isOnline ? '#a6e3a1' : '#f38ba8';

    const svg = `<svg width="450" height="${cardHeight}" viewBox="0 0 450 ${cardHeight}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <style>
          .shadow { text-shadow: 1px 1px 2px rgba(0,0,0,0.8); }
          .motd-container div { white-space: pre-wrap; word-break: break-all; text-shadow: 1px 1px 2px rgba(0,0,0,1); font-family: Arial, sans-serif; }
          .player-container div { display: block; font-family: Arial, sans-serif; text-shadow: 1px 1px 2px rgba(0,0,0,1); }
        </style>
      </defs>
      
      <clipPath id="radius">
        <rect width="450" height="${cardHeight}" rx="16" />
      </clipPath>
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

      <foreignObject x="105" y="75" width="320" height="60">
        <div xmlns="http://www.w3.org/1999/xhtml" class="motd-container" style="color:#ffffff; font-size:14px; line-height:1.4;">
          ${motdHtml}
        </div>
      </foreignObject>

      <text x="105" y="152" font-family="Arial" font-size="11" fill="#94e2d5" font-weight="bold" style="letter-spacing:1px" class="shadow">ONLINE PLAYERS</text>
      <foreignObject x="105" y="162" width="320" height="${playerAreaHeight}">
        <div xmlns="http://www.w3.org/1999/xhtml" class="player-container" style="font-size:13px; line-height:1.4;">
          ${playerHtml}
        </div>
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
    <link rel="icon" href="https://ib.a0b.de5.net/file/1770001024571_2307052_Mvie09JU.png">
    <style>
        body { 
            margin: 0;
            padding: 20px;
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
            /* 背景图设置 */
            background: url('https://other.api.yilx.cc/api/moe') no-repeat center center fixed;
            background-size: cover;
        }
        /* 网页整体半透明遮罩 */
        body::before {
            content: '';
            position: fixed;
            top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(17, 17, 27, 0.4);
            z-index: -1;
        }
        .box { 
            background: rgba(30, 30, 46, 0.85); /* 磨砂玻璃效果 */
            backdrop-filter: blur(12px);
            -webkit-backdrop-filter: blur(12px);
            padding: 40px 30px; 
            border-radius: 28px; 
            width: 100%; 
            max-width: 420px; 
            text-align: center; 
            box-shadow: 0 25px 50px rgba(0,0,0,0.4); 
            border: 1px solid rgba(255, 255, 255, 0.1);
        }
        .logo { width: 80px; height: 80px; margin-bottom: 20px; border-radius: 18px; box-shadow: 0 8px 16px rgba(0,0,0,0.3); }
        h2 { margin: 0; color: #ffffff; font-size: 24px; letter-spacing: 1px; }
        p { color: rgba(205, 214, 244, 0.8); font-size: 14px; margin: 10px 0 25px; }
        input { 
            width: 100%; 
            padding: 15px; 
            margin-bottom: 20px; 
            border-radius: 14px; 
            border: 1px solid rgba(137, 180, 250, 0.3); 
            background: rgba(17, 17, 27, 0.6); 
            color: white; 
            box-sizing: border-box; 
            font-size: 16px; 
            outline: none; 
            transition: 0.3s; 
        }
        input:focus { border-color: #89b4fa; background: rgba(17, 17, 27, 0.8); }
        button { 
            background: #89b4fa; 
            color: #11111b; 
            border: none; 
            padding: 15px; 
            border-radius: 14px; 
            font-weight: bold; 
            cursor: pointer; 
            width: 100%; 
            font-size: 16px; 
            transition: 0.3s;
            box-shadow: 0 4px 12px rgba(137, 180, 250, 0.3);
        }
        button:hover { background: #b4befe; transform: translateY(-2px); box-shadow: 0 6px 15px rgba(137, 180, 250, 0.4); }
        #res { margin-top: 35px; width: 100%; }
        img { width: 100%; border-radius: 16px; box-shadow: 0 12px 24px rgba(0,0,0,0.4); }
        .footer { margin-top: 25px; font-size: 12px; color: rgba(255,255,255,0.5); }
    </style>
</head>
<body>
    <div class="box">
        <img src="https://ib.a0b.de5.net/file/1770001024571_2307052_Mvie09JU.png" class="logo">
        <h2>Minecraft Motd 获取</h2>
        <p>输入服务器 IP，即刻生成二次元风格状态卡片</p>
        <input type="text" id="ip" placeholder="例如: play.hypixel.net" spellcheck="false" onkeypress="if(event.keyCode==13)gen()">
        <button onclick="gen()">生成预览卡片</button>
        <div id="res"></div>
        <div class="footer">© 2024 MC Card Tool • Powered by Cloudflare</div>
    </div>
    <script>
        function gen() {
            const ip = document.getElementById('ip').value.trim();
            if(!ip) return;
            const resDiv = document.getElementById('res');
            resDiv.innerHTML = '<p style="color:#89b4fa">正在连接服务器...</p>';
            const url = window.location.origin + '?server=' + encodeURIComponent(ip);
            const img = new Image();
            img.onload = function() {
                resDiv.innerHTML = '';
                resDiv.appendChild(img);
            };
            img.src = url;
        }
    </script>
</body>
</html>
`;