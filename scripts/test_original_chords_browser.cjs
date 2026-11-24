const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..');
const server=http.createServer((req,res)=>{
  const url=new URL(req.url,'http://localhost');
  if(url.pathname==='/auth.js'){
    res.setHeader('Content-Type','application/javascript');
    return res.end('window.zborcekAuth={state:{isAdmin:true,username:"QA"},ready:Promise.resolve()};');
  }
  if(url.pathname.startsWith('/api/')){res.statusCode=404;return res.end('{}');}
  const file=path.resolve(root,'.'+(url.pathname==='/'?'/index.html':decodeURIComponent(url.pathname)));
  if(!file.startsWith(root+path.sep)||!fs.existsSync(file)){res.statusCode=404;return res.end();}
  const mime={'.js':'application/javascript','.css':'text/css','.html':'text/html','.png':'image/png'};
  res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');
  fs.createReadStream(file).pipe(res);
});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 let browser;
 try{
  browser=await chromium.launch({headless:true,channel:'msedge'});
  const page=await browser.newPage({viewport:{width:1440,height:900}});
  await page.goto(`http://127.0.0.1:${server.address().port}/`);
  await page.waitForFunction(()=>typeof getChordSongs==='function'&&getChordSongs().length>30);
  const result=await page.evaluate(()=>{
    const imported=window.ZBORCEK_SONG_CATALOG.chordCorrections.filter(s=>s.sourceImport);
    const findings=[];
    for(const source of imported){
      const song=state.songs.find(s=>s.title===source.title);
      if(!song){findings.push('Missing '+source.title);continue;}
      selectedChordSongId=song.id;renderChordEditor();
      const box=document.querySelector('#inlineChordEditor');
      const sheet=box.querySelector('.editable-chord-sheet');
      if(!sheet||!sheet.textContent.trim())findings.push('Blank '+source.title);
      if(box.querySelectorAll('[data-drag-chord]').length!==tokenizeInlineChords(song.inlineChords).filter(t=>t.chord).length)findings.push('Lost markers '+source.title);
    }
    return findings;
  });
  assert.deepEqual(result,[]);
  await page.evaluate(()=>{
    const song=state.songs.find(s=>s.title==='Kaj se vam zdi, pastirci vi');
    selectedChordSongId=song.id;renderChordEditor();document.querySelector('#chordEditorDialog').showModal();
  });
  await page.screenshot({path:path.join(root,'tmp/pdfs/reconciled-pastirci-desktop.png')});
  const bounds=await page.evaluate(()=>{
    const s=document.querySelector('.editable-chord-sheet').getBoundingClientRect();
    const b=document.querySelector('.editable-chord-body').getBoundingClientRect();
    return {sheetBottom:s.bottom,bodyBottom:b.bottom};
  });
  assert.ok(bounds.sheetBottom>=bounds.bodyBottom,'Sheet contains the entire song');
  await page.setViewportSize({width:390,height:844});
  await page.screenshot({path:path.join(root,'tmp/pdfs/reconciled-pastirci-mobile.png')});
  await page.evaluate(async()=>{
    document.querySelector('#chordEditorDialog').close();
    await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
    const titles=new Set(window.ZBORCEK_SONG_CATALOG.chordCorrections.filter(s=>s.sourceImport).map(s=>s.title));
    const songs=getChordSongs().filter(s=>titles.has(s.title));
    if(songs.length!==32)throw Error(`Expected 32 unique source songs, found ${songs.length}`);
    renderChordPrint(songs);
    if(!fitChordPrint())throw Error('Print sizing failed');
    document.body.classList.add('printing-chords');
  });
  await page.pdf({path:path.join(root,'tmp/pdfs/reconciled-all-chords.pdf'),format:'A4',printBackground:true,preferCSSPageSize:true});
  console.log('Browser: all 32 imported songs render all markers; sheet contains lyrics; desktop/mobile screenshots and A4 PDF generated.');
 }finally{if(browser)await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
