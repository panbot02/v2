// Consumed-CDK lookup. Synthetic codes and mocked verifyCdk/queryOrder only.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const puppeteer = (await import(pathToFileURL(process.env.PUPPETEER_CORE || '/tmp/pwtest/node_modules/puppeteer-core/lib/esm/puppeteer/puppeteer-core.js').href)).default;
const artifacts = process.env.ARTIFACTS || '/opt/cursor/artifacts';
const calls = [];
const waits = new Map();
let netLeft = 1;

function type(file){
 if(file.endsWith('.js'))return 'text/javascript; charset=utf-8';
 if(file.endsWith('.css'))return 'text/css; charset=utf-8';
 if(file.endsWith('.wasm'))return 'application/wasm';
 if(file.endsWith('.webp'))return 'image/webp';
 if(file.endsWith('.png'))return 'image/png';
 return 'text/html; charset=utf-8';
}
function cors(origin){return {'Access-Control-Allow-Origin':origin||'*','Access-Control-Allow-Headers':'Content-Type','Access-Control-Allow-Methods':'POST, OPTIONS'}}
function json(data, origin, code=200){return {status:200, contentType:'application/json', headers:{...cors(origin),'Cache-Control':'no-store'}, body:JSON.stringify({code, ...data})}}
function consumed(extra={}){return {code:0, error:'该CDK兑换已完成，请查询订单', ...extra}}
function row(cdk, extra){return {cdk, code:200, error:'', cdk_status:'activated', provider:'openai', product_name:'ChatGPT Plus', plan:'chatgptplusplan', order:null, ...extra}}
function order(cdk, extra){
 return {status:'success', account:'buyer@example.com', product_name:'ChatGPT Plus', plan:'chatgptplusplan', provider:'openai', payment_card:'4242424242424242', finished_at:'2026-11-19T13:42:18Z', started_at:'2026-11-19T13:41:00Z', order_no:'ORD-'+cdk, cdk, error:'', ...extra};
}
function verifyBody(cdk){
 if(cdk==='BAD-NONE')return {code:0, error:'CDK 不存在或不可用'};
 if(cdk==='BAD-LOCK')return {code:0, error:'CDK 正在使用中，请稍后再试'};
 if(cdk==='BAD-MAINT')return {code:0, error:'当前兑换服务正在维护中，请稍后再试。如有疑问，请联系管理员。'};
 if(cdk==='BAD-SWITCH')return {code:0, error:'该 CDK 属于 Claude 兑换，请切换后继续'};
 if(cdk==='BAD-BROAD')return {code:0, error:'请查询订单后联系客服，兑换码无效'};
 if(cdk==='BAD-SHORT')return {code:0, error:'该CDK兑换已完成'};
 if(cdk==='CODE-ACT')return {code:0, error:'暂时不能验证', cdk_status:'activated'};
 if(cdk==='CODE-USED')return {code:0, error:'别的原因', error_code:'consumed'};
 if(cdk==='CODE-OFF')return consumed({cdk_status:'disabled'});
 if(cdk==='CODE-FREE')return consumed({cdk_status:'unused'});
 if(cdk==='LIVE-OK')return {code:200, error:'', data:{activation_token:'act-test', expires_in:900, expires_at:'2026-11-20T12:00:00Z', provider:'openai', product_name:'ChatGPT Plus', plan:'chatgptplusplan'}};
 return consumed();
}
function queryBody(cdk){
 if(cdk==='USED-ZONE')return {code:200, error:'', results:[row(cdk, {product_name:'Grok Super', plan:'grok_super', order:order(cdk, {product_name:'Grok Super', plan:'grok_super', finished_at:'2026-11-19 21:42:18', account:'grok-buyer@example.com'})})]};
 if(cdk==='USED-PROC')return {code:200, error:'', results:[row(cdk, {cdk_status:'activating', order:order(cdk, {status:'processing', finished_at:null, product_name:'ChatGPT Plus'})})]};
 if(cdk==='USED-FAIL')return {code:200, error:'', results:[row(cdk, {order:order(cdk, {status:'failed', error:'支付未完成', product_name:'Claude Pro', plan:'claudepro'})})]};
 if(cdk==='USED-NONE')return {code:200, error:'', results:[row(cdk, {order:null, product_name:null, plan:null})]};
 if(cdk==='USED-MISS')return {code:200, error:'', results:[row(cdk, {product_name:null, plan:null, order:order(cdk, {product_name:null, plan:null, finished_at:null, account:null, payment_card:null, order_no:null, started_at:null})})]};
 if(cdk==='USED-CODE0')return {code:200, error:'', results:[row(cdk, {code:0, error:'这一条查询超时', order:null, cdk_status:'unused'})]};
 if(cdk==='CODE-ACT'||cdk==='CODE-USED')return {code:200, error:'', results:[row(cdk, {provider:'claude', product_name:'Claude Pro', plan:'claudepro', order:order(cdk, {provider:'claude', product_name:'Claude Pro', plan:'claudepro', account:'claude-buyer@example.com'})})]};
 return {code:200, error:'', results:[row(cdk, {order:order(cdk)})]};
}

