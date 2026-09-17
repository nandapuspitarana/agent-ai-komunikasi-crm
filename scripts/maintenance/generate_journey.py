import json
import re

SERVICE_NAMES = {
    "PO": "Private Office",
    "MR": "Meeting Room",
    "VO": "Virtual Office",
    "DW": "Dedicated Workstation",
    "Co": "Coworking"
}

def extract_data():
    with open('userJourneNewIntens.json', 'r', encoding='utf-8') as f:
        data = json.load(f)
        
    intents = data.get('data', {}).get('intents', [])
    if not intents:
        if isinstance(data, list):
            intents = data
            
    # services_data[service_code][city] = [centers...]
    services_data = {code: {} for code in SERVICE_NAMES.keys()}
    
    # Extract centers per service
    for intent in intents:
        name = intent.get('name', '')
        if name.startswith('04') and ' Explore ' in name:
            match = re.match(r'04([A-Za-z]{2}) Explore (.+)', name)
            if match:
                code = match.group(1)
                center_name = match.group(2).strip()
                
                phrases = intent.get('trainingPhrases', [])
                city = "Unknown"
                if phrases:
                    phrase = phrases[0]
                    city_match = re.search(r'at [^,]+, (.+)\.$', phrase)
                    if city_match:
                        city = city_match.group(1).strip()
                        
                desc = intent.get('response', '')
                
                if code in services_data:
                    if city not in services_data[code]:
                        services_data[code][city] = {}
                    services_data[code][city][center_name] = desc

    # Pass 2: If city is Unknown, try to find it from 03[code] [City]
    for intent in intents:
        name = intent.get('name', '')
        if name.startswith('03'):
            match = re.match(r'03([A-Za-z]{2}) (.+)', name)
            if match:
                code = match.group(1)
                city = match.group(2).strip()
                options = intent.get('options', '')
                centers = [c.strip() for c in options.split(',') if c.strip()]
                
                if code in services_data:
                    if city not in services_data[code]:
                        services_data[code][city] = {}
                    
                    for c in centers:
                        if not c: continue
                        if 'Unknown' in services_data[code] and c in services_data[code]['Unknown']:
                            desc = services_data[code]['Unknown'].pop(c)
                            services_data[code][city][c] = desc
                        elif c not in services_data[code][city]:
                            services_data[code][city][c] = ''
                            
    for code in services_data:
        if 'Unknown' in services_data[code] and not services_data[code]['Unknown']:
            del services_data[code]['Unknown']

    return services_data

