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
  try {
    const res = await fetch(apiUrl, { cf: { cacheTtl: 60 } });
    const data = await res.json();
    const isOnline = data.online;
    
    // 1. MOTD 颜色与换行处理
    const motdHtml = isOnline ? (data.motd?.html || "<div>A Minecraft Server</div>") : "<div>Server Offline</div>";

    // 2. 玩家列表处理 (每行一个，保留颜色)
    let playerHtml = "";
    let playerCount = 0;
    if (isOnline && data.players.list?.length > 0) {
      const list = data.players.list.slice(0, 5);
      playerCount = list.length;
      playerHtml = list.map(p => `<div style="font-style:italic; height:20px; overflow:hidden;">${p.name_html || p.name_clean}</div>`).join("");
      if (data.players.list.length > 5) playerHtml += '<div style="opacity:0.5">...</div>';
    } else {
      playerHtml = '<div style="opacity:0.5">No players online</div>';
    }

    // 3. 动态高度计算
    const baseHeight = 150;
    const playerAreaHeight = (playerCount > 0 ? playerCount : 1) * 22;
    const cardHeight = baseHeight + playerAreaHeight;
    
    const version = isOnline ? (data.version?.name_clean || "Java Edition") : "N/A";
    const icon = (isOnline && data.icon) ? data.icon : "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAAAAACPAi4CAAAABGdBTUEAALGPC/xhBQAAACBjSFJNAAB6JgAAgIQAAPoAAACA6AAAdTAAAOpgAAA6mAAAF3CculE8AAAAAmJLR0QA/4ePzL8AAAAHdElNRQfmBQIIDisOf7SDAAAB60lEQVRYw+2Wv07DMBTGv7SjCBMTE88D8SAsIAlLpC68SAsv0sqD8EDMPEAkEpS6IDEx8R7IDCSmIDExMTERExO76R0SInX6p07qXpInR7Gv78/n77OfL6Ioiv49pA4UUB8KoD4UQH0ogPpQAPWhAOpDAdSHAqgPBVAfCqA+FEAtpA4877LpOfu+8e67HrvuGfd9j73pOfuB9+7XvjvXv9+8f/35vvuO9963vveee993rN+8937YvPue995733fvvfd9933P+8593/vOu997773vvu+59773vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vvWv995679973vu+973vv+973vvfdf8F937vve9/77vvf9/8D933vuv9XvPfuu/997/ve973v/Xf8N9733ve+973vvfd973vv+/8N9733ve+97/9v/wXv/f8A/33/vf8N/73vvve9773vve+973vv/Rfe+89/33/ve99733vve+99733f/xd8N9733ve+973v";

    const statusColor = isOnline ? '#a6e3a1' : '#f38ba8';

    const svg = `<svg width="450" height="${cardHeight}" viewBox="0 0 450 ${cardHeight}" xmlns="http://www.w3.org/2000/svg">
      <rect width="450" height="${cardHeight}" rx="16" fill="#181825" stroke="#313244" stroke-width="2"/>
      
      <image href="${icon}" x="25" y="25" width="64" height="64" />
      <text x="105" y="45" font-family="Arial" font-size="20" fill="#cdd6f4" font-weight="bold">${serverIP}</text>
      <text x="105" y="65" font-family="Arial" font-size="12" fill="#fab387">${version}</text>
      
      <rect x="330" y="28" width="100" height="24" rx="12" fill="${statusColor}" fill-opacity="0.15"/>
      <text x="380" y="44" font-family="Arial" font-size="12" font-weight="bold" fill="${statusColor}" text-anchor="middle">
        ${isOnline ? data.players.online + ' / ' + data.players.max : 'OFFLINE'}
      </text>

      <foreignObject x="105" y="78" width="320" height="50">
        <div xmlns="http://www.w3.org/1999/xhtml" style="color:#bac2de; font-family:Arial; font-size:14px; line-height:1.4; overflow:hidden; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical;">
          ${motdHtml}
        </div>
      </foreignObject>

      <text x="105" y="145" font-family="Arial" font-size="11" fill="#94e2d5" font-weight="bold" style="letter-spacing:1px">PLAYERS ONLINE</text>
      <foreignObject x="105" y="155" width="320" height="${playerAreaHeight + 20}">
        <div xmlns="http://www.w3.org/1999/xhtml" style="color:#94e2d5; font-family:Arial; font-size:13px; line-height:20px;">
          ${playerHtml}
        </div>
      </foreignObject>
    </svg>`;
    return new Response(svg, { headers: { "Content-Type": "image/svg+xml", "Cache-Control": "public, max-age=60" } });
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
    <title>MC Card Pro</title>
    <style>
        :root { --bg: #11111b; --card: #1e1e2e; --text: #cdd6f4; --accent: #89b4fa; }
        [data-theme="light"] { --bg: #eff1f5; --card: #e6e9ef; --text: #4c4f69; --accent: #8839ef; }
        body { background: var(--bg); color: var(--text); font-family: system-ui; display: flex; flex-direction: column; align-items: center; min-height: 100vh; margin: 0; padding: 20px; box-sizing: border-box; transition: 0.3s; }
        .container { background: var(--card); padding: 25px; border-radius: 20px; box-shadow: 0 10px 30px rgba(0,0,0,0.3); text-align: center; width: 100%; max-width: 400px; }
        .theme-btn { position: fixed; top: 15px; right: 15px; cursor: pointer; font-size: 20px; background: var(--card); padding: 8px; border-radius: 50%; border: 1px solid var(--accent); }
        input { width: 100%; padding: 12px; margin: 15px 0; border: none; border-radius: 10px; background: var(--bg); color: var(--text); box-sizing: border-box; border: 1px solid var(--accent); }
        button { background: var(--accent); color: #11111b; border: none; padding: 12px; border-radius: 10px; font-weight: bold; cursor: pointer; width: 100%; font-size: 16px; }
        #preview { margin-top: 25px; width: 100%; }
        #preview img { width: 100%; height: auto; border-radius: 12px; }
        .code-box { background: #000; color: #a6e3a1; padding: 12px; border-radius: 8px; font-size: 11px; margin-top: 15px; display: none; text-align: left; word-break: break-all; white-space: pre-wrap; }
    </style>
</head>
<body data-theme="dark">
    <div class="theme-btn" onclick="setTheme()">🌓</div>
    <div class="container">
        <h3 style="margin:0">Minecraft Status Card</h3>
        <input type="text" id="ip" placeholder="输入服务器 IP (如: hypixel.net)">
        <button onclick="gen()">立即生成</button>
        <div id="preview"></div>
        <div id="code" class="code-box"></div>
    </div>
    <script>
        const savedTheme = localStorage.getItem('mc-theme') || 'dark';
        document.body.setAttribute('data-theme', savedTheme);
        function setTheme() {
            const current = document.body.getAttribute('data-theme');
            const next = current === 'dark' ? 'light' : 'dark';
            document.body.setAttribute('data-theme', next);
            localStorage.setItem('mc-theme', next);
        }
        function gen() {
            const ip = document.getElementById('ip').value.trim();
            if(!ip) return;
            const url = window.location.origin + '?server=' + encodeURIComponent(ip);
            document.getElementById('preview').innerHTML = '<img src="' + url + '">';
            const c = document.getElementById('code');
            c.style.display = 'block';
            c.innerText = 'Markdown 代码:\\n![MC Status](' + url + ')';
        }
    </script>
</body>
</html>
`;