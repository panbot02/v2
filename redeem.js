// 萌萌哒 AI · credentials never leave memory except in requests to the configured service.
const $=id=>document.getElementById(id), stage=$('stage');
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const brandText=v=>String(v??'').replace(/easysub|脚萌萌哒/ig,'萌萌哒 AI');
const friendly=v=>brandText(typeof v==='string'?v:'这一步暂时没有完成，请稍后再试。');
const PLAN={chatgptplusplan:'ChatGPT Plus',chatgptprolite:'ChatGPT Pro 100',chatgptproliteplan:'ChatGPT Pro 100',chatgptpro:'ChatGPT Pro 200',chatgptproplan:'ChatGPT Pro 200',chatgptpromax:'ChatGPT Pro 500',chatgptgoplan:'ChatGPT Go',chatgpt2pro20x:'ChatGPT Pro 200',claudepro:'Claude Pro',claudemax5x:'Claude Max 5x',claudemax20x:'Claude Max 20x',grok_plus:'Plus',grok_premium:'Premium',grok_super:'Super',grok_ultra:'Ultra',PRODUCT_TIER_SUPER_GROK_LITE:'SuperGrok Lite',PRODUCT_TIER_GROK_PRO:'SuperGrok',PRODUCT_TIER_SUPER_GROK_PLUS:'SuperGrok Plus',PRODUCT_TIER_SUPER_GROK_PRO:'SuperGrok Heavy',free:'免费版',Free:'免费版',plus:'Plus',pro:'Pro'};
const plan=v=>PLAN[v]||brandText(v||'暂未提供');
const PROVIDER={openai:'ChatGPT',claude:'Claude',grok:'Grok'};
const MAX=5*1024*1024, KEY='jmm.redeem.flow.v1';
let W=(function(){var q=(location.search+'&'+location.hash.slice(1)).replace(/^\?/,'').split('&');for(var i=0;i<q.length;i++){var kv=q[i].split('=');if(kv[0].toLowerCase()==='sales'&&kv[1]){try{var v=decodeURIComponent(kv[1]).trim();if(v)return v.slice(0,40)}catch(e){}}}return 'panplus5'})();
document.querySelectorAll('.wxid').forEach(e=>e.textContent=W);
const hasSales=/(?:^|[?&#])sales=/i.test(location.search+'&'+location.hash.slice(1));
function salesURL(path){let u=new URL(path,location.href);if(hasSales)u.searchParams.set('Sales',W);if(!path.includes('#'))u.hash='';return u.pathname+u.search+u.hash}
function serviceHomeURL(){const u=new URL('https://panbot02.github.io/v2/');u.searchParams.set('Sales',W);return u.href}
document.querySelectorAll('.sales-link').forEach(a=>a.href=salesURL(a.getAttribute('href')));
$('redeem-nav').href=salesURL('redeem.html');
function safeGet(key){try{return sessionStorage.getItem(key)}catch{return null}}
function safeSet(key,val){try{sessionStorage.setItem(key,val);return true}catch{return false}}
let theme='';try{theme=localStorage.t||''}catch{}
document.documentElement.dataset.t=theme||(matchMedia('(prefers-color-scheme:dark)').matches?'dark':'');
$('tg').onclick=()=>{const h=document.documentElement;h.dataset.t=h.dataset.t==='dark'?'':'dark';try{localStorage.t=h.dataset.t}catch{}};
async function copy(text,status){try{await navigator.clipboard.writeText(text);if(status)status.textContent='已复制，去粘贴就好。'}catch{const t=document.createElement('textarea');t.value=text;t.style.position='fixed';t.style.opacity='0';document.body.append(t);t.select();let ok=false;try{ok=document.execCommand('copy')}catch{}t.remove();if(status)status.textContent=ok?'已复制，去粘贴就好。':'没能自动复制，请长按选中文字复制。'}}
$('cp').onclick=()=>copy(W,$('copy-status'));
$('copy-link').onclick=()=>copy(location.href,$('alert')).then(()=>{$('alert').hidden=false});
let preview=new URLSearchParams(location.hash.slice(1)).get('preview')||new URLSearchParams(location.search).get('preview');
if(!['step1','step2','confirm','success','query','processing','failed'].includes(preview))preview=null;
if(window.JMM_DESIGN_PREVIEW_ONLY===true&&!preview)preview='step1';
const DEMO={provider:'openai',product_name:'ChatGPT Plus',plan:'chatgptplusplan',activation_token:'preview-only',expires_in:900,expires_at:new Date(Date.now()+900000).toISOString()};
const KEY_ERROR='CKD 有异常';
function readCdk(value){const raw=String(value??'').trim();if(!raw)throw new Error('请输入有效的兑换码。');const m=raw.match(/^(momoda|pan)-/i);if(!m)return {key:raw,pan:false,input:raw};const key=raw.slice(m[0].length).trim();if(!key)throw new Error('请输入有效的兑换码。');return {key,pan:m[1].toLowerCase()==='pan',input:raw}}
function normalizeCdk(value){return readCdk(value).key}
function canonicalCdk(value){const key=String(value??'').trim();if(!key)throw new Error('请输入有效的兑换码。');return key}
function publicCdkInput(saved){const typed=saved?.cdkInput;if(!typed||!saved?.cdk)return '';try{return normalizeCdk(typed)===saved.cdk?typed:''}catch{return ''}}
function clearStaleKeyView(){cancelLookup();cdkValid=false;token='';account=null;syncHead();const q=$('query-results');if(q)q.innerHTML='';const look=$('lookup-result');if(look)look.remove();if($('network-note'))$('network-note').hidden=true;}
function rejectKey(){clearStaleKeyView();err(new Error(KEY_ERROR));}
function usedRecord(entry){if(!entry||entry.pan)return false;if(entry.order)return true;const status=String(entry.status||'').toLowerCase();if(status==='activated')return true;return /已兑换/.test(entry.note||'')}
function concealUsedNonPan(report){let hidden=0;const keep=list=>list.filter(item=>{if(!usedRecord(item))return true;hidden++;return false});report.found=keep(report.found||[]);report.pending=keep(report.pending||[]);if(hidden){report.inputCount=Math.max(0,(report.inputCount||0)-hidden);report.concealed=true}return report}
let flow=null;try{const p=JSON.parse(safeGet(KEY));if(p&&typeof p.nonce==='string'&&/^[A-Za-z0-9_-]+$/.test(p.nonce)&&p.nonce.length>=22&&p.nonce.length<=86&&typeof p.cdk==='string'){const input=p.cdkInput||'';p.cdk=p.cdkNormalized===true?canonicalCdk(p.cdk):normalizeCdk(p.cdk);p.cdkInput=input;let pan=false;try{const again=readCdk(input);pan=again.pan&&again.key===p.cdk}catch{}p.panOrigin=pan;p.cdkNormalized=true;flow=p}}catch{}
let token='',account=null,mode='redeem',busy=false,pollId=0,cdkValid=false,zstdPromise=null;
const rateUntil=new Map();
if(preview){$('redeem-nav').href=salesURL('redeem.html#preview=step1');$('preview-note').hidden=false;flow={nonce:'preview',cdk:'DEMO-JMM-2026-PLUS',meta:DEMO};}
let sessionDraft='',cdkDraft=publicCdkInput(flow),redeemLocked=false;
function persist(){if(preview)return; // Never persist a Session, Cookie, raw input, refreshed_token or account.
 const f=flow;if(f)safeSet(KEY,JSON.stringify({nonce:f.nonce,cdk:f.cdk,cdkInput:f.cdkInput,cdkNormalized:true,panOrigin:f.panOrigin===true,meta:f.meta,queryToken:f.queryToken,orderNo:f.orderNo,uncertain:f.uncertain,terminal:f.terminal,orderMeta:f.orderMeta}));}
if(flow&&!preview)persist();
function newNonce(){const b=crypto.getRandomValues(new Uint8Array(24));return bytes64(b).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')}
function bytes64(b){let out='';for(let i=0;i<b.length;i+=0x8000)out+=String.fromCharCode(...b.subarray(i,i+0x8000));return btoa(out)}
function payload(r){return r.data&&typeof r.data==='object'?r.data:r}
function apiBase(){const base=typeof window.EASYSUB_API_BASE==='string'?window.EASYSUB_API_BASE:'https://api.easysub.site';const b=base.replace(/\/+$/,'');return b.endsWith('/api/v1/sub')?b:b+'/api/v1/sub'}
class ApiError extends Error{constructor(m,kind,wait=0){super(m);this.kind=kind;this.wait=wait}}
async function api(path,data){
 if(preview)throw new ApiError('当前为设计预览，不会连接真实充值接口。','preview');
 const till=rateUntil.get(path)||0;if(Date.now()<till)throw new ApiError('慢一点点，接口需要休息。请在 '+Math.ceil((till-Date.now())/1000)+' 秒后重试。','rate',till-Date.now());
 const ctl=new AbortController(),timer=setTimeout(()=>ctl.abort(),35000);let res;
 try{res=await fetch(apiBase()+'/'+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data),credentials:'omit',cache:'no-store',referrerPolicy:'no-referrer',signal:ctl.signal});}
 catch(e){if(e instanceof TypeError)throw new ApiError('浏览器暂时未能连接充值接口。请查看下方的连接说明，再重试。','network');throw new ApiError('连接等待有点久。若已提交充值，请先查询订单，避免重复提交。','timeout')}
 finally{clearTimeout(timer)}
 if(res.status===429){const retry=res.headers.get('Retry-After');const sec=/^\d+(\.\d+)?$/.test(retry||'')?Number(retry):Math.max(1,(Date.parse(retry)-Date.now())/1000||30);const wait=Math.ceil(sec*1000);rateUntil.set(path,Date.now()+wait);throw new ApiError('请求有点密，等 '+Math.ceil(wait/1000)+' 秒再试就好。','rate',wait)}
 if(res.status===503)throw new ApiError('安全校验暂不可用，请稍后再试。兑换码请先保留好。','unavailable');
 let r;try{r=await res.json()}catch{throw new ApiError('接口没有返回可读取的结果，请稍后再试。','response')}
 if(!res.ok||Number(r.code)!==200){
  const data=r.data&&typeof r.data==='object'?r.data:{};
  const raw=typeof r.error==='string'?r.error:(typeof data.error==='string'?data.error:'');
  const fail=new ApiError(friendly(raw||'这一步暂时没有完成，请稍后再试。'),'business');
  fail.code=Number(r.code);
  fail.rawError=raw;
  const status=r.cdk_status??data.cdk_status;
  fail.cdkStatus=typeof status==='string'?status:'';
  const coded=r.error_code??r.biz_code??data.error_code??data.biz_code;
  fail.errorCode=typeof coded==='string'?coded:'';
  throw fail;
 }
 return payload(r);
}
function err(e){$('alert').textContent=friendly(e.message||e);$('alert').hidden=false;if(e.kind==='network')$('network-note').hidden=false;}
function clearError(){$('alert').hidden=true;}
function step(n){const querying=mode==='query';const bar=document.querySelector('.stepper');const cap=$('step-caption');if(bar)bar.hidden=querying;if(cap){cap.hidden=querying;cap.textContent=querying?'':({1:'验证兑换码',2:'输入登录信息',3:'确认账号',4:'充值结果'}[n]||'')}document.querySelectorAll('.stepper li').forEach(li=>{const k=Number(li.dataset.step);li.classList.toggle('on',k===n);li.classList.toggle('done',k<n);const num=li.querySelector('.num');if(num)num.textContent=k<n?'✓':String(k);li.setAttribute('aria-current',k===n?'step':'false')});}
function render(html,n){stage.dataset.step=String(n);stage.innerHTML='<div class="fade">'+html+'</div>';step(n);syncHead();if(preview){const field=$('cdk');if(field){field.readOnly=true;field.value='DEMO-JMM-2026-PLUS'}const session=$('session');if(session){session.readOnly=true;session.value='演示用虚构登录信息 · 无需粘贴真实 Session';}const drop=$('drop');if(drop)drop.hidden=true;const query=$('query-cdks');if(query){query.readOnly=true;query.value='DEMO-JMM-2026-PLUS'}}}
// Keep the current form/confirmation DOM intact until a successful response.
function inlineLoading(button,text){
 const controls=[...stage.querySelectorAll('button,input,textarea,select'),$('query-tab'),$('redeem-tab'),$('query-nav')].filter(Boolean);
 const states=controls.map(el=>[el,el.disabled]);for(const [el] of states)el.disabled=true;
 const html=button?.innerHTML;stage.setAttribute('aria-busy','true');
 if(button){button.setAttribute('aria-busy','true');button.innerHTML='<span class="button-spinner" aria-hidden="true"></span><span data-loading-label>'+esc(text)+'</span>'}
 let released=false;return ()=>{if(released)return;released=true;stage.removeAttribute('aria-busy');for(const [el,disabled] of states)if(el.isConnected)el.disabled=disabled;if(button?.isConnected){button.innerHTML=html;button.removeAttribute('aria-busy')}};
}
function setLoadingLabel(button,text){const label=button?.querySelector('[data-loading-label]');if(label)label.textContent=text}
function setMode(m){pollId++;mode=m;clearError();$('query-tab')?.classList.toggle('on',m==='query');$('redeem-tab')?.classList.toggle('on',m==='redeem');if(m==='query')showQuery();else showCode();}
function tab(m){if(busy)return;captureSession();token='';account=null;setMode(m)}
$('query-tab').onclick=()=>{tab('query');document.querySelector('.workspace')?.scrollIntoView()};$('net-query').onclick=()=>tab('query');$('redeem-tab')?.addEventListener('click',()=>tab('redeem'));
function heading(tag,title,desc){return '<div class="section-tag">'+esc(tag)+'</div><h2>'+title+'</h2><p class="lead">'+desc+'</p>'}
function syncHead(){
 const intro=$('sheet-intro'),mark=$('sheet-mark');if(!intro||!mark)return;
 if(flow?.meta&&cdkValid){
  const p=flow.meta.provider;
  if(p==='claude'){mark.hidden=true}else{mark.hidden=false;mark.src=p==='grok'?'img/switch-grok.webp':'img/switch-chatgpt.webp';mark.alt=''}
  intro.textContent=title()+'。核对账号后才会充值。';
 }else{mark.hidden=true;intro.textContent='验证兑换码，核对账号后再充值。适用于 ChatGPT、Claude 与 Grok。'}
}
function riskNotice(){return '<p class="risk-note" id="session-warning">登录凭据等同账号凭证，请勿发给任何人。继续后会经 HTTPS 送到充值服务商 api.easysub.site，只用于这次核对与充值。请只在信任该服务商时继续。</p>'}
function groups(inner){return '<ol class="sheet-groups">'+inner+'</ol>'}
function codeGroup(cdkValue,resume){return '<li class="sheet-group"><span class="gnum">1</span><div><h2>输入兑换码</h2>'+(resume?'<div class="network-note"><b>上次的订单还在这里。</b><p>若上次已提交，请先恢复查询，确认结果后再操作。</p><button class="text-btn" type="button" id="resume">恢复订单查询 ›</button></div>':'')+'<form id="code-form" class="form"><label for="cdk">兑换码（CDK）</label><input id="cdk" class="field cdk-field" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="粘贴你的兑换码" maxlength="500" value="'+esc(cdkValue)+'" required><div class="actions"><button class="btn" type="submit">验证兑换码 <span>→</span></button><a class="text-btn step-back" id="step-back" href="'+esc(salesURL('index.html'))+'">上一步</a><button type="button" class="text-btn" id="go-query">已兑换？查询订单 ›</button></div></form><p class="group-note">验证通过后，才能填写并提交登录信息。</p></div></li>'}
function lockedSessionGroup(){return '<li class="sheet-group is-locked"><span class="gnum">2</span><div><h2>输入登录信息</h2><p class="group-note">兑换码验证通过后，这里会打开对应的 Session 或 Cookie 输入。</p><textarea class="lock-field" disabled placeholder="验证兑换码后填写" aria-disabled="true"></textarea>'+riskNotice()+'</div></li>'}
function lockedActionGroup(){return '<li class="sheet-group is-locked"><span class="gnum">3</span><div><h2>确认并充值</h2><p class="group-note">读取账号后，才会显示当前会员和即将充值的套餐。需要勾选确认后才会提交。</p><button class="btn" type="button" disabled>确认账号并充值</button></div></li>'}
function providerEntry(provider){if(provider==='claude')return {url:'https://claude.ai/',hint:'登录 claude.ai 后，从 Cookie 复制 sessionKey，粘贴到下方。'};if(provider==='grok')return {url:'https://grok.com/',hint:'登录 grok.com 后，从 Cookie 复制 sso，粘贴到下方。'};return {url:'https://chatgpt.com/api/auth/session',hint:'登录后打开这个页面，复制完整 JSON，粘贴到下方。'}}
function sessionTools(provider){const e=providerEntry(provider),h=HELP[provider];return '<p class="group-note">'+esc(e.hint)+'</p><div class="link-row"><code id="session-url">'+esc(e.url)+'</code><button type="button" class="text-btn" id="copy-session-url">点击复制</button><a class="btn" id="open-session-url" href="'+esc(e.url)+'" target="_blank" rel="noopener noreferrer">打开网址</a><small id="url-copy-status" role="status"></small></div><form id="session-form"><label for="session">'+esc(h.label)+'</label><textarea id="session" aria-describedby="session-warning" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="'+esc(h.placeholder)+'" required></textarea>'+riskNotice()+'<div class="actions"><button class="btn" type="submit">读取并核对账号 →</button><button type="button" class="text-btn step-back" id="step-back">上一步</button><label class="text-btn file-btn" for="file">导入文件</label></div><div class="upload" id="drop"><input type="file" id="file" accept=".txt,.json,.log,.text,application/json,text/plain" hidden><span id="file-name"></span></div><p class="caption">文件只在本机读取，不写入浏览器存储。</p>'+expires()+'<details class="help-detail" id="session-help"><summary>在哪里获取 '+esc(h.label)+'？</summary><ol>'+h.html+'</ol></details></form>'}
function title(meta=flow?.meta){if(!meta)return '订阅会员';let s=brandText(meta.product_name||plan(meta.plan));if(meta.product_type==='codex_credits')s+=' · '+(Number(meta.credit_quantity)||0).toLocaleString('zh-CN')+' Credits';return s}
function banner(){let m=flow.meta,p=m.provider;let art=p==='claude'?'<span class="mark" aria-hidden="true">✳</span>':'<img src="img/'+(p==='grok'?'switch-grok.webp':'switch-chatgpt.webp')+'" alt="">';return '<div class="product-banner">'+art+'<div><b>'+esc(title())+'</b><small>'+esc(PROVIDER[p]||'订阅服务')+' · 兑换码已验证</small></div><span class="verified">✓ 已验证</span></div>'}
function captureSession(){const field=$('session');if(field)sessionDraft=field.value}
function showCode(){cancelLookup();cdkValid=false;token='';account=null;const resume=flow?.uncertain||flow?.queryToken;const cdkValue=cdkDraft||publicCdkInput(flow);render(groups(codeGroup(cdkValue,resume)+lockedSessionGroup()+lockedActionGroup()),1);
 const cdkField=$('cdk');if(cdkField)cdkField.addEventListener('input',()=>{cdkDraft=cdkField.value;clearError();cdkValid=false;syncHead();const look=$('lookup-result');if(look)look.remove()});
 $('go-query').onclick=()=>tab('query');if($('resume'))$('resume').onclick=()=>restore();
 $('code-form').onsubmit=async e=>{e.preventDefault();if(busy)return;clearError();const input=$('cdk').value;cdkDraft=input;const trimmed=input.trim();let parsed;try{parsed=readCdk(trimmed)}catch(error){clearStaleKeyView();err(error);return}
 const c=parsed.key;
 if(flow&&flow.cdk!==c){if(flow.uncertain){err(new Error('上次提交的结果还未确认，请先恢复订单查询，再开始新的兑换。'));return}flow=null;sessionDraft='';}
 if(preview){flow={nonce:'preview',cdk:c,cdkInput:trimmed,panOrigin:parsed.pan,meta:DEMO};cdkValid=true;showSession();return}
 if(!flow)flow={nonce:newNonce(),cdk:c,cdkInput:trimmed,cdkNormalized:true,panOrigin:parsed.pan};else{flow.cdk=c;flow.cdkInput=trimmed;flow.panOrigin=parsed.pan}persist();
 if(flow.uncertain||flow.queryToken){await restore();return}
 busy=true;cancelLookup();const release=inlineLoading($('code-form').querySelector('[type=submit]'),'正在验证…');try{await verify(false);cdkValid=true;showSession()}catch(e){if(isConsumedVerifyError(e)&&flow?.panOrigin){setLoadingLabel($('code-form')?.querySelector('[type=submit]'),'正在查询订单…');await lookupConsumed()}else if(isConsumedVerifyError(e))rejectKey();else err(e)}finally{release();busy=false}
 };
}
async function verify(renew){const p={cdk:flow.cdk,request_nonce:flow.nonce};if(renew)p.renew=true;const r=await api('verifyCdk',p);if(!r.activation_token||!['openai','claude','grok'].includes(r.provider))throw new ApiError('接口返回的兑换凭据不完整，请稍后再验证一次。','response');flow.meta={activation_token:r.activation_token,expires_in:r.expires_in,expires_at:r.expires_at,provider:r.provider,product_name:r.product_name,plan:r.plan,product_type:r.product_type,credit_quantity:r.credit_quantity,resumed:r.resumed};persist();}
const HELP={openai:{label:'Session JSON',placeholder:'粘贴 chatgpt.com/api/auth/session 返回的完整 JSON',html:'<li>打开 <a href="https://chatgpt.com/" target="_blank" rel="noopener noreferrer">chatgpt.com ↗</a>，登录这次要充值的账号。</li><li>在同一浏览器打开 <a href="https://chatgpt.com/api/auth/session" target="_blank" rel="noopener noreferrer">chatgpt.com/api/auth/session ↗</a>。</li><li>复制页面中的完整 JSON，粘贴到下方；也可以导入本地文件。</li>'},claude:{label:'sessionKey',placeholder:'粘贴 Claude 的 sessionKey Cookie 值',html:'<li>打开 <a href="https://claude.ai/" target="_blank" rel="noopener noreferrer">claude.ai ↗</a>，登录要充值的账号。</li><li>打开浏览器开发者工具 → Application / 应用 → Cookies。</li><li>找到 sessionKey，复制它的值到下方。不要提供密码。</li>'},grok:{label:'sso Cookie',placeholder:'粘贴 sso 值，或 sso=TOKEN / Cookie 请求头 / 含 sso 的 Cookie JSON',html:'<li>打开 <a href="https://grok.com/" target="_blank" rel="noopener noreferrer">grok.com ↗</a>，登录要充值的账号。</li><li>开发者工具 → Application / 应用 → Cookies → grok.com，复制 sso。</li><li>也支持 sso=TOKEN、Cookie 请求头、{"sso":"TOKEN"} 或 Cookie 数组（域名为 grok.com / .grok.com）。仅 auth_token 或 sso-rw 不可用。</li>'}};
function expires(){const v=flow?.meta?.expires_at;if(!v)return '';return '<p class="caption">本次验证有效至 '+esc(shanghai(v))+'。继续时会按需更新有效期，不会静默提交充值。</p>'}
function showSession(){cancelLookup();cdkValid=true;const p=flow.meta.provider;render(groups('<li class="sheet-group is-done"><span class="gnum">1</span><div><h2>输入兑换码</h2><p class="group-note">已验证 '+esc(title())+'。要换兑换码，先返回上一步。</p></div></li><li class="sheet-group"><span class="gnum">2</span><div><h2>输入登录信息</h2>'+sessionTools(p)+'</div></li>'+lockedActionGroup()),2);
 const field=$('session');if(field&&!preview)field.value=sessionDraft;if(field)field.addEventListener('input',()=>{sessionDraft=field.value});
 // Position only an actual step transition if prior scrolling hid its input.
 requestAnimationFrame(()=>{const box=$('session');if(!box)return;const r=box.getBoundingClientRect(),nav=document.querySelector('header').getBoundingClientRect();if(r.top<nav.bottom||r.top>innerHeight-80)stage.scrollIntoView({block:'start',behavior:'instant'})});
 $('step-back').onclick=()=>{if(busy||redeemLocked)return;captureSession();showCode()};$('copy-session-url').onclick=()=>copy($('session-url').textContent,$('url-copy-status'));$('file').onchange=e=>importFile(e.target.files[0]);const drop=$('drop');drop.ondragover=e=>{e.preventDefault();drop.classList.add('drag')};drop.ondragleave=()=>drop.classList.remove('drag');drop.ondrop=e=>{e.preventDefault();drop.classList.remove('drag');importFile(e.dataTransfer.files[0])};
 $('session-form').onsubmit=async e=>{e.preventDefault();if(busy)return;clearError();let raw=$('session').value;if(!raw.trim())return;sessionDraft=raw;
 if(preview){token='preview-token-not-real';account=demoAccount();showConfirm();return}
 busy=true;const release=inlineLoading($('session-form').querySelector('[type=submit]'),'正在核对账号…');let normalized='';try{normalized=normalize(raw,flow.meta.provider);token=await pack(normalized);normalized='';await verify(true);const r=await api('precheckAccount',{token,cdk:flow.cdk,activation_token:flow.meta.activation_token});if(r.refreshed_token)token=r.refreshed_token;account=r;if($('session'))$('session').value='';sessionDraft=raw;showConfirm()}
 catch(e){token='';normalized='';raw='';err(e)}finally{release();busy=false}
 };
}
async function importFile(f){if(preview||busy)return;if(!f)return;clearError();if(f.size>MAX){err(new Error('文件有点大，请使用不超过 5 MB 的文本文件。'));return}try{const v=await f.text();if(new TextEncoder().encode(v).length>MAX)throw new Error('文件有点大，请控制在 5 MB 内。');$('session').value=v;sessionDraft=v;$('file-name').textContent='已在本机读取：'+f.name+' · 尚未提交';}catch(e){err(e)}}
function normalize(raw,p){if(new TextEncoder().encode(raw).length>MAX)throw new Error('登录信息过长，请控制在 5 MB 内。');const s=raw.trim();if(p==='openai'){let obj;try{obj=JSON.parse(s)}catch{throw new Error('这里需要完整的 Session JSON，请从 Session 页面重新复制。')}if(!obj||typeof obj!=='object'||Array.isArray(obj)||!obj.accessToken)throw new Error('没有找到有效的 Session 登录信息，请登录后重新复制完整 JSON。');return s}
 if(p==='claude'){const m=s.match(/(?:^|[;\s])sessionKey=([^;\s]+)/);return m?m[1]:s}
 let out='';if(s.startsWith('{')||s.startsWith('[')){let o;try{o=JSON.parse(s)}catch{throw new Error('Cookie JSON 没有读完整，请检查后再试。')}if(Array.isArray(o)){const c=o.find(c=>c&&c.name==='sso'&&(!c.domain||['grok.com','.grok.com'].includes(c.domain)));out=c?.value||''}else if(typeof o.sso==='string')out=o.sso;else if(Array.isArray(o.cookies)){const c=o.cookies.find(c=>c?.name==='sso'&&(!c.domain||['grok.com','.grok.com'].includes(c.domain)));out=c?.value||''}}
 else {const c=s.replace(/^Cookie:\s*/i,'').match(/(?:^|;\s*)sso=([^;\s]+)/);if(c)out=c[1];else if(!/[\s;=]/.test(s))out=s}
 if(!out||typeof out!=='string')throw new Error('没有找到 Grok 的 sso。请复制 sso Cookie；只有 auth_token 或 sso-rw 不行哦。');return out.trim();}
async function pack(raw){if(!zstdPromise)zstdPromise=import('./vendor/zstd/index.web.js').then(async m=>{await m.init();return m}).catch(e=>{zstdPromise=null;throw new Error('本机压缩组件未能加载，请刷新页面后再试。')});const z=await zstdPromise;const b=new TextEncoder().encode(raw);return 'zstd64:'+bytes64(z.compress(b,3))}
function demoAccount(){return {email:'momo@example.com',name:'萌萌',plan_type:'free',subscription_plan:'free',has_active_subscription:false,eligible:true}}
function eligible(){return account?.eligible===true&&(flow.meta.product_type!=='codex_credits'||account.credit_purchase_eligible===true)}
function currentPlan(){return plan(account.subscription_plan||account.plan_type||(account.has_active_subscription?'当前会员':'free'))}
function showConfirm(){const ok=eligible(),a=account;render(groups('<li class="sheet-group is-done"><span class="gnum">1</span><div><h2>输入兑换码</h2><p class="group-note">已验证 '+esc(title())+'。</p></div></li><li class="sheet-group is-done"><span class="gnum">2</span><div><h2>输入登录信息</h2><p class="group-note">登录信息已读取，只留在这次页面的内存里。</p></div></li><li class="sheet-group"><span class="gnum">3</span><div><h2>确认并充值</h2><div class="account"><span class="avatar">'+esc((a.name||a.account_name||a.email||'你').slice(0,1))+'</span><div><b>'+esc(a.email||a.account_name||a.name||'账号已读取')+'</b><small>'+esc(a.name||a.account_name||a.account_id||'请以账号标识为准')+'</small></div></div><div class="compare"><div><small>当前会员</small><b>'+esc(currentPlan())+'</b><p>'+esc(a.has_active_subscription?'有效订阅':'暂无有效订阅')+(a.billing_period?' · '+esc(a.billing_period):'')+'</p>'+['expires_at','renews_at','cancels_at'].filter(k=>a[k]).map(k=>'<p>'+({expires_at:'到期',renews_at:'续费',cancels_at:'取消'}[k])+'：'+esc(shanghai(a[k]))+'</p>').join('')+'</div><span>→</span><div class="upcoming"><small>即将充值</small><b>'+esc(title())+'</b><p>'+esc(PROVIDER[flow.meta.provider])+' · 按兑换码对应商品充值</p></div></div>'+(ok?'<label class="checkbox"><input type="checkbox" id="consent"><span>我已核对上述账号、当前会员与即将充值的套餐，确认充值到这个账号。</span></label>':'<div class="alert" style="margin-top:20px">这个账号暂不符合本次兑换条件，尚未提交充值。'+(flow.meta.product_type==='codex_credits'?' Credits 商品需要符合条件的个人付费订阅，且账号支持购买 Credits。':' 请换一个符合条件的账号，或联系萌萌哒 AI。')+'</div>')+'<div class="actions">'+(ok?'<button class="btn" id="confirm" disabled>确认账号并充值 →</button>':'')+'<button type="button" class="text-btn step-back" id="step-back">上一步</button></div><p class="caption">提交后请耐心等候，不要重复充值。暂时离开也能用兑换码查询进度。</p></div></li>'),3);
 $('step-back').onclick=()=>{if(busy||redeemLocked)return;token='';account=null;showSession()};if(ok){$('consent').onchange=()=>{$('confirm').disabled=!$('consent').checked||busy||redeemLocked};$('confirm').onclick=submit;}
}
async function submit(){if(busy||redeemLocked||!eligible()||!$('consent')?.checked||!token)return;if(flow?.queryToken){err(new Error('这笔充值已经提交。请先查询订单，不要重复充值。'));return}clearError();if(preview){token='';sessionDraft='';const o=demoOrder();flow.orderMeta=DEMO;showResult(o);return}
 redeemLocked=true;busy=true;const release=inlineLoading($('confirm'),'正在提交充值…');try{
 if(flow.uncertain){const rows=await query(flow.cdk,true);if(rows.length){token='';sessionDraft='';showResults(rows);return}flow.uncertain=false;persist()}
 await verify(true);flow.uncertain=true;persist();const r=await api('redeem',{token,cdk:flow.cdk,activation_token:flow.meta.activation_token});token='';account=null;sessionDraft='';
 flow.queryToken=r.order_query_token;flow.orderNo=r.order_no;flow.orderMeta={provider:r.provider||flow.meta.provider,product_name:r.product_name||flow.meta.product_name,plan:r.plan||flow.meta.plan,product_type:r.product_type||flow.meta.product_type,credit_quantity:r.credit_quantity||flow.meta.credit_quantity};persist();
 if(!flow.queryToken){showProcessing({status:'processing',order_no:flow.orderNo},true);err(new Error('充值已提交，但未收到进度凭据。请通过兑换码查询结果，不要再次充值。'));return}
 release();await poll();
 }catch(e){if(flow?.uncertain){token='';account=null;sessionDraft='';showProcessing({status:'processing',order_no:flow.orderNo},true)}else redeemLocked=false;err(e)}finally{release();busy=false}
}
function demoOrder(){return {status:'success',account:'momo@example.com',product_name:'ChatGPT Plus',plan:'chatgptplusplan',payment_card:'4242',finished_at:'2026-11-19T13:42:18Z',started_at:'2026-11-19T13:41:00Z',order_no:'JMM202611190001'}}
function showProcessing(o={},paused=false){let txt=o.payment_result_checking?'正在确认支付结果':o.retrying?'正在自动重试':'正在为你充值';render('<div class="loader" aria-hidden="true"></div>'+heading('STEP 04 · '+(paused?'稍后可以再查':'已经开始处理'),paused?'进度先记下，<span>稍后继续查。</span>':esc(txt),paused?'订单可能仍在处理，暂时未确认最终结果。现在可以离开页面，保留兑换码，稍后查询。':'任务已提交，这还不是最终成功。萌萌哒 AI 正在帮你查询最新进度。')+'<div class="progress-track"></div><div class="processing-meta"><span>订单号：'+esc(o.order_no||flow?.orderNo||'等待接口返回')+'</span><span>'+(o.attempt_current?'本次尝试 '+esc(o.attempt_current)+' / '+esc(o.attempt_max||'—'):'稍等一下，不用重复提交')+'</span></div>'+(o.error?'<p class="progress-caption">'+esc(friendly(o.error))+'</p>':'')+'<p class="progress-caption">'+(paused?'尚未收到最终结果，不代表充值失败。':'页面会自动更新，约每 2 秒查询一次。超过 3 分钟后可以稍后再查。')+'</p><div class="actions"><button id="later-query" class="btn secondary">用兑换码查询</button>'+(paused&&flow?.queryToken?'<button id="resume-poll" class="text-btn">继续查看进度 ›</button>':'')+'</div>',4);$('later-query').onclick=()=>{busy=false;tab('query')};if($('resume-poll'))$('resume-poll').onclick=()=>{if(!busy)poll()};}
function wait(ms){return new Promise(r=>setTimeout(r,ms))}
async function poll(deferInitial=false){const id=++pollId,start=Date.now();if(!deferInitial)showProcessing();while(id===pollId&&Date.now()-start<180000){try{const r=await api('redeemResult',{order_query_token:flow.queryToken});if(id!==pollId)return;const o=r.order||r;if(o.status==='success'||o.status==='failed'){flow.terminal=o.status;flow.uncertain=false;persist();showResult(o);return}if(o.status!=='processing')throw new Error('暂未获取到订单状态，请稍后查询。');showProcessing(o);const ms=o.retry_after?Math.max(2000,Number(o.retry_after)*1000):2000;await wait(Math.min(ms,180000-(Date.now()-start)))}catch(e){if(id!==pollId)return;if(e.kind==='rate'&&Date.now()-start+e.wait<180000){showProcessing({status:'processing',order_no:flow.orderNo,retrying:true});await wait(e.wait);continue}showProcessing({status:'processing',order_no:flow.orderNo},true);err(e);return}}if(id===pollId)showProcessing({status:'processing',order_no:flow?.orderNo},true)}
function shanghai(v){if(!v)return '待完成';let d;if(typeof v==='number')d=new Date(v<1e12?v*1000:v);else{let s=String(v).trim();if(/^\d{10}(?:\d{3})?$/.test(s))return shanghai(Number(s));if(/^\d{4}-\d\d-\d\d[ T]\d\d:\d\d/.test(s)&&!/(Z|[+-]\d\d:?\d\d)$/i.test(s))s=s.replace(' ','T')+'+08:00';d=new Date(s)}if(!Number.isFinite(d.getTime()))return '时间格式待确认';return new Intl.DateTimeFormat('zh-CN',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false}).format(d)+' 北京时间'}
function maskCard(v){if(!v)return '暂未提供';const s=String(v);const digits=s.replace(/\D/g,'');return digits.length>=4?'•••• '+digits.slice(-4):'已隐藏'}
function accountText(v){if(v&&typeof v==='object')return v.email||v.name||v.account_name||v.account_id||'暂未提供';return v||'暂未提供'}
function orderProduct(o){const m=o.order_no&&o.order_no===flow?.orderNo?flow.orderMeta||{}:{};const p=o.product_name||o.plan;let s=p?brandText(o.product_name||plan(o.plan)):(m.product_name||m.plan?title({...m,product_type:undefined}):'暂未提供');const qty=o.credit_quantity||m.credit_quantity;if((o.product_type||m.product_type)==='codex_credits'&&qty)s+=' · '+Number(qty).toLocaleString('zh-CN')+' Credits';return s}
function cell(k,v,full=false){return '<div class="result-cell'+(full?' full':'')+'"><small>'+esc(k)+'</small><b>'+esc(v)+'</b></div>'}
function servicePromoHTML(){return '<p class="service-promo">更多 AI 会员服务，欢迎访问：<a href="'+esc(serviceHomeURL())+'">萌萌哒 AI</a></p>'}
function resultHTML(o){const status={success:'充值成功',failed:'充值未完成',processing:'处理中'}[o.status]||'状态待确认';return '<div class="result-card"><h3>'+esc(o.order_no||'充值订单')+'<span class="result-status '+esc(o.status||'')+'">'+(preview?'演示 · ':'')+status+'</span></h3><div class="result-table">'+cell('账号',accountText(o.account||o.email))+cell('充值类型',orderProduct(o))+cell('卡号（支付卡尾号）',maskCard(o.payment_card))+cell('充值时间',o.finished_at?shanghai(o.finished_at):'待完成 · 北京时间')+cell('订单号',o.order_no||'暂未提供')+(o.started_at?cell('开始时间',shanghai(o.started_at)):'')+(o.error?cell(o.status==='processing'?'处理提示':'原因',friendly(o.error),true):'')+'</div>'+(o.status==='processing'?'<p class="caption">'+(o.payment_result_checking?'正在确认支付结果。':o.retrying?'正在自动重试。':'订单仍在处理中。')+'稍后可以再次查询，不要重复充值。</p>':'')+(o.status==='success'?servicePromoHTML():'')+'</div>'}
function orderInfo(o){const lines=[preview?'萌萌哒 AI · 设计预览（虚构订单，未真实充值）':'萌萌哒 AI · 订单信息','账号：'+accountText(o.account||o.email),'充值类型：'+orderProduct(o),'卡号：'+maskCard(o.payment_card),'充值时间：'+(o.finished_at?shanghai(o.finished_at):'待完成'),'订单号：'+(o.order_no||'暂未提供'),'状态：'+({success:'充值成功',failed:'充值未完成',processing:'处理中'}[o.status]||'待确认')];if(o.status==='success')lines.push('更多 AI 会员服务，欢迎访问：萌萌哒 AI '+serviceHomeURL());return lines.join('\n')}
function showResult(o){pollId++;token='';account=null;sessionDraft='';const success=o.status==='success';render('<div class="success-mark '+(success?'':'failure')+'">'+(success?'✓':'!')+'</div>'+heading('STEP 04 · '+(success?'好啦，充值完成':'这次未能完成'),preview?'演示结果，<span>不是真实充值。</span>':success?'新会员，<span>已经就位。</span>':'暂时没充上，<span>我们一起看一下。</span>',preview?'下面展示的是虚构订单，仅用于看看完成后的页面效果；没有真实账号被充值。':success?'感谢你的耐心等候。可以保存下方订单信息，之后查询也方便。':'请先查看订单原因。保留兑换码与订单号，联系萌萌哒 AI 确认后再操作。')+resultHTML(o)+'<div class="actions"><button class="btn" id="copy-order">复制订单信息</button><button class="text-btn" id="again">开始另一笔充值 ›</button></div><p class="toast" id="order-copy" role="status"></p>',4);$('copy-order').onclick=()=>copy(orderInfo(o),$('order-copy'));$('again').onclick=reset;}
function reset(){pollId++;cancelLookup();token='';account=null;sessionDraft='';cdkDraft='';redeemLocked=false;flow=null;if(!preview){try{sessionStorage.removeItem(KEY)}catch{}}setMode('redeem')}
function parseQueryInput(text){
 const lines=String(text??'').split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
 if(!lines.length)return null;
 if(lines.length>50)return {tooMany:true,items:[],invalid:[]};
 const items=[],invalid=[],seen=new Set();
 for(const line of lines){
  let parsed;try{parsed=readCdk(line)}catch{invalid.push(line);continue}
  if(seen.has(parsed.key))continue;seen.add(parsed.key);items.push({input:line,cdk:parsed.key,pan:parsed.pan});
 }
 return {items,invalid};
}
function queryKey(value){try{return normalizeCdk(value)}catch{return String(value??'').trim()}}
function withOrderDetails(row,item){
 const order=row&&row.order&&typeof row.order==='object'?{...row.order}:null;
 if(!order)return null;
 order.cdk=order.cdk||row.cdk||item.cdk;
 if(!order.product_name&&row.product_name)order.product_name=row.product_name;
 if(!order.plan&&row.plan)order.plan=row.plan;
 if(!order.provider&&row.provider)order.provider=row.provider;
 if(!order.product_type&&row.product_type)order.product_type=row.product_type;
 if(!order.credit_quantity&&row.credit_quantity)order.credit_quantity=row.credit_quantity;
 return order;
}
function classifyQuery(items,payload){
 const found=[],missing=[],failed=[],disabled=[],expired=[],pending=[],locked=[];
 const rows=Array.isArray(payload?.results)?payload.results:null;
 if(rows){
  const by=new Map();
  for(const row of rows){const key=queryKey(row?.cdk||'');if(key)by.set(key,row)}
  for(const item of items){
   const row=by.get(item.cdk);
   if(!row){pending.push(item);continue}
   const order=withOrderDetails(row,item);
   if(order){found.push({...item,order});continue}
   if(Number(row.code)===0){failed.push({...item,error:row.error||'这一条暂时没有查完。'});continue}
   const status=String(row.cdk_status||'').toLowerCase();
   if(status==='disabled')disabled.push(item);
   else if(status==='expired')expired.push(item);
   else if(status==='activating')locked.push(item);
   else if(status==='activated')pending.push({...item,note:'已标记为已兑换，但没有订单详情'});
   else missing.push({...item,status});
  }
 }else{
  const legacy=[].concat(payload?.orders||[],payload?.order?[payload.order]:[]).filter(x=>x&&typeof x==='object');
  const by=new Map();let unlabeled=false;
  for(const order of legacy){const key=queryKey(order.cdk||order.cdk_code||'');if(key)by.set(key,order);else unlabeled=true}
  if(unlabeled||legacy.some(order=>!queryKey(order.cdk||order.cdk_code||''))){
   for(const order of legacy)found.push({input:queryKey(order.cdk||''),cdk:queryKey(order.cdk||''),order});
   for(const item of items)pending.push(item);
  }else if(!legacy.length){for(const item of items)missing.push(item)}
  else for(const item of items){const order=by.get(item.cdk);if(order)found.push({...item,order});else missing.push(item)}
 }
 return {inputCount:items.length,found,missing,failed,disabled,expired,pending,locked,invalid:[]};
}
let lookupSeq=0;
function cancelLookup(){lookupSeq++}
function compactError(value){return String(value??'').trim().toLowerCase().replace(/\s+/g,'').replace(/[，,。．.！!？?：:]/g,'')}
const CONSUMED_MESSAGE='该cdk兑换已完成请查询订单';
const ACTIVATED_CODES=new Set(['activated','cdk_activated','consumed','cdk_consumed','redeemed']);
const OTHER_CDK_STATUS=new Set(['unused','activating','disabled','expired','replaced','destroyed','unknown']);
function isConsumedVerifyError(error){
 if(!error||error.kind!=='business'||Number(error.code)!==0)return false;
 const status=String(error.cdkStatus||'').trim().toLowerCase();
 if(OTHER_CDK_STATUS.has(status))return false;
 const coded=String(error.errorCode||'').trim().toLowerCase();
 if(status==='activated'||ACTIVATED_CODES.has(coded))return true;
 return compactError(error.rawError)===CONSUMED_MESSAGE;
}
function lookupProduct(order){
 const named=order.product_name||order.plan;
 if(!named)return '暂未提供';
 let s=brandText(order.product_name||plan(order.plan));
 if(order.product_type==='codex_credits'&&order.credit_quantity)s+=' · '+Number(order.credit_quantity).toLocaleString('zh-CN')+' Credits';
 return s;
}
function lookupTime(order){
 if(order.finished_at)return shanghai(order.finished_at);
 if(order.status==='processing')return '处理中，完成时间尚未返回';
 return '完成时间暂未提供';
}
function lookupStatus(order){return {success:'充值成功',failed:'充值未完成',processing:'处理中'}[order.status]||'状态待确认'}
function lookupNotes(order){
 const notes=[];
 if(!order.product_name&&!order.plan)notes.push('订单没有返回充值类型。');
 if(!order.finished_at)notes.push(order.status==='processing'?'订单还在处理，没有完成时间。':'订单没有返回完成时间。');
 if(accountText(order.account||order.email)==='暂未提供')notes.push('订单没有返回账号。');
 if(!order.status)notes.push('订单没有返回状态。');
 return notes;
}
function lookupCard(order){
 const status=lookupStatus(order);
 const cls={success:'success',failed:'failed',processing:'processing'}[order.status]||'';
 return '<div class="result-card"><h3>'+esc(order.order_no||'充值订单')+'<span class="result-status '+esc(cls)+'">'+status+'</span></h3><div class="result-table">'+
  '<div class="result-cell" id="lookup-product"><small>充值类型</small><b>'+esc(lookupProduct(order))+'</b></div>'+
  '<div class="result-cell" id="lookup-time"><small>充值时间</small><b>'+esc(lookupTime(order))+'</b></div>'+
  '<div class="result-cell" id="lookup-account"><small>账号</small><b>'+esc(accountText(order.account||order.email))+'</b></div>'+
  cell('状态',status)+
  cell('订单号',order.order_no||'暂未提供')+
  (order.payment_card?cell('卡号（支付卡尾号）',maskCard(order.payment_card)):'')+
  (order.started_at?cell('开始时间',shanghai(order.started_at)):'')+
  (order.error?cell(order.status==='processing'?'处理提示':'原因',friendly(order.error),true):'')+
  '</div>'+(order.status==='success'?servicePromoHTML():'')+'</div>';
}
function lookupView(report,failure){
 if(failure||!report)return {kind:'error',message:failure?.message||'订单查询没有返回结果。'};
 if(report.found.length){
  const order=report.found[0].order||{};
  if(order.status==='success')return {kind:'success',order};
  if(order.status==='processing')return {kind:'processing',order};
  if(order.status==='failed')return {kind:'failed',order};
  return {kind:'unknown',order,note:'订单状态不是已完成、处理中或失败。'};
 }
 if(report.failed.length)return {kind:'error',message:report.failed[0].error||'这一条暂时没有查完。'};
 if(report.disabled.length)return {kind:'blocked',note:'订单查询显示这个兑换码已禁用，没有成功充值记录。'};
 if(report.expired.length)return {kind:'blocked',note:'订单查询显示这个兑换码已过期，没有成功充值记录。'};
 if(report.locked.length)return {kind:'blocked',note:'订单查询显示这个兑换码已锁定或处理中，但没有返回订单。'};
 if(report.pending.length)return {kind:'empty',note:report.pending[0].note||'订单查询没有返回明确的订单详情。'};
 return {kind:'empty',note:'订单查询没有返回订单。这不代表兑换码未使用，也不能当成充值成功。'};
}
const LOOKUP_COPY={
 success:['STEP 01 · 已查到充值记录','这笔兑换，<span>已经完成。</span>','下面是订单查询返回的充值类型和完成时间，按北京时间显示。验证报错本身不能当成充值成功。'],
 processing:['STEP 01 · 订单还在处理','充值还没结束，<span>先别当成成功。</span>','订单查询显示仍在处理。充值类型和时间以这次查询为准。'],
 failed:['STEP 01 · 这笔没有完成','充值未完成，<span>请看订单原因。</span>','订单查询返回失败。验证报错不能单独当作完成。'],
 empty:['STEP 01 · 没有订单记录','没有查到充值记录，<span>不能当成成功。</span>','验证接口提示兑换已完成，但订单查询没有返回可展示的订单。'],
 error:['STEP 01 · 订单暂时没查到','这次没查成，<span>可以再试一次。</span>','验证接口提示兑换已完成。订单查询没有成功，所以还不能确认充了什么、什么时候完成。'],
 blocked:['STEP 01 · 不能当成充值成功','查询结果不是成功订单，<span>请再确认。</span>','下面是订单查询返回的状态。不能把验证报错当成充值成功。'],
 unknown:['STEP 01 · 状态待确认','订单状态还不能确认，<span>先别当成成功。</span>','订单查询返回了记录，但状态不是已完成、处理中或失败。']
};
function revealLookup(){
 requestAnimationFrame(()=>{
  const box=$('lookup-result');if(!box)return;
  const nav=document.querySelector('header')?.getBoundingClientRect().bottom||0;
  const focus=[$('lookup-product'),$('lookup-time'),$('lookup-account')].filter(Boolean);
  const watched=focus.length?focus:[box];
  const hidden=watched.some(el=>{const r=el.getBoundingClientRect();return r.top<nav+4||r.bottom>innerHeight-8});
  if(hidden)box.scrollIntoView({block:'start',behavior:'instant'});
 });
}
function showLookup(view){
 cdkValid=false;token='';account=null;clearError();
 const copy=LOOKUP_COPY[view.kind]||LOOKUP_COPY.unknown;
 const notes=[view.note,view.message?friendly(view.message):'',...(view.order?lookupNotes(view.order):[])].filter(Boolean);
 render('<div id="lookup-result">'+heading(copy[0],copy[1],copy[2])+(view.order?lookupCard(view.order):'<div class="empty" id="lookup-empty">没有可展示的充值类型或完成时间。</div>')+(notes.length?'<p class="caption">'+notes.map(esc).join('<br>')+'</p>':'')+'<div class="actions"><button class="btn" type="button" id="lookup-retry">重试查询</button><button class="text-btn" type="button" id="lookup-manual">手动查询订单 ›</button><button class="text-btn" type="button" id="lookup-another">换一个兑换码 ›</button></div></div>',1);
 revealLookup();
 $('lookup-retry').onclick=async()=>{if(busy)return;busy=true;clearError();const release=inlineLoading($('lookup-retry'),'正在查询…');try{await lookupConsumed()}finally{release();busy=false}};
 $('lookup-manual').onclick=()=>{if(busy)return;tab('query')};
 $('lookup-another').onclick=()=>{if(busy)return;showCode()};
}
async function lookupConsumed(){
 if(!flow?.panOrigin){rejectKey();return}
 const id=++lookupSeq;
 const cdk=flow?.cdk;
 if(!cdk){if(id===lookupSeq)showLookup({kind:'error',message:'没有可查询的兑换码。'});return}
 let report=null,failure=null;
 try{report=classifyQuery([{input:flow.cdkInput||cdk,cdk}],await api('queryOrder',{cdks:[cdk]}))}
 catch(error){failure=error}
 if(id!==lookupSeq)return;
 showLookup(lookupView(report,failure));
}
async function query(cdk,canonical=false){
 const values=Array.isArray(cdk)?cdk:[cdk];
 const cdks=[...new Set(values.map(canonical?canonicalCdk:normalizeCdk))];
 const report=classifyQuery(cdks.map(c=>({input:c,cdk:c})),await api('queryOrder',{cdks}));
 return report.found.map(x=>x.order).filter(o=>o&&['processing','success','failed'].includes(o.status));
}
function demoQueryReport(){
 const order=demoOrder();
 const missing=Array.from({length:9},(_,i)=>({cdk:'DEMO-NO-ORDER-'+(i+1),input:'DEMO-NO-ORDER-'+(i+1),status:'unused'}));
 return {inputCount:10,found:[{cdk:'DEMO-FOUND-ORDER',input:'DEMO-FOUND-ORDER',order}],missing,failed:[],disabled:[],expired:[],pending:[],locked:[],invalid:[]};
}
function reusableLine(item){if(!item||typeof item!=='object'||!item.input)return '';try{return normalizeCdk(item.input)===item.cdk?item.input:''}catch{return ''}}
function codeLines(list){return list.map(reusableLine).filter(Boolean).join('\n')}
function queryStat(n,label){return '<span><b>'+n+'</b>'+esc(label)+'</span>'}
function codeBucket(title,note,list,copyId,copyLabel){
 if(!list.length)return '';
 return '<section class="code-bucket"><h3>'+esc(title)+' <b>'+list.length+'</b></h3><p class="caption">'+note+'</p><ul class="code-list">'+list.map(x=>'<li>'+esc(reusableLine(x))+(x.note?' <small>'+esc(x.note)+'</small>':'')+(x.error?' <small>'+esc(friendly(x.error))+'</small>':'')+'</li>').join('')+'</ul><button type="button" class="text-btn" id="'+copyId+'">'+esc(copyLabel)+'</button></section>';
}
function renderQueryReport(report){
 const target=$('query-results');if(!target)return;
 const accounted=report.found.length+report.missing.length+report.failed.length+report.disabled.length+report.expired.length+report.pending.length+report.locked.length;
 const stats=[queryStat(report.inputCount,'输入'),queryStat(report.found.length,'找到订单'),queryStat(report.missing.length,'未找到订单')];
 if(report.disabled.length)stats.push(queryStat(report.disabled.length,'已禁用'));
 if(report.expired.length)stats.push(queryStat(report.expired.length,'已过期'));
 if(report.locked.length)stats.push(queryStat(report.locked.length,'已锁定'));
 if(report.failed.length)stats.push(queryStat(report.failed.length,'查询失败'));
 if(report.pending.length)stats.push(queryStat(report.pending.length,'状态待确认'));
 target.innerHTML='<div class="query-summary" aria-label="查询统计">'+stats.join('')+'</div>'+
  (accounted===report.inputCount?'':'<p class="caption">输入 '+report.inputCount+' 个，结果分类合计 '+accounted+' 个。两边不一致时，请不要把差额当成未使用。</p>')+
  (report.missing.length?'<p class="query-caveat">未找到订单不代表兑换码未使用、真实存在或可以充值。订单查询只说明有没有最近一笔订单；接口里的 unused 只表示未产生订单。</p>':'')+
  (report.found.length?report.found.map((x,i)=>resultHTML(x.order)+'<button type="button" class="text-btn query-copy" data-i="'+i+'">复制这笔订单信息</button>').join(''):(report.inputCount?'<div class="empty">没有返回可展示的订单。</div>':''))+
  '<p class="toast" id="query-copy-status" role="status"></p>'+
  codeBucket('未找到订单','这些兑换码没有订单。不能据此判断未使用，也不能直接拿去充值。',report.missing,'copy-missing','复制未找到订单的兑换码')+
  codeBucket('已禁用','这些兑换码已禁用，不能兑换。',report.disabled,'copy-disabled','复制已禁用的兑换码')+
  codeBucket('已过期','这些兑换码已过期，不能兑换。',report.expired,'copy-expired','复制已过期的兑换码')+
  codeBucket('已锁定或处理中','这些兑换码处于锁定或处理中，但没有返回订单。不要当成未使用。',report.locked,'copy-locked','复制已锁定的兑换码')+
  codeBucket('查询失败','这些兑换码本次没有查完，没有计入未找到订单。可以只重试这一部分。',report.failed,'copy-failed','复制查询失败的兑换码')+
  (report.failed.length?'<button type="button" class="btn secondary" id="retry-failed">重试查询失败的兑换码</button>':'')+
  codeBucket('状态待确认','这些兑换码对不上明确结果。不要当成未找到，也不要当成未使用。',report.pending,'copy-pending','复制状态待确认的兑换码')+
  (report.invalid.length?'<p id="format-invalid">请输入有效的兑换码。</p>':'')+(report.concealed?'<p id="invalid-keys">CKD 有异常</p>':'');
 target.querySelectorAll('.query-copy').forEach(b=>b.onclick=()=>copy(orderInfo(report.found[Number(b.dataset.i)].order),$('query-copy-status')));
 const copyMap=[['copy-missing',report.missing],['copy-disabled',report.disabled],['copy-expired',report.expired],['copy-locked',report.locked],['copy-failed',report.failed],['copy-pending',report.pending]];
 for(const [id,list] of copyMap){const button=$(id);if(button)button.onclick=()=>copy(codeLines(list),$('query-copy-status'))}
 const retry=$('retry-failed');if(retry)retry.onclick=()=>{const field=$('query-cdks');if(!field||busy)return;field.value=codeLines(report.failed);$('query-form').requestSubmit()};
}
async function restore(){if(busy)return;busy=true;clearError();const release=inlineLoading($('resume')||$('code-form')?.querySelector('[type=submit]'),'正在恢复查询…');try{if(flow.queryToken){await poll(true)}else{const rows=await query(flow.cdk,true);if(rows.length){flow.uncertain=rows.some(x=>x.status==='processing');persist();showResults(rows)}else err(new Error('暂未查到订单，这不代表兑换码无效。上次提交结果仍需确认，请保留兑换码稍后查询，或联系萌萌哒 AI。'))}}catch(e){err(e)}finally{release();busy=false}}
function showQuery(){cancelLookup();render(heading('订单查询 · 离开后也能找回','输入兑换码，<span>看看进度。</span>','一行一个 CDK，最多 50 个。查到的订单和没查到的兑换码都会留下。没查到订单不代表未使用或可以充值。')+'<form id="query-form"><label for="query-cdks">兑换码（CDK）</label><textarea id="query-cdks" class="cdk-field" spellcheck="false" autocomplete="off" placeholder="一行一个兑换码，最多 50 个" required>'+esc(publicCdkInput(flow))+'</textarea><div class="actions"><button class="btn" type="submit">查询订单 →</button><button class="text-btn" type="button" id="back-redeem">返回充值</button></div></form><div id="query-results"></div>',1);$('back-redeem').onclick=()=>tab('redeem');$('query-form').onsubmit=async e=>{e.preventDefault();if(busy)return;clearError();const parsed=parseQueryInput($('query-cdks').value);if(!parsed)return;if(parsed.tooMany){clearStaleKeyView();err(new Error('一次最多查 50 个兑换码，分开查就好。'));return}if(preview){renderQueryReport(demoQueryReport());return}if(!parsed.items.length){clearStaleKeyView();err(new Error('请输入有效的兑换码。'));const box=$('query-results');if(box)box.innerHTML='<p id="format-invalid">请输入有效的兑换码。</p>';return}busy=true;const release=inlineLoading($('query-form').querySelector('.btn'),'正在查询…');try{const report=concealUsedNonPan(classifyQuery(parsed.items,await api('queryOrder',{cdks:parsed.items.map(x=>x.cdk)})));report.invalid=parsed.invalid;if(report.concealed&&!report.found.length&&!report.missing.length&&!report.failed.length&&!report.disabled.length&&!report.expired.length&&!report.pending.length&&!report.locked.length){const box=$('query-results');if(box)box.innerHTML='<p id="invalid-keys">CKD 有异常</p>'}else renderQueryReport(report)}catch(error){err(error);renderQueryReport({inputCount:parsed.items.length,found:[],missing:[],failed:parsed.items.map(x=>({...x,error:error.message||''})),disabled:[],expired:[],pending:[],locked:[],invalid:parsed.invalid})}finally{release();busy=false}};const queryField=$('query-cdks');if(queryField)queryField.addEventListener('input',()=>{const box=$('query-results');if(box)box.innerHTML='';clearError()});}
function showResults(rows){mode='query';$('query-tab')?.classList.add('on');$('redeem-tab')?.classList.remove('on');showQuery();renderQueryReport({inputCount:rows.length,found:rows.map(o=>({input:o.cdk||'',cdk:o.cdk||'',order:o})),missing:[],failed:[],disabled:[],expired:[],pending:[],locked:[],invalid:[]})}
function previewRoute(){clearError();$('network-note').hidden=true;busy=false;pollId++;mode='redeem';$('redeem-tab')?.classList.add('on');$('query-tab')?.classList.remove('on');if(preview)flow={nonce:'preview',cdk:'DEMO-JMM-2026-PLUS',meta:DEMO};if(preview==='step2')showSession();else if(preview==='confirm'){token='preview-token';account=demoAccount();showConfirm()}else if(preview==='success')showResult(demoOrder());else if(preview==='failed')showResult({...demoOrder(),status:'failed',payment_card:null,error:'账号暂不符合本次充值条件，请核对后联系萌萌哒 AI。'});else if(preview==='processing')showProcessing({order_no:'JMM202611190001',retrying:true,attempt_current:2,attempt_max:3});else if(preview==='query'){setMode('query');renderQueryReport(demoQueryReport())}else if(location.hash==='#query'&&!preview)setMode('query');else showCode();}
if(preview){const labels={step1:'1 验证兑换码',step2:'2 输入登录信息',confirm:'3 确认账号',success:'4 完成效果',query:'查询订单'};$('preview-controls').innerHTML=Object.entries(labels).map(([k,v])=>'<a href="'+esc(salesURL('redeem.html#preview='+k))+'">'+v+'</a>').join('');}
previewRoute();
window.addEventListener('hashchange',()=>{const next=new URLSearchParams(location.hash.slice(1)).get('preview');if(['step1','step2','confirm','success','query','processing','failed'].includes(next)){preview=next;$('preview-note').hidden=false;previewRoute()}});
window.addEventListener('pagehide',()=>{token='';account=null;sessionDraft='';const s=$('session');if(s)s.value='';pollId++});

window.addEventListener('pageshow',e=>{if(e.persisted){busy=false;redeemLocked=false;token='';account=null;sessionDraft='';pollId++;setMode('redeem')}});
