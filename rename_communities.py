import json
import re

def get_name_for_nodes(nodes):
    names = [n['label'].lower() for n in nodes]
    text = ' '.join(names)
    if 'admin' in text or 'shield' in text or 'claude' in text or 'dashboard' in text or 'explore' in text:
        return 'Core UI & Setup'
    if 'changelog' in text or 'trash' in text or 'orphan' in text or 'message' in text:
        return 'Project Operations'
    if 'app.jsx' in text or 'app()' in text or 'root' in text:
        return 'Application Root'
    if 'audio' in text or 'notification' in text:
        return 'Notifications & Audio'
    if 'fix_button' in text:
        return 'Button Fixes'
    if 'replace' in text or 'styles' in text:
        return 'Style Replacement'
    if 'orb' in text:
        return 'Orb Fixes'
    if 'icon' in text:
        return 'Icons'
    if 'sendnotification' in text:
        return 'Webhook Service'
    if 'settings' in text:
        return 'User Settings'
    if len(nodes) > 0:
        return nodes[0]['label'].replace('.js', '').replace('.py', '').replace('()', '').title() + ' Module'
    return 'Misc Module'

# Load graph.json
with open('graphify-out/graph.json', 'r', encoding='utf-8') as f:
    graph_data = json.load(f)

# Group nodes
communities = {}
for n in graph_data['nodes']:
    cid = str(n.get('community', 0))
    if cid not in communities: communities[cid] = []
    communities[cid].append(n)

# Generate mapping
cid_to_name = {}
for cid, nodes in communities.items():
    cid_to_name[cid] = get_name_for_nodes(nodes)

# 1. Update graph.json
for n in graph_data['nodes']:
    cid = str(n.get('community', 0))
    n['community_name'] = cid_to_name[cid]

with open('graphify-out/graph.json', 'w', encoding='utf-8') as f:
    json.dump(graph_data, f, indent=2)

# 2. Update graph.html
with open('graphify-out/graph.html', 'r', encoding='utf-8') as f:
    html = f.read()

for cid, name in cid_to_name.items():
    html = html.replace(f'"label": "Community {cid}"', f'"label": "{name}"')
    html = html.replace(f'"community_name": "Community {cid}"', f'"community_name": "{name}"')

with open('graphify-out/graph.html', 'w', encoding='utf-8') as f:
    f.write(html)

# 3. Update GRAPH_REPORT.md
with open('graphify-out/GRAPH_REPORT.md', 'r', encoding='utf-8') as f:
    md = f.read()

for cid, name in cid_to_name.items():
    md = md.replace(f'Community {cid} - "Community {cid}"', f'{name}')
    md = md.replace(f'Community {cid}', f'{name}')

with open('graphify-out/GRAPH_REPORT.md', 'w', encoding='utf-8') as f:
    f.write(md)

print("Communities renamed successfully!")
