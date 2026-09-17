import xml.etree.ElementTree as ET
import re
import os
import html

def strip_tags(html_content):
    if not html_content:
        return ""
    # Remove html tags
    clean = re.compile('<.*?>')
    text = re.sub(clean, '', html_content)
    # Decode html entities
    text = html.unescape(text)
    return text.strip()

def parse_wordpress_xml(xml_file_path, output_dir):
    # Read the file content and find where the actual XML starts
    with open(xml_file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    xml_start = content.find('<?xml')
    if xml_start != -1:
        content = content[xml_start:]
    
    import io
    tree = ET.parse(io.StringIO(content))
    root = tree.getroot()

    # Define namespaces used in WordPress XML
    namespaces = {
        'wp': 'http://wordpress.org/export/1.2/',
        'content': 'http://purl.org/rss/1.0/modules/content/'
    }

    if not os.path.exists(output_dir):
        os.makedirs(output_dir)

    # Find all items (posts)
    channel = root.find('channel')
    count = 0
    
    for item in channel.findall('item'):
        post_type = item.find('wp:post_type', namespaces)
        if post_type is None or post_type.text != 'office':
            continue

        title = item.find('title').text
        if not title:
            continue
            
        location_data = {
            'title': title,
            'description': '',
            'address': '',
            'address2': '',
            'phone': '',
            'email': '',
            'whatsapp': '',
            'latitude': '',
            'longitude': '',
            'amenities': [],
            'pricing': []
        }

        # Parse postmeta
        meta_dict = {}
        for meta in item.findall('wp:postmeta', namespaces):
            key_elem = meta.find('wp:meta_key', namespaces)
            val_elem = meta.find('wp:meta_value', namespaces)
            if key_elem is not None and val_elem is not None and val_elem.text:
                meta_dict[key_elem.text] = val_elem.text

        location_data['description'] = strip_tags(meta_dict.get('welcome_content', ''))
        location_data['address'] = meta_dict.get('address', '')
        location_data['address2'] = meta_dict.get('address2', '')
        location_data['phone'] = meta_dict.get('phone', '')
        location_data['email'] = meta_dict.get('email', '')
        location_data['whatsapp'] = meta_dict.get('whatsapp', '')
        location_data['latitude'] = meta_dict.get('latitude', '')
        location_data['longitude'] = meta_dict.get('longitude', '')

        for key, val in meta_dict.items():
            if key.startswith('building_amenities_') and key.endswith('_title'):
                location_data['amenities'].append(strip_tags(val).replace('\n', ' '))

        # Determine country suffix
        def get_country_suffix(email, address, address2, title):
            search_text = f"{email} {address} {address2} {title}".lower()
            if "thailand" in search_text or "bangkok" in search_text or "@th.ceosuite.com" in search_text:
                return "thailand"
            if "vietnam" in search_text or "hanoi" in search_text or "ho chi minh" in search_text or "@vn.ceosuite.com" in search_text:
                return "vietnam"
            if "korea" in search_text or "seoul" in search_text or "@kr.ceosuite.com" in search_text:
                return "south_korea"
            if "malaysia" in search_text or "kuala lumpur" in search_text or "@my.ceosuite.com" in search_text:
                return "malaysia"
            if "philippines" in search_text or "manila" in search_text or "@ph.ceosuite.com" in search_text:
                return "philippines"
            if "singapore" in search_text or "@sg.ceosuite.com" in search_text:
                return "singapore"
            if "china" in search_text or "beijing" in search_text or "shanghai" in search_text or "@cn.ceosuite.com" in search_text:
                return "china"
            if "indonesia" in search_text or "jakarta" in search_text or "@id.ceosuite.com" in search_text:
                return "indonesia"
            return None

        country = get_country_suffix(location_data['email'], location_data['address'], location_data['address2'], title)

        # Process prices based on country
        price_count_str = meta_dict.get('price_list', '0')
        try:
            price_count = int(price_count_str)
        except ValueError:
            price_count = 0

        for idx in range(price_count):
            title_key = f'price_list_{idx}_title'
            if title_key in meta_dict:
                price_val = None
                if country:
                    country_price_key = f'price_list_{idx}_{country}_price'
                    if country_price_key in meta_dict:
                        price_val = meta_dict[country_price_key]
                
                if not price_val:
                    default_price_key = f'price_list_{idx}_price'
                    price_val = meta_dict.get(default_price_key, '')
                    
                if price_val:
                    location_data['pricing'].append(f"{strip_tags(meta_dict[title_key])}: {strip_tags(price_val)}")

        # Build Markdown content
        md_lines = []
        md_lines.append(f"# {location_data['title']}")
        md_lines.append("")
        
        if location_data['description']:
            md_lines.append("## Deskripsi")
            md_lines.append(location_data['description'])
            md_lines.append("")
            
        md_lines.append("## Kontak & Alamat")
        address_full = ", ".join(filter(None, [location_data['address'], location_data['address2']]))
        if address_full: md_lines.append(f"- **Alamat:** {address_full}")
        if location_data['phone']: md_lines.append(f"- **Telepon:** {location_data['phone']}")
        if location_data['whatsapp']: md_lines.append(f"- **WhatsApp:** {location_data['whatsapp']}")
        if location_data['email']: md_lines.append(f"- **Email:** {location_data['email']}")
        if location_data['latitude']: md_lines.append(f"- **Latitude:** {location_data['latitude']}")
        if location_data['longitude']: md_lines.append(f"- **Longitude:** {location_data['longitude']}")
        md_lines.append("")
        
        if location_data['amenities']:
            md_lines.append("## Fasilitas")
            for am in set(location_data['amenities']):
                if am.strip():
                    md_lines.append(f"- {am.strip()}")
            md_lines.append("")
            
        if location_data['pricing']:
            md_lines.append("## Layanan & Harga")
            for pr in location_data['pricing']:
                md_lines.append(f"- {pr}")
            md_lines.append("")

        # Save to markdown file
        safe_title = re.sub(r'[^a-zA-Z0-9_\-]', '_', location_data['title'].lower())
        output_file = os.path.join(output_dir, f"{safe_title}.md")
        
        with open(output_file, 'w', encoding='utf-8') as f:
            f.write("\n".join(md_lines))
            
        count += 1
        print(f"Generated {output_file}")

    print(f"Successfully converted {count} locations.")

if __name__ == '__main__':
    xml_path = r"c:\Users\nanda\Documents\aiagent\agent-ai-komunikasi-crm\userjourney\knowledge base\ceosuite.WordPress.2026-06-24-location.xml"
    out_dir = r"c:\Users\nanda\Documents\aiagent\agent-ai-komunikasi-crm\userjourney\knowledge base\md_locations"
    parse_wordpress_xml(xml_path, out_dir)
