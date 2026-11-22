// Mixed batch-query checks with synthetic codes and a mocked queryOrder response.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const puppeteer = (await import(pathToFileURL(process.env.PUPPETEER_CORE || '/tmp/pwtest/node_modules/puppeteer-core/lib/esm/puppeteer/puppeteer-core.js').href)).default;
const artifacts = process.env.ARTIFACTS || '/opt/cursor/artifacts';
const input = ['pan-AAA','PAN-AAA','','Pan-BBB','pan-','Momoda-BBB','pan-CCC','PAN-DDD','pAn-EEE','Pan-FFF','pan-GGG','PAN-HHH','Pan-III','pan-JJJ','PAN-KKK'].join('\n');
let posts = [];

function type(file){
 if(file.endsWith('.js'))return 'text/javascript; charset=utf-8';
 if(file.endsWith('.css'))return 'text/css; charset=utf-8';
 if(file.endsWith('.wasm'))return 'application/wasm';
 return 'text/html; charset=utf-8';
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
const browser = await puppeteer.launch({executablePath:process.env.CHROME || '/usr/local/bin/google-chrome', headless:true, args:['--no-sandbox','--disable-dev-shm-usage']});
const failures = [];
const check = (name, ok, detail='') => {if(!ok)failures.push(name+(detail?`: ${detail}`:'')); else console.log('ok', name)};
function cors(origin){return {'Access-Control-Allow-Origin':origin||'*','Access-Control-Allow-Headers':'Content-Type','Access-Control-Allow-Methods':'POST, OPTIONS'}}
function row(cdk, extra){return {cdk, code:200, error:'', order:null, ...extra}}
function order(status, cdk){return {status, account:'buyer@example.com', product_name:'ChatGPT Plus', plan:'chatgptplusplan', payment_card:'4242424242424242', order_no:'ORD-'+cdk, cdk, finished_at:'2026-11-19T13:42:18Z'}}
const mixed = {
 code:200, error:'',
 results:[
  row('AAA', {cdk_status:'activated', order:order('success','AAA')}),
  row('BBB', {cdk_status:'unused'}),
  row('CCC', {cdk_status:'disabled'}),
  row('DDD', {cdk_status:'expired'}),
  row('EEE', {cdk_status:'activating'}),
  row('FFF', {code:0, error:'这一条查询超时', cdk_status:'unused'}),
  row('GGG', {cdk_status:'unused'}),
  row('HHH', {cdk_status:'activated', order:order('failed','HHH')}),
  row('III', {cdk_status:'activating', order:order('processing','III')}),
  row('JJJ', {cdk_status:'activated'})
 ]
};

async function open(){
 const page = await browser.newPage();
 await page.evaluateOnNewDocument(() => localStorage.setItem('t','light'));
 await page.setViewport({width:1280, height:900});
 await page.setRequestInterception(true);
 page.on('request', async request => {
  const target = request.url();
  if(!target.includes('/api/v1/sub/'))return request.continue();
  const origin = request.headers().origin || '*';
  if(request.method()==='OPTIONS')return request.respond({status:204, headers:cors(origin)});
  const name = target.split('/api/v1/sub/')[1].split('?')[0];
  if(name!=='queryOrder')return request.respond({status:500, contentType:'application/json', headers:cors(origin), body:'{}'});
  const body = JSON.parse(request.postData()||'{}');
  posts.push(body.cdks);
  if(body.cdks.includes('NET'))return request.abort('failed');
  return request.respond({status:200, contentType:'application/json', headers:cors(origin), body:JSON.stringify(mixed)});
 });
 await page.goto(base+'/redeem.html', {waitUntil:'networkidle0'});
 await page.evaluate(() => {window.__copied=''; navigator.clipboard.writeText=async text=>{window.__copied=text}});
 return page;
}
function stat(page, label){return page.evaluate(name => {const el=[...document.querySelectorAll('.query-summary span')].find(node=>node.textContent.includes(name));return el?el.querySelector('b').textContent:''}, label)}

try {
 fs.mkdirSync(artifacts,{recursive:true});
 const page = await open();
 await page.click('#query-tab');
 await page.waitForSelector('#query-cdks');
 await page.evaluate(value => {document.getElementById('query-cdks').value=value}, input);
 await page.click('#query-form button[type=submit]');
 await page.waitForSelector('.query-summary');
 check('duplicate and prefix sent once', JSON.stringify(posts[0])==='["AAA","BBB","CCC","DDD","EEE","FFF","GGG","HHH","III","JJJ","KKK"]', JSON.stringify(posts[0]));
 check('input count', await stat(page,'输入')==='11');
 check('found count', await stat(page,'找到订单')==='3');
 check('missing count', await stat(page,'未找到订单')==='2');
 check('disabled count', await stat(page,'已禁用')==='1');
 check('expired count', await stat(page,'已过期')==='1');
 check('locked count', await stat(page,'已锁定')==='1');
 check('failure count', await stat(page,'查询失败')==='1');
 check('pending count', await stat(page,'状态待确认')==='2');
 check('empty suffix is a normal validation error', (await page.$eval('#format-invalid', el => el.textContent))==='请输入有效的兑换码。');
 const text = await page.evaluate(() => document.body.innerText);
 check('counts reconcile', ['11','3','2','1','1','1','1','2','1'].every((n,i)=>[
  '输入','找到订单','未找到订单','已禁用','已过期','已锁定','查询失败','状态待确认','无法识别'
 ].length));
 const numbers = ['输入','找到订单','未找到订单','已禁用','已过期','已锁定','查询失败','状态待确认','无法识别'];
 const values = [];
 for(const name of numbers)values.push(Number(await stat(page,name)));
 check('bucket sum matches input', values[0]===values.slice(1,8).reduce((a,b)=>a+b,0), values.join(','));
 const labels = await page.$$eval('.query-summary span', nodes => nodes.map(node => node.textContent));
check('no unused-stock category', !labels.some(label => label.includes('未使用')) && text.includes('不代表兑换码未使用、真实存在或可以充值') && !text.includes('复制未使用'), labels.join(' | '));
 check('all three orders stay visible', text.includes('ORD-AAA') && text.includes('ORD-HHH') && text.includes('ORD-III'));
 check('card stays masked', text.includes('•••• 4242') && !text.includes('4242424242424242'));
 await page.click('#copy-missing');
 const missing = await page.evaluate(() => window.__copied);
 check('copy missing codes only', missing==='Pan-BBB\npan-GGG', missing);
 await page.click('#copy-failed');
 check('copy failed code only', await page.evaluate(() => window.__copied)==='Pan-FFF');
 const results = await page.$eval('#query-results', el => el.textContent);
 check('duplicate Momoda line is not listed again', !results.includes('Momoda-BBB') && await page.$('#invalid-keys')===null);
 await page.click('.query-copy');
 const orderCopy = await page.evaluate(() => window.__copied);
 check('order copy excludes other codes and session', orderCopy.includes('ORD-AAA') && !orderCopy.includes('BBB') && !orderCopy.includes('synthetic') && !orderCopy.includes('4242424242424242'));
 await page.evaluate(() => {const el=document.querySelector('.query-summary');const top=el.getBoundingClientRect().top+window.scrollY-70;window.scrollTo(0, top)});
 await page.screenshot({path:path.join(artifacts,'batch-query-desktop.png')});
 await page.setViewport({width:390, height:844});
 const overflow = await page.evaluate(() => document.documentElement.scrollWidth-document.documentElement.clientWidth);
 check('mobile batch result does not overflow', overflow<=1, String(overflow));
 await page.screenshot({path:path.join(artifacts,'batch-query-mobile.png')});

 const failed = await open();
 await failed.click('#query-tab');
 await failed.waitForSelector('#query-cdks');
 await failed.evaluate(() => {document.getElementById('query-cdks').value='Pan-NET'});
 await failed.click('#query-form button[type=submit]');
 await failed.waitForSelector('#retry-failed');
 check('network failure is not counted as missing', await stat(failed,'未找到订单')==='0' && await stat(failed,'查询失败')==='1');
 check('network failure keeps the code for retry', (await failed.$eval('.code-list', el => el.textContent)).includes('NET'));
 posts.length = 0;
 await failed.click('#retry-failed');
 await failed.waitForFunction(() => document.querySelectorAll('#retry-failed').length>0);
 check('retry sends the failed code again', posts.at(-1)?.join()==='NET', JSON.stringify(posts));
} finally {
 await browser.close();
 server.close();
}
if(failures.length){console.error(failures.map(item=>'FAIL '+item).join('\n'));process.exit(1)}
console.log('batch query checks passed');
