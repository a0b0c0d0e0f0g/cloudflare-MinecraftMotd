export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const serverIP = url.searchParams.get("server");

    if (!serverIP) {
      return new Response(htmlTemplate, {
        headers: { "Content-Type": "text/html;charset=UTF-8" }
      });
    }

    return handleImageRequest(serverIP);
  }
};

async function handleImageRequest(serverIP) {
  const apiUrl = `https://mcapi.us/server/status?ip=${encodeURIComponent(serverIP)}`;
  
  try {
    const res = await fetch(apiUrl, { 
      headers: { "User-Agent": "MC-Status-Worker/1.4" },
      cf: { cacheTtl: 60 }
    });
    const data = await res.json();
    const isOnline = data.status === "success" && data.online;
    
    // --- 数据处理 ---
    const version = isOnline ? (data.server.name || "Unknown") : "N/A";
    const playersNow = isOnline ? data.players.now : 0;
    const playersMax = isOnline ? data.players.max : 0;
    
    let playerListText = "None";
    if (isOnline && data.players.list && data.players.list.length > 0) {
      playerListText = data.players.list.slice(0, 5).join(", ");
      if (data.players.list.length > 5) playerListText += "...";
    }

    const cleanMotd = (isOnline ? data.motd : "Server is currently offline.")
      .replace(/§[0-9a-fk-or]/gi, "").replace(/\n/g, " ").substring(0, 45);

    const iconData = (isOnline && data.favicon) ? data.favicon : "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAAAAACPAi4CAAAABGdBTUEAALGPC/xhBQAAACBjSFJNAAB6JgAAgIQAAPoAAACA6AAAdTAAAOpgAAA6mAAAF3CculE8AAAAAmJLR0QA/4ePzL8AAAAHdElNRQfmBQIIDisOf7SDAAAB60lEQVRYw+2Wv07DMBTGv7SjCBMTE88D8SAsIAlLpC68SAsv0sqD8EDMPEAkEpS6IDEx8R7IDCSmIDExMTERExO76R0SInX6p07qXpInR7Gv78/n77OfL6Ioiv49pA4UUB8KoD4UQH0ogPpQAPWhAOpDAdSHAqgPBVAfCqA+FEAtpA4877LpOfu+8e67HrvuGfd9j73pOfuB9+7XvjvXv9+8f/35vvuO9963vveee993rN+8937YvPue995733fvvfd9933P+8593/vOu997773vvu+59773vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vvWv995679973vu+973vv+973vvfdf8F937vve9/77vvf9/8D933vuv9XvPfuu/997/ve973v/Xf8N9733ve+973vvfd973vv+/8N9733ve+97/9v/wXv/f8A/33/vf8N/73vvve9773vve+973vv/Rfe+89/33/ve99733vve+99733f/xd8N9733ve+973v";

    // --- SVG 卡片设计 ---
    const svg = `
    <svg width="450" height="150" viewBox="0 0 450 150" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#1e1e2e;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#181825;stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect width="450" height="150" rx="20" fill="url(#g)" stroke="#313244" stroke-width="2"/>
      <image href="${iconData}" x="25" y="30" width="64" height="64" />
      <text x="105" y="45" font-family="Arial,sans-serif" font-size="20" fill="#cdd6f4" font-weight="bold">${serverIP}</text>
      <text x="105" y="65" font-family="Arial,sans-serif" font-size="12" fill="#fab387">Version: ${version}</text>
      <text x="105" y="88" font-family="Arial,sans-serif" font-size="14" fill="#a6adc8">${cleanMotd}</text>
      <rect x="105" y="105" width="100" height="22" rx="11" fill="${isOnline ? '#a6e3a1' : '#f38ba8'}" fill-opacity="0.15"/>
      <circle cx="118" cy="116" r="4" fill="${isOnline ? '#a6e3a1' : '#f38ba8'}"/>
      <text x="130" y="120" font-family="Arial,sans-serif" font-size="12" font-weight="bold" fill="${isOnline ? '#a6e3a1' : '#f38ba8'}">
        ${isOnline ? playersNow + ' / ' + playersMax : 'OFFLINE'}
      </text>
      <text x="215" y="120" font-family="Arial,sans-serif" font-size="11" fill="#94e2d5" font-style="italic">Players: ${playerListText}</text>
    </svg>`;

    return new Response(svg, { headers: { "Content-Type": "image/svg+xml", "Cache-Control": "public, max-age=60" } });
  } catch (e) {
    return new Response("Error", { status: 500 });
  }
}

const htmlTemplate = \`
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>MC 服务器状态卡片</title>
    <style>
        :root { --bg: #eff1f5; --card: #e6e9ef; --text: #4c4f69; --input: #ccd0da; --btn: #8839ef; --btn-text: #ffffff; }
        [data-theme="dark"] { --bg: #11111b; --card: #1e1e2e; --text: #cdd6f4; --input: #313244; --btn: #89b4fa; --btn-text: #11111b; }
        body { background: var(--bg); color: var(--text); font-family: 'Segoe UI', system-ui; transition: 0.3s; display: flex; flex-direction: column; align-items: center; min-height: 100vh; margin: 0; padding-top: 40px; }
        .container { background: var(--card); padding: 2rem; border-radius: 20px; box-shadow: 0 10px 30px rgba(0,0,0,0.1); width: 90%; max-width: 480px; text-align: center; }
        .theme-toggle { position: absolute; top: 20px; right: 20px; cursor: pointer; padding: 10px; border-radius: 50%; background: var(--input); font-size: 20px; }
        input { width: 100%; box-sizing: border-box; padding: 14px; margin: 15px 0; border: none; border-radius: 12px; background: var(--input); color: var(--text); outline: none; }
        button { width: 100%; padding: 14px; border: none; border-radius: 12px; background: var(--btn); color: var(--btn-text); font-weight: bold; cursor: pointer; font-size: 16px; }
        #preview { margin-top: 30px; }
        #preview img { max-width: 100%; border-radius: 10px; }
        .code-box { background: #181825; color: #a6e3a1; padding: 15px; margin-top: 20px; border-radius: 10px; font-size: 12px; text-align: left; display: none; word-break: break-all; }
    </style>
</head>
<body data-theme="dark">
    <div class="theme-toggle" onclick="toggleTheme()">🌓</div>
    <div class="container">
        <h2 style="margin-top:0">MC 卡片生成器 v2.0</h2>
        <input type="text" id="ip" placeholder="输入服务器地址 (如: play.hypixel.net)">
        <button onclick="generate()">立即生成</button>
        <div id="preview"></div>
        <div id="code" class="code-box"></div>
    </div>
    <script>
        function toggleTheme() {
            const body = document.body;
            body.setAttribute('data-theme', body.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
        }
        function generate() {
            const ip = document.getElementById('ip').value;
            if(!ip) return;
            const url = window.location.origin + '?server=' + encodeURIComponent(ip);
            document.getElementById('preview').innerHTML = '<p>预览:</p><img src="' + url + '">';
            const code = document.getElementById('code');
            code.style.display = 'block';
            code.innerText = '![MC Status](' + url + ')';
        }
    </script>
</body>
</html>
\`;