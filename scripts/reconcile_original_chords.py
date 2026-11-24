"""Reconcile PDF character anchors with Canva lyrics; produce an audit report."""
import difflib
import json
import re
import unicodedata
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
def key(s): return re.sub('[^a-z0-9]','',unicodedata.normalize('NFD',s.lower()))
CHORD=re.compile(r'\(?[A-Ha-h](?:is|es|#|b)?(?:m|maj|min|sus|dim|aug)?\d*(?:/[A-Ha-h][#b]?)?\)?')
def positions(s):
    text,indices='',[]
    for i,c in enumerate(s):
        k=key(c); text+=k; indices.extend([i]*len(k))
    return text,indices
def source_lines(rows):
    lines=[]; pending=[]; previous_top=None
    for row in rows:
        text=row['text'].strip()
        if not text or max(c['size'] for c in row['chars'])>=17: continue
        if CHORD.search(text) and not CHORD.sub('',text).strip():
            joined=''.join(c['text'] for c in row['chars'])
            pending.extend((row['chars'][m.start()]['x0'],m.group()) for m in CHORD.finditer(joined))
            continue
        if not pending and not lines: continue
        chars=row['chars']; joined=''.join(c['text'] for c in chars)
        blocks=difflib.SequenceMatcher(None,joined,text,autojunk=False).get_matching_blocks()
        anchors=[]
        for x,name in pending:
            i=min(range(len(chars)),key=lambda i:abs(chars[i]['x0']-x))
            b=min(blocks,key=lambda b:min(abs(i-b.a),abs(i-b.a-b.size)))
            anchors.append((max(0,min(len(text),b.b+i-b.a)),name))
        if previous_top is not None and row['top']-previous_top>52:lines.append(('',[]))
        lines.append((text,anchors)); pending=[]; previous_top=row['top']
    if pending: raise ValueError('Unassigned final chord row')
    return lines
def display(s):
    words=s.split()
    if words and sum(len(w)==1 for w in words)/len(words)>.65:
        s=re.sub(' {2,}','\x00',s.strip()).replace(' ','').replace('\x00',' ')
    return s.strip()
def render(text,anchors):
    groups={}
    for i,name in anchors:
        if name not in groups.setdefault(i,[]):groups[i].append(name)
    for i,names in sorted(groups.items(),reverse=True):text=text[:i]+'['+' '.join(names)+']'+text[i:]
    return text
def reconcile(lines,reference):
    if not reference:return '\n'.join(render(t,a) for t,a in lines),[]
    destination='\n'.join(display(line).lower() for line in reference.splitlines() if line.strip())
    destination=re.sub(r'(?m)^(\W*)(\w)',lambda m:m[1]+m[2].upper(),destination)
    for name in ('Bog','Bogu','Boga','Božji','Božja','Božje','Jezus','Jezusa','Jezusu','Kristus','Kristusa','Marija','Marijo','Jožef','Jožefom','Gospod','Gospoda','Gospodu','Betlehem','Nazaret','Golgoto'):
        destination=re.sub(r'\b'+name.lower()+r'\b',name,destination)
    old='\n'.join(t for t,_ in lines)
    ok,op=positions(old); nk,np=positions(destination)
    blocks=difflib.SequenceMatcher(None,ok,nk,autojunk=False).get_matching_blocks()
    mapping={b.a+i:b.b+i for b in blocks for i in range(b.size)}
    anchors=[]; unmapped=[]; offset=0; breaks=set()
    for text,changes in lines:
        if not text:
            old_index=sum(1 for p in op if p<offset)
            following=next((j for j in range(old_index,len(op)) if j in mapping),None)
            if following is not None:
                breaks.add(destination[:np[mapping[following]]].count('\n'))
        for index,name in changes:
            i=min(range(len(op)),key=lambda i:abs(op[i]-offset-index))
            if i in mapping:anchors.append((np[mapping[i]],name))
            else:
                phrase,pp=positions(text); start=nk.find(phrase)
                if start>=0:
                    j=min(range(len(pp)),key=lambda j:abs(pp[j]-index))
                    anchors.append((np[start+j],name))
                else:
                    # Reviewed spelling/repetition differences in the original:
                    # zvečičarja -> Zveličarja; a printed 2X marker and a quote.
                    if key(text) in {'zvecicarjaboga','ceimateustaslaviteboga2x','tigospod'}:
                        near=min(mapping,key=lambda j:abs(j-i))
                        if abs(near-i)<=5: anchors.append((np[mapping[near]],name))
                        else: unmapped.append({'line':text,'chord':name})
                    else: unmapped.append({'line':text,'chord':name})
        offset+=len(text)+1
    # Expand only an exact repeated source phrase. Source-specific changes that
    # already have anchors take precedence over a reused refrain pattern.
    for text,changes in lines:
        phrase,pp=positions(text)
        if len(phrase)<12 or not changes:continue
        start=nk.find(phrase)
        while start>=0:
            left=np[start]; right=np[start+len(phrase)-1]+1
            if not any(left<=i<right for i,_ in anchors):
                for index,name in changes:
                    j=min(range(len(pp)),key=lambda j:abs(pp[j]-index))
                    anchors.append((np[start+j],name))
            start=nk.find(phrase,start+len(phrase))
    rendered=render(destination,anchors).splitlines()
    return '\n'.join(('\n' if i in breaks and i else '')+line for i,line in enumerate(rendered)),unmapped
