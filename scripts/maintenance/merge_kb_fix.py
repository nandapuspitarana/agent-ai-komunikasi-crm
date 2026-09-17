import os
import re

md_dir = r'c:\Users\nanda\Documents\aiagent\agent-ai-komunikasi-crm\userjourney\knowledge base\md_locations'
l2_dir = r'c:\Users\nanda\Documents\aiagent\agent-ai-komunikasi-crm\userjourney\knowledge base'

mapping = {
    'athenee_tower.md': 'L2-centre-bangkok-athenee-tower.md',
    'sunshine_financial_center.md': 'L2-centre-beijing-sunshine-financial-center.md',
    'the_exchange_twin_towers.md': 'L2-centre-beijing-the-exchange-twin-towers.md',
    'ping_an_finance_center.md': 'L2-centre-hangzhou-ping-an-finance-center-tower-b.md',
    'lotte_center.md': 'L2-centre-hanoi-lotte-center-east-tower.md',
    'vietcombank_tower.md': 'L2-centre-ho-chi-minh-city-vietcombank-tower.md',
    'k11_atelier_victoria_dockside.md': 'L2-centre-hongkong-k11-atelier-victoria-dockside.md',
    'axa_tower.md': 'L2-centre-jakarta-axa-tower.md',
    'indonesia_stock_exchange.md': 'L2-centre-jakarta-idx.md',
    'one_pacific_place.md': 'L2-centre-jakarta-one-pacific-place.md',
    'sahid_sudirman_center.md': 'L2-centre-jakarta-sahid-sudirman-center.md',
    'axiata_tower.md': 'L2-centre-kuala-lumpur-axiata-tower.md',
    'menara_maxis_26th.md': 'L2-centre-kuala-lumpur-menara-maxis-26th-floor.md',
    'menara_maxis_36th.md': 'L2-centre-kuala-lumpur-menara-maxis-36th-floor.md',
    'q_sentral.md': 'L2-centre-kuala-lumpur-q-sentral-east-wing.md',
    'lkg_tower.md': 'L2-centre-manila-lkg-tower.md',
    'kyobo_building.md': 'L2-centre-seoul-kyobo-building.md',
    'parnas_tower.md': 'L2-centre-seoul-parnas-tower.md',
    'hong_kong_new_world_tower__k11_.md': 'L2-centre-shanghai-hongkong-new-world-tower-k11.md',
    'shanghai_lujiazui_finance_plaza.md': 'L2-centre-shanghai-lujiazui-finance-plaza.md',
    'shanghai_world_financial_center.md': 'L2-centre-shanghai-world-financial-center.md',
    'centennial_tower.md': 'L2-centre-singapore-centennial-tower.md'
}

def parse_md_location(path):
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()

    deskripsi_match = re.search(r'## Deskripsi\s+(.*?)\s+## Kontak', content, re.DOTALL)
    deskripsi = deskripsi_match.group(1).strip() if deskripsi_match else ''
    lines = deskripsi.split('\n')
    if len(lines) > 2 and lines[0].isupper() and (lines[1].isupper() or 'INDONESIA' in lines[1] or 'THAILAND' in lines[1] or 'MALAYSIA' in lines[1]):
        deskripsi = '\n'.join(lines[2:]).strip()

    kontak_match = re.search(r'## Kontak & Alamat\s+(.*?)\s+## Fasilitas', content, re.DOTALL)
    kontak = kontak_match.group(1).strip() if kontak_match else ''
    kontak_fields = {}
    for line in kontak.split('\n'):
        if ':' in line and line.startswith('-'):
            key, val = line.split(':', 1)
            key = key.replace('-', '').replace('**', '').strip()
            val = val.replace('**', '').strip()
            kontak_fields[key] = val

    fasilitas_match = re.search(r'## Fasilitas\s+(.*?)\s+## Layanan', content, re.DOTALL)
    if not fasilitas_match:
        fasilitas_match = re.search(r'## Fasilitas\s+(.*)', content, re.DOTALL)
    fasilitas = fasilitas_match.group(1).strip() if fasilitas_match else ''
    return deskripsi, kontak_fields, fasilitas

for md_file, l2_file in mapping.items():
    md_path = os.path.join(md_dir, md_file)
    l2_path = os.path.join(l2_dir, l2_file)
    
    if not os.path.exists(md_path) or not os.path.exists(l2_path):
        continue
        
    deskripsi, kontak_fields, fasilitas = parse_md_location(md_path)
    
    with open(l2_path, 'r', encoding='utf-8') as f:
        l2_content = f.read()

    # Clean up the previously injected buggy ** values
    for key in ['Telepon', 'WhatsApp', 'Email', 'Latitude', 'Longitude']:
        l2_content = re.sub(rf'-\s+{key}:\s*\*\*\s*', f'- {key}: ', l2_content)

    identity_section_match = re.search(r'(Controlled centre identity:\s+.*?)\n\n## Building Profile', l2_content, re.DOTALL)
    if identity_section_match:
        identity_section = identity_section_match.group(1)
        new_identity = identity_section
        
        for key in ['Telepon', 'WhatsApp', 'Email', 'Latitude', 'Longitude']:
            if key in kontak_fields:
                val = kontak_fields[key]
                if not re.search(rf'-\s+{key}:', new_identity, re.IGNORECASE):
                    new_identity += f'\n- {key}: {val}'
                else:
                    new_identity = re.sub(rf'-\s+{key}:.*', f'- {key}: {val}', new_identity)
        
        l2_content = l2_content.replace(identity_section, new_identity)

    # Clean up missing newline before ## Access Hours if it happened previously
    l2_content = re.sub(r'(.*?)\n## Access Hours', r'\1\n\n## Access Hours', l2_content)

    # Write back
    with open(l2_path, 'w', encoding='utf-8') as f:
        f.write(l2_content)
    
    print(f"Fixed {l2_file}")

print("Merge completed.")
