// Computed type, overflow, and first-viewport checks. No CDK, Session, or recharge calls.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const puppeteer = (await import(pathToFileURL(process.env.PUPPETEER_CORE || '/tmp/pwtest/node_modules/puppeteer-core/lib/esm/puppeteer/puppeteer-core.js').href)).default;
const artifacts = process.env.ARTIFACTS || '/opt/cursor/artifacts';
const chrome = process.env.CHROME || '/usr/bin/google-chrome';

function type(file){
  if(file.endsWith('.css')) return 'text/css; charset=utf-8';
  if(file.endsWith('.js')) return 'text/javascript; charset=utf-8';
  if(file.endsWith('.wasm')) return 'application/wasm';
  if(file.endsWith('.webp')) return 'image/webp';
  if(file.endsWith('.png')) return 'image/png';
  return 'text/html; charset=utf-8';
}
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
const browser = await puppeteer.launch({executablePath:chrome, headless:true, args:['--no-sandbox','--disable-dev-shm-usage','--font-render-hinting=none']});
const failures = [];
const check = (name, ok, detail='') => {if(!ok) failures.push(name+(detail?`: ${detail}`:'')); else console.log('ok', name);};

function describe(el){
  const id = el.id ? '#'+el.id : '';
  const cls = typeof el.className === 'string' && el.className ? '.'+el.className.trim().split(/\s+/).slice(0,2).join('.') : '';
  return el.tagName.toLowerCase()+id+cls;
}

async function measure(page){
  return page.evaluate(() => {
    const sizes = new Map();
    const note = (size, label) => {
      if(!sizes.has(size)) sizes.set(size, []);
      const list = sizes.get(size);
      if(list.length < 6 && !list.includes(label)) list.push(label);
    };
    const visit = (el, pseudo) => {
      const cs = getComputedStyle(el, pseudo || undefined);
      if(pseudo){
        const content = cs.content;
        if(!content || content === 'none' || content === 'normal') return;
      }
      note(cs.fontSize, (pseudo || '')+' '+(el.id ? '#'+el.id : el.tagName.toLowerCase()+(typeof el.className==='string' && el.className ? '.'+String(el.className).trim().split(/\s+/).slice(0,2).join('.') : '')));
    };
    document.querySelectorAll('html, body, body *').forEach(el => {
      visit(el);
      visit(el, '::before');
      visit(el, '::after');
      visit(el, '::marker');
      if(el.matches('input, textarea')) visit(el, '::placeholder');
    });
    const px = value => Math.round(parseFloat(value));
    const fold = selector => {
      const el = document.querySelector(selector);
      if(!el) return null;
      const box = el.getBoundingClientRect();
      return {top:Math.round(box.top), bottom:Math.round(box.bottom), height:Math.round(box.height)};
    };
    return {
      sizes: Object.fromEntries(sizes),
      body: px(getComputedStyle(document.body).fontSize),
      h1: px(getComputedStyle(document.querySelector('h1')).fontSize),
      h2: document.querySelector('h2') ? px(getComputedStyle(document.querySelector('h2')).fontSize) : null,
      input: document.querySelector('input, textarea') ? px(getComputedStyle(document.querySelector('input, textarea')).fontSize) : null,
      button: document.querySelector('button, .btn') ? px(getComputedStyle(document.querySelector('button, .btn')).fontSize) : null,
      price: document.querySelector('.pr') ? px(getComputedStyle(document.querySelector('.pr')).fontSize) : null,
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      viewport: {w: window.innerWidth, h: window.innerHeight},
      cdk: fold('#cdk'),
      submit: fold('#code-form button[type=submit]'),
      theme: document.documentElement.dataset.t || 'light',
      copy: {
        plus: document.body.innerText.includes('160'),
        grok: document.body.innerText.includes('80'),
        helper: document.body.innerText.includes('如果兑换码以 MoMoDa- 开头')
      }
    };
  });
}

