// Browser checks for the recharge workflow. Uses the system Chrome and mocked
// recharge responses only. It never calls the live recharge API.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';

const puppeteerPath = process.env.PUPPETEER_CORE || '/tmp/pwtest/node_modules/puppeteer-core/lib/esm/puppeteer/puppeteer-core.js';
const puppeteer = (await import(pathToFileURL(puppeteerPath).href)).default;

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const artifacts = process.env.ARTIFACTS || '/opt/cursor/artifacts';
const chrome = process.env.CHROME || '/usr/local/bin/google-chrome';
const sales = 'AgentSale77';
const sessionText = '{"accessToken":"synthetic-session-token","user":"not-real"}';
const fullCard = '4242424242424242';
let redeemCalls = 0;

function type(file){
  if(file.endsWith('.html')) return 'text/html; charset=utf-8';
  if(file.endsWith('.css')) return 'text/css; charset=utf-8';
  if(file.endsWith('.js')) return 'text/javascript; charset=utf-8';
  if(file.endsWith('.wasm')) return 'application/wasm';
  if(file.endsWith('.webp')) return 'image/webp';
  if(file.endsWith('.png')) return 'image/png';
  return 'application/octet-stream';
}
function cors(origin){return {'Access-Control-Allow-Origin':origin||'*','Access-Control-Allow-Headers':'Content-Type','Access-Control-Allow-Methods':'POST, OPTIONS'};}
function json(data, origin){return {status:200, contentType:'application/json', headers:cors(origin), body:JSON.stringify({code:200, data})};}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://127.0.0.1');
  const rel = decodeURIComponent(url.pathname);
  const file = path.join(root, rel === '/' ? 'index.html' : rel.replace(/^\/+/, ''));
  if(!file.startsWith(root) || !fs.existsSync(file) || fs.statSync(file).isDirectory()){
    res.writeHead(404); res.end('missing'); return;
  }
  res.writeHead(200, {'Content-Type':type(file), 'Cache-Control':'no-store'});
  fs.createReadStream(file).pipe(res);
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await puppeteer.launch({
  executablePath: chrome,
  headless: true,
  args: ['--no-sandbox', '--disable-dev-shm-usage']
});
const failures = [];
function check(name, ok, detail=''){if(!ok) failures.push(name+(detail?`: ${detail}`:'')); else console.log('ok', name);}

async function open(pathname){
  const page = await browser.newPage();
  await page.evaluateOnNewDocument(() => localStorage.setItem('t', 'light'));
  await page.setViewport({width:1280, height:800, deviceScaleFactor:1});
  await page.setRequestInterception(true);
  page.on('request', async request => {
    const target = request.url();
    if(!target.includes('/api/v1/sub/')) return request.continue();
    const origin = request.headers().origin || '*';
    const name = target.split('/api/v1/sub/')[1].split('?')[0];
    if(request.method()==='OPTIONS') return request.respond({status:204, headers:cors(origin)});
    const respond = payload => request.respond(payload);
    if(name === 'verifyCdk') return respond(json({activation_token:'act-test', expires_in:900, expires_at:'2026-11-20T12:00:00Z', provider:'openai', product_name:'ChatGPT Plus', plan:'chatgptplusplan'}, origin));
    if(name === 'precheckAccount') return respond(json({email:'buyer@example.com', name:'Buyer', plan_type:'free', subscription_plan:'free', has_active_subscription:false, eligible:true}, origin));
    if(name === 'redeemResult') return respond(json({order:{status:'success', account:'buyer@example.com', product_name:'ChatGPT Plus', plan:'chatgptplusplan', payment_card:fullCard, finished_at:'2026-11-19T13:42:18Z', order_no:'JMMTEST1'}}, origin));
    if(name === 'redeem'){redeemCalls += 1; await new Promise(r => setTimeout(r, 350)); return respond(json({order_query_token:'qt-test', order_no:'JMMTEST1', provider:'openai', product_name:'ChatGPT Plus', plan:'chatgptplusplan'}, origin));}
    return respond({status:500, contentType:'application/json', body:JSON.stringify({code:0, error:'unexpected '+name})});
  });
  await page.goto(base+pathname, {waitUntil:'networkidle0'});
  return page;
}

