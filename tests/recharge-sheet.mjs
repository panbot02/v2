// Sheet layout checks. Synthetic codes and mocked responses only.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const puppeteer = (await import(pathToFileURL(process.env.PUPPETEER_CORE || '/tmp/pwtest/node_modules/puppeteer-core/lib/esm/puppeteer/puppeteer-core.js').href)).default;
const artifacts = process.env.ARTIFACTS || '/opt/cursor/artifacts';
const sessionText = '{"accessToken":"synthetic-session-token","user":"not-real"}';

function type(file){
 if(file.endsWith('.js')) return 'text/javascript; charset=utf-8';
 if(file.endsWith('.css')) return 'text/css; charset=utf-8';
 if(file.endsWith('.wasm')) return 'application/wasm';
 if(file.endsWith('.webp')) return 'image/webp';
 if(file.endsWith('.png')) return 'image/png';
 return 'text/html; charset=utf-8';
}
function cors(origin){return {'Access-Control-Allow-Origin':origin||'*','Access-Control-Allow-Headers':'Content-Type','Access-Control-Allow-Methods':'POST, OPTIONS'}}
function json(data, origin){return {status:200, contentType:'application/json', headers:cors(origin), body:JSON.stringify({code:200, data})}}
const server = http.createServer((req, res) => {
 const url = new URL(req.url, 'http://127.0.0.1');
 const rel = decodeURIComponent(url.pathname);
 const file = path.join(root, rel === '/' ? 'index.html' : rel.replace(/^\/+/, ''));
 if(!file.startsWith(root) || !fs.existsSync(file) || fs.statSync(file).isDirectory()){res.writeHead(404); res.end('missing'); return}
 res.writeHead(200, {'Content-Type':type(file), 'Cache-Control':'no-store'});
 fs.createReadStream(file).pipe(res);
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await puppeteer.launch({executablePath:process.env.CHROME || '/usr/local/bin/google-chrome', headless:true, protocolTimeout:30000, args:['--no-sandbox','--disable-dev-shm-usage']});
const failures = [];
const check = (name, ok, detail='') => {if(!ok) failures.push(name+(detail?`: ${detail}`:'')); else console.log('ok', name)};

async function open(width, height){
 const page = await browser.newPage();
 await page.setViewport({width, height, deviceScaleFactor:1});
 await page.evaluateOnNewDocument(() => localStorage.setItem('t','light'));
 await page.setRequestInterception(true);
 page.on('request', request => {
  const target = request.url();
  if(!target.includes('/api/v1/sub/')) return request.continue();
  const origin = request.headers().origin || '*';
  if(request.method()==='OPTIONS') return request.respond({status:204, headers:cors(origin)});
  const name = target.split('/api/v1/sub/')[1].split('?')[0];
  let body = {};
  try{body = JSON.parse(request.postData()||'{}')}catch{}
  if(name==='verifyCdk'){
   if(String(body.cdk||'').includes('USED')) return request.respond({status:200, contentType:'application/json', headers:cors(origin), body:JSON.stringify({code:0, error:'该CDK兑换已完成，请查询订单'})});
   return request.respond(json({activation_token:'act-test', expires_in:900, expires_at:'2026-11-20T12:00:00Z', provider:'openai', product_name:'ChatGPT Plus', plan:'chatgptplusplan'}, origin));
  }
  if(name==='queryOrder'){
   return request.respond({status:200, contentType:'application/json', headers:cors(origin), body:JSON.stringify({code:200, error:'', results:[{cdk:body.cdks?.[0], code:200, error:'', cdk_status:'activated', provider:'openai', product_name:'ChatGPT Plus', plan:'chatgptplusplan', order:{status:'success', account:'buyer@example.com', product_name:'ChatGPT Plus', plan:'chatgptplusplan', payment_card:'4242424242424242', finished_at:'2026-11-19T13:42:18Z', order_no:'ORD-SHEET', cdk:body.cdks?.[0]}}]})});
  }
  if(name==='precheckAccount') return request.respond(json({email:'buyer@example.com', name:'Buyer', plan_type:'free', subscription_plan:'free', has_active_subscription:false, eligible:true}, origin));
  return request.respond({status:500, contentType:'application/json', headers:cors(origin), body:'{}'});
 });
 await page.goto(base+'/redeem.html?Sales=AgentSale77', {waitUntil:'networkidle0'});
 return page;
}
function banned(text){
 return ['服务正常','PLS-','不会存储','服务器不会'].filter(item => text.includes(item));
}

try {
 fs.mkdirSync(artifacts, {recursive:true});
 const page = await open(1280, 800);
 const initial = await page.evaluate(() => ({
  text: document.body.innerText,
  session: !!document.getElementById('session'),
  locked: document.querySelectorAll('.sheet-group.is-locked').length,
  groups: document.querySelectorAll('.sheet-group').length,
  hero: !!document.querySelector('.intro'),
  h1: document.querySelector('h1').textContent
 }));
 check('initial has three groups and no session field', initial.groups===3 && initial.locked===2 && initial.session===false, JSON.stringify(initial));
 check('initial has no hero and no invented status', initial.hero===false && banned(initial.text).length===0 && !initial.text.includes('当前账号无任何订阅'), banned(initial.text).join(','));
 check('initial names the service', initial.h1.includes('萌萌哒 AI') && initial.text.includes('ChatGPT') && initial.text.includes('Claude') && initial.text.includes('Grok'));
 await page.screenshot({path:path.join(artifacts, 'sheet-initial-desktop.png')});

 const mobile = await open(390, 844);
 const mobileOverflow = await mobile.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
 check('mobile sheet does not overflow', mobileOverflow<=1, String(mobileOverflow));
 await mobile.screenshot({path:path.join(artifacts, 'sheet-initial-mobile.png')});
 await mobile.close();

 await page.evaluate(() => {
  const field = document.getElementById('cdk');
  field.value = 'SHEET-NEW';
  field.dispatchEvent(new Event('input', {bubbles:true}));
 });
 await page.click('#code-form button[type=submit]');
 await page.waitForSelector('#session');
 const unlocked = await page.evaluate(() => ({
  step: document.getElementById('stage').dataset.step,
  disabled: document.getElementById('session').disabled,
  url: document.getElementById('session-url').textContent,
  open: document.getElementById('open-session-url').href,
  text: document.body.innerText,
  product: document.getElementById('sheet-intro').textContent
 }));
 check('verified code unlocks session', unlocked.step==='2' && unlocked.disabled===false && unlocked.url==='https://chatgpt.com/api/auth/session' && unlocked.open.startsWith('https://chatgpt.com/api/auth/session'));
 check('unlocked names the returned product', unlocked.product.includes('ChatGPT Plus') && unlocked.text.includes('已验证 ChatGPT Plus'));
 check('unlocked keeps the risk notice truthful', unlocked.text.includes('api.easysub.site') && banned(unlocked.text).length===0, banned(unlocked.text).join(','));
 await page.screenshot({path:path.join(artifacts, 'sheet-unlocked-desktop.png')});

 await page.evaluate(value => {
  const field = document.getElementById('session');
  field.value = value;
  field.dispatchEvent(new Event('input', {bubbles:true}));
 }, sessionText);
 await page.click('#session-form button[type=submit]');
 await page.waitForSelector('#consent');
 const confirm = await page.evaluate(() => ({
  text: document.body.innerText,
  confirmDisabled: document.getElementById('confirm').disabled,
  session: !!document.getElementById('session')
 }));
 check('confirm shows current and upcoming plans', confirm.text.includes('当前会员') && confirm.text.includes('即将充值') && confirm.text.includes('暂无有效订阅') && confirm.text.includes('ChatGPT Plus'));
 check('confirm waits for consent and hides the session field', confirm.confirmDisabled===true && confirm.session===false);
 check('confirm does not invent a healthy-account badge', banned(confirm.text).length===0, banned(confirm.text).join(','));
 await page.screenshot({path:path.join(artifacts, 'sheet-confirm-desktop.png')});

 const used = await open(1280, 800);
 await used.evaluate(() => {const field=document.getElementById('cdk'); field.value='SHEET-USED'; field.dispatchEvent(new Event('input',{bubbles:true}));});
 await used.click('#code-form button[type=submit]');
 await used.waitForSelector('#lookup-time');
 const usedText = await used.evaluate(() => document.body.innerText);
 check('used code shows queried product and Beijing time', usedText.includes('ChatGPT Plus') && usedText.includes('2026/11/19 21:42:18') && usedText.includes('北京时间'));
 check('used code does not open session', await used.$('#session')===null);
 await used.screenshot({path:path.join(artifacts, 'sheet-used-desktop.png')});
 const usedMobile = await open(390, 844);
 await usedMobile.evaluate(() => {const field=document.getElementById('cdk'); field.value='SHEET-USED'; field.dispatchEvent(new Event('input',{bubbles:true}));});
 await usedMobile.click('#code-form button[type=submit]');
 await usedMobile.waitForSelector('#lookup-time');
 const usedOverflow = await usedMobile.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
 check('used result does not overflow on mobile', usedOverflow<=1, String(usedOverflow));
 await usedMobile.screenshot({path:path.join(artifacts, 'sheet-used-mobile.png')});
} finally {
 await browser.close();
 server.close();
}
if(failures.length){console.error(failures.map(item => 'FAIL '+item).join('\n')); process.exit(1)}
console.log('recharge sheet checks passed');
