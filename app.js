// PhoneMatch DZ Phase 4 — matching, search, comparison, favorites, Supabase and fallback prices.
// Only the Publishable/anon key belongs here. NEVER add the service-role/secret key to client code.
const SUPABASE_URL = "https://slpyzzjsgqdsebfodkua.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_7MZ4Hpp0xNWBn0ZamjafFw_V50v0nSh";
const $ = id => document.getElementById(id);
const money = n => n == null || !Number.isFinite(Number(n)) ? 'غير متوفر' : Number(n).toLocaleString('fr-FR') + ' دج';
let PRICE_DB = {phones:{}, generated_at:null, source:'base'};
let favorites = new Set();
try { favorites = new Set(JSON.parse(localStorage.getItem('pm-dz-favorites') || '[]')); } catch (_) {}
const budget=$('budget'), use=$('use'), brand=$('brand'), network=$('network');
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

async function loadPrices(){
  const status=$('dbStatus');
  try {
    if (SUPABASE_URL.startsWith('https://') && SUPABASE_ANON_KEY && !SUPABASE_ANON_KEY.includes('YOUR_')) {
      const r=await fetch(`${SUPABASE_URL}/rest/v1/phone_best_offers?select=*`,{headers:{apikey:SUPABASE_ANON_KEY,Authorization:`Bearer ${SUPABASE_ANON_KEY}`},cache:'no-store'});
      if(r.ok){
        const rows=await r.json(); const phones={};
        rows.forEach(o=>{ if(!o.phone_name || !(Number(o.price_dzd)>0)) return; phones[o.phone_name]={price:Number(o.price_dzd),offers:[{price:Number(o.price_dzd),source:o.store_name||'مصدر غير محدد',url:o.product_url||'',confidence:o.confidence}],updated_at:o.observed_at,status:'live',source:'Supabase'}; });
        if(Object.keys(phones).length){PRICE_DB={phones,generated_at:new Date().toISOString(),source:'Supabase'};return;}
      } else console.warn('Supabase read returned HTTP',r.status);
    }
  } catch(e){ console.warn('Supabase unavailable; trying prices.json',e); }
  try { const r=await fetch('prices.json?ts='+Date.now(),{cache:'no-store'}); if(r.ok){const d=await r.json();if(d&&d.phones)PRICE_DB={...d,source:'prices.json'};} }
  catch(e){console.warn('prices.json unavailable; using reference prices',e);}
}
function phoneData(p){const x=PRICE_DB.phones?.[p[0]];return {...p,livePrice:x&&x.price!=null?Number(x.price):p[2],priceInfo:x||null};}
function score(raw){const p=phoneData(raw),b=+budget.value,price=p.livePrice;let s=price<=b?35:Math.max(0,35-(price-b)/b*35);s+=raw[11].includes(use.value)?30:8;s+=raw[10]*.15+raw[3]/12*6+raw[4]/512*4+raw[5]/7000*5;if(use.value==='camera')s+=raw[6]/200*5;if(use.value==='gaming')s+=raw[10]/100*8;if(use.value==='battery')s+=raw[5]/8500*8;return Math.max(0,Math.min(99,Math.round(s)));}
function offerHtml(info){if(!info)return '<div class="offer-meta">السعر المعروض مرجعي، لم يصل عرض مباشر لهذا الهاتف.</div>';const offers=(info.offers||[]).slice(0,3).filter(o=>Number(o.price)>0);if(!offers.length)return `<div class="offer-meta">آخر رصد: ${info.updated_at?new Date(info.updated_at).toLocaleString('ar-DZ'):'غير محدد'}</div>`;return `<div class="offers"><b>العرض المسجل</b>${offers.map(o=>o.url?`<a href="${esc(o.url)}" target="_blank" rel="noopener noreferrer">${money(o.price)} — ${esc(o.source||'المصدر')}</a>`:`<span class="offer-meta">${money(o.price)} — ${esc(o.source||'المصدر')}</span>`).join('')}</div>`;}
function card(raw,match=false){const p=phoneData(raw),info=p.priceInfo,live=info?.status==='live';const isFav=favorites.has(raw[0]);return `<article class="phone-card"><div class="card-top"><span class="brand-tag">${esc(raw[1])} · ${raw[9]}G</span><span class="status-tag ${live?'live':''}">${live?'● عرض من قاعدة البيانات':'○ سعر مرجعي'}</span></div><h3>${esc(raw[0])}</h3><div class="model-meta">تقييم الأداء: ${raw[10]}/100</div><div class="price">${money(p.livePrice)} <small>تقريبًا</small></div><div class="stats"><div class="stat">الذاكرة RAM<b>${raw[3]} GB</b></div><div class="stat">التخزين<b>${raw[4]} GB</b></div><div class="stat">البطارية<b>${raw[5].toLocaleString('fr-FR')} mAh</b></div><div class="stat">الكاميرا<b>${raw[6]} MP</b></div><div class="stat">الشاشة<b>${raw[7]} بوصة</b></div><div class="stat">التحديث<b>${raw[8]} Hz</b></div></div>${match?`<div class="match">مدى المطابقة: ${score(raw)}%<div class="bar"><i style="width:${score(raw)}%"></i></div></div>`:''}${offerHtml(info)}<div class="card-actions"><button class="small-btn" onclick="pick('${esc(raw[0])}',1)">قارن 1</button><button class="small-btn" onclick="pick('${esc(raw[0])}',2)">قارن 2</button><button class="favorite-btn ${isFav?'active':''}" aria-label="إضافة للمفضلة" title="إضافة للمفضلة" onclick="toggleFavorite('${esc(raw[0])}')">${isFav?'♥':'♡'}</button></div></article>`;}
function filteredPhones(catalog=false){const q=(catalog?$('search').value:'').trim().toLowerCase();const b=catalog?$('catalogBrand').value:brand.value;const n=catalog?$('catalogNetwork').value:network.value;return PHONES.filter(p=>(b==='all'||p[1]===b)&&(n==='all'||String(p[9])===n)&&(!q||(p[0]+' '+p[1]).toLowerCase().includes(q)));}
function sortPhones(arr){const mode=$('sort').value;return arr.sort((a,b)=>mode==='priceAsc'?phoneData(a).livePrice-phoneData(b).livePrice:mode==='priceDesc'?phoneData(b).livePrice-phoneData(a).livePrice:mode==='performance'?b[10]-a[10]:score(b)-score(a));}
function render(){ $('bt').textContent=money(+budget.value);const arr=sortPhones(filteredPhones());$('count').textContent=arr.length;$('cards').innerHTML=arr.length?arr.slice(0,6).map(p=>card(p,true)).join(''):'<div class="empty-state">لا توجد نتائج بهذه الفلاتر. جرّب تغيير الميزانية أو العلامة.</div>';const s=$('dbStatus');if(PRICE_DB.source==='Supabase'){s.className='status-banner ok';s.innerHTML='<span class="status-dot"></span><span>تم جلب عروض من Supabase. تحقق من تاريخ ومصدر كل عرض قبل الشراء.</span>';$('priceStatus').textContent='متصل';}else if(PRICE_DB.source==='prices.json'){s.className='status-banner warn';s.innerHTML='<span class="status-dot"></span><span>تُستخدم بيانات الأسعار الاحتياطية من prices.json؛ الاتصال المباشر لم يُرجع عروضًا.</span>';$('priceStatus').textContent='احتياطي';}else{s.className='status-banner warn';s.innerHTML='<span class="status-dot"></span><span>تظهر الأسعار المرجعية من قاعدة الهواتف؛ لم يتم تأكيد اتصال الأسعار المباشرة.</span>';$('priceStatus').textContent='مرجعي';}$('totalPhones').textContent=PHONES.length;}
function renderCatalog(){const arr=filteredPhones(true);$('all').innerHTML=arr.length?arr.map(p=>card(p,false)).join(''):'<div class="empty-state">لا توجد هواتف مطابقة للبحث.</div>';}
function initCompare(){['c1','c2'].forEach(id=>$(id).innerHTML=PHONES.map(p=>`<option value="${esc(p[0])}">${esc(p[0])}</option>`).join(''));if(PHONES.length>1)$('c2').selectedIndex=1;compare();}
function compare(){let a=PHONES.find(p=>p[0]===$('c1').value),b=PHONES.find(p=>p[0]===$('c2').value);if(!a||!b)return;a=phoneData(a);b=phoneData(b);const rows=[['السعر',money(a.livePrice),money(b.livePrice)],['RAM',a[3]+' GB',b[3]+' GB'],['التخزين',a[4]+' GB',b[4]+' GB'],['البطارية',a[5].toLocaleString('fr-FR')+' mAh',b[5].toLocaleString('fr-FR')+' mAh'],['الكاميرا',a[6]+' MP',b[6]+' MP'],['الشاشة',a[7]+' بوصة',b[7]+' بوصة'],['معدل التحديث',a[8]+' Hz',b[8]+' Hz'],['الشبكة',a[9]+'G',b[9]+'G'],['تقييم الأداء',a[10]+'/100',b[10]+'/100'],['مطابقة اختياراتك',score(PHONES.find(p=>p[0]===a[0]))+'%',score(PHONES.find(p=>p[0]===b[0]))+'%']];$('table').innerHTML='<table><thead><tr><th>المواصفة</th><th>'+esc(a[0])+'</th><th>'+esc(b[0])+'</th></tr></thead><tbody>'+rows.map(r=>`<tr><td><b>${r[0]}</b></td><td>${r[1]}</td><td>${r[2]}</td></tr>`).join('')+'</tbody></table>';}
function pick(name,k){$(k===1?'c1':'c2').value=name;compare();location.hash='compare';}
function toggleFavorite(name){favorites.has(name)?favorites.delete(name):favorites.add(name);try{localStorage.setItem('pm-dz-favorites',JSON.stringify([...favorites]));}catch(_){}render();renderCatalog();renderFavorites();}
function renderFavorites(){const arr=PHONES.filter(p=>favorites.has(p[0]));$('favCount').textContent=arr.length;$('favoritesList').innerHTML=arr.length?arr.map(p=>card(p,false)).join(''):'<div class="empty-state">لم تحفظ أي هاتف بعد. اضغط ♡ على بطاقة الهاتف لإضافته هنا.</div>';}
[...new Set(PHONES.map(p=>p[1]))].sort().forEach(x=>{brand.insertAdjacentHTML('beforeend',`<option value="${esc(x)}">${esc(x)}</option>`);$('catalogBrand').insertAdjacentHTML('beforeend',`<option value="${esc(x)}">${esc(x)}</option>`);});
budget.addEventListener('input',render);use.addEventListener('change',render);brand.addEventListener('change',render);network.addEventListener('change',render);$('sort').addEventListener('change',render);$('match').addEventListener('click',()=>{render();location.hash='cards';});$('search').addEventListener('input',renderCatalog);$('catalogBrand').addEventListener('change',renderCatalog);$('catalogNetwork').addEventListener('change',renderCatalog);$('c1').addEventListener('change',compare);$('c2').addEventListener('change',compare);
(async()=>{await loadPrices();initCompare();render();renderCatalog();renderFavorites();})();

