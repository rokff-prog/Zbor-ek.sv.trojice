"""Extract positioned lines from the original choir PDF for chord reconciliation."""
import argparse
import json
from pathlib import Path
import pdfplumber


def extract(source):
    pages = []
    with pdfplumber.open(source) as document:
        for number, page in enumerate(document.pages, 1):
            columns = []
            for left, right in [(0, page.width / 2), (page.width / 2, page.width)]:
                chars = [c for c in page.chars if left <= c['x0'] < right and c['text'].strip()]
                rows = []
                for char in sorted(chars, key=lambda c: (round(c['top'], 1), c['x0'])):
                    row = next((r for r in rows if abs(r['top'] - char['top']) < 3), None)
                    if row is None:
                        row = {'top': char['top'], 'chars': []}
                        rows.append(row)
                    row['chars'].append({k: char[k] for k in ('text', 'x0', 'x1', 'top', 'size', 'fontname')})
                for row in rows:
                    row['chars'].sort(key=lambda c: c['x0'])
                    text = ''
                    end = None
                    for char in row['chars']:
                        if end is not None and char['x0'] - end > 2:
                            text += ' '
                        text += char['text']
                        end = char['x1']
                    row['text'] = text
                columns.append(sorted(rows, key=lambda r: r['top']))
            pages.append({'page': number, 'width': page.width, 'columns': columns})
    return pages


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('pdf', type=Path)
    parser.add_argument('output', type=Path)
    args = parser.parse_args()
    args.output.parent.mkdir(parents=True, exist_ok=True)
    data = extract(args.pdf)
    args.output.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding='utf-8')
    for page in data:
        print(page['page'], ' | '.join(' / '.join(r['text'] for r in column[:3]) for column in page['columns']))