const server = http.createServer((req, res) => {
 const url = new URL(req.url, 'http://127.0.0.1');
 const file = path.join(root, decodeURIComponent(url.pathname).replace(/^\/+/, '') || 'index.html');
 if(!file.startsWith(root) || !fs.existsSync(file) || fs.statSync(file).isDirectory()){res.writeHead(404);res.end();return}
 res.writeHead(200, {'Content-Type':type(file),'Cache-Control':'no-store'});
 fs.createReadStream(file).pipe(res);
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await puppeteer.launch({executablePath:process.env.CHROME || '/usr/local/bin/google-chrome', headless:true, args:['--no-sandbox','--disable-dev-shm-usage']});
const failures = [];
const check = (name, ok, detail='') => {if(!ok)failures.push(name+(detail?`: ${detail}`:'')); else console.log('ok', name)};

async function open(width, height, sales='AgentSale77'){
 const page = await browser.newPage();
 await page.evaluateOnNewDocument(() => localStorage.setItem('t','light'));
 await page.setViewport({width, height, deviceScaleFactor:1});
 await page.setRequestInterception(true);
 page.on('request', async request => {
  const target = request.url();
  if(!target.includes('/api/v1/sub/'))return request.continue();
  const origin = request.headers().origin || '*';
  if(request.method()==='OPTIONS')return request.respond({status:204, headers:cors(origin)});
  const name = target.split('/api/v1/sub/')[1].split('?')[0];
  let body = {};
  try{body = JSON.parse(request.postData()||'{}')}catch{}
  const cdk = body.cdk || body.cdks?.[0] || '';
  calls.push({name, body, cdk});
  const gate = waits.get(cdk+':'+name);
  if(gate)await gate;
  if(name==='verifyCdk'){
   const payload = verifyBody(cdk);
   if(payload.code===200)return request.respond({status:200, contentType:'application/json', headers:{...cors(origin),'Cache-Control':'no-store'}, body:JSON.stringify(payload)});
   return request.respond(json({error:payload.error, cdk_status:payload.cdk_status, error_code:payload.error_code}, origin, 0));
  }
  if(name==='queryOrder'){
   if(cdk==='USED-NET' && netLeft>0){netLeft -= 1; return request.abort('failed')}
   return request.respond(json(queryBody(cdk), origin, 200));
  }
  if(name==='precheckAccount')return request.respond(json({email:'buyer@example.com', name:'Buyer', plan_type:'free', has_active_subscription:false, eligible:true}, origin));
  return request.respond(json({error:'unexpected '+name}, origin, 0));
 });
 await page.goto(`${base}/redeem.html?Sales=${encodeURIComponent(sales)}`, {waitUntil:'networkidle0'});
 return page;
}
async function fill(page, value){
 await page.waitForSelector('#cdk');
 await page.evaluate(v => {
  const field = document.getElementById('cdk');
  field.value = v;
  field.dispatchEvent(new Event('input', {bubbles:true}));
 }, value);
}
async function submit(page){
 await page.evaluate(() => document.getElementById('code-form').requestSubmit());
}
function sent(name, cdk){return calls.filter(item => item.name===name && item.cdk===cdk)}
function visible(page, id){
 return page.evaluate(nodeId => {
  const el = document.getElementById(nodeId);
  if(!el)return null;
  const nav = document.querySelector('header').getBoundingClientRect().bottom;
  const r = el.getBoundingClientRect();
  return {text:el.textContent, top:r.top, bottom:r.bottom, nav, height:window.innerHeight, overflow:document.documentElement.scrollWidth-document.documentElement.clientWidth};
 }, id);
}

try {
 fs.mkdirSync(artifacts, {recursive:true});
 const page = await open(1280, 800);
 const first = await page.evaluate(() => ({
  step: document.getElementById('stage').dataset.step,
  session: !!document.getElementById('session'),
  text: document.body.innerText,
  prices: document.body.innerText.includes('¥')
 }));
 check('first screen is verify step', first.step==='1' && first.text.includes('输入兑换码') && first.text.includes('验证兑换码'));
 check('first screen does not ask for session', first.session===false && !first.text.includes('Session JSON'));
 check('consumed error is not shown before submit', !first.text.includes('该CDK兑换已完成'));

 await fill(page, 'Pan-USED-OK');
 const before = calls.length;
 let releaseOk;
 waits.set('USED-OK:queryOrder', new Promise(resolve => {releaseOk = resolve}));
 await submit(page);
 await page.waitForFunction(() => document.querySelector('[data-loading-label]')?.textContent==='正在查询订单…');
 const loading = await page.evaluate(() => ({
  busy: document.getElementById('stage').getAttribute('aria-busy'),
  disabled: document.querySelector('#code-form button[type=submit]').disabled,
  session: !!document.getElementById('session')
 }));
 check('lookup stays inline and blocks a second submit', loading.busy==='true' && loading.disabled===true && loading.session===false);
 releaseOk();
 waits.delete('USED-OK:queryOrder');
 await page.waitForSelector('#lookup-time');
 await page.waitForFunction(() => {
  const nav = document.querySelector('header').getBoundingClientRect().bottom;
  return ['lookup-time','lookup-account'].every(id => {
   const el = document.getElementById(id);
   if(!el)return false;
   const r = el.getBoundingClientRect();
   return r.top>=nav && r.bottom<=window.innerHeight;
  });
 });
 const time = await visible(page, 'lookup-time');
 const product = await visible(page, 'lookup-product');
 const text = await page.evaluate(() => document.body.innerText);
 check('success shows queried product', product.text.includes('ChatGPT Plus'), product.text);
 check('success converts completion to Beijing time', time.text.includes('2026/11/19 21:42:18') && time.text.includes('北京时间'), time.text);
 check('success shows account and status', text.includes('buyer@example.com') && text.includes('充值成功'));
 check('result replaces the used-code alert', await page.$eval('#alert', el => el.hidden) && text.includes('订单查询返回的充值类型') && !text.includes('请查询订单'));
 check('card is masked', text.includes('•••• 4242') && !text.includes('4242424242424242'));
 check('session stays closed', await page.$('#session')===null);
 check('success sales link uses the page sales id', await page.$eval('.service-promo a', a => a.href)==='https://panbot02.github.io/v2/?Sales=AgentSale77');
 const account = await visible(page, 'lookup-account');
 check('desktop product, time, and account are in view', product.top>=product.nav && product.bottom<=product.height && time.top>=time.nav && time.bottom<=time.height && account.top>=account.nav && account.bottom<=account.height, JSON.stringify({product, time, account}));
 check('desktop result does not overflow', time.overflow<=1, String(time.overflow));
 const verify = sent('verifyCdk','USED-OK');
 const query = sent('queryOrder','USED-OK');
 check('success queries the normalized code once', verify.length===1 && query.length===1 && verify[0].body.cdk==='USED-OK' && JSON.stringify(query[0].body.cdks)==='["USED-OK"]');
 check('verify keeps nonce and query sends no session', typeof verify[0].body.request_nonce==='string' && verify[0].body.request_nonce.length>=22 && !JSON.stringify(query[0].body).includes('session') && !JSON.stringify(verify[0].body).includes('token'));
 check('no extra call before submit', before===0 || calls.slice(0, before).every(item => item.cdk!=='USED-OK'));
 await page.screenshot({path:path.join(artifacts, 'used-cdk-desktop-success.png')});

 const mobile = await open(390, 844);
 await fill(mobile, 'Pan-USED-OK');
 await submit(mobile);
 await mobile.waitForSelector('#lookup-time');
 await mobile.waitForFunction(() => {
  const nav = document.querySelector('header').getBoundingClientRect().bottom;
  return ['lookup-time','lookup-account'].every(id => {
   const el = document.getElementById(id);
   if(!el)return false;
   const r = el.getBoundingClientRect();
   return r.top>=nav && r.bottom<=window.innerHeight;
  });
 });
 const mobileBox = await visible(mobile, 'lookup-time');
 check('mobile completion time is in view', mobileBox.top>=mobileBox.nav && mobileBox.bottom<=mobileBox.height, JSON.stringify(mobileBox));
 check('mobile result does not overflow', mobileBox.overflow<=1, String(mobileBox.overflow));
 check('mobile does not ask for session', await mobile.$('#session')===null);
 await mobile.screenshot({path:path.join(artifacts, 'used-cdk-mobile-success.png')});

 async function lookup(value, width=1280, height=800){
  const next = await open(width, height);
  const trimmed=String(value).trim();
  await fill(next, /^pan-/i.test(trimmed)?value:'Pan-'+trimmed);
  await submit(next);
  await next.waitForFunction(() => document.getElementById('lookup-result') || !document.getElementById('alert').hidden);
  return next;
 }
 const zone = await lookup('  PAN-USED-ZONE  ');
 await zone.waitForSelector('#lookup-product');
 const zoneText = await zone.evaluate(() => document.body.innerText);
 check('zone-less timestamp stays Beijing time', (await visible(zone,'lookup-time')).text.includes('2026/11/19 21:42:18 北京时间'));
 check('prefixed query keeps the code case once', sent('verifyCdk','USED-ZONE').at(-1).body.cdk==='USED-ZONE' && sent('queryOrder','USED-ZONE').at(-1).body.cdks[0]==='USED-ZONE');
 check('zone result shows the queried product', zoneText.includes('Grok Super') && zoneText.includes('充值成功'));

 const proc = await lookup('USED-PROC');
 await proc.waitForSelector('#lookup-time');
 const procText = await proc.evaluate(() => document.body.innerText);
 check('processing is not called success', procText.includes('处理中') && procText.includes('先别当成成功') && !procText.includes('充值成功') && (await visible(proc,'lookup-time')).text.includes('完成时间尚未返回'));
 check('processing still shows the product', procText.includes('ChatGPT Plus'));
 await proc.screenshot({path:path.join(artifacts, 'used-cdk-desktop-processing.png')});

 const failed = await lookup('USED-FAIL');
 await failed.waitForSelector('#lookup-time');
 const failedText = await failed.evaluate(() => document.body.innerText);
 const failedStatus = await failed.$eval('.result-status', el => el.textContent);
 check('failed order stays failed', failedStatus==='充值未完成' && failedText.includes('Claude Pro') && failedText.includes('支付未完成') && !failedText.includes('充值成功'), failedStatus+' | '+failedText.slice(0,240));
 check('failed completion uses Beijing time', (await visible(failed,'lookup-time')).text.includes('2026/11/19 21:42:18 北京时间'));

 const none = await lookup('USED-NONE');
 const noneText = await none.evaluate(() => document.body.innerText);
 check('activated without an order is not success', noneText.includes('没有查到充值记录') && noneText.includes('已标记为已兑换') && !noneText.includes('充值成功') && !noneText.includes('ChatGPT Plus') && await none.$('#session')===null);

 const miss = await lookup('USED-MISS');
 await miss.waitForSelector('#lookup-product');
 const missText = await miss.evaluate(() => document.body.innerText);
 check('missing product stays blank', (await visible(miss,'lookup-product')).text.includes('暂未提供') && missText.includes('订单没有返回充值类型'));
 check('missing completion stays blank', (await visible(miss,'lookup-time')).text.includes('完成时间暂未提供') && missText.includes('订单没有返回完成时间'));
 check('missing account stays blank', missText.includes('订单没有返回账号') && missText.includes('暂未提供'));
 check('missing fields do not invent a product', !missText.includes('ChatGPT Plus') && !missText.includes('21:42:18'));
 await miss.screenshot({path:path.join(artifacts, 'used-cdk-desktop-missing.png')});

 const codeFail = await lookup('USED-CODE0');
 const codeFailText = await codeFail.evaluate(() => document.body.innerText);
 check('per-code query failure is not a missing success', codeFailText.includes('这次没查成') && codeFailText.includes('这一条查询超时') && !codeFailText.includes('充值成功'));

 netLeft = 1;
 const net = await lookup('USED-NET');
 await net.waitForSelector('#lookup-retry');
 check('network error offers retry', (await net.evaluate(() => document.body.innerText)).includes('这次没查成') && await net.$('#session')===null);
 const verifiesBeforeRetry = sent('verifyCdk','USED-NET').length;
 await net.click('#lookup-retry');
 await net.waitForSelector('#lookup-time');
 check('retry queries again without verifying again', sent('verifyCdk','USED-NET').length===verifiesBeforeRetry && sent('queryOrder','USED-NET').length===2);
 check('retry shows the authoritative product and time', (await net.evaluate(() => document.body.innerText)).includes('ChatGPT Plus') && (await visible(net,'lookup-time')).text.includes('北京时间'));

 const manual = await lookup('USED-OK');
 await manual.waitForSelector('#lookup-manual');
 await manual.click('#lookup-manual');
 await manual.waitForSelector('#query-cdks');
 check('manual query opens with the same code', await manual.$eval('#query-cdks', el => el.value)==='Pan-USED-OK');
 check('manual query still has no session field', await manual.$('#session')===null);

 const another = await lookup('Pan-Pan-aBcD');
 check('pan prefix strips once and keeps the key case', sent('verifyCdk','Pan-aBcD').length===1 && sent('queryOrder','Pan-aBcD').at(-1).body.cdks[0]==='Pan-aBcD');
 await another.click('#lookup-another');
 await another.waitForSelector('#cdk');
 await fill(another, 'PAN-ZzKey');
 await submit(another);
 await another.waitForSelector('#lookup-product');
 check('uppercase Pan prefix strips once', sent('verifyCdk','ZzKey').at(-1).body.cdk==='ZzKey' && sent('queryOrder','ZzKey').at(-1).body.cdks[0]==='ZzKey');
 await another.click('#lookup-another');
 await another.waitForSelector('#cdk');
 const rawMark = calls.filter(item => item.name==='queryOrder' && item.cdk==='RAW-AbCkey').length;
 await fill(another, 'RAW-AbCkey');
 await submit(another);
 await another.waitForFunction(() => document.getElementById('alert').textContent==='CKD 有异常');
 check('raw used code is verified and not looked up', calls.some(item => item.name==='verifyCdk' && item.cdk==='RAW-AbCkey') && calls.filter(item => item.name==='queryOrder' && item.cdk==='RAW-AbCkey').length===rawMark && await another.$('#lookup-product')===null);

 const blank = await open(1280, 800);
 const mark = calls.length;
 await fill(blank, 'Pan-');
 await submit(blank);
 await blank.waitForFunction(() => document.getElementById('alert').textContent==='请输入有效的兑换码。');
 check('empty suffix does not call the api', calls.length===mark && (await blank.evaluate(() => document.getElementById('alert').textContent))==='请输入有效的兑换码。');

 async function staysError(value, snippet){
  const next = await lookup(value);
  const alert = await next.$eval('#alert', el => ({hidden:el.hidden, text:el.textContent}));
  check(value+' is not auto-queried', sent('queryOrder', value).length===0 && alert.hidden===false && alert.text.includes(snippet), alert.text);
  check(value+' does not open session', await next.$('#session')===null && await next.$('#lookup-result')===null);
 }
 await staysError('BAD-NONE', 'CDK 不存在或不可用');
 await staysError('BAD-LOCK', 'CDK 正在使用中');
 await staysError('BAD-MAINT', '维护中');
 await staysError('BAD-SWITCH', 'Claude');
 await staysError('BAD-BROAD', '兑换码无效');
 await staysError('BAD-SHORT', '该CDK兑换已完成');
 await staysError('CODE-OFF', '该CDK兑换已完成');
 await staysError('CODE-FREE', '该CDK兑换已完成');

 const activated = await lookup('CODE-ACT');
 await activated.waitForSelector('#lookup-product');
 check('structured activated status queries the order', (await activated.evaluate(() => document.body.innerText)).includes('Claude Pro') && sent('queryOrder','CODE-ACT').length===1);
 const consumedCode = await lookup('CODE-USED');
 await consumedCode.waitForSelector('#lookup-time');
 check('structured consumed code queries the order', sent('queryOrder','CODE-USED').length===1 && (await visible(consumedCode,'lookup-time')).text.includes('北京时间'));

 const race = await open(1280, 800);
 let releaseRace;
 waits.set('RACE-CDK:queryOrder', new Promise(resolve => {releaseRace = resolve}));
 await fill(race, 'Pan-RACE-CDK');
 await race.evaluate(() => {
  const form = document.getElementById('code-form');
  form.requestSubmit();
  form.requestSubmit();
 });
 await race.waitForFunction(() => document.querySelector('[data-loading-label]')?.textContent==='正在查询订单…');
 check('duplicate submit verifies once', sent('verifyCdk','RACE-CDK').length===1, String(sent('verifyCdk','RACE-CDK').length));
 check('duplicate submit does not query twice while the first is open', sent('queryOrder','RACE-CDK').length===1);
 check('in-flight submit stays disabled', await race.$eval('#code-form button[type=submit]', el => el.disabled)===true);
 releaseRace();
 await race.waitForSelector('#lookup-time');
 check('late duplicate does not leave a session field', await race.$('#session')===null);
 const retryMark = sent('queryOrder','RACE-CDK').length;
 await race.evaluate(() => {
  const button = document.getElementById('lookup-retry');
  button.click();
  button.click();
 });
 await race.waitForFunction(() => document.getElementById('lookup-time') && !document.getElementById('stage').getAttribute('aria-busy'));
 check('duplicate retry sends one query', sent('queryOrder','RACE-CDK').length===retryMark+1, String(sent('queryOrder','RACE-CDK').length));

 const live = await open(1280, 800);
 await fill(live, 'Pan-LIVE-OK');
 await submit(live);
 await live.waitForSelector('#session');
 check('unused code still reaches session', await live.$eval('#stage', el => el.dataset.step)==='2');
 check('unused code does not query an order', sent('queryOrder','LIVE-OK').length===0 && sent('verifyCdk','LIVE-OK').length===1);
 check('live verify body is the normalized code', sent('verifyCdk','LIVE-OK')[0].body.cdk==='LIVE-OK' && sent('verifyCdk','LIVE-OK')[0].body.renew!==true);

 const home = await open(1280, 800);
 await home.goto(base+'/index.html', {waitUntil:'networkidle0'});
 const prices = await home.evaluate(() => document.body.innerText);
 check('pricing copy is unchanged', prices.includes('¥160') && prices.includes('¥80') && prices.includes('¥249'));
} finally {
 await browser.close();
 server.close();
}
if(failures.length){console.error(failures.map(item => 'FAIL '+item).join('\n')); process.exit(1)}
console.log('used cdk lookup checks passed');
