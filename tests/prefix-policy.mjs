// Used-code prefix rule. Synthetic codes and mocked responses only.
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
function verifyFor(cdk){
 if(cdk==='USED' || cdk==='aBcD') return {code:0, error:'该CDK兑换已完成，请查询订单'};
 if(cdk==='MISSING') return {code:0, error:'CDK 不存在或不可用'};
 if(cdk==='LOCKED') return {code:0, error:'CDK 正在使用中，请稍后再试'};
 return {code:200, data:{activation_token:'act', expires_in:900, expires_at:'2026-11-20T12:00:00Z', provider:'openai', product_name:'ChatGPT Plus', plan:'chatgptplusplan'}};
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
  if(name==='verifyCdk'){
   const payload = verifyFor(body.cdk);
   return request.respond({status:200, contentType:'application/json', headers:cors(origin), body:JSON.stringify(payload)});
  }
  if(name==='queryOrder'){
   const results = (body.cdks||[]).map(cdk => ({
    cdk, code:200, error:'', cdk_status: cdk==='FRESH' || cdk==='GONE' ? 'unused' : 'activated',
    product_name: cdk==='FRESH' || cdk==='GONE' ? null : 'ChatGPT Plus',
    plan: cdk==='FRESH' || cdk==='GONE' ? null : 'chatgptplusplan',
    order: cdk==='FRESH' || cdk==='GONE' ? null : {status:'success', account:'buyer@example.com', product_name:'ChatGPT Plus', plan:'chatgptplusplan', finished_at:'2026-11-19T13:42:18Z', order_no:'ORD-'+cdk, cdk}
   }));
   return request.respond({status:200, contentType:'application/json', headers:cors(origin), body:JSON.stringify({code:200, error:'', results})});
  }
  return request.respond({status:500, contentType:'application/json', headers:cors(origin), body:'{}'});
 });
 await page.goto(base+'/redeem.html', {waitUntil:'networkidle0'});
 return page;
}
async function submitCode(page, value){
 await page.waitForSelector('#cdk');
 await page.evaluate(v => {
  const field = document.getElementById('cdk');
  field.value = v;
  field.dispatchEvent(new Event('input', {bubbles:true}));
  document.getElementById('code-form').requestSubmit();
 }, value);
}
function postsFor(name, cdk){return calls.filter(item => item.name===name && item.cdk===cdk)}

try {
 const page = await open();
 for(const sample of ['FRESH', 'Momoda-FRESH', 'PAN-FRESH']){
  const mark = calls.length;
  await submitCode(page, sample);
  await page.waitForSelector('#session');
  check(sample+' unused reaches session', await page.$eval('#stage', el => el.dataset.step)==='2');
  check(sample+' is sent without its prefix', postsFor('verifyCdk','FRESH').at(-1).body.cdk==='FRESH' && calls.length===mark+1);
  await page.click('#step-back');
  await page.waitForSelector('#cdk');
 }

 await submitCode(page, 'Pan-aBcD');
 await page.waitForSelector('#lookup-time');
 check('used Pan- shows the order', (await page.$eval('#lookup-time', el => el.textContent)).includes('北京时间') && postsFor('queryOrder','aBcD').length===1);
 check('used Pan- keeps the key case', postsFor('verifyCdk','aBcD').at(-1).body.cdk==='aBcD');
 await page.click('#lookup-retry');
 await page.waitForFunction(() => document.querySelectorAll('#lookup-time').length>0 && !document.getElementById('stage').getAttribute('aria-busy'));
 check('Pan recovery retries the normalized key', postsFor('queryOrder','aBcD').length===2 && postsFor('verifyCdk','aBcD').length===1);

 await page.click('#lookup-another');
 await page.waitForSelector('#cdk');
 const beforeMomoda = postsFor('queryOrder','USED').length;
 await submitCode(page, 'Momoda-USED');
 await page.waitForFunction(() => document.getElementById('alert').textContent==='兑换码识别异常，可以联系panplus5');
 const momodaView = await page.evaluate(() => ({alert:document.getElementById('alert').textContent, order:document.body.innerText.includes('ORD-USED'), product:!!document.getElementById('lookup-product'), session:!!document.getElementById('session')}));
 check('used Momoda- is only 兑换码识别异常，可以联系panplus5', momodaView.alert==='兑换码识别异常，可以联系panplus5' && momodaView.order===false && momodaView.product===false && momodaView.session===false, JSON.stringify(momodaView));
 check('used Momoda- is verified and not queried', postsFor('verifyCdk','USED').length===1 && postsFor('queryOrder','USED').length===beforeMomoda);

 await submitCode(page, 'USED');
 await page.waitForFunction(() => document.getElementById('alert').textContent==='兑换码识别异常，可以联系panplus5');
 check('used raw code is not queried', postsFor('queryOrder','USED').length===beforeMomoda && !((await page.evaluate(() => document.body.innerText)).includes('ORD-USED')));

 const missingMark = calls.length;
 await submitCode(page, 'Momoda-MISSING');
 await page.waitForFunction(() => !document.getElementById('alert').hidden);
 const missingAlert = await page.$eval('#alert', el => el.textContent);
 check('missing code uses the replacement message', missingAlert==='兑换码识别异常，可以联系panplus5' && calls.length===missingMark+1);
 await submitCode(page, 'LOCKED');
 await page.waitForFunction(() => document.getElementById('alert').textContent.includes('正在使用中'));
 check('locked code is not called used', (await page.$eval('#alert', el => el.textContent))!=='兑换码识别异常，可以联系panplus5');

 const emptyMark = calls.length;
 await submitCode(page, 'Pan-');
 await page.waitForFunction(() => document.getElementById('alert').textContent==='请输入有效的兑换码。');
 check('empty Pan- suffix is not sent', calls.length===emptyMark);
 await submitCode(page, 'xxPan-FRESH');
 await page.waitForSelector('#session');
 check('mid-prefix is the whole raw key', postsFor('verifyCdk','xxPan-FRESH').length===1);

 await page.click('#query-tab');
 await page.waitForSelector('#query-cdks');
 await page.evaluate(() => {document.getElementById('query-cdks').value='Pan-aBcD\nMomoda-USED\nGONE'; document.getElementById('query-form').requestSubmit()});
 await page.waitForFunction(() => {const box=document.getElementById('query-results'); return box && box.innerText.includes('ORD-aBcD') && box.innerText.includes('兑换码识别异常，可以联系panplus5')});
 const mixed = await page.$eval('#query-results', el => el.innerText);
 check('batch shows the Pan order only', mixed.includes('ORD-aBcD') && mixed.includes('兑换码识别异常，可以联系panplus5') && !mixed.includes('ORD-USED'));
 check('batch still shows a code with no order', mixed.includes('GONE') && !mixed.includes('ORD-USED'));
 const copied = await page.evaluate(() => {window.__copied=''; navigator.clipboard.writeText=async text=>{window.__copied=text}; return true});
 if(await page.$('#copy-missing')) await page.click('#copy-missing');
 const clip = await page.evaluate(() => window.__copied||'');
 check('copy does not include the hidden used code', !clip.includes('USED') && !clip.includes('ORD-USED'));
} finally {
 await browser.close();
 server.close();
}
if(failures.length){console.error(failures.map(item => 'FAIL '+item).join('\n')); process.exit(1)}
console.log('prefix policy checks passed');
