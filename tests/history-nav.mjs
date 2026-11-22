// Browser history for the recharge card. Synthetic codes and mocked responses only.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const puppeteer = (await import(pathToFileURL(process.env.PUPPETEER_CORE || '/tmp/pwtest/node_modules/puppeteer-core/lib/esm/puppeteer/puppeteer-core.js').href)).default;
const sales = 'AgentSale77';
const sessionText = '{"accessToken":"synthetic-session-token","user":"not-real"}';
const code = 'Pan-HistKey';
let redeemCalls = 0;
let precheckCalls = 0;
let holdPrecheck = null;
let releasePrecheck = () => {};
let precheckSeen = () => {};
let holdRedeem = null;
let releaseRedeem = () => {};
let redeemSeen = () => {};

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

async function open(pathname){
 const page = await browser.newPage();
 await page.setViewport({width:1280, height:900, deviceScaleFactor:1});
 await page.evaluateOnNewDocument(() => localStorage.setItem('t','light'));
 await page.setRequestInterception(true);
 page.on('request', async request => {
  const target = request.url();
  if(!target.includes('/api/v1/sub/')) return request.continue();
  const origin = request.headers().origin || '*';
  if(request.method()==='OPTIONS') return request.respond({status:204, headers:cors(origin)});
  const name = target.split('/api/v1/sub/')[1].split('?')[0];
  if(name==='verifyCdk') return request.respond(json({activation_token:'act-test', expires_in:900, expires_at:'2026-11-20T12:00:00Z', provider:'openai', product_name:'ChatGPT Plus', plan:'chatgptplusplan'}, origin));
  if(name==='precheckAccount'){
   precheckCalls += 1;
   precheckSeen();
   if(holdPrecheck) await holdPrecheck;
   return request.respond(json({email:'buyer@example.com', name:'Buyer', plan_type:'free', subscription_plan:'free', has_active_subscription:false, eligible:true}, origin));
  }
  if(name==='redeem'){
   redeemCalls += 1;
   redeemSeen();
   if(holdRedeem) await holdRedeem;
   return request.respond(json({order_query_token:'qt-test', order_no:'JMMTEST1', provider:'openai', product_name:'ChatGPT Plus', plan:'chatgptplusplan'}, origin));
  }
  if(name==='redeemResult') return request.respond(json({order:{status:'success', account:'buyer@example.com', product_name:'ChatGPT Plus', plan:'chatgptplusplan', payment_card:'4242424242424242', finished_at:'2026-11-19T13:42:18Z', order_no:'JMMTEST1'}}, origin));
  if(name==='queryOrder') return request.respond({status:200, contentType:'application/json', headers:cors(origin), body:JSON.stringify({code:200, error:'', results:[]})});
  return request.respond({status:500, contentType:'application/json', headers:cors(origin), body:'{}'});
 });
 await page.goto(base+pathname, {waitUntil:'networkidle0'});
 return page;
}
function armPrecheck(){holdPrecheck = new Promise(resolve => {releasePrecheck = resolve}); precheckSeen = () => {}}
function armRedeem(){holdRedeem = new Promise(resolve => {releaseRedeem = resolve}); redeemSeen = () => {}}
async function fill(page, id, value){
 await page.waitForSelector('#'+id);
 await page.evaluate((fieldId, fieldValue) => {
  const field = document.getElementById(fieldId);
  field.value = fieldValue;
  field.dispatchEvent(new Event('input', {bubbles:true}));
 }, id, value);
}
async function stateOf(page){
 return page.evaluate(() => ({step:history.state?.step||'', root:history.state?.root===true, keys:history.state?Object.keys(history.state).sort():[], raw:JSON.stringify(history.state||{}), url:location.href, length:history.length, view:document.getElementById('stage')?.dataset.view||'', stored:sessionStorage.getItem('jmm.redeem.flow.v1')||'', local:JSON.stringify(localStorage)}));
}
function cleanState(raw){
 return !raw.includes('synthetic-session-token') && !raw.includes('HistKey') && !raw.includes('accessToken') && !raw.includes('buyer@example.com') && !raw.includes('qt-test') && !raw.includes('secret-token') && !raw.includes('SECRET');
}

