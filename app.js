const phones=[
["Samsung Galaxy A55","Samsung",72000,8,256,5000,50,82,["camera","daily","work"]],
["Xiaomi Redmi Note 13 Pro","Xiaomi",59000,8,256,5000,200,78,["camera","gaming","daily"]],
["POCO X6 Pro","POCO",68000,12,512,5000,64,95,["gaming","performance"]],
["iPhone 13","Apple",95000,4,128,3240,12,90,["camera","daily","work"]],
["Samsung Galaxy A35","Samsung",56000,8,256,5000,50,74,["daily","camera","work"]],
["Infinix GT 20 Pro","Infinix",62000,12,256,5000,108,91,["gaming","performance"]],
["Honor X8b","Honor",43000,8,256,4500,108,67,["daily","camera","work"]],
["Tecno Camon 30","Tecno",47000,8,256,5000,50,70,["camera","daily"]]
];
const names=["استعمال عادي","ألعاب","كاميرا","دراسة/عمل","بطارية"], tags=["daily","gaming","camera","work","battery"]; let usage=0;
const money=n=>n.toLocaleString("fr-FR")+" دج";
document.getElementById("uses").innerHTML=names.map((x,i)=>`<button class="chip ${i==0?"active":""}" onclick="usage=${i};document.querySelectorAll('.chip').forEach((b,j)=>b.classList.toggle('active',j==${i}));render()">${x}</button>`).join("");
document.getElementById("budget").oninput=render;
function score(p){let b=+budget.value,s=p[2]<=b?30:18;s+=p[8].includes(tags[usage])?30:10;s+=p[7]*.15;s+=p[5]/5000*12;s+=p[3]/12*8;s+=p[4]/512*5;if(usage==2)s+=p[6]/200*15;return Math.min(99,Math.round(s))}
function render(){let b=+budget.value;document.getElementById("bt").textContent=money(b);let a=phones.filter(p=>p[2]<=b*1.12).sort((x,y)=>score(y)-score(x)).slice(0,5);document.getElementById("results").innerHTML=a.map(p=>`<article class="card"><h3>${p[0]}</h3><div>${p[1]}</div><p class="price">${money(p[2])}</p><div class="stats"><div class="stat">RAM: <b>${p[3]} GB</b></div><div class="stat">تخزين: <b>${p[4]} GB</b></div><div class="stat">بطارية: <b>${p[5]} mAh</b></div><div class="stat">كاميرا: <b>${p[6]} MP</b></div><div class="stat">أداء: <b>${p[7]}/100</b></div><div class="stat">التوافق: <b>${score(p)}%</b></div></div></article>`).join("")||"<p>لا يوجد هاتف مناسب لهذه الميزانية.</p>"}render();