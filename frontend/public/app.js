const API=window.location.hostname==='localhost'?'http://localhost:8000':'';
let currentPage=1,chatConvId=null;

// Nav
document.querySelectorAll('.nav-btn').forEach(b=>b.addEventListener('click',()=>{
  document.querySelectorAll('.nav-btn').forEach(x=>x.classList.remove('active'));
  document.querySelectorAll('.view').forEach(x=>x.classList.remove('active'));
  b.classList.add('active');
  document.getElementById('view-'+b.dataset.view).classList.add('active');
  if(b.dataset.view==='dashboard')loadDashboard();
  if(b.dataset.view==='devices')loadDevices();
  if(b.dataset.view==='analytics')loadAnalytics('summary');
}));

async function api(path,opts={}){
  try{
    const r=await fetch(API+path,{headers:{'Content-Type':'application/json'},...opts});
    if(!r.ok)throw new Error(`${r.status}`);
    return r.json();
  }catch(e){console.error(path,e);return null;}
}

// Dashboard
async function loadDashboard(){
  const[status,summary]=await Promise.all([api('/status'),api('/analytics/summary')]);
  const dot=document.getElementById('statusDot');
  if(status?.status==='OK'){dot.innerHTML='● Online';dot.style.color='#10b981';}
  else{dot.innerHTML='● Offline';dot.style.color='#ef4444';}

  if(status?.downstream){
    const g=document.getElementById('healthGrid');
    g.innerHTML=Object.entries(status.downstream).map(([n,s])=>
      `<div class="health-item"><span class="dot" style="background:${s==='OK'?'#10b981':'#ef4444'}"></span>${n}: ${s}</div>`
    ).join('');
  }

  const sc=document.getElementById('summaryCards');
  if(summary){
    sc.innerHTML=`
      <div class="card"><h3>Total Devices</h3><div class="value">${summary.totalDevices||0}</div></div>
      <div class="card"><h3>Avg Price</h3><div class="value">$${summary.priceStats?.avg||0}</div></div>
      <div class="card"><h3>Min Price</h3><div class="value">$${summary.priceStats?.min||0}</div></div>
      <div class="card"><h3>Max Price</h3><div class="value">$${summary.priceStats?.max||0}</div></div>`;
  }
}

// Devices
async function loadDevices(page=1){
  currentPage=page;
  const d=await api(`/rentals/products?page=${page}&limit=12`);
  if(!d)return;
  const list=document.getElementById('deviceList');
  const items=d.data||[];
  list.innerHTML=items.map(v=>`
    <div class="card device-card">
      <div class="name">${v.name||v.id||'Product'}</div>
      <div class="type">${v.category||v.type||'Rental'}</div>
      <div class="price">$${v.pricePerDay||v.price||0}<span style="font-size:.7rem;color:var(--muted)">/day</span></div>
      <span class="status status-${(v.status||'available').toLowerCase()}">${v.status||'Available'}</span>
    </div>`).join('');

  const pg=d.pagination;
  if(pg){
    const el=document.getElementById('pagination');
    let h='';
    if(pg.hasPrev)h+=`<button onclick="loadDevices(${pg.page-1})">← Prev</button>`;
    for(let i=1;i<=Math.min(pg.totalPages,5);i++)
      h+=`<button class="${i===pg.page?'active':''}" onclick="loadDevices(${i})">${i}</button>`;
    if(pg.hasNext)h+=`<button onclick="loadDevices(${pg.page+1})">Next →</button>`;
    el.innerHTML=h;
  }
}

async function searchDevices(){
  const q=document.getElementById('searchInput').value;
  const type=document.getElementById('filterType').value;
  let url=`/rentals/products?q=${encodeURIComponent(q)}`;
  if(type)url+=`&category=${type}`;
  const d=await api(url);
  if(!d)return;
  document.getElementById('deviceList').innerHTML=(d.data||d.results||[]).map(v=>`
    <div class="card device-card">
      <div class="name">${v.name||v.id}</div>
      <div class="type">${v.category||v.type||'Rental'}</div>
      <div class="price">$${v.pricePerDay||v.price||0}<span style="font-size:.7rem;color:var(--muted)">/day</span></div>
      <span class="status status-${(v.status||'available').toLowerCase()}">${v.status||'Available'}</span>
    </div>`).join('');
}