try {
 const page = await open(`/index.html?Sales=${encodeURIComponent(sales)}`);
 await Promise.all([page.waitForNavigation({waitUntil:'networkidle0'}), page.click('#self-redeem')]);
 await page.waitForSelector('#cdk');
 let state = await stateOf(page);
 check('arrival replaces the code step without trapping', state.step==='code' && state.root===true && state.view==='code', JSON.stringify(state));
 check('history state has no secrets or code', state.keys.join()==='app,ref,root,step' && cleanState(state.raw) && !state.url.includes('Hist') && state.url.includes('Sales='+sales), state.raw+' '+state.url);
 const codeLength = state.length;

 await fill(page, 'cdk', code);
 await page.click('#code-form button[type=submit]');
 await page.waitForSelector('#session');
 state = await stateOf(page);
 check('verify pushes the session step', state.step==='session' && state.root===false && state.length===codeLength+1 && cleanState(state.raw), JSON.stringify(state));
 await fill(page, 'session', sessionText);
 const beforeBack = await page.evaluate(() => history.length);
 await page.click('#step-back');
 await page.waitForSelector('#cdk');
 state = await stateOf(page);
 check('in-page back returns to the code step without a new entry', state.step==='code' && state.length===beforeBack && (await page.$eval('#cdk', el => el.value))===code, JSON.stringify(state));
 await page.click('#code-form button[type=submit]');
 await page.waitForSelector('#session');
 check('session text stays in memory', await page.$eval('#session', el => el.value)===sessionText);
 await page.click('#session-form button[type=submit]');
 await page.waitForSelector('#consent');
 state = await stateOf(page);
 const consent = await page.$eval('#confirm', el => el.disabled);
 check('confirm is its own step and consent starts unchecked', state.step==='confirm' && consent===true && cleanState(state.raw) && !state.stored.includes('synthetic-session-token') && !state.local.includes('synthetic'), JSON.stringify(state));

 await page.goBack();
 await page.waitForSelector('#session');
 check('browser back from confirm returns to session', (await stateOf(page)).step==='session' && await page.$eval('#session', el => el.value)===sessionText);
 await page.goBack();
 await page.waitForSelector('#cdk');
 check('browser back from session returns to the code', (await stateOf(page)).step==='code' && await page.$eval('#cdk', el => el.value)===code);
 await page.goForward();
 await page.waitForSelector('#session');
 check('forward restores session without skipping ahead', (await stateOf(page)).step==='session' && await page.$('#confirm')===null);
 await page.goForward();
 await page.waitForSelector('#consent');
 check('forward restores confirm without consent or a recharge', (await page.$eval('#confirm', el => el.disabled))===true && redeemCalls===0 && (await stateOf(page)).step==='confirm');
 await page.goBack();
 await page.goBack();
 await page.waitForFunction(() => history.state?.step==='code');
 await Promise.all([page.waitForNavigation({waitUntil:'networkidle0'}), page.goBack()]);
 check('back from the first step leaves for pricing', page.url().includes('/index.html') && page.url().includes('Sales='+sales), page.url());

 const edited = await open(`/redeem.html?Sales=${sales}`);
 await fill(edited, 'cdk', code);
 await edited.click('#code-form button[type=submit]');
 await edited.waitForSelector('#session');
 await fill(edited, 'session', sessionText);
 await edited.click('#session-form button[type=submit]');
 await edited.waitForSelector('#consent');
 await edited.goBack();
 await edited.waitForSelector('#session');
 await edited.goBack();
 await edited.waitForSelector('#cdk');
 await fill(edited, 'cdk', 'Pan-OTHER');
 await edited.goForward();
 await edited.waitForFunction(() => !document.getElementById('session') && !document.getElementById('confirm'));
 const editedState = await stateOf(edited);
 check('edited code blocks forward into the old session', editedState.view==='code' && editedState.step==='code' && cleanState(editedState.raw), JSON.stringify(editedState));
 await edited.close();

 armPrecheck();
 let seen = new Promise(resolve => {precheckSeen = resolve});
 const race = await open(`/redeem.html?Sales=${sales}`);
 await fill(race, 'cdk', code);
 await race.click('#code-form button[type=submit]');
 await race.waitForSelector('#session');
 await fill(race, 'session', sessionText);
 await race.click('#session-form button[type=submit]');
 await seen;
 await race.goBack();
 await race.waitForSelector('#cdk');
 releasePrecheck();
 await race.waitForFunction(() => document.getElementById('stage').dataset.view==='code', {timeout:3000}).catch(()=>{});
 await new Promise(resolve => setTimeout(resolve, 400));
 check('a late account check does not pull the page forward', await race.$('#confirm')===null && (await stateOf(race)).view==='code');
 await race.goForward();
 await race.waitForSelector('#session');
 await new Promise(resolve => setTimeout(resolve, 300));
 check('forward after the late check stays on session', await race.$('#confirm')===null && redeemCalls===0);
 await race.close();

 armRedeem();
 seen = new Promise(resolve => {redeemSeen = resolve});
 const order = await open(`/redeem.html?Sales=${sales}`);
 const beforeRedeem = redeemCalls;
 await fill(order, 'cdk', code);
 await order.click('#code-form button[type=submit]');
 await order.waitForSelector('#session');
 await fill(order, 'session', sessionText);
 await order.click('#session-form button[type=submit]');
 await order.waitForSelector('#consent');
 await order.click('#consent');
 await order.click('#confirm');
 await seen;
 await order.waitForFunction(() => (document.getElementById('stage').dataset.view||'')==='order');
 await order.goBack();
 await order.waitForSelector('#order-hold');
 const held = await order.evaluate(() => ({text:document.getElementById('order-hold').innerText, confirm:!!document.getElementById('confirm')}));
 check('back during recharge shows the hold and not success', held.text.includes('不要重复充值') && !held.text.includes('充值成功') && held.confirm===false, held.text);
 check('the recharge request was sent once', redeemCalls===beforeRedeem+1, String(redeemCalls));
 releaseRedeem();
 await new Promise(resolve => setTimeout(resolve, 500));
 check('the finished order does not yank the hold forward', await order.$('#order-hold')!==null && !((await order.$eval('#order-hold', el => el.innerText)).includes('充值成功')) && redeemCalls===beforeRedeem+1);
 await order.goForward();
 await order.waitForFunction(() => document.body.innerText.includes('充值成功'));
 check('forward shows the stored result without another recharge', redeemCalls===beforeRedeem+1 && (await stateOf(order)).step==='order');
 await order.goBack();
 await order.waitForSelector('#order-hold');
 check('back from the result cannot submit again', await order.$('#confirm')===null);
 await order.goBack();
 await order.waitForSelector('#resume');
 const resumeCalls = redeemCalls;
 await order.click('#code-form button[type=submit]');
 await order.waitForFunction(() => (document.getElementById('stage').dataset.view||'')==='order');
 await new Promise(resolve => setTimeout(resolve, 300));
 check('resuming the same code does not redeem again', redeemCalls===resumeCalls);
 await order.close();

 const fresh = await open(`/redeem.html?Sales=${sales}`);
 await fresh.evaluate(() => {
  sessionStorage.setItem('jmm.redeem.flow.v1', JSON.stringify({nonce:'abcdefghijABCDEFGHIJ12', cdk:'SECRET-CDK', cdkInput:'Pan-SECRET-CDK', cdkNormalized:true, panOrigin:true, meta:{provider:'openai', product_name:'ChatGPT Plus', plan:'chatgptplusplan', activation_token:'secret-token'}, queryToken:'secret-query-token', orderNo:'SECRET-ORDER', uncertain:true}));
 });
 const callsBeforeReload = precheckCalls+redeemCalls;
 await fresh.reload({waitUntil:'networkidle0'});
 await fresh.waitForSelector('#resume');
 const refreshed = await stateOf(fresh);
 check('refresh keeps the unfinished order visible without calling it success', refreshed.view==='code' && refreshed.step==='code' && await fresh.$('#session')===null && !refreshed.raw.includes('secret') && !refreshed.raw.includes('SECRET') && !(await fresh.evaluate(() => document.body.innerText.includes('充值成功'))), JSON.stringify(refreshed));
 check('refresh does not restore credentials into history or send a recharge', cleanState(refreshed.raw) && precheckCalls+redeemCalls===callsBeforeReload);
 await fresh.evaluate(() => history.replaceState({app:'jmm-redeem', step:'confirm', ref:'forged', cdk:'SECRET-CDK', account:'buyer@example.com', token:'secret-token'}, ''));
 await fresh.reload({waitUntil:'networkidle0'});
 const forged = await stateOf(fresh);
 check('a forged confirm entry reloads as the safe code step', forged.step==='code' && forged.view==='code' && cleanState(forged.raw) && await fresh.$('#confirm')===null, JSON.stringify(forged));
 await fresh.close();

 const preview = await open(`/redeem.html?Sales=${sales}#preview=confirm`);
 check('preview confirm stays on its hash', preview.url().includes('#preview=confirm') && await preview.$eval('#preview-note', el => !el.hidden));
 await preview.click('#preview-controls a[href*="preview=step1"]');
 await preview.waitForFunction(() => location.hash.includes('preview=step1'));
 await preview.goBack();
 await preview.waitForFunction(() => location.hash.includes('preview=confirm'));
 check('preview back follows the hash and does not call the API', preview.url().includes('#preview=confirm') && await preview.$('#consent')!==null && precheckCalls+redeemCalls===callsBeforeReload);
 await preview.close();

 const query = await open(`/redeem.html?Sales=${sales}`);
 await query.click('#query-tab');
 await query.waitForSelector('#query-cdks');
 await fill(query, 'query-cdks', 'Pan-QUERY-LINE');
 check('query is a history step without the typed code', (await stateOf(query)).step==='query' && cleanState((await stateOf(query)).raw));
 await query.goBack();
 await query.waitForSelector('#cdk');
 check('back from query returns to recharge', (await stateOf(query)).step==='code');
 await query.goForward();
 await query.waitForSelector('#query-cdks');
 check('forward restores the unsaved query text', await query.$eval('#query-cdks', el => el.value)==='Pan-QUERY-LINE');
 await query.close();

 const direct = await open(`/redeem.html?Sales=${sales}`);
 await direct.evaluate(() => {history.back = () => {}});
 await Promise.all([direct.waitForNavigation({waitUntil:'networkidle0'}), direct.click('#step-back')]);
 check('a direct visit falls back to pricing', direct.url().includes('/index.html') && direct.url().includes('Sales='+sales), direct.url());
} finally {
 await browser.close();
 server.close();
}
if(failures.length){console.error(failures.map(item => 'FAIL '+item).join('\n')); process.exit(1)}
console.log('history navigation checks passed');