async function layout(page, label){
  const box = await page.evaluate(() => {
    const card = document.querySelector('.main-card');
    const groups = document.querySelector('.sheet-groups');
    const stage = document.getElementById('stage');
    const btn = document.querySelector('.main-card .btn');
    const header = document.querySelector('header');
    const cardBox = card.getBoundingClientRect();
    const code = document.getElementById('cdk');
    const locked = document.querySelector('.sheet-group.is-locked');
    return {
      journey: !!document.querySelector('.journey, .side-note, .intro, .assurance'),
      groupsInCard: !!(groups && card.contains(groups) && stage.contains(groups)),
      codeBeforeLocked: !!(code && locked && (code.compareDocumentPosition(locked) & Node.DOCUMENT_POSITION_FOLLOWING)),
      centerDelta: Math.abs((cardBox.left + cardBox.right) / 2 - window.innerWidth / 2),
      btn: getComputedStyle(btn).backgroundColor,
      header: getComputedStyle(header).backgroundColor,
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      caption: document.getElementById('step-caption').textContent,
      step: stage.dataset.step,
      session: !!document.getElementById('session')
    };
  });
  check(label+' no sidebar or hero', box.journey === false, JSON.stringify(box));
  check(label+' code group before locked login', box.groupsInCard && box.codeBeforeLocked && box.session === false);
  check(label+' form centered', box.centerDelta < 24, String(box.centerDelta));
  check(label+' blue button', box.btn === 'rgb(0, 113, 227)', box.btn);
  check(label+' dark subscription bar', box.header.includes('22, 22, 23'), box.header);
  check(label+' no horizontal overflow', box.overflow <= 1, String(box.overflow));
  return box;
}