// Phase 5 add-ons. Admin actions require a Supabase Auth session AND an admin_users row.
const historyPhone=$('historyPhone'), offerPhone=$('offerPhone');
function fillPhoneSelectors(){
  const opts=PHONES.map(p=>`<option value="${esc(p[0])}">${esc(p[0])}</option>`).join('');
  if(historyPhone)historyPhone.innerHTML=opts;
  if(offerPhone)offerPhone.innerHTML=opts;
}
function apiHeaders(token){return {apikey:SUPABASE_ANON_KEY,Authorization:`Bearer ${token||SUPABASE_ANON_KEY}`,'Content-Type':'application/json'}}
async function getRest(path, token){
  const r=await fetch(`${SUPABASE_URL}/rest/v1/${path}`,{headers:apiHeaders(token),cache:'no-store'});
  if(!r.ok)throw new Error(`Supabase HTTP ${r.status}`); return r.json();
}
async function loadHistory(){
  const phone=historyPhone?.value; const status=$('historyStatus'); if(!phone||!status)return;
  status.className='status-banner';status.textContent='جارٍ تحميل السجل…';
  try{
    const q=`phone_price_history?select=phone_name,store_name,price_dzd,product_url,observed_at&phone_name=eq.${encodeURIComponent(phone)}&order=observed_at.desc&limit=80`;
    const rows=await getRest(q);
    const chart=$('historyChart'), table=$('historyTable'), stores=$('storeOffers');
    if(!rows.length){chart.innerHTML='<div class="history-empty">لا توجد سجلات تاريخية لهذا الهاتف حتى الآن. ستظهر البيانات بعد تسجيل العروض.</div>';table.innerHTML='';stores.innerHTML='<div class="empty-state">لا توجد عروض مسجلة لهذا الهاتف.</div>';status.className='status-banner warn';status.textContent='لا توجد بيانات تاريخية بعد.';return;}
    const ordered=[...rows].reverse(); const vals=ordered.map(x=>Number(x.price_dzd)).filter(x=>x>0);const max=Math.max(...vals),min=Math.min(...vals),range=max-min||1;
    chart.innerHTML=ordered.map(x=>{const v=Number(x.price_dzd),h=26+((v-min)/range)*120;return `<div class="history-bar" title="${esc(x.store_name)} · ${money(v)}"><strong>${money(v)}</strong><div class="bar-fill" style="height:${h}px"></div><span>${new Date(x.observed_at).toLocaleDateString('ar-DZ')}</span></div>`}).join('');
    table.innerHTML='<table><thead><tr><th>المتجر</th><th>السعر</th><th>تاريخ الرصد</th><th>الرابط</th></tr></thead><tbody>'+rows.map(x=>`<tr><td>${esc(x.store_name)}</td><td>${money(Number(x.price_dzd))}</td><td>${new Date(x.observed_at).toLocaleString('ar-DZ')}</td><td>${x.product_url?`<a href="${esc(x.product_url)}" target="_blank" rel="noopener noreferrer">فتح العرض</a>`:'—'}</td></tr>`).join('')+'</tbody></table>';
    const latest=new Map(); rows.forEach(x=>{if(!latest.has(x.store_name))latest.set(x.store_name,x)});
    const offers=[...latest.values()].sort((a,b)=>Number(a.price_dzd)-Number(b.price_dzd));
    stores.innerHTML='<table><thead><tr><th>المتجر</th><th>أحدث سعر مسجل</th><th>تاريخ الرصد</th><th>الرابط</th></tr></thead><tbody>'+offers.map(x=>`<tr><td>${esc(x.store_name)}</td><td>${money(Number(x.price_dzd))}</td><td>${new Date(x.observed_at).toLocaleString('ar-DZ')}</td><td>${x.product_url?`<a href="${esc(x.product_url)}" target="_blank" rel="noopener noreferrer">فتح العرض</a>`:'—'}</td></tr>`).join('')+'</tbody></table>';
    status.className='status-banner ok';status.textContent=`تم تحميل ${rows.length} سجل سعر. قد تختلف الأسعار الفعلية عن الأسعار المسجلة.`;
  }catch(e){status.className='status-banner warn';status.textContent='تعذر تحميل سجل الأسعار. تحقق من إنشاء جدول phone_price_history وسياسات القراءة في Supabase.';console.warn(e)}
}
let sbClient=null;
function setAdminMessage(msg,isError=false){const el=$('adminLoginStatus');if(el){el.textContent=msg;el.style.color=isError?'#dc2626':''}}
async function initAdmin(){
  if(!window.supabase?.createClient){setAdminMessage('تعذر تحميل مكتبة تسجيل الدخول. تحقق من الاتصال بالإنترنت.',true);return}
  sbClient=window.supabase.createClient(SUPABASE_URL,SUPABASE_ANON_KEY);
  const {data:{session}}=await sbClient.auth.getSession(); if(session)await showAdminSession(session);
  sbClient.auth.onAuthStateChange((_event,session)=>{if(session)showAdminSession(session);else{$('adminSignedOut').hidden=false;$('adminSignedIn').hidden=true;}});
}
async function showAdminSession(session){
  try{
    const {data,error}=await sbClient.from('admin_users').select('user_id').eq('user_id',session.user.id).maybeSingle();
    if(error)throw error;
    if(!data){await sbClient.auth.signOut();setAdminMessage('هذا الحساب ليس ضمن قائمة المديرين. أضف UID الصحيح إلى admin_users.',true);return}
    $('adminSignedOut').hidden=true;$('adminSignedIn').hidden=false;$('adminIdentity').textContent=session.user.email||session.user.id;
  }catch(e){console.warn(e);setAdminMessage('تعذر التحقق من صلاحية المدير. تحقق من سياسات RLS لجدول admin_users.',true)}
}
async function submitOffer(e){
  e.preventDefault();const status=$('offerFormStatus');status.textContent='جارٍ الحفظ…';
  try{
    const {data:{session}}=await sbClient.auth.getSession();if(!session)throw new Error('سجّل الدخول أولًا.');
    const phone_name=offerPhone.value,store_name=$('offerStore').value.trim(),price_dzd=Number($('offerPrice').value),product_url=$('offerUrl').value.trim()||null,wilaya=$('offerWilaya').value.trim()||null;
    if(!phone_name||!store_name||!(price_dzd>0))throw new Error('أدخل الهاتف والمتجر وسعرًا صحيحًا.');
    const payload={phone_name,store_name,price_dzd,product_url,wilaya,stock_status:'unknown',source_type:'admin_entry',confidence:1,observed_at:new Date().toISOString()};
    const {error}=await sbClient.from('phone_offers').insert(payload);if(error)throw error;
    const {error:histError}=await sbClient.from('phone_price_history').insert({phone_name,store_name,price_dzd,product_url,observed_at:payload.observed_at});if(histError)throw histError;
    status.textContent='تم حفظ العرض وتسجيل السعر بنجاح.';$('offerForm').reset();await loadPrices();render();renderCatalog();await loadHistory();
  }catch(e){status.textContent='لم يتم الحفظ: '+(e.message||'خطأ غير معروف');console.warn(e)}
}
if(historyPhone){fillPhoneSelectors();$('loadHistory').addEventListener('click',loadHistory);historyPhone.addEventListener('change',loadHistory);$('adminLogin').addEventListener('submit',async e=>{e.preventDefault();setAdminMessage('جارٍ تسجيل الدخول…');try{const {error}=await sbClient.auth.signInWithPassword({email:$('adminEmail').value.trim(),password:$('adminPassword').value});if(error)throw error;setAdminMessage('تم تسجيل الدخول.');}catch(err){setAdminMessage('تعذر تسجيل الدخول: تحقق من البريد وكلمة المرور وتأكيد البريد في Supabase.',true);console.warn(err)}});$('adminLogout').addEventListener('click',()=>sbClient?.auth.signOut());$('offerForm').addEventListener('submit',submitOffer);initAdmin();loadHistory();}
