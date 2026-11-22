// Pan- prefix checks. Synthetic codes and mocked responses only.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const puppeteer = (await import(pathToFileURL(process.env.PUPPETEER_CORE || '/tmp/pwtest/node_modules/puppeteer-core/lib/esm/puppeteer/puppeteer-core.js').href)).default;
const calls = [];
function type(file){
 if(file.endsWith('.js')) return 'text/javascript; charset=utf-8';
 if(file.endsWith('.css')) return 'text/css; charset=utf-8';
 if(file.endsWith('.wasm')) return 'application/wasm';
 return 'text/html; charset=utf-8';
}
function cors(origin){return {'Access-Control-Allow-Origin':origin||'*','Access-Control-Allow-Headers':'Content-Type','Access-Control-Allow-Methods':'POST, OPTIONS'}}
const server = http.createServer((req, res) => {
 const url = new URL(req.url, 'http://127.0.0.1');
 const file = path.join(root, decodeURIComponent(url.pathname).replace(/^\/+/, '') || 'index.html');
 if(!file.startsWith(root) || !fs.existsSync(file) || fs.statSync(file).isDirectory()){res.writeHead(404);res.end();return}
 res.writeHead(200, {'Content-Type':type(file),'Cache-Control':'no-store'});
 fs.createReadStream(file).pipe(res);
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await puppeteer.launch({executablePath:process.env.CHROME || '/usr/local/bin/google-chrome', headless:true, protocolTimeout:30000, args:['--no-sandbox','--disable-dev-shm-usage']});
const failures = [];
const check = (name, ok, detail='') => {if(!ok) failures.push(name+(detail?`: ${detail}`:'')); else console.log('ok', name)};

async function open(){
 const page = await browser.newPage();
 await page.setViewport({width:1280, height:800});
 await page.setRequestInterception(true);
 page.on('request', request => {
  const target = request.url();
  if(!target.includes('/api/v1/sub/')) return request.continue();
  const origin = request.headers().origin || '*';
  if(request.method()==='OPTIONS') return request.respond({status:204, headers:cors(origin)});
  const name = target.split('/api/v1/sub/')[1].split('?')[0];
  let body = {};
  try{body = JSON.parse(request.postData()||'{}')}catch{}
  calls.push({name, body, cdk: body.cdk || body.cdks?.[0] || ''});
  if(name==='verifyCdk' && body.cdk==='USED'){
   return request.respond({status:200, contentType:'application/json', headers:cors(origin), body:JSON.stringify({code:0, error:'该CDK兑换已完成，请查询订单'})});
  }
  if(name==='verifyCdk'){
   return request.respond({status:200, contentType:'application/json', headers:cors(origin), body:JSON.stringify({code:200, data:{activation_token:'act', expires_in:900, expires_at:'2026-11-20T12:00:00Z', provider:'openai', product_name:'ChatGPT Plus', plan:'chatgptplusplan'}})});
  }
  if(name==='queryOrder'){
   const cdk = body.cdks?.[0];
   const order = cdk==='KEEP'
    ? {status:'success', account:'buyer@example.com', product_name:'ChatGPT Plus', plan:'chatgptplusplan', finished_at:'2026-11-19T13:42:18Z', order_no:'ORD-KEEP', cdk}
    : null;
   return request.respond({status:200, contentType:'application/json', headers:cors(origin), body:JSON.stringify({code:200, error:'', results:[{cdk, code:200, error:'', cdk_status:order?'activated':'unused', product_name:order?'ChatGPT Plus':null, plan:order?'chatgptplusplan':null, order}]})});
  }
  return request.respond({status:500, contentType:'application/json', headers:cors(origin), body:'{}'});
 });
 await page.goto(base+'/redeem.html', {waitUntil:'networkidle0'});
 return page;
}
async function submitCode(page, value){
 await page.evaluate(v => {
  const field = document.getElementById('cdk');
  field.value = v;
  field.dispatchEvent(new Event('input', {bubbles:true}));
  document.getElementById('code-form').requestSubmit();
 }, value);
}

try {
 const page = await open();
 const before = calls.length;
 for(const bad of ['Momoda-AbC', 'momoda-AbC', 'RAWKEY', 'Pan-', 'xxPan-AbC', '  bare-key  ']){
  const mark = calls.length;
  await submitCode(page, bad);
  await page.waitForFunction(() => document.getElementById('alert').textContent==='CKD 有异常');
  check(bad+' makes no request', calls.length===mark);
  check(bad+' message is exact', await page.$eval('#alert', el => el.textContent)==='CKD 有异常');
 }
 check('denied inputs added no calls', calls.length===before);

 await submitCode(page, 'Pan-KEEP');
 await page.waitForSelector('#session');
 check('Pan- strips once and keeps case', calls.at(-1).body.cdk==='KEEP');
 const shown = await page.$eval('#sheet-intro', el => el.textContent);
 check('verified head names the product', shown.includes('ChatGPT Plus'));
 await page.click('#step-back');
 await page.waitForSelector('#cdk');
 await submitCode(page, 'Momoda-KEEP');
 await page.waitForFunction(() => document.getElementById('alert').textContent==='CKD 有异常');
 const afterBad = await page.evaluate(() => ({
  intro: document.getElementById('sheet-intro').textContent,
  session: !!document.getElementById('session'),
  product: document.body.innerText.includes('ChatGPT Plus')
 }));
 check('invalid input clears the verified product', afterBad.intro!==shown && !afterBad.intro.includes('ChatGPT Plus') && afterBad.session===false && afterBad.product===false, JSON.stringify(afterBad));

 await page.click('#query-tab');
 await page.waitForSelector('#query-cdks');
 await page.evaluate(() => {document.getElementById('query-cdks').value='PAN-KEEP\nMomoda-SECRET\nraw-secret'; document.getElementById('query-form').requestSubmit()});
 await page.waitForSelector('.query-summary');
 const mixed = await page.$eval('#query-results', el => el.textContent);
 check('mixed batch queries only the Pan code', calls.filter(item => item.name==='queryOrder').at(-1).body.cdks.join()==='KEEP');
 check('mixed batch hides invalid text', mixed.includes('ORD-KEEP') && mixed.includes('CKD 有异常') && !mixed.includes('Momoda-SECRET') && !mixed.includes('raw-secret'));
 const afterOrders = calls.length;
 await page.evaluate(() => {document.getElementById('query-cdks').value='Momoda-ONLY'; document.getElementById('query-form').requestSubmit()});
 await page.waitForFunction(() => document.getElementById('invalid-keys') && document.getElementById('invalid-keys').textContent==='CKD 有异常');
 const cleared = await page.$eval('#query-results', el => el.textContent);
 check('invalid query clears the previous order', !cleared.includes('ORD-KEEP') && cleared==='CKD 有异常', cleared);
 check('invalid query sends nothing', calls.length===afterOrders);

 const recovered = await open();
 await recovered.evaluate(() => {
  sessionStorage.setItem('jmm.redeem.flow.v1', JSON.stringify({nonce:'abcdefghijklmnopqrstuv', cdk:'KEEP', cdkInput:'not-a-prefix', cdkNormalized:true, uncertain:true}));
 });
 await recovered.reload({waitUntil:'networkidle0'});
 check('raw saved input is not placed in the public field', await recovered.$eval('#cdk', el => el.value)==='');
 await recovered.click('#resume');
 await recovered.waitForFunction(() => document.body.innerText.includes('ORD-KEEP'));
 check('stored normalized key is still queried', calls.filter(item => item.name==='queryOrder' && item.cdk==='KEEP').length>=1);
} finally {
 await browser.close();
 server.close();
}
if(failures.length){console.error(failures.map(item => 'FAIL '+item).join('\n')); process.exit(1)}
console.log('prefix policy checks passed');
