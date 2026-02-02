export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const serverIP = url.searchParams.get("server");

    if (serverIP) {
      return handleImageRequest(serverIP);
    } else {
      return new Response(htmlTemplate, {
        headers: { "Content-Type": "text/html;charset=UTF-8" }
      });
    }
  }
};

async function handleImageRequest(serverIP) {
  const apiUrl = `https://mcapi.us/server/status?ip=${encodeURIComponent(serverIP)}`;
  try {
    const res = await fetch(apiUrl, { headers: { "User-Agent": "MC-Status-Worker/1.1" } });
    const data = await res.json();
    const isOnline = data.status === "success" && data.online;
    
    const playersNow = isOnline ? data.players.now : 0;
    const playersMax = isOnline ? data.players.max : 0;
    const cleanMotd = (isOnline ? data.motd : "Server Offline").replace(/§[0-9a-fk-or]/gi, "").substring(0, 45);
    const iconData = (isOnline && data.favicon) ? data.favicon : "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAAAAACPAi4CAAAABGdBTUEAALGPC/xhBQAAACBjSFJNAAB6JgAAgIQAAPoAAACA6AAAdTAAAOpgAAA6mAAAF3CculE8AAAAAmJLR0QA/4ePzL8AAAAHdElNRQfmBQIIDisOf7SDAAAB60lEQVRYw+2Wv07DMBTGv7SjCBMTE88D8SAsIAlLpC68SAsv0sqD8EDMPEAkEpS6IDEx8R7IDCSmIDExMTERExO76R0SInX6p07qXpInR7Gv78/n77OfL6Ioiv49pA4UUB8KoD4UQH0ogPpQAPWhAOpDAdSHAqgPBVAfCqA+FEAtpA4877LpOfu+8e67HrvuGfd9j73pOfuB9+7XvjvXv9+8f/35vvuO9963vveee993rN+8937YvPue995733fvvfd9933P+8593/vOu997773vvu+59773vve97973vve9773vveu+9773vve+7773vve+967vfffvve++73vve+9777vve+99333f89733vfee997333v+967nvve++5733vve+97733fve+9733vfd9973vv+977rvee99733vve+9773vve99733vfe99733ve9973vvve99733vve+9733vve9973vvve9773vve+9773vve+9733vve+9773vve+9773vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vvWv995679973vu+973vv+973vvfdf8F937vve9/77vvf9/8D933vuv9XvPfuu/997/ve973v/Xf8N9733ve+973vvfd973vv+/8N9733ve+97/9v/wXv/f8A/33/vf8N/73vvve9773vve9973vv/Rfe+89/33/ve99733vve+99733f/xd8N9733ve+973v";

    const svg = `
    <svg width="400" height="100" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" rx="10" fill="#1e1e2e"/>
      <image href="${iconData}" x="20" y="18" width="64" height="64" />
      <text x="100" y="40" font-family="Arial" font-size="18" fill="#cdd6f4" font-weight="bold">${serverIP}</text>
      <text x="100" y="65" font-family="Arial" font-size="14" fill="#a6adc8">${cleanMotd}</text>
      <circle cx="105" cy="82" r="4" fill="${isOnline ? '#a6e3a1' : '#f38ba8'}"/>
      <text x="115" y="86" font-family="Arial" font-size="12" fill="#bac2de">${isOnline ? `Online | ${playersNow}/${playersMax}` : 'Offline'}</text>
    </svg>`;

    return new Response(svg, { headers: { "Content-Type": "image/svg+xml", "Cache-Control": "max-age=60" } });
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
    <title>Minecraft 服务器状态生成器</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <style>
        body { background-color: #1a1b26; color: #a9b1d6; padding-top: 50px; }
        .container-box { max-width: 600px; margin: 0 auto; background: #24283b; padding: 30px; border-radius: 15px; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
        .preview-area { background: #1a1b26; border-radius: 10px; padding: 20px; text-align: center; margin-top: 20px; }
        .code-box { background: #16161e; padding: 15px; border-radius: 8px; font-family: monospace; font-size: 13px; margin-top: 20px; word-break: break-all; display: none; }
        .btn-primary { background-color: #7aa2f7; border: none; }
        .btn-primary:hover { background-color: #89ddff; }
        .form-control { background: #1a1b26; border: 1px solid #414868; color: #c0caf5; }
        .form-control:focus { background: #24283b; color: #c0caf5; border-color: #7aa2f7; }
    </style>
</head>
<body>
    <div class="container-box">
        <h3 class="mb-4 text-center">Minecraft 服务器状态卡片</h3>
        <div class="input-group mb-3">
            <input type="text" id="ipInput" class="form-control" placeholder="输入服务器地址 (如: play.hypixel.net)">
            <button class="btn btn-primary" onclick="generate()">确定</button>
        </div>
        <div class="preview-area" id="previewArea"><span class="text-muted">等待生成预览...</span></div>
        <div id="codeBox" class="code-box">
            <label class="small text-muted mb-2 d-block">Markdown 代码:</label>
            <code id="mdLink"></code>
        </div>
    </div>
    <script>
        function generate() {
            const ip = document.getElementById('ipInput').value.trim();
            if (!ip) return alert("请输入服务器 IP");
            
            // 核心修改：使用当前页面的 host 动态生成
            const protocol = window.location.protocol;
            const host = window.location.host;
            const fullUrl = protocol + "//" + host + "/?server=" + encodeURIComponent(ip) + "&t=" + Date.now();
            
            document.getElementById('previewArea').innerHTML = \`
                <p class="small text-muted mb-2">预览：</p>
                <img src="\${fullUrl}" style="max-width: 100%; height: auto; border-radius: 8px;">
            \`;
            
            document.getElementById('codeBox').style.display = 'block';
            document.getElementById('mdLink').innerText = \`![MC Server Status](\${fullUrl.split('&t=')[0]}) \`;
        }
    </script>
</body>
</html>`;
