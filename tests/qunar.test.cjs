const fs=require('fs'), vm=require('vm'), assert=require('assert');
const {clean,route,services,hosts}=require('../scripts/qunar-clean.js');
const source=fs.readFileSync(__dirname+'/../scripts/qunar-clean.js','utf8');
let count=0;
function test(name,fn){fn();count++;console.log('PASS '+name);}
const url=s=>'https://slugger.qunar.com/slugger-proxy?qrt='+s;
function run(s,data,extra={}){return clean({url:url(s)},{status:200,body:JSON.stringify({bstatus:{code:0},data,...extra})});}
const parsed=r=>JSON.parse(r.body);
test('mine head preserves membership, login and toolbar',()=>{
  const d={myHead:{loginStatus:true,userId:'synthetic'},vipArea:{level:'R2'},topRightIcons:['settings','scan','messages'],rightQuickEntrance:{title:'学生卡'}};
  const r=run('pp_gw_u_myHeadInfo',d), expected={...d,rightQuickEntrance:null};
  assert.deepStrictEqual(parsed(r).data,expected);assert.equal(d.rightQuickEntrance.title,'学生卡');
});
test('mine finance preserves orders, invoice, points and order reminders',()=>{
  const d={financial:{cards:['loan','payLater','businessLoan','bank','wallet'],version:2},financialBanner:{id:'promo'},
    order:{cards:[{id:'order1',amount:120.50,status:'unpaid'}],orderBanner:{title:'出行提醒'}},icon:{cards:['invoice']},pointsCenter:{points:23}};
  const r=run('pp_gw_u_myMainCard',d);
  assert.deepStrictEqual(parsed(r).data,{...d,financial:{...d.financial,cards:[]},financialBanner:null});
});
test('mine recommendations terminate pagination',()=>{
  const r=run('p_feedlist_recommend',{contentList:[{cardType:'picture'}],pageFinished:false,pageNo:2});
  assert.deepStrictEqual(parsed(r).data,{contentList:[],pageFinished:true,pageNo:2});
});
test('mine popups and floats only',()=>{
  const r=run('m_gw_myPage_doAppDelivery',{popInfo:{popType:1},floatInfo:{id:'ad'},version:1});
  assert.deepStrictEqual(parsed(r).data,{popInfo:null,floatInfo:null,version:1});
});
test('trip promotional fallback data emptied but itinerary/order preserved',()=>{
  const d={emptyCardMap:{videoUrl:'ad'},funMapCard:{title:'promo'},cityTrips:[{orderId:'123',depart:'10:00'}]};
  assert.deepStrictEqual(parsed(run('p_tripcard_list',d)).data,{...d,emptyCardMap:{},funMapCard:{}});
});
test('shared feed by service and direct URL',()=>{
  const d={list:[{type:'DETAIL'}],isLastOne:false,fastFilterNameList:['北京'],requestId:'keep'};
  const a=run('content_api_common_feed_open_postList',d);
  const b=clean({url:'https://lang.qunar.com/api/common/feed/open/postList'}, {body:JSON.stringify({data:d})});
  assert.deepStrictEqual(parsed(a).data,parsed(b).data);assert.equal(parsed(a).data.isLastOne,true);assert.equal(parsed(a).data.list.length,0);
});
test('train bottom SDK banner removes only the identified field',()=>{
  const body={responseBizHead:{code:0},bottomADBannerMap:{SDK:'true',adspotidIOS:'test'},trainList:[{price:50}]};
  const r=clean({url:url('t_ga_TrainBottomADBanner')},{status:200,body:JSON.stringify(body)});
  assert.deepStrictEqual(parsed(r),{...body,bottomADBannerMap:{}});
});
test('flight home banners and card banner',()=>{
  assert.equal(parsed(run('f_flight_home_banner',{banners:[{url:'test'}]})).data.banners.length,0);
  assert.deepStrictEqual(parsed(run('f_flight_homecard_banner',{bannerImageUrl:'img',bannerJumpUrl:'url',version:2})).data,{bannerImageUrl:'',bannerJumpUrl:'',version:2});
});
test('shared ad SDK shape preserves all unrelated fields',()=>{
  const d={imageURL:'img',clickURL:'url',adspotidIOS:'ios',AdrAdsPotId:'android',city:'北京',fare:99};
  for(const s of ['f_sylas_get_adspotId','f_flight_home_bottom','unknown_business']) {
    const r=run(s,d);assert.deepStrictEqual(parsed(r).data,{...d,imageURL:'',clickURL:'',adspotidIOS:'',AdrAdsPotId:''});
  }
});
test('hotel ad-specific native model keeps hotel photos/results',()=>{
  const d={adBanner:[{locName:'bottom',locIndex:3,adUrl320:'advert'}],hotels:[{id:'hotel',photos:['room.jpg'],price:100}]};
  const r=run('unknown_hotel_route',d);
  assert.deepStrictEqual(parsed(r).data,{...d,adBanner:[{locName:'bottom',locIndex:3,adUrl320:''}]});
});
test('flight popup keeps response status/envelope',()=>{
  const r=run('f_flightHome_float_window',{adInfo:{id:'popup'}},{trace:'synthetic'});
  assert.deepStrictEqual(parsed(r),{bstatus:{code:0},data:{},trace:'synthetic'});
});
test('home five-card requires full signature and preserves search',()=>{
  const d={search:{placeholder:'附近的酒店'},cards:[{marketList:[1],rankList:[2],promotion:{id:3},couponBanner:{id:4}},{title:'hotel-search'}]};
  const r=run('p_homeRecommend',d), out=parsed(r).data;
  assert.deepStrictEqual(out.search,d.search);assert.deepStrictEqual(out.cards[1],d.cards[1]);
  assert.deepStrictEqual(out.cards[0],{marketList:[],rankList:[],promotion:null,couponBanner:null});
});
test('query encoding, POST JSON and form route selectors',()=>{
  assert.equal(route({url:'https://slugger.qunar.com/slugger-proxy?t=pp_gw_u_myHeadInfo'}).service,'pp_gw_u_myHeadInfo');
  assert.equal(route({url:'https://slugger.qunar.com/slugger-proxy',body:JSON.stringify({serviceType:'pp_gw_u_myHeadInfo'})}).service,'pp_gw_u_myHeadInfo');
  assert.equal(route({url:'https://slugger.qunar.com/slugger-proxy',body:'qrt=pp_gw_u_myHeadInfo'}).service,'pp_gw_u_myHeadInfo');
  assert.equal(route({url:'https://slugger.qunar.com/slugger-proxy?qrt=%70p_gw_u_myHeadInfo'}).service,'pp_gw_u_myHeadInfo');
});
test('hidden service mine schema works; wrong schema does not',()=>{
  assert.equal(run('',{myHead:{},vipArea:{},topRightIcons:[],rightQuickEntrance:{}}).kind,'changed');
  assert.equal(run('',{rightQuickEntrance:{}}).kind,'unmatched');
});
test('unknown booking/search/payment APIs unchanged',()=>{
  const d={orders:[{orderId:'999999999999999999',status:'unpaid',price:100}],hotels:[{banner:'room.jpg'}],flights:[{isAd:true,price:80}],coupon:{value:10},recommend:{destination:'北京'}};
  assert(!run('flight_search',d).body);
  assert.equal(clean({url:'https://pay.qunar.com/api/pay'},{body:JSON.stringify({data:d})}).kind,'outside-scope');
});
test('foreign hosts and lookalike suffixes excluded',()=>{
  for(const host of ['evil.test','slugger.qunar.com.evil.test','notqunar.com','qunar.com@evil.test']) assert.equal(route({url:'https://'+host+'/x?qrt=pp_gw_u_myHeadInfo'}),null);
});
test('malformed JSON, HTML, compressed/binary and oversized responses untouched',()=>{
  for(const body of ['{broken','<html>login</html>',new Uint8Array([31,139]),'x'.repeat(4*1024*1024+1)]) assert(!clean({url:url('pp_gw_u_myHeadInfo')},{body}).body);
});
test('unsafe numeric order IDs never rounded by rewriting',()=>{
  const r=clean({url:url('pp_gw_u_myHeadInfo')},{body:'{"data":{"rightQuickEntrance":{},"orderId":999999999999999999}}'});
  assert.equal(r.kind,'unsafe-number');assert(!r.body);
});
test('API errors and HTTP errors retain original response',()=>{
  assert.equal(run('pp_gw_u_myHeadInfo',{rightQuickEntrance:{}},{bstatus:{code:500}}).kind,'api-error');
  assert.equal(clean({url:url('pp_gw_u_myHeadInfo')},{status:403,body:'{"data":{"rightQuickEntrance":{}}}'}).kind,'http-error');
});
test('conflicting selectors fail open',()=>{
  assert.equal(clean({url:url('pp_gw_u_myHeadInfo'),body:'qrt=pp_gw_u_myMainCard'},{body:'{}'}).kind,'ambiguous');
});
test('repeat cleaning idempotent',()=>{
  const first=run('p_feedlist_recommend',{contentList:[1],pageFinished:false});
  assert(!clean({url:url('p_feedlist_recommend')},{body:first.body}).body);
});
function loon(request,response,store={},failStore=false){
  const done=[],logs=[],notifications=[];
  const ctx={console:{log:x=>logs.push(x)},$done:x=>done.push(x),
    $persistentStore:{read:k=>store[k],write:(v,k)=>{if(failStore)throw Error('full');store[k]=v;return true}},
    $notification:{post:(...args)=>notifications.push(args)}};
  if(request)ctx.$request=request;if(response)ctx.$response=response;
  vm.runInNewContext(source,ctx);
  assert.equal(done.length,1);return{output:done[0],logs,store,notifications};
}
test('Loon runtime calls done once and only returns changed body',()=>{
  const r=loon({url:url('pp_gw_u_myHeadInfo')},{status:200,body:'{"data":{"rightQuickEntrance":{}}}',headers:{'Set-Cookie':'secret'}});
  assert.deepStrictEqual(Object.keys(r.output),['body']);assert.equal(JSON.parse(r.output.body).data.rightQuickEntrance,null);
});
test('logs and storage exclude credentials/account fields',()=>{
  const r=loon({url:url('pp_gw_u_myHeadInfo')+'&token=secret-token',headers:{Cookie:'secret-cookie'}},{body:'{"data":{"rightQuickEntrance":{},"userId":"secret-user"}}'});
  const evidence=JSON.stringify({logs:r.logs,store:r.store});assert(!evidence.includes('secret-'));
});
test('storage failure must not prevent response cleaning',()=>{
  const r=loon({url:url('pp_gw_u_myHeadInfo')},{body:'{"data":{"rightQuickEntrance":{}}}'},{},true);assert(r.output.body);
});
test('manual report works before any requests',()=>{
  const r=loon();assert.equal(r.notifications.length,1);assert(r.notifications[0][2].includes('捕获响应 0 次'));
});
test('plugin remote paths, hostnames and legacy URL regex match',()=>{
  const modern=fs.readFileSync(__dirname+'/../plugins/qunar.plugin','utf8'), legacy=fs.readFileSync(__dirname+'/../plugins/qunar-legacy.plugin','utf8');
  assert(modern.includes('script("https://raw.githubusercontent.com/aoomee/Loon-Adblock-Plugins/main/scripts/qunar-clean.js")'));assert(legacy.includes('script-path=https://raw.githubusercontent.com/aoomee/Loon-Adblock-Plugins/main/scripts/qunar-clean.js'));
  const line=legacy.split('\n').find(l=>l.startsWith('http-response ')),re=new RegExp(line.split(' ')[1]);
  hosts.forEach(h=>assert(re.test('https://'+h+'/x')));assert(!re.test('https://slugger.qunar.com.evil.test/x'));
  for(const s of services)assert(re.test(url(s)));
  const rewrite=legacy.split('\n').filter(l=>l.endsWith(' reject')).map(l=>{
    assert.equal(l.split(' ').length,2,'Loon legacy reject has no Surge dash argument');
    return new RegExp(l.split(' ')[0]);
  });
  assert(rewrite[0].test('https://homefront.qunar.com/front/splash/ad?a=1'));
  assert(!rewrite[0].test('https://homefront.qunar.com/front/splash/advice'));
  assert(rewrite[1].test('https://qde.qunar.com/preload?pg=hotel'));
  assert(!rewrite[1].test('https://qde.qunar.com/preloadOrder'));
});
test('modern response rule is anchored to the same allowed hosts',()=>{
  const plugin=fs.readFileSync(__dirname+'/../plugins/qunar.plugin','utf8');
  const line=plugin.split('\n').find(l=>l.startsWith('response if '));
  const re=vm.runInNewContext(line.match(/~= (.+) then script/)[1]);
  hosts.forEach(h=>assert(re.test('https://'+h+'/x')));
  assert(!re.test('https://slugger.qunar.com.evil.test/x'));
  assert(!re.test('https://evil.test/?url=https://slugger.qunar.com/x'));
});
test('homepage import links resolve to both repository plugins and hosted script exists',()=>{
  const root=__dirname+'/..', base='https://raw.githubusercontent.com/aoomee/Loon-Adblock-Plugins/main/';
  const readme=fs.readFileSync(root+'/README.md','utf8'), docs=fs.readFileSync(root+'/docs/qunar.md','utf8');
  for(const file of ['qunar.plugin','qunar-legacy.plugin']){
    const link='https://www.nsloon.com/openloon/import?plugin='+encodeURIComponent(base+'plugins/'+file);
    assert(readme.includes(link)); assert(docs.includes(link));
    const decoded=new URL(link).searchParams.get('plugin');
    assert.equal(decoded,base+'plugins/'+file);
    assert(fs.existsSync(root+'/'+decoded.slice(base.length)));
    const plugin=fs.readFileSync(root+'/plugins/'+file,'utf8');
    const scriptURLs=plugin.match(/https:\/\/raw\.githubusercontent\.com[^"\s,]+/g);
    assert.equal(scriptURLs.length,2);
    scriptURLs.forEach(url=>{assert.equal(url,base+'scripts/qunar-clean.js');assert(fs.existsSync(root+'/'+url.slice(base.length)));});
  }
});
console.log('TOTAL '+count+' tests passed. Synthetic fixtures derived from supplied IPA code; no live-device or Loon parser validation.');
