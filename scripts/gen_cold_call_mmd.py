"""Build coldCallTree.mmd from the Lucidchart shape-data export.

The chart lives in Lucidchart; coldcalltree.csv is its "shape data" export,
which is the only export format that carries connector endpoints (Line Source
/ Line Destination) and therefore the real graph. Re-export over the CSV and
re-run this script whenever the chart changes.

    python3 scripts/gen_cold_call_mmd.py
"""

import csv
import textwrap
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC, OUT = ROOT / 'coldcalltree.csv', ROOT / 'coldCallTree.mmd' 

# Lucid shapes that are page furniture (section labels, step numbers, side
# notes), not conversation steps. Verified by hand against the source chart.
ANNOTATIONS = {
    '19','23','24','25','30','35','36','37','73','74','75',
    '97','98','99','100','101','102','107','114','218',
}
START = '4'          # "Hey (name) can you hear me?" — the 'CALL STARTS HERE' target
WRAP = 44            # chars per line inside a node

rows = list(csv.DictReader(SRC.open()))

shapes, edges = {}, []
for r in rows:
    s, d = r['Line Source'].strip(), r['Line Destination'].strip()
    if s or d:
        if s and d:                       # drop unattached arrow stubs
            edges.append((s, d, ' '.join(r['Text Area 1'].split())))
    elif r['Name'] in ('Rectangle', 'Sticky note', 'Text'):
        shapes[r['Id']] = ' '.join(r['Text Area 1'].split())

nodes = {i: t for i, t in shapes.items() if i not in ANNOTATIONS}
edges = [e for e in edges if e[0] in nodes and e[1] in nodes]

out_edges = {}
for s, d, l in edges:
    out_edges.setdefault(s, []).append((d, l))

terminal = [i for i in nodes if i not in out_edges]
# A short terminal is a call outcome ("LEAD SET!"); a long one is a closing
# line the chart simply stops after. Only the former reads well as a pill.
outcomes = sorted((i for i in terminal if len(nodes[i]) <= 40), key=int)
deadends = sorted((i for i in terminal if len(nodes[i]) > 40), key=int)


def esc(t):
    return t.replace('#', '#35;').replace('"', '#quot;')


def label(t, width=WRAP):
    return '<br/>'.join(esc(l) for l in textwrap.wrap(t, width)) or '&nbsp;'


def shape(i):
    t = label(nodes[i])
    return f'N{i}(["{t}"])' if i == START or i in outcomes else f'N{i}["{t}"]'


# Emit in BFS order from the start so the file reads in call order.
order, seen, queue = [], {START}, [START]
while queue:
    n = queue.pop(0)
    order.append(n)
    for d, _ in out_edges.get(n, []):
        if d not in seen:
            seen.add(d); queue.append(d)
order += [i for i in sorted(nodes, key=int) if i not in seen]

L = [
    '---',
    'title: Cold Call Decision Tree',
    '---',
    '%% Generated from coldcalltree.csv (Lucidchart shape-data export).',
    '%% Node text is verbatim from the source chart; each edge label is the',
    '%% prospect response that sends you down that branch.',
    '%% Regenerate with scripts/gen_cold_call_mmd.py — do not hand-edit.',
    '',
    "%%{init: {'flowchart': {'wrappingWidth': 320, 'nodeSpacing': 45, 'rankSpacing': 90, 'curve': 'basis'}}}%%",
    'flowchart LR',
]
L += ['    ' + shape(i) for i in order]
L.append('')
for s in order:
    for d, lbl in out_edges.get(s, []):
        L.append(f'    N{s} -->|"{label(lbl, 30)}"| N{d}' if lbl else f'    N{s} --> N{d}')
L += [
    '',
    '    classDef start fill:#0d47a1,stroke:#90caf9,stroke-width:3px,color:#fff;',
    '    classDef outcome fill:#1b5e20,stroke:#a5d6a7,stroke-width:3px,color:#fff;',
    '    classDef deadend fill:#4e342e,stroke:#bcaaa4,stroke-width:2px,color:#fff;',
    f'    class N{START} start;',
    '    class ' + ','.join(f'N{i}' for i in outcomes) + ' outcome;',
    '    class ' + ','.join(f'N{i}' for i in deadends) + ' deadend;',
]
OUT.write_text('\n'.join(L) + '\n')
print(f'{OUT.name}: {len(nodes)} nodes, {len(edges)} edges')
print('outcomes :', [(i, nodes[i]) for i in outcomes])
print('deadends :', [(i, nodes[i][:55]) for i in deadends])