def build_flow(services_data):
    intents = [
        {
            "name": "Start / Main Menu",
            "trainingPhrases": ["hi", "hello", "start", "menu", "start again", "what services do you offer", "help"],
            "responseType": "options",
            "response": "Hello, I’m Claire from CEO SUITE. What are you looking for today?",
            "options": "Help me choose, Private Office, Day Office, Dedicated Workstation, Coworking, Virtual Office, Meeting Room",
            "metadata": {}
        },
        {
            "name": "Help me choose",
            "trainingPhrases": ["Help me choose", "I don't know what I need", "Guide me", "Recommend a service"],
            "responseType": "options",
            "response": "Sure. Which need sounds closest?",
            "options": "Space for my team, A regular desk, Occasional workspace, Business address, Meeting room, Private office for a day",
            "metadata": {}
        },
        {
            "name": "Need: Space for my team",
            "trainingPhrases": ["Space for my team", "I need an office for my team", "Team workspace"],
            "responseType": "options",
            "response": "I recommend Private Office. Best for teams that need a private, ready-to-use office with flexible terms.\n\nWhich city are you interested in?",
            "options": ", ".join(sorted([f"{c} (PO)" for c in services_data['PO'].keys() if c != 'Unknown'])),
            "metadata": {}
        }
    ]
    
    intents.append({
        "name": "Direct: Private Office",
        "trainingPhrases": ["Private Office", "I want a private office", "i need private office"],
        "responseType": "options",
        "response": "Private Office\nBest for teams that need a private, ready-to-use office with flexible terms.\n\nWhich city are you interested in?",
        "options": ", ".join(sorted([f"{c} (PO)" for c in services_data.get('PO', {}).keys() if c != 'Unknown'])),
        "metadata": {}
    })
    
    intents.append({
        "name": "Direct: Meeting Room",
        "trainingPhrases": ["Meeting Room", "I want a meeting room", "i need a meeting room", "Meeting room"],
        "responseType": "options",
        "response": "Meeting Room\nFully equipped meeting rooms for your professional gatherings.\n\nWhich city are you interested in?",
        "options": ", ".join(sorted([f"{c} (MR)" for c in services_data.get('MR', {}).keys() if c != 'Unknown'])),
        "metadata": {}
    })

    intents.append({
        "name": "Direct: Virtual Office",
        "trainingPhrases": ["Virtual Office", "I want a virtual office", "Business address"],
        "responseType": "options",
        "response": "Virtual Office\nEstablish a premium business address without the physical space overhead.\n\nWhich city are you interested in?",
        "options": ", ".join(sorted([f"{c} (VO)" for c in services_data.get('VO', {}).keys() if c != 'Unknown'])),
        "metadata": {}
    })

    intents.append({
        "name": "Direct: Dedicated Workstation",
        "trainingPhrases": ["Dedicated Workstation", "A regular desk", "I need a dedicated desk"],
        "responseType": "options",
        "response": "Dedicated Workstation\nYour own personal desk in a shared premium environment.\n\nWhich city are you interested in?",
        "options": ", ".join(sorted([f"{c} (DW)" for c in services_data.get('DW', {}).keys() if c != 'Unknown'])),
        "metadata": {}
    })

    intents.append({
        "name": "Direct: Coworking",
        "trainingPhrases": ["Coworking", "Occasional workspace", "Hot desking"],
        "responseType": "options",
        "response": "Coworking\nFlexible hot-desking options in our premium business lounges.\n\nWhich city are you interested in?",
        "options": ", ".join(sorted([f"{c} (Co)" for c in services_data.get('Co', {}).keys() if c != 'Unknown'])),
        "metadata": {}
    })
    
    intents.append({
        "name": "Direct: Day Office",
        "trainingPhrases": ["Day Office", "Private office for a day"],
        "responseType": "options",
        "response": "Day Office\nPrivate office space available on a daily basis.\n\nWhich city are you interested in?",
        "options": ", ".join(sorted([f"{c} (PO)" for c in services_data.get('PO', {}).keys() if c != 'Unknown'])),
        "metadata": {}
    })

    webhook_base = "https://n8n-7-7.ceosuite.com/webhook/639da863-643a-4f6d-8237-750e4eaac76e"

    for code, cities in services_data.items():
        service_name = SERVICE_NAMES.get(code, code)
        
        for city, centers in cities.items():
            if not centers or city == "Unknown":
                continue
                
            center_names = list(centers.keys())
            
            intents.append({
                "name": f"{code} City: {city}",
                "trainingPhrases": [f"{city} ({code})", f"In {city} for {service_name}", f"{city} {service_name}"],
                "responseType": "options",
                "response": f"Here are our premium {service_name} locations in {city}. Please choose a centre.",
                "options": ", ".join([f"{c} ({code})" for c in center_names]),
                "metadata": {}
            })
            
            for center_name, desc in centers.items():
                if not center_name: continue
                clean_desc = desc.replace('\n', '<br/>')
                if not clean_desc:
                    clean_desc = f"Our {service_name} at {center_name} is available with premium amenities."
                    
                response_html = f"<div class='card'><div class='card-title'>{center_name} ({city}) - {service_name}</div>"
                response_html += f"<div class='small'>{clean_desc}</div></div>"
                response_html += "<div class='cta-note'>Next, you can continue with the recommended action or ask a question.</div>"
                
                intents.append({
                    "name": f"{code} Centre: {center_name}",
                    "trainingPhrases": [f"{center_name} ({code})"],
                    "responseType": "options",
                    "response": response_html,
                    "options": f"Request quotation {center_name} ({code}), Book a tour {center_name} ({code}), Start again",
                    "metadata": {}
                })
                
                webhook_query = f"?venue={center_name.replace(' ', '+')}&city={city.replace(' ', '+')}&product={service_name.replace(' ', '+')}"
                full_webhook = webhook_base + webhook_query
                
                form_script = "const c=this.closest('.form-card');const i=c.querySelectorAll('input');let d={};i.forEach(el=>d[el.placeholder||el.type]=el.value);window.postMessage({type:'widget_form_submit',url:'" + full_webhook + "',payload:d}, '*');"
                
                if code == 'MR':
                    quote_form = f"Our team will review {service_name} availability for {center_name}. Please provide your details.<div class='form-card'><label class='form-card_label'>Name</label><input type='text' placeholder='Name' class='form-card_input'/><label class='form-card_label'>Email</label><input type='email' placeholder='Email' class='form-card_input'/><label class='form-card_label'>Contact Number</label><input type='tel' placeholder='Phone' class='form-card_input'/><div class='form-grid'><div><label class='form-card_label'>Date</label><input type='date' class='form-card_input'/></div><div><label class='form-card_label'>Time</label><input type='time' class='form-card_input'/></div></div><div class='form-grid'><div><label class='form-card_label'>Duration</label><input type='text' placeholder='e.g. 2 hours' class='form-card_input'/></div><div><label class='form-card_label'>Persons</label><input type='number' placeholder='Size' class='form-card_input'/></div></div><label class='form-card_label'>Remarks</label><input type='text' placeholder='Any special requests' class='form-card_input'/><button type='button' class='submit-btn' onclick=\"{form_script}\">Request Quotation</button></div>"
                else:
                    quote_form = f"Our team will review {service_name} availability for {center_name}. Please provide your details.<div class='form-card'><label class='form-card_label'>Name</label><input type='text' placeholder='Name' class='form-card_input'/><label class='form-card_label'>Email</label><input type='email' placeholder='Email' class='form-card_input'/><label class='form-card_label'>Contact Number</label><input type='tel' placeholder='Phone' class='form-card_input'/><div class='form-grid'><div><label class='form-card_label'>Team Size</label><input type='number' placeholder='Size' class='form-card_input'/></div><div><label class='form-card_label'>Move-in Date</label><input type='date' class='form-card_input'/></div></div><button type='button' class='submit-btn' onclick=\"{form_script}\">Request Quotation</button></div>"
                
                intents.append({
                    "name": f"Action: Request Quotation {center_name} ({code})",
                    "trainingPhrases": [f"Request quotation {center_name} ({code})", f"I want a quote for {center_name} {service_name}"],
                    "responseType": "form",
                    "response": quote_form,
                    "options": "",
                    "metadata": {}
                })
                
                tour_form = f"Schedule a tour for {service_name} at {center_name}.<div class='form-card'><div class='form-grid'><div><label class='form-card_label'>Date</label><input type='date' class='form-card_input'/></div><div><label class='form-card_label'>Time</label><input type='time' class='form-card_input'/></div></div><label class='form-card_label'>Name</label><input type='text' placeholder='Name' class='form-card_input'/><label class='form-card_label'>Email</label><input type='email' placeholder='Email' class='form-card_input'/><button type='button' class='submit-btn' onclick=\"{form_script}\">Schedule Tour</button></div>"
                
                intents.append({
                    "name": f"Action: Book a tour {center_name} ({code})",
                    "trainingPhrases": [f"Book a tour {center_name} ({code})", f"Schedule a tour {center_name} {service_name}"],
                    "responseType": "form",
                    "response": tour_form,
                    "options": "",
                    "metadata": {}
                })

    with open('UserJourney-Agent.json', 'r', encoding='utf-8') as f:
        old_data = json.load(f)
        
    old_data['data']['intents'] = intents
    
    with open('UserJourney-Agent.json', 'w', encoding='utf-8') as f:
        json.dump(old_data, f, indent=2)
        
    print(f"Generated {len(intents)} intents.")

if __name__ == '__main__':
    cities_data = extract_data()
    build_flow(cities_data)
