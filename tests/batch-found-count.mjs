// Batch found-order count. Placeholder codes and mocked responses only.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const puppeteer = (await import(pathToFileURL(process.env.PUPPETEER_CORE || '/tmp/pwtest/node_modules/puppeteer-core/lib/esm/puppeteer/puppeteer-core.js').href)).default;
const secrets = {
 AAA:'secret-account-aaa@hidden.test',
 BBB:'secret-account-bbb@hidden.test',
 PAN:'pan-buyer@example.com'
};

function type(file){
 if(file.endsWith('.js')) return 'text/javascript; charset=utf-8';
 if(file.endsWith('.css')) return 'text/css; charset=utf-8';
 if(file.endsWith('.wasm')) return 'application/wasm';
 return 'text/html; charset=utf-8';
}
function cors(origin){return {'Access-Control-Allow-Origin':origin||'*','Access-Control-Allow-Headers':'Content-Type','Access-Control-Allow-Methods':'POST, OPTIONS'}}
function orderFor(cdk){
 if(cdk==='NONE' || cdk==='FAIL' || cdk==='BARE') return null;
 const account = cdk==='PAN' ? secrets.PAN : cdk==='BBB' ? secrets.BBB : secrets.AAA;
 return {status:'success', account, product_name:'Hidden '+cdk+' Plus', plan:'chatgptplusplan', finished_at:'2026-11-19T13:42:18Z', order_no:'ORD-'+cdk, cdk, payment_card:'4242424242424242'};
}
const server = http.createServer((req, res) => {
 const url = new URL(req.url, 'http://127.0.0.1');
 const file = path.join(root, decodeURIComponent(url.pathname).replace(/^\/+/, '') || 'index.html');
 if(!file.startsWith(root) || !fs.existsSync(file) || fs.statSync(file).isDirectory()){res.writeHead(404); res.end(); return}
 res.writeHead(200, {'Content-Type':type(file), 'Cache-Control':'no-store'});
 fs.createReadStream(file).pipe(res);
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await puppeteer.launch({executablePath:process.env.CHROME || '/usr/local/bin/google-chrome', headless:true, protocolTimeout:30000, args:['--no-sandbox','--disable-dev-shm-usage']});
const failures = [];
const check = (name, ok, detail='') => {if(!ok) failures.push(name+(detail?`: ${detail}`:'')); else console.log('ok', name)};

async function open(){
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
  if(name!=='queryOrder') return request.respond({status:500, contentType:'application/json', headers:cors(origin), body:'{}'});
  if((body.cdks||[]).includes('NET')) return request.abort('failed');
  const results = (body.cdks||[]).map(cdk => {
   if(cdk==='FAIL') return {cdk, code:0, error:'这一条查询超时', cdk_status:'unused', order:null};
   const order = orderFor(cdk);
   return {cdk, code:200, error:'', cdk_status:order?'activated':cdk==='BARE'?'activated':'unused', order};
  });
  return request.respond({status:200, contentType:'application/json', headers:cors(origin), body:JSON.stringify({code:200, error:'', results})});
 });
 await page.goto(base+'/redeem.html', {waitUntil:'networkidle0'});
 await page.evaluate(() => {window.__copied=''; navigator.clipboard.writeText=async text=>{window.__copied=text}});
 await page.click('#query-tab');
 await page.waitForSelector('#query-cdks');
 return page;
}
async function query(page, value){
 await page.evaluate(text => {document.getElementById('query-cdks').value=text; document.getElementById('query-form').requestSubmit()}, value);
 await page.waitForFunction(() => {const box=document.getElementById('found-count')||document.getElementById('query-results'); return box && box.innerText.trim().length>0});
}
function leaked(text){return text.includes(secrets.AAA) || text.includes(secrets.BBB) || text.includes('ORD-AAA') || text.includes('ORD-BBB') || text.includes('Hidden AAA') || text.includes('Hidden BBB')}

try {
 const nonPan = await open();
 await query(nonPan, 'Momoda-AAA\nBBB');
 const nonPanText = await nonPan.$eval('#query-results', el => el.innerText);
 const nonPanHtml = await nonPan.$eval('#query-results', el => el.innerHTML);
 check('non-Pan orders are count only', nonPanText.includes('有2个找到订单') && !leaked(nonPanText) && !leaked(nonPanHtml) && !nonPanText.includes('Momoda-AAA'), nonPanText);
 await nonPan.close();

 const pan = await open();
 await query(pan, 'Pan-PAN');
 const panText = await pan.$eval('#query-results', el => el.innerText);
 check('Pan- order details stay visible', panText.includes('有1个找到订单') && panText.includes('ORD-PAN') && panText.includes(secrets.PAN) && panText.includes('北京时间'));
 await pan.evaluate(() => document.querySelector('.query-copy').click());
 const panCopy = await pan.evaluate(() => window.__copied);
 check('copy includes only the Pan order', panCopy.includes('ORD-PAN') && panCopy.includes(secrets.PAN) && !panCopy.includes('AAA'));
 await pan.close();

 const mixed = await open();
 await query(mixed, 'Momoda-AAA\nPan-PAN\nNONE\nFAIL\nBARE');
 const mixedText = await mixed.$eval('#query-results', el => el.innerText);
 const mixedHtml = await mixed.$eval('#query-results', el => el.innerHTML);
 check('mixed batch counts both orders and shows only Pan', mixedText.includes('有2个找到订单') && mixedText.includes('ORD-PAN') && mixedText.includes('NONE') && mixedText.includes('FAIL') && mixedText.includes('BARE') && !leaked(mixedText) && !leaked(mixedHtml));
 check('no record stays missing and the error stays failed', mixedText.includes('未找到订单') && mixedText.includes('查询失败') && !mixedText.includes('ORD-NONE'));
 await mixed.evaluate(() => {const button=document.getElementById('copy-missing'); if(button)button.click()});
 const missingCopy = await mixed.evaluate(() => window.__copied);
 check('copy missing does not include counted codes', !missingCopy.includes('AAA') && !missingCopy.includes('ORD-') && missingCopy.includes('NONE'), missingCopy);
 await mixed.evaluate(() => {const field=document.getElementById('query-cdks'); field.value='Pan-PAN edited'; field.dispatchEvent(new Event('input',{bubbles:true}))});
 const cleared = await mixed.$eval('#query-results', el => el.innerText);
 check('editing the batch clears the previous orders', cleared==='' && !cleared.includes('ORD-PAN'));
 await mixed.close();

 const downgrade = await open();
 await query(downgrade, 'Pan-AAA\nMomoda-AAA');
 const downText = await downgrade.$eval('#query-results', el => el.innerText);
 const downHtml = await downgrade.$eval('#query-results', el => el.innerHTML);
 check('a later non-Pan line removes detail permission', downText.includes('有1个找到订单') && !leaked(downText) && !leaked(downHtml));
 await downgrade.close();

 const noUpgrade = await open();
 await query(noUpgrade, 'BBB\nPan-BBB');
 const upText = await noUpgrade.$eval('#query-results', el => el.innerText);
 const upHtml = await noUpgrade.$eval('#query-results', el => el.innerHTML);
 check('a later Pan line cannot reveal an earlier code', upText.includes('有1个找到订单') && !leaked(upText) && !leaked(upHtml));
 await noUpgrade.close();
} finally {
 await browser.close();
 server.close();
}
if(failures.length){console.error(failures.map(item => 'FAIL '+item).join('\n')); process.exit(1)}
console.log('batch found count checks passed');
