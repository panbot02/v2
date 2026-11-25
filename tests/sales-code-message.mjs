// Sales id inside the abnormal-code message. Placeholder codes and mocked responses only.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const puppeteer = (await import(pathToFileURL(process.env.PUPPETEER_CORE || '/tmp/pwtest/node_modules/puppeteer-core/lib/esm/puppeteer/puppeteer-core.js').href)).default;
const message = id => '兑换码识别异常，可以联系'+id;

function type(file){
 if(file.endsWith('.js')) return 'text/javascript; charset=utf-8';
 if(file.endsWith('.css')) return 'text/css; charset=utf-8';
 if(file.endsWith('.wasm')) return 'application/wasm';
 if(file.endsWith('.webp')) return 'image/webp';
 if(file.endsWith('.png')) return 'image/png';
 return 'text/html; charset=utf-8';
}
function cors(origin){return {'Access-Control-Allow-Origin':origin||'*','Access-Control-Allow-Headers':'Content-Type','Access-Control-Allow-Methods':'POST, OPTIONS'}}
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
const calls = [];

async function open(search){
 const page = await browser.newPage();
 const dialogs = [];
 page.on('dialog', async dialog => { dialogs.push(dialog.message()); await dialog.dismiss(); });
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
  calls.push({name, cdk:body.cdk||body.cdks?.[0]||''});
  if(name==='verifyCdk'){
   const payload = body.cdk==='FRESH' ? {code:200, data:{activation_token:'act', expires_in:900, expires_at:'2026-11-20T12:00:00Z', provider:'openai', product_name:'ChatGPT Plus', plan:'chatgptplusplan'}} : {code:0, error:body.cdk==='LOCKED' ? 'CDK 正在使用中，请稍后再试' : body.cdk==='aBcD' ? '该CDK兑换已完成，请查询订单' : '该CDK兑换已完成，请查询订单'};
   if(body.cdk==='MISSING') payload.error = 'CDK 不存在或不可用';
   return request.respond({status:200, contentType:'application/json', headers:cors(origin), body:JSON.stringify(payload.code===200?payload:{code:0, error:payload.error})});
  }
  if(name==='queryOrder'){
   const results = (body.cdks||[]).map(cdk => {
    const panOrder = cdk==='aBcD';
    const hidden = cdk==='USED';
    const order = panOrder||hidden ? {status:'success', product_name:'ChatGPT Plus', plan:'chatgptplusplan', finished_at:'2026-11-19T13:42:18Z', order_no:panOrder?'ORD-aBcD':'ORD-USED', cdk} : null;
    return {cdk, code:200, cdk_status:order?'activated':'unused', order};
   });
   return request.respond({status:200, contentType:'application/json', headers:cors(origin), body:JSON.stringify({code:200, error:'', results})});
  }
  return request.respond({status:500, contentType:'application/json', headers:cors(origin), body:'{}'});
 });
 await page.goto(base+'/redeem.html'+search, {waitUntil:'networkidle0'});
 page.__dialogs = () => dialogs;
 return page;
}
async function shown(page){
 return page.evaluate(() => ({
  alert:document.getElementById('alert')?.textContent||'',
  wx:document.querySelector('.wxid').textContent,
  url:location.href,
  link:document.querySelector('.sales-link')?.href||'',
  html:document.body.querySelector('img,script') ? 'injected' : ''
 }));
}

try {
 const lower = await open('?sales=weiXin01&cdk=USED');
 await lower.waitForFunction(text => document.getElementById('alert').textContent===text, {}, message('weiXin01'));
 let view = await shown(lower);
 check('lowercase sales is the WeChat in the automatic message', view.alert===message('weiXin01') && view.wx===view.alert.slice('兑换码识别异常，可以联系'.length) && view.url.includes('sales=weiXin01') && !view.url.toLowerCase().includes('cdk=') && view.link.includes('Sales=weiXin01'), JSON.stringify(view));
 check('automatic used code does not look up an order', calls.filter(item => item.name==='queryOrder').length===0 && calls.filter(item => item.name==='verifyCdk' && item.cdk==='USED').length===1);
 await lower.close();

 const upper = await open('?Sales=WeiXin02');
 await upper.waitForSelector('#cdk');
 await upper.evaluate(() => {const field=document.getElementById('cdk'); field.value='Momoda-USED'; field.dispatchEvent(new Event('input',{bubbles:true})); document.getElementById('code-form').requestSubmit()});
 await upper.waitForFunction(text => document.getElementById('alert').textContent===text, {}, message('WeiXin02'));
 view = await shown(upper);
 check('uppercase Sales matches the manual message and the page WeChat', view.alert===message('WeiXin02') && view.wx==='WeiXin02' && view.link.includes('Sales=WeiXin02'));
 await upper.close();

 for(const search of ['', '?sales=', '?sales=%20', '?Sales=']){
  const page = await open(search);
  await page.evaluate(() => {const field=document.getElementById('cdk'); field.value='MISSING'; field.dispatchEvent(new Event('input',{bubbles:true})); document.getElementById('code-form').requestSubmit()});
  await page.waitForFunction(text => document.getElementById('alert').textContent===text, {}, message('panplus5'));
  view = await shown(page);
  check('missing or empty sales uses panplus5 '+search, view.alert===message('panplus5') && view.wx==='panplus5', JSON.stringify(view));
  await page.close();
 }

 const nasty = '<img src=x onerror=alert(1)>';
 const injected = await open('?sales='+encodeURIComponent(nasty));
 await injected.evaluate(() => {const field=document.getElementById('cdk'); field.value='USED'; field.dispatchEvent(new Event('input',{bubbles:true})); document.getElementById('code-form').requestSubmit()});
 await injected.waitForFunction(text => document.getElementById('alert').textContent===text, {}, message(nasty));
 await injected.click('#query-tab');
 await injected.waitForSelector('#query-cdks');
 await injected.evaluate(() => {document.getElementById('query-cdks').value='Pan-aBcD\nMomoda-USED'; document.getElementById('query-form').requestSubmit()});
 await injected.waitForFunction(text => {const box=document.getElementById('invalid-keys'); return box && box.textContent===text}, {}, message(nasty));
 const safe = await injected.evaluate(text => ({
  alert:document.getElementById('alert').textContent,
  box:document.getElementById('invalid-keys').textContent,
  images:document.querySelectorAll('#invalid-keys img, #alert img').length,
  scripts:document.querySelectorAll('#invalid-keys script, #alert script').length,
  order:document.getElementById('query-results').innerText.includes('ORD-aBcD'),
  hidden:!document.getElementById('query-results').innerText.includes('ORD-USED')
 }), message(nasty));
 check('batch and manual messages stay plain text', safe.alert===message(nasty) && safe.box===message(nasty) && safe.images===0 && safe.scripts===0 && safe.order && safe.hidden && injected.__dialogs().length===0, JSON.stringify(safe));
 await injected.close();

 const fresh = await open('?sales=FreshWx&cdk=FRESH');
 await fresh.waitForSelector('#session');
 check('lowercase sales still verifies an unused linked code once', calls.filter(item => item.cdk==='FRESH' && item.name==='verifyCdk').length===1 && (await shown(fresh)).wx==='FreshWx');
 const before = calls.length;
 await fresh.goBack();
 await fresh.waitForSelector('#cdk');
 await fresh.goForward();
 await fresh.waitForSelector('#session');
 check('sales link does not verify again', calls.length===before);
 await fresh.close();
} finally {
 await browser.close();
 server.close();
}
if(failures.length){console.error(failures.map(item => 'FAIL '+item).join('\n')); process.exit(1)}
console.log('sales code message checks passed');
