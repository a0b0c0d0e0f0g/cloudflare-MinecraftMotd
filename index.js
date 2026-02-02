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
    
    let playerHtml = "";
    if (isOnline && data.players.list?.length > 0) {
      playerHtml = data.players.list.slice(0, 8).map(p => `<div style="height:22px;">${p.name_clean}</div>`).join("");
    } else {
      playerHtml = '<div style="opacity:0.5">No players online</div>';
    }

    const cardHeight = 350;
    const icon = (isOnline && data.icon) ? data.icon : "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAAAAACPAi4CAAAABGdBTUEAALGPC/xhBQAAACBjSFJNAAB6JgAAgIQAAPoAAACA6AAAdTAAAOpgAAA6mAAAF3CculE8AAAAAmJLR0QA/4ePzL8AAAAHdElNRQfmBQIIDisOf7SDAAAB60lEQVRYw+2Wv07DMBTGv7SjCBMTE88D8SAsIAlLpC68SAsv0sqD8EDMPEAkEpS6IDEx8R7IDCSmIDExMTERExO76R0SInX6p07qXpInR7Gv78/n77OfL6Ioiv49pA4UUB8KoD4UQH0ogPpQAPWhAOpDAdSHAqgPBVAfCqA+FEAtpA4877LpOfu+8e67HrvuGfd9j73pOfuB9+7XvjvXv9+8f/35vvuO9963vveee993rN+8937YvPue995733fvvfd9933P+8593/vOu997773vvu+59773vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vve+9733vvWv995679973vu+973vv+973vvfdf8F937vve9/77vvf9/8D933vuv9XvPfuu/997/ve973v/Xf8N9733ve+973vvfd973vv+/8N9733ve+97/9v/wXv/f8A/33/vf8N/73vvve9773vve+973vv/Rfe+89/33/ve99733vve+99733f/xd8N9733ve+973v";

    const svg = `<svg width="450" height="${cardHeight}" viewBox="0 0 450 ${cardHeight}" xmlns="http://www.w3.org/2000/svg">
      <defs><clipPath id="m"><rect width="450" height="${cardHeight}" rx="45" /></clipPath></defs>
      <g clip-path="url(#m)">
        <image href="${backgroundImage}" width="450" height="${cardHeight}" preserveAspectRatio="xMidYMid slice" />
        <rect width="450" height="${cardHeight}" fill="#000" fill-opacity="0.7" />
      </g>
      <image href="${icon}" x="35" y="35" width="64" height="64" />
      <text x="115" y="60" font-family="Arial" font-size="22" fill="#fff" font-weight="bold">${serverIP}</text>
      <foreignObject x="35" y="115" width="380" height="200">
        <div xmlns="http://www.w3.org/1999/xhtml" style="color:#fff; font-family:sans-serif;">
          ${motdHtml}<br/><br/>
          <div style="font-size:12px; color:#64D2FF;">ONLINE PLAYERS</div>
          <div style="font-size:14px; margin-top:10px;">${playerHtml}</div>
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
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <style>
        :root { --p-x: 0px; --p-y: 0px; }
        body { margin: 0; height: 100vh; display: flex; align-items: center; justify-content: center; background: #000; font-family: system-ui; overflow: hidden; }
        #bg { position: fixed; top: -10%; left: -10%; width: 120%; height: 120%; background: url('https://other.api.yilx.cc/api/moe') center/cover; z-index: -1; transform: translate(calc(var(--p-x)*-1.2), calc(var(--p-y)*-1.2)); transition: 0.2s; }
        .box { background: rgba(255,255,255,0.1); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); padding: 30px; border-radius: 40px; width: 85%; max-width: 400px; border: 1px solid rgba(255,255,255,0.2); transform: translate(var(--p-x), var(--p-y)); color: #fff; }
        input { width: 100%; padding: 15px; margin: 20px 0; border-radius: 15px; border: none; background: rgba(0,0,0,0.3); color: #fff; box-sizing: border-box; }
        button { width: 100%; padding: 15px; border-radius: 15px; border: none; font-weight: bold; cursor: pointer; }
        #res img { width: 100%; border-radius: 30px; margin-top: 20px; }
        #sheet { position: fixed; bottom: -100%; left: 0; right: 0; background: rgba(30,30,30,0.9); backdrop-filter: blur(20px); padding: 20px; border-radius: 25px 25px 0 0; transition: 0.4s; text-align: center; z-index: 100; }
        #sheet.show { bottom: 0; }
        .btn { background: rgba(255,255,255,0.1); color: #0A84FF; padding: 15px; border-radius: 15px; margin: 10px 0; font-weight: 600; cursor: pointer; }
    </style>
</head>
<body onmousemove="px(event)" ontouchmove="tx(event)">
    <div id="bg"></div>
    <div class="box">
        <h2 style="margin:0">MC Status</h2>
        <input id="ip" placeholder="play.hypixel.net">
        <button onclick="gen()">生成卡片</button>
        <div id="res"></div>
    </div>
    <div id="sheet">
        <div style="width:40px;height:5px;background:#555;margin:0 auto 15px;border-radius:3px"></div>
        <div class="btn" onclick="copy()">复制链接</div>
        <div class="btn" style="color:#FF453A" onclick="closeSheet()">关闭</div>
    </div>
    <script>
        let url = '';
        function px(e) { update((window.innerWidth/2-e.pageX)/40, (window.innerHeight/2-e.pageY)/40); }
        function tx(e) { update((window.innerWidth/2-e.touches[0].pageX)/40, (window.innerHeight/2-e.touches[0].pageY)/40); }
        function update(x,y) { document.documentElement.style.setProperty('--p-x',x+'px'); document.documentElement.style.setProperty('--p-y',y+'px'); }
        function gen() {
            const ip = document.getElementById('ip').value;
            url = window.location.origin + '?server=' + encodeURIComponent(ip);
            const img = new Image();
            img.onload = () => { 
                document.getElementById('res').innerHTML = ''; 
                document.getElementById('res').appendChild(img);
                document.getElementById('sheet').classList.add('show');
            };
            img.src = url;
        }
        function copy() { navigator.clipboard.writeText(url); alert('已复制'); }
        function closeSheet() { document.getElementById('sheet').classList.remove('show'); }
    </script>
</body>
</html>`; // <-- 重点：闭合反引号和分号