try {
  fs.mkdirSync(artifacts, {recursive:true});
  const page = await open(`/redeem.html?Sales=${sales}`);
  const step1 = await layout(page, 'desktop step 1');
  check('desktop starts on step 1', step1.step === '1' && step1.caption === '验证兑换码');
  const backControl = await page.$eval('#step-back', el => ({tag:el.tagName, href:el.getAttribute('href')||''}));
  check('first step back matches browser history', backControl.tag==='BUTTON' && !/javascript:/i.test(backControl.href), JSON.stringify(backControl));
  await page.screenshot({path:path.join(artifacts, 'recharge-desktop-step1.png')});

  await page.type('#cdk', 'Pan-TEST-CDK-ALPHA');
  await page.click('#code-form button[type=submit]');
  await page.waitForSelector('#session');
  check('reached login step', await page.$eval('#stage', s => s.dataset.step) === '2');
  await page.type('#session', sessionText);
  await page.click('#step-back');
  await page.waitForSelector('#cdk');
  check('back from login stays on recharge', page.url().includes('redeem.html'));
  check('back from login keeps CDK', await page.$eval('#cdk', el => el.value) === 'Pan-TEST-CDK-ALPHA');
  check('back from login uses the code history step', await page.evaluate(() => history.state?.step)==='code');

  await page.click('#code-form button[type=submit]');
  await page.waitForSelector('#session');
  check('login text kept after returning', await page.$eval('#session', el => el.value) === sessionText);
  await page.click('#session-form button[type=submit]');
  await page.waitForSelector('#confirm');
  check('confirmation step', await page.$eval('#stage', s => s.dataset.step) === '3');
  await page.click('#step-back');
  await page.waitForSelector('#session');
  check('back from confirm keeps login text', await page.$eval('#session', el => el.value) === sessionText);
  check('back from confirm stays on recharge', page.url().includes('redeem.html') && await page.evaluate(() => history.state?.step)==='session');
  const stored = await page.evaluate(() => sessionStorage.getItem('jmm.redeem.flow.v1') || '');
  check('login text is not stored', !stored.includes('synthetic-session-token') && !stored.includes('accessToken'));

  await page.click('#session-form button[type=submit]');
  await page.waitForSelector('#consent');
  await page.click('#consent');
  await page.evaluate(() => {
    const button = document.getElementById('confirm');
    const submit = button.onclick;
    submit.call(button);
    submit.call(button);
  });
  await page.waitForSelector('.service-promo a', {timeout:15000});
  check('redeem submitted once', redeemCalls === 1, String(redeemCalls));
  const promo = await page.$eval('.service-promo a', a => ({text:a.textContent, href:a.href}));
  check('success names 萌萌哒 AI', promo.text === '萌萌哒 AI', promo.text);
  check('success uses actual sales id', promo.href === `https://panbot02.github.io/v2/?Sales=${sales}`, promo.href);
  check('success does not use example 123', !promo.href.includes('Sales=123'));
  const visibleCard = await page.$eval('.result-table', el => el.textContent);
  check('card is masked', visibleCard.includes('•••• 4242') && !visibleCard.includes(fullCard), visibleCard);
  await page.evaluate(() => {window.__copied=''; navigator.clipboard.writeText = async text => {window.__copied=text;};});
  await page.click('#copy-order');
  const copied = await page.evaluate(() => window.__copied);
  check('copied order includes promo', copied.includes('更多 AI 会员服务，欢迎访问：萌萌哒 AI https://panbot02.github.io/v2/?Sales='+sales), copied);
  check('copied order hides full card and session', !copied.includes(fullCard) && !copied.includes('synthetic-session-token'));
  await page.screenshot({path:path.join(artifacts, 'recharge-desktop-success.png')});

  await page.setViewport({width:390, height:844, deviceScaleFactor:1});
  await page.screenshot({path:path.join(artifacts, 'recharge-mobile-success.png'), fullPage:false});
  const mobileSuccess = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  check('mobile success has no horizontal overflow', mobileSuccess <= 1, String(mobileSuccess));

  const mobile = await open(`/redeem.html?Sales=${sales}`);
  await mobile.setViewport({width:390, height:844, deviceScaleFactor:1});
  await mobile.reload({waitUntil:'networkidle0'});
  const mobileBox = await layout(mobile, 'mobile step 1');
  check('mobile caption visible', mobileBox.caption === '验证兑换码');
  await mobile.screenshot({path:path.join(artifacts, 'recharge-mobile-step1.png')});

  const plain = await open('/redeem.html#preview=success');
  const plainHref = await plain.$eval('.service-promo a', a => a.href);
  check('missing sales uses the page default', plainHref === 'https://panbot02.github.io/v2/?Sales=panplus5', plainHref);
  const hashed = await open('/redeem.html#preview=success&Sales=HashSale88');
  const hashHref = await hashed.$eval('.service-promo a', a => a.href);
  check('hash sales is preserved', hashHref === 'https://panbot02.github.io/v2/?Sales=HashSale88', hashHref);
  const failed = await open(`/redeem.html?Sales=${sales}#preview=failed`);
  check('failed order has no promo', await failed.$('.service-promo') === null);
  const home = await open(`/index.html?Sales=${encodeURIComponent(sales)}`);
  await Promise.all([home.waitForNavigation({waitUntil:'networkidle0'}), home.click('#self-redeem')]);
  check('pricing opens recharge', home.url().includes('/redeem.html') && home.url().includes(`Sales=${sales}`), home.url());
  await Promise.all([home.waitForNavigation({waitUntil:'networkidle0'}), home.click('#step-back')]);
  check('first step back returns to pricing', home.url().includes('/index.html') && home.url().includes(`Sales=${sales}`), home.url());
} finally {
  await browser.close();
  server.close();
}

if(failures.length){
  console.error(failures.map(item => 'FAIL '+item).join('\n'));
  process.exit(1);
}
console.log('all recharge workflow checks passed');