def main():
    path=ROOT/'song-catalog.js'
    catalog=json.loads(path.read_text(encoding='utf-8').split('=',1)[1].strip().rstrip(';'))
    pages=json.loads((ROOT/'tmp/pdfs/original-chords-positioned.json').read_text(encoding='utf-8'))
    refs={p['page']:p['text'] for p in json.loads((ROOT/'tmp/pdfs/pdf-songbook-text.json').read_text(encoding='utf-8'))}
    layout=[(1,[('Ves dan vso noč',8)]),(2,[('On nosi ves svet',5),('On nosi ves svet',6)]),
      (3,[('Aleluja, naše veselje',2),('Hozana (Oče tebi izročam vse)',None)]),
      (4,[('Aleluja (Hallelujah)',None)]*2),(5,[('Dal si čisto mi srce',None)]*2),
      (6,[('Hozana (Svet si ti naš Gospod)',4),('Darujem ti ljubezen',3)]),
      (7,[('Pesem vesela naj gospoda slavi',7)]*2),(8,[('Če imate usta',10),('Povej naprej!',9)]),
      (9,[('Sem jaz (družinica)',11)]*2),(10,[('Gospod usmili se',12),('Jagnje Božje (Jemec)',13)]),
      (11,[('Vsa ljudstva ploskajte',14)]),(12,[('Poslušajte vsi ljudje',15),('Glej zvezdice Božje',16)]),
      (13,[('Tam stoji pa hlevček',17)]),(14,[('Kaj se vam zdi, pastirci vi',19),('Sveta noč',18)]),
      (15,[('Slavi ga, slavi ga',20),('Ko čutiš to',21)]),(16,[('Ti naša mati ljubljena',22),('Naj te pozdravim',23)]),
      (17,[('O Marija (Kako si lepa)',24),('Kličem "svet si"',25)]),
      (18,[('Mamica je kakor zarja',26),('Mi se imamo radi',27)]),
      (19,[('Glori, glori aleluja',None),('Glori, glori aleluja (Rok)',None)]),
      (20,[('Aleluja (Jezus Kristus je naš Rešenik)',28),('Jezus, hvala za sonce',29)])]
    songs={}
    for page,columns in layout:
        for column,(title,ref) in enumerate(columns):
            item=songs.setdefault(title,{'lines':[],'refs':[],'pages':[]})
            item['lines']+=source_lines(pages[page-1]['columns'][column])
            if ref and ref not in item['refs']:item['refs'].append(ref)
            item['pages'].append([page,column+1])
    updates=[]; report=[]
    for title,item in songs.items():
        song=next((s for s in catalog['songs'] if key(title) in [key(s['title']),*map(key,s.get('aliases',[]))]),None)
        if not song:
            song={'key':'original-pdf-'+key(title),'title':title,'aliases':[],'categories':[],'known':False,'link':''}
            catalog['songs'].append(song)
        names=[title,song['title'],*song.get('aliases',[])]
        reference_lines=[]
        for r in item['refs']:
            for line in refs[r].splitlines():
                words=line.split()
                decorative=bool(words) and sum(len(w)==1 for w in words)/len(words)>.65
                line=display(line)
                if decorative and any(key(line)==key(name) for name in names):continue
                if r==25 and key(line).startswith('klicemsvetsipoklonimse'):continue
                line=line.replace('S VET','SVET').replace('SLAV I GA','SLAVI GA')
                reference_lines.append(line)
        reference='\n'.join(reference_lines)
        text,unmapped=reconcile(item['lines'],reference)
        updates.append({'version':'original-pdf-2026-11-24-v2','title':song['title'],'link':'','inlineChords':text,'sourceImport':True,'sourcePages':item['pages']})
        report.append({'title':title,'pages':item['pages'],'referencePages':item['refs'],'unmapped':unmapped,
          'sourceChordCount':sum(len(a) for _,a in item['lines']),'outputChordCount':len(re.findall(r'\[[^\]]+\]',text))})
    titles={key(u['title']) for u in updates}
    catalog['chordCorrections']=[u for u in catalog['chordCorrections'] if key(u['title']) not in titles]+updates
    catalog['version']='2026-11-24-original-pdf-v2'
    path.write_text('window.ZBORCEK_SONG_CATALOG = '+json.dumps(catalog,ensure_ascii=False,indent=2)+';\n',encoding='utf-8')
    (ROOT/'scripts/fixtures').mkdir(exist_ok=True)
    (ROOT/'scripts/fixtures/chord-reconciliation-report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
    print(f'{len(updates)} songs processed; {sum(len(r["unmapped"]) for r in report)} source anchors require review.')
    for r in report:
        if r['unmapped']:print(r['title'],json.dumps(r['unmapped'],ensure_ascii=False))
if __name__=='__main__':main()
