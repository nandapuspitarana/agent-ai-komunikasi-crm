import os
import re

md_dir = r'c:\Users\nanda\Documents\aiagent\agent-ai-komunikasi-crm\userjourney\knowledge base\md_locations'
l2_dir = r'c:\Users\nanda\Documents\aiagent\agent-ai-komunikasi-crm\userjourney\knowledge base'

# Manual mapping
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

    # Extract Deskripsi
    deskripsi_match = re.search(r'## Deskripsi\s+(.*?)\s+## Kontak', content, re.DOTALL)
    deskripsi = deskripsi_match.group(1).strip() if deskripsi_match else ''

    # Clean up deskripsi (remove the title and CITY, COUNTRY if they exist at the top)
    lines = deskripsi.split('\n')
    if len(lines) > 2 and lines[0].isupper() and (lines[1].isupper() or 'INDONESIA' in lines[1] or 'THAILAND' in lines[1] or 'MALAYSIA' in lines[1]):
        deskripsi = '\n'.join(lines[2:]).strip()

    # Extract Kontak & Alamat
    kontak_match = re.search(r'## Kontak & Alamat\s+(.*?)\s+## Fasilitas', content, re.DOTALL)
    kontak = kontak_match.group(1).strip() if kontak_match else ''
    kontak_fields = {}
    for line in kontak.split('\n'):
        if ':' in line and line.startswith('-'):
            key, val = line.split(':', 1)
            key = key.replace('-', '').replace('**', '').strip()
            val = val.strip()
            kontak_fields[key] = val

    # Extract Fasilitas
    fasilitas_match = re.search(r'## Fasilitas\s+(.*?)\s+## Layanan', content, re.DOTALL)
    if not fasilitas_match:
        # Just in case Layanan & Harga is missing
        fasilitas_match = re.search(r'## Fasilitas\s+(.*)', content, re.DOTALL)
    fasilitas = fasilitas_match.group(1).strip() if fasilitas_match else ''

    return deskripsi, kontak_fields, fasilitas

for md_file, l2_file in mapping.items():
    md_path = os.path.join(md_dir, md_file)
    l2_path = os.path.join(l2_dir, l2_file)
    
    if not os.path.exists(md_path) or not os.path.exists(l2_path):
        print(f"Skipping {md_file} - not found.")
        continue
        
    deskripsi, kontak_fields, fasilitas = parse_md_location(md_path)
    
    with open(l2_path, 'r', encoding='utf-8') as f:
        l2_content = f.read()

    # 1. Update Deskripsi Lokasi before "Controlled centre identity:"
    if 'Controlled centre identity:' in l2_content:
        # Check if Deskripsi Lokasi already exists
        if '**Deskripsi Lokasi:**' in l2_content:
            l2_content = re.sub(r'\*\*Deskripsi Lokasi:\*\*\s+.*?(?=Controlled centre identity:)', 
                                f'**Deskripsi Lokasi:**\n{deskripsi}\n\n', 
                                l2_content, flags=re.DOTALL)
        else:
            l2_content = l2_content.replace('Controlled centre identity:', 
                                f'**Deskripsi Lokasi:**\n{deskripsi}\n\nControlled centre identity:')

    # 2. Update Controlled centre identity fields
    identity_section_match = re.search(r'(Controlled centre identity:\s+.*?)\n\n## Building Profile', l2_content, re.DOTALL)
    if identity_section_match:
        identity_section = identity_section_match.group(1)
        new_identity = identity_section
        
        # We only want to add fields that are not in the existing identity list.
        # But for Latitude/Longitude/Telepon/WhatsApp/Email, we can add them.
        for key in ['Telepon', 'WhatsApp', 'Email', 'Latitude', 'Longitude']:
            if key in kontak_fields:
                val = kontak_fields[key]
                # check if it's already there
                if not re.search(rf'-\s+{key}:', new_identity, re.IGNORECASE):
                    new_identity += f'\n- {key}: {val}'
                else:
                    # Replace existing value
                    new_identity = re.sub(rf'-\s+{key}:.*', f'- {key}: {val}', new_identity)
        
        l2_content = l2_content.replace(identity_section, new_identity)

    # 3. Update Facilities
    # The L2 files usually have `## Facilities\nConfirm facilities... include:\n- ...\n\n## Access Hours`
    facilities_replacement = f"## Facilities\nConfirm facilities from approved centre data before promising them. Verified facilities at this location include:\n{fasilitas}"
    
    l2_content = re.sub(r'## Facilities\s+.*?(?=\n## Access Hours)', facilities_replacement, l2_content, flags=re.DOTALL)

    with open(l2_path, 'w', encoding='utf-8') as f:
        f.write(l2_content)
    
    print(f"Updated {l2_file}")

print("Merge completed.")