async function open(pathname, theme, width, height){
  const page = await browser.newPage();
  await page.setViewport({width, height, deviceScaleFactor:1});
  await page.evaluateOnNewDocument(value => {localStorage.setItem('t', value);}, theme === 'dark' ? 'dark' : '');
  await page.setRequestInterception(true);
  page.on('request', request => {
    const target = request.url();
    if(/easysub|workers\.dev|\/api\//.test(target)) return request.abort('failed');
    return request.continue();
  });
  await page.goto(base+pathname, {waitUntil:'networkidle0'});
  return page;
}

const desktop = {body:14, secondary:24, display:56};
const mobile = {body:14, secondary:22, display:36};

try {
  fs.mkdirSync(artifacts, {recursive:true});
  const cases = [
    ['index.html', 'light', 1280, 800, desktop, 'pricing-desktop-light'],
    ['index.html', 'dark', 1280, 800, desktop, 'pricing-desktop-dark'],
    ['index.html', 'light', 390, 844, mobile, 'pricing-mobile-light'],
    ['index.html', 'dark', 390, 844, mobile, 'pricing-mobile-dark'],
    ['index.html', 'light', 1024, 500, desktop, 'pricing-1024x500-light'],
    ['redeem.html', 'light', 1280, 800, desktop, 'recharge-desktop-light'],
    ['redeem.html', 'dark', 1280, 800, desktop, 'recharge-desktop-dark'],
    ['redeem.html', 'light', 390, 844, mobile, 'recharge-mobile-light'],
    ['redeem.html', 'dark', 390, 844, mobile, 'recharge-mobile-dark'],
    ['redeem.html', 'light', 1024, 500, desktop, 'recharge-1024x500-light'],
    ['redeem.html', 'dark', 1024, 500, desktop, 'recharge-1024x500-dark'],
    ['redeem.html', 'light', 390, 600, mobile, 'recharge-390x600-light'],
    ['redeem.html', 'dark', 390, 600, mobile, 'recharge-390x600-dark']
  ];
  for(const [pathname, theme, width, height, scale, shot] of cases){
    const page = await open('/'+pathname, theme, width, height);
    const box = await measure(page);
    const label = `${pathname} ${theme} ${width}x${height}`;
    const seen = Object.keys(box.sizes).map(size => Math.round(parseFloat(size))).sort((a,b) => a-b);
    const expect = [scale.body, scale.secondary, scale.display];
    check(label+' exactly three sizes', seen.length === 3 && seen.every((size, i) => size === expect[i]), JSON.stringify(box.sizes));
    check(label+' body 14px', box.body === 14, String(box.body));
    check(label+' display tier', box.h1 === scale.display, String(box.h1));
    if(box.h2 != null) check(label+' secondary tier', box.h2 === scale.secondary, String(box.h2));
    if(pathname === 'index.html') check(label+' price display', box.price === scale.display, String(box.price));
    if(box.input != null) check(label+' control 14px', box.input === 14 && box.button === 14, JSON.stringify({input:box.input, button:box.button}));
    check(label+' no horizontal overflow', box.overflow <= 1, String(box.overflow));
    check(label+' theme', box.theme === theme, box.theme);
    if(pathname === 'index.html'){
      check(label+' prices kept', box.copy.plus && box.copy.grok);
    } else {
      check(label+' cdk helper stays removed', box.copy.helper === false);
      const above = box.cdk && box.submit && box.cdk.bottom <= height && box.submit.bottom <= height && box.cdk.top >= 0 && box.submit.top >= 0;
      check(label+' input and submit above fold', above, JSON.stringify({cdk:box.cdk, submit:box.submit, height}));
      if(above) console.log('fold', label, JSON.stringify({cdk:box.cdk, submit:box.submit}));
    }
    await page.screenshot({path:path.join(artifacts, shot+'.png')});
    await page.close();
  }

  const query = await open('/redeem.html', 'light', 1280, 800);
  await query.click('#query-tab');
  await query.waitForSelector('#query-cdks');
  const queryType = await query.evaluate(() => ({
    field: Math.round(parseFloat(getComputedStyle(document.querySelector('#query-cdks')).fontSize)),
    placeholder: Math.round(parseFloat(getComputedStyle(document.querySelector('#query-cdks'), '::placeholder').fontSize)),
    button: Math.round(parseFloat(getComputedStyle(document.querySelector('#query-form button[type=submit]')).fontSize))
  }));
  check('query controls 14px', queryType.field === 14 && queryType.placeholder === 14 && queryType.button === 14, JSON.stringify(queryType));
  const blocked = await query.evaluate(() => performance.getEntriesByType('resource').some(entry => /easysub|workers\.dev|\/api\//.test(entry.name)));
  check('typography pass made no recharge request', blocked === false);
  await query.close();
} finally {
  await browser.close();
  server.close();
}

if(failures.length){
  console.error(failures.map(item => 'FAIL '+item).join('\n'));
  process.exit(1);
}
console.log('all typography checks passed');
