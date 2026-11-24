// Customer-facing recharge copy. Synthetic codes and mocked responses only.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const puppeteer = (await import(pathToFileURL(process.env.PUPPETEER_CORE || '/tmp/pwtest/node_modules/puppeteer-core/lib/esm/puppeteer/puppeteer-core.js').href)).default;
const warning = '请仅在信任本服务时提交登录凭据';
const removed = '登录凭据等同账号凭证';
const sessionText = '{"accessToken":"synthetic-session-token","user":"not-real"}';
const forbidden = /easysub|workers\.dev|api\.easysub\.site/i;

function type(file){
 if(file.endsWith('.js')) return 'text/javascript; charset=utf-8';
 if(file.endsWith('.css')) return 'text/css; charset=utf-8';
 if(file.endsWith('.wasm')) return 'application/wasm';
 if(file.endsWith('.webp')) return 'image/webp';
 if(file.endsWith('.png')) return 'image/png';
 return 'text/html; charset=utf-8';
}
function cors(origin){return {'Access-Control-Allow-Origin':origin||'*','Access-Control-Allow-Headers':'Content-Type','Access-Control-Allow-Methods':'POST, OPTIONS'}}
function verifyFor(cdk){
 if(cdk==='LOCKED') return {code:0, error:'CDK 正在使用中，请稍后再试'};
 if(cdk==='DOMAIN') return {code:0, error:'请稍后再试，详见 https://api.easysub.site/help ，EasySub 维护中'};
 if(cdk==='HTML') return {code:0, error:'<html><body>api.easysub.site accessToken=secret-token</body></html>'};
 if(cdk==='USED') return {code:0, error:'该CDK兑换已完成，请查询订单'};
 const provider = cdk.includes('CLAUDE') ? 'claude' : cdk.includes('GROK') ? 'grok' : 'openai';
 return {code:200, data:{activation_token:'act', expires_in:900, expires_at:'2026-11-20T12:00:00Z', provider, product_name:'ChatGPT Plus', plan:'chatgptplusplan'}};
}
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
const page = await browser.newPage();
const pageErrors = [];
page.on('pageerror', error => pageErrors.push(String(error)));
page.on('console', message => { if(message.type()==='error') pageErrors.push(message.text()); });
await page.setViewport({width:1280, height:900});
await page.setRequestInterception(true);
page.on('request', request => {
 const target = request.url();
 if(!target.includes('/api/v1/sub/')) return request.continue();
 const origin = request.headers().origin || '*';
 if(request.method()==='OPTIONS') return request.respond({status:204, headers:cors(origin)});
 const name = target.split('/api/v1/sub/')[1].split('?')[0];
 let body = {};
 try{body = JSON.parse(request.postData()||'{}')}catch{}
 if(name==='verifyCdk') return request.respond({status:200, contentType:'application/json', headers:cors(origin), body:JSON.stringify(verifyFor(body.cdk))});
 if(name==='precheckAccount') return request.respond({status:200, contentType:'application/json', headers:cors(origin), body:JSON.stringify({code:200, data:{email:'buyer@example.com', name:'Buyer', plan_type:'free', subscription_plan:'free', has_active_subscription:false, eligible:true}})});
 if(name==='queryOrder'){
  const cdk = body.cdks?.[0] || '';
  if(cdk==='USED') return request.respond({status:200, contentType:'application/json', headers:cors(origin), body:JSON.stringify({code:200, error:'', results:[{cdk, code:200, cdk_status:'activated', product_name:'ChatGPT Plus', plan:'chatgptplusplan', order:{status:'failed', account:'buyer@example.com', product_name:'ChatGPT Plus', plan:'chatgptplusplan', finished_at:'2026-11-19T13:42:18Z', order_no:'ORD-USED', error:'失败原因见 https://api.easysub.site/status'}}]})});
  if(cdk==='FAIL') return request.respond({status:200, contentType:'application/json', headers:cors(origin), body:JSON.stringify({code:200, error:'', results:[{cdk, code:0, error:'EasySub 暂时失败，请访问 api.easysub.site'}]})});
  return request.respond({status:200, contentType:'application/json', headers:cors(origin), body:JSON.stringify({code:200, error:'', results:[]})});
 }
 return request.respond({status:500, contentType:'application/json', headers:cors(origin), body:'{}'});
});
async function fill(id, value){
 await page.waitForSelector('#'+id);
 await page.evaluate((fieldId, fieldValue) => {
  const field = document.getElementById(fieldId);
  field.value = fieldValue;
  field.dispatchEvent(new Event('input', {bubbles:true}));
 }, id, value);
}
async function submitCode(value){
 await fill('cdk', value);
 await page.click('#code-form button[type=submit]');
}
async function backToCode(){
 if(await page.$('#step-back')) await page.click('#step-back');
 await page.waitForSelector('#cdk');
}
function visibleLeak(text){return forbidden.test(text)}

