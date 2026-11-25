// Linked CDK verification. Placeholder codes and mocked responses only.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const puppeteer = (await import(pathToFileURL(process.env.PUPPETEER_CORE || '/tmp/pwtest/node_modules/puppeteer-core/lib/esm/puppeteer/puppeteer-core.js').href)).default;
const problem = '兑换码有问题，可以联系销售更换账号';
const calls = [];

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
 if(cdk==='USED' || cdk==='aBcD') return {code:0, error:'该CDK兑换已完成，请查询订单'};
 if(cdk==='MISSING') return {code:0, error:'CDK 不存在或不可用'};
 if(cdk==='LOCKED') return {code:0, error:'CDK 正在使用中，请稍后再试'};
 return {code:200, data:{activation_token:'act', expires_in:900, expires_at:'2026-11-20T12:00:00Z', provider:'openai', product_name:'ChatGPT Plus', plan:'chatgptplusplan'}};
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

async function open(search, statusFor){
 const page = await browser.newPage();
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
  calls.push({name, body, cdk:body.cdk||body.cdks?.[0]||''});
  if(statusFor && name==='verifyCdk' && statusFor[body.cdk]) return request.respond({status:statusFor[body.cdk], contentType:'application/json', headers:cors(origin), body:'{}'});
  if(name==='verifyCdk') return request.respond({status:200, contentType:'application/json', headers:cors(origin), body:JSON.stringify(verifyFor(body.cdk))});
  if(name==='precheckAccount' || name==='redeem') return request.respond({status:500, contentType:'application/json', headers:cors(origin), body:JSON.stringify({code:0, error:'should not run'})});
  if(name==='queryOrder'){
   const cdk = body.cdks?.[0] || '';
   const order = cdk==='aBcD' ? {status:'success', account:'buyer@example.com', product_name:'ChatGPT Plus', plan:'chatgptplusplan', finished_at:'2026-11-19T13:42:18Z', order_no:'ORD-'+cdk, cdk} : null;
   return request.respond({status:200, contentType:'application/json', headers:cors(origin), body:JSON.stringify({code:200, error:'', results:[{cdk, code:200, cdk_status:order?'activated':'unused', product_name:order?'ChatGPT Plus':null, order}]})});
  }
  return request.respond({status:500, contentType:'application/json', headers:cors(origin), body:'{}'});
 });
 await page.goto(base+'/redeem.html'+search, {waitUntil:'networkidle0'});
 return page;
}
function posts(name, cdk){return calls.filter(item => item.name===name && (!cdk || item.cdk===cdk))}

