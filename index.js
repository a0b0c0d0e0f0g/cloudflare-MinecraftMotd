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
    
    // 玩家解析逻辑：每行一个
    let playerLines = [];
    let cardHeight = 150; // 默认高度
    
    if (isOnline) {
      if (data.players.list && data.players.list.length > 0) {
        // 取前 4 名玩家，每行一个
        playerLines = data.players.list.slice(0, 4).map(p => p.name_clean);
        if (data.players.list.length > 4) playerLines.push("...");
        // 根据玩家数量动态增加卡片高度 (每行约18px)
        cardHeight = 150 + (playerLines.length * 18);
      } else if (data.players.online > 0) {
        playerLines = [`${data.players.online} player(s) online`];
      } else {
        playerLines = ["No players"];
      }
    }

    const version = isOnline ? (data.version?.name_clean || "Java") : "N/A";
    const motd = isOnline ? (data.motd?.clean || "Online") : "Offline";
    const icon = (isOnline && data.icon) ? data.icon : "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAAAAACPAi4CAAAABGdBTUEAALGPC/xhBQAAACBjSFJNAAB6JgAAgIQAAPoAAACA6AAAdTAAAOpgAAA6mAAAF3CculE8AAAAAmJLR0QA/4ePzL8AAAAHdElNRQfmBQIIDisOf7SDAAAB60lEQVRYw+2Wv07DMBTGv7SjCBMTE88D8SAsIAlLpC68SAsv0sqD8EDMPEAkEpS6IDEx8R7IDCSmIDExMTERExO76R0SInX6p07qXpInR7Gv78/n77OfL6Ioiv49pA4UUB8KoD4UQH0ogPpQAPWhAOpDAdSHAqgPBVAfCqA+FEAtpA4877LpOfu+8e67HrvuGfd9j73pOfuB9+7XvjvXv9+8f/35vvuO9963vveee993rN+8937YvPue995733fvvfd9933P+8593/vOu997773vvu+59773vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vvWv995679973vu+973vv+973vvfdf8F937vve9/77vvf9/8D933vuv9XvPfuu/997/ve973v/Xf8N9733ve+973vvfd973vv+/8N9733ve+97/9v/wXv/f8A/33/vf8N/73vvve9773vve+973vv/Rfe+89/33/ve99733vve+99733f/xd8N9733ve+973v";

    let svgPlayers = playerLines.map((name, i) => 
      `<text x="210" y="${118 + i * 18}" font-family="Arial" font-size="12" fill="#94e2d5" font-style="italic">${name}</text>`
    ).join("");

    const svg = `<svg width="450" height="${cardHeight}" viewBox="0 0 450 ${cardHeight}" xmlns="http://www.w3.org/2000/svg">
      <rect width="450" height="${cardHeight}" rx="16" fill="#181825" stroke="#313244" stroke-width="2"/>
      <image href="${icon}" x="25" y="35" width="64" height="64" />
      <text x="105" y="45" font-family="Arial" font-size="20" fill="#cdd6f4" font-weight="bold">${serverIP}</text>
      <text x="105" y="65" font-family="Arial" font-size="12" fill="#fab387">${version}</text>
      <text x="105" y="88" font-family="Arial" font-size="14" fill="#bac2de">${motd.substring(0,40)}</text>
      <rect x="105" y="105" width="85" height="22" rx="11" fill="${isOnline ? '#a6e3a1' : '#f38ba8'}" fill-opacity="0.15"/>
      <text x="115" y="121" font-family="Arial" font-size="12" font-weight="bold" fill="${isOnline ? '#a6e3a1' : '#f38ba8'}">${isOnline ? data.players.online + '/' + data.players.max : 'OFFLINE'}</text>
      <text x="210" y="100" font-family="Arial" font-size="11" fill="#94e2d5" font-weight="bold">PLAYER LIST:</text>
      ${svgPlayers}
    </svg>`;
    return new Response(svg, { headers: { "Content-Type": "image/svg+xml", "Cache-Control": "public, max-age=60" } });
  } catch (e) {
    return new Response("Error", { status: 500 });
  }
}const htmlTemplate = `
<!DOCTYPE html>
<html lang="zh">
<head>
    <meta charset="UTF-8">
    <title>MC Card Pro</title>
    <style>
        :root { --bg: #11111b; --card: #1e1e2e; --text: #cdd6f4; --accent: #89b4fa; }
        [data-theme="light"] { --bg: #eff1f5; --card: #e6e9ef; --text: #4c4f69; --accent: #8839ef; }
        body { background: var(--bg); color: var(--text); font-family: system-ui; display: flex; flex-direction: column; align-items: center; min-height: 100vh; margin: 0; padding: 40px 0; transition: 0.3s; }
        .container { background: var(--card); padding: 30px; border-radius: 24px; box-shadow: 0 10px 40px rgba(0,0,0,0.4); text-align: center; width: 420px; }
        .theme-btn { position: fixed; top: 20px; right: 20px; cursor: pointer; font-size: 24px; background: var(--card); padding: 10px; border-radius: 50%; border: 1px solid var(--accent); }
        input { width: 100%; padding: 14px; margin: 20px 0; border: none; border-radius: 12px; background: var(--bg); color: var(--text); box-sizing: border-box; outline: 1px solid var(--accent); }
        button { background: var(--accent); color: #11111b; border: none; padding: 14px; border-radius: 12px; font-weight: bold; cursor: pointer; width: 100%; font-size: 16px; transition: 0.2s; }
        button:active { transform: scale(0.98); }
        #preview { margin-top: 30px; }
        .code-box { background: #000; color: #a6e3a1; padding: 15px; border-radius: 10px; font-size: 12px; margin-top: 20px; display: none; text-align: left; word-break: break-all; }
    </style>
</head>
<body data-theme="dark">
    <div class="theme-btn" onclick="setTheme()">🌓</div>
    <div class="container">
        <h2 style="margin:0">MC Card Pro</h2>
        <input type="text" id="ip" placeholder="Server IP (e.g. mc.hypixel.net)">
        <button onclick="gen()">生成卡片</button>
        <div id="preview"></div>
        <div id="code" class="code-box"></div>
    </div>
    <script>
        // 初始化加载主题
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
            document.getElementById('preview').innerHTML = '<img src="' + url + '" style="width:100%; border-radius:12px;">';
            const c = document.getElementById('code');
            c.style.display = 'block';
            c.innerText = '![MC Status](' + url + ')';
        }
    </script>
</body>
</html>
`;