// Analytics
async function loadAnalytics(tab){
  document.querySelectorAll('.tab').forEach((t,i)=>{t.classList.toggle('active',['summary','trends','peak','spikes'][i]===tab);});
  const el=document.getElementById('analyticsContent');
  el.innerHTML='<p>Loading…</p>';

  if(tab==='summary'){
    const d=await api('/analytics/summary');
    if(!d){el.innerHTML='<p>Failed to load</p>';return;}
    el.innerHTML=`
      <h3>Price Statistics</h3>
      <table><tr><th>Metric</th><th>Value</th></tr>
      <tr><td>Total Devices</td><td>${d.totalDevices}</td></tr>
      <tr><td>Min</td><td>$${d.priceStats?.min}</td></tr>
      <tr><td>Max</td><td>$${d.priceStats?.max}</td></tr>
      <tr><td>Avg</td><td>$${d.priceStats?.avg}</td></tr>
      <tr><td>Median</td><td>$${d.priceStats?.median}</td></tr>
      <tr><td>Total</td><td>$${d.priceStats?.total}</td></tr></table>
      <h3 style="margin-top:1rem">Categories</h3>
      <table><tr><th>Type</th><th>Count</th><th>Total Value</th></tr>
      ${Object.entries(d.categories||{}).map(([k,v])=>`<tr><td>${k}</td><td>${v.count}</td><td>$${v.totalPrice.toFixed(2)}</td></tr>`).join('')}</table>`;
  }
  if(tab==='trends'){
    const d=await api('/analytics/trends?period=monthly');
    if(!d){el.innerHTML='<p>Failed</p>';return;}
    el.innerHTML=`<h3>Monthly Trends</h3><table><tr><th>Period</th><th>Count</th><th>Avg Price</th></tr>
      ${(d.data||[]).map(t=>`<tr><td>${t.period}</td><td>${t.count}</td><td>$${t.avgPrice}</td></tr>`).join('')}</table>`;
  }
  if(tab==='peak'){
    const d=await api('/analytics/peak-window?days=7');
    if(!d){el.innerHTML='<p>Failed</p>';return;}
    el.innerHTML=`<h3>Peak 7-Day Window</h3><p style="color:var(--accent);font-size:1.3rem;font-weight:700">Total Activity: ${d.total}</p>
      <table><tr><th>Date</th><th>Count</th></tr>
      ${(d.window||[]).map(w=>`<tr><td>${w.date}</td><td>${w.count}</td></tr>`).join('')}</table>`;
  }
  if(tab==='spikes'){
    const d=await api('/analytics/price-spikes');
    if(!d){el.innerHTML='<p>Failed</p>';return;}
    const sp=(d.spikes||[]).filter(s=>s.nextSpikeDate).slice(0,15);
    el.innerHTML=`<h3>Price Spikes (${sp.length} detected)</h3>
      <table><tr><th>Date</th><th>Price</th><th>Next Spike</th><th>Days</th></tr>
      ${sp.map(s=>`<tr><td>${s.date}</td><td>$${s.price}</td><td>$${s.nextSpikePrice}</td><td>${s.daysUntilSpike}</td></tr>`).join('')}</table>`;
  }
}

// Chat
async function sendChat(){
  const input=document.getElementById('chatInput');
  const msg=input.value.trim();
  if(!msg)return;
  input.value='';
  const el=document.getElementById('chatMessages');
  el.innerHTML+=`<div class="msg user">${msg}</div>`;
  el.scrollTop=el.scrollHeight;

  const d=await api('/chat',{method:'POST',body:JSON.stringify({message:msg,userId:'guest',sessionId:chatConvId})});
  if(d){
    chatConvId=d.sessionId;
    el.innerHTML+=`<div class="msg assistant">${d.reply}</div>`;
  }else{
    el.innerHTML+=`<div class="msg assistant">Sorry, I couldn't process that. Please try again.</div>`;
  }
  el.scrollTop=el.scrollHeight;
}

// Init
loadDashboard();