try {
 await page.goto(base+'/redeem.html?Sales=AgentSale77', {waitUntil:'networkidle0'});
 const initial = await page.evaluate(() => document.body.innerText);
 check('entry omits the credential block', !initial.includes(removed) && !initial.includes(warning) && !visibleLeak(initial) && await page.$('.risk-note')===null, initial.slice(0, 240));
 check('entry does not promise secrecy', !initial.includes('不会存储') && !initial.includes('绝对保密') && !initial.includes('不会发给') && !initial.includes('不会发送'));

 await submitCode('Pan-OPEN');
 await page.waitForSelector('#session');
 const openai = await page.evaluate(() => {
  const note = document.getElementById('session-warning');
  const field = document.getElementById('session');
  const style = getComputedStyle(note);
  return {text:document.body.innerText, url:document.getElementById('session-url').textContent, warning:note.textContent, next:field.nextElementSibling===note, caption:note.classList.contains('caption'), risk:!!document.querySelector('.risk-note'), bg:style.backgroundColor, size:style.fontSize};
 });
 check('openai session keeps a compact note and the login link', openai.warning===warning && openai.next && openai.caption && openai.risk===false && openai.bg==='rgba(0, 0, 0, 0)' && openai.size==='14px' && openai.url==='https://chatgpt.com/api/auth/session' && openai.text.includes('chatgpt.com') && !openai.text.includes(removed) && !visibleLeak(openai.text), JSON.stringify(openai));
 await fill('session', sessionText);
 await page.click('#session-form button[type=submit]');
 await page.waitForSelector('#consent');
 const confirm = await page.evaluate(() => ({text:document.body.innerText, disabled:document.getElementById('confirm').disabled}));
 check('confirm still gates recharge with consent', confirm.disabled===true && confirm.text.includes('当前会员') && confirm.text.includes('即将充值') && confirm.text.includes('我已核对上述账号') && !confirm.text.includes(removed) && !visibleLeak(confirm.text));
 await page.click('#step-back');
 await page.waitForSelector('#session');
 await backToCode();

 await submitCode('Pan-CLAUDE');
 await page.waitForSelector('#session-url');
 const claude = await page.evaluate(() => ({url:document.getElementById('session-url').textContent, warning:document.getElementById('session-warning').textContent, text:document.body.innerText}));
 check('claude session names claude.ai only', claude.warning===warning && claude.url==='https://claude.ai/' && claude.text.includes('claude.ai') && !visibleLeak(claude.text));
 await backToCode();
 await submitCode('Pan-GROK');
 await page.waitForSelector('#session-url');
 const grok = await page.evaluate(() => ({url:document.getElementById('session-url').textContent, warning:document.getElementById('session-warning').textContent, text:document.body.innerText}));
 check('grok session names grok.com only', grok.warning===warning && grok.url==='https://grok.com/' && grok.text.includes('grok.com') && !visibleLeak(grok.text));
 await backToCode();

 await submitCode('LOCKED');
 await page.waitForFunction(() => document.getElementById('alert').textContent.includes('正在使用中'));
 check('locked status stays specific', (await page.$eval('#alert', el => el.textContent))==='CDK 正在使用中，请稍后再试');
 await submitCode('DOMAIN');
 await page.waitForFunction(() => document.getElementById('alert').textContent.includes('充值服务'));
 const domainAlert = await page.$eval('#alert', el => el.textContent);
 check('domain error keeps the retry and hides the service name', domainAlert.includes('请稍后再试') && domainAlert.includes('充值服务') && !visibleLeak(domainAlert) && !domainAlert.includes('https://'), domainAlert);
 await submitCode('HTML');
 await page.waitForFunction(() => document.getElementById('alert').textContent==='服务暂不可用，请稍后再试。');
 const htmlAlert = await page.$eval('#alert', el => el.textContent);
 check('html payload is not shown', htmlAlert==='服务暂不可用，请稍后再试。' && !htmlAlert.includes('accessToken') && !visibleLeak(htmlAlert));

 await submitCode('Pan-USED');
 await page.waitForSelector('#lookup-product');
 const used = await page.evaluate(() => document.body.innerText);
 check('used code still shows the order without the upstream host', used.includes('ChatGPT Plus') && used.includes('充值服务') && !visibleLeak(used) && !used.includes('https://api.easysub'));

 await page.click('#query-tab');
 await page.waitForSelector('#query-cdks');
 await fill('query-cdks', 'FAIL');
 await page.click('#query-form button[type=submit]');
 await page.waitForFunction(() => {const box=document.getElementById('query-results'); return box && box.innerText.includes('暂时失败')});
 const queried = await page.$eval('#query-results', el => el.innerText);
 check('query error hides the service name', queried.includes('暂时失败') && queried.includes('充值服务') && !visibleLeak(queried), queried);
 check('page has no console errors', pageErrors.length===0, pageErrors.join('\n'));
} finally {
 await browser.close();
 server.close();
}
if(failures.length){console.error(failures.map(item => 'FAIL '+item).join('\n')); process.exit(1)}
console.log('customer copy checks passed');