try {
 const mark = calls.length;
 const linked = await open('?Sales=AgentSale77&cdk=Pan-EXAMPLE');
 await linked.waitForSelector('#session');
 const linkedView = await linked.evaluate(() => ({
  url:location.href,
  field:document.getElementById('cdk')?document.getElementById('cdk').value:'',
  step:document.getElementById('stage').dataset.step,
  state:JSON.stringify(history.state||{}),
  sales:document.querySelector('.wxid').textContent,
  referrer:document.querySelector('meta[name=referrer]').content,
  session:!!document.getElementById('session'),
  confirm:!!document.getElementById('confirm')
 }));
 check('linked code verifies once and opens session', linkedView.step==='2' && linkedView.session && !linkedView.confirm && posts('verifyCdk','EXAMPLE').length===1 && posts('precheckAccount').length===0 && posts('redeem').length===0, JSON.stringify(linkedView));
 check('linked code leaves the address without the code', !linkedView.url.includes('cdk=') && !linkedView.url.includes('EXAMPLE') && linkedView.url.includes('Sales=AgentSale77') && linkedView.sales==='AgentSale77' && !linkedView.state.includes('EXAMPLE') && linkedView.referrer==='no-referrer', linkedView.url);
 const afterLink = calls.length;
 await linked.goBack();
 await linked.waitForSelector('#cdk');
 await linked.goForward();
 await linked.waitForSelector('#session');
 check('back and forward do not verify again', calls.length===afterLink && posts('verifyCdk','EXAMPLE').length===1);
 await linked.goBack();
 await linked.waitForSelector('#cdk');
 await linked.evaluate(() => {
  const field = document.getElementById('cdk');
  field.value = 'MANUAL-NEW';
  field.dispatchEvent(new Event('input', {bubbles:true}));
  document.getElementById('code-form').requestSubmit();
 });
 await linked.waitForSelector('#session');
 check('manual retry still verifies', posts('verifyCdk','MANUAL-NEW').length===1 && posts('precheckAccount').length===0);
 await linked.close();

 const encoded = await open('?CDK=Momoda-AbC%2Bkey&Sales=AgentSale77');
 await encoded.waitForSelector('#session');
 check('encoded prefix is stripped once and case is kept', posts('verifyCdk','AbC+key').length===1 && (await encoded.evaluate(() => location.href)).includes('Sales=AgentSale77') && !(await encoded.evaluate(() => location.href)).toLowerCase().includes('cdk='));
 await encoded.close();

 for(const search of ['', '?cdk=', '?cdk=%20', '?Sales=AgentSale77&cdk=']){
  const blankMark = calls.length;
  const blank = await open(search);
  await blank.waitForSelector('#cdk');
  await new Promise(resolve => setTimeout(resolve, 200));
  const blankView = await blank.evaluate(() => ({value:document.getElementById('cdk').value, hidden:document.getElementById('alert').hidden, session:!!document.getElementById('session')}));
  check('empty or missing cdk does not verify '+search, calls.length===blankMark && blankView.value==='' && blankView.hidden && !blankView.session, JSON.stringify(blankView));
  await blank.close();
 }

 const usedPan = await open('?cdk=Pan-aBcD&Sales=AgentSale77');
 await usedPan.waitForSelector('#lookup-time');
 check('linked used Pan- shows the order', (await usedPan.$eval('#lookup-time', el => el.textContent)).includes('北京时间') && posts('queryOrder','aBcD').length===1 && posts('verifyCdk','aBcD').length===1);
 await usedPan.close();

 const usedRaw = await open('?cdk=USED');
 await usedRaw.waitForFunction(() => document.getElementById('alert').textContent==='兑换码有问题，可以联系销售更换账号');
 check('linked used raw code shows only the problem message', posts('verifyCdk','USED').length===1 && posts('queryOrder','USED').length===0 && await usedRaw.$('#lookup-product')===null);
 await usedRaw.close();

 const missing = await open('?cdk=Momoda-MISSING');
 await missing.waitForFunction(() => document.getElementById('alert').textContent==='兑换码有问题，可以联系销售更换账号');
 check('linked missing code uses the same message', posts('verifyCdk','MISSING').length===1 && posts('queryOrder','MISSING').length===0);
 await missing.close();

 const locked = await open('?cdk=LOCKED');
 await locked.waitForFunction(() => document.getElementById('alert').textContent.includes('正在使用中'));
 check('linked locked code stays a lock message', (await locked.$eval('#alert', el => el.textContent))!==problem && posts('queryOrder','LOCKED').length===0);
 await locked.close();

 const down = await open('?cdk=Pan-DOWN', {DOWN:503});
 await down.waitForFunction(() => !document.getElementById('alert').hidden);
 const downText = await down.$eval('#alert', el => el.textContent);
 check('linked service failure is not called a bad code', downText!==problem && downText.includes('稍后再试') && await down.$('#session')===null, downText);
 const downCalls = calls.filter(item => item.cdk==='DOWN').length;
 await down.goBack().catch(()=>{});
 await new Promise(resolve => setTimeout(resolve, 200));
 check('a failed link does not verify itself again', calls.filter(item => item.cdk==='DOWN').length===downCalls);
 await down.close();

 const preview = await open('?cdk=Pan-EXAMPLE#preview=step1');
 await preview.waitForSelector('#preview-note');
 await new Promise(resolve => setTimeout(resolve, 200));
 check('preview does not verify a linked code', posts('verifyCdk','EXAMPLE').length===1 && !(await preview.evaluate(() => location.href)).includes('cdk='));
 await preview.close();
} finally {
 await browser.close();
 server.close();
}
if(failures.length){console.error(failures.map(item => 'FAIL '+item).join('\n')); process.exit(1)}
console.log('cdk link checks passed');
