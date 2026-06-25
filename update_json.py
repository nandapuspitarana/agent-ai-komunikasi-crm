import json

with open('UserJourney-Agent.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

# Mapping of suffixes to their full forms
suffix_map = {
    "(PO)": "Private Office",
    "Private Office": "Private Office",
    "(MR)": "Meeting Room",
    "Meeting Room": "Meeting Room",
    "(VO)": "Virtual Office",
    "Virtual Office": "Virtual Office",
    "(DW)": "Dedicated Workstation",
    "Dedicated Workstation": "Dedicated Workstation"
}

def process_options(options_str):
    if not options_str:
        return options_str
    
    opts = [o.strip() for o in options_str.split(',') if o.strip()]
    new_opts = []
    
    for opt in opts:
        # Ignore if it already has a pipe
        if '|' in opt:
            new_opts.append(opt)
            continue
            
        # Check if it's an action option
        if opt.startswith("Request quotation"):
            new_opts.append(f"Request Quotation|{opt}")
            continue
        elif opt.startswith("Book a tour"):
            new_opts.append(f"Book a Tour|{opt}")
            continue
            
        # Check if it's a city or centre selection
        matched = False
        # sort by length descending to match "(PO)" before "O" just in case, though they don't overlap here
        for suffix, full_name in sorted(suffix_map.items(), key=lambda x: -len(x[0])):
            if opt.endswith(suffix):
                label = opt[:-len(suffix)].strip()
                if label:
                    value = f"{label} {full_name}"
                    new_opts.append(f"{label}|{value}")
                else:
                    new_opts.append(opt)
                matched = True
                break
                
        if not matched:
            new_opts.append(opt)
            
    return ", ".join(new_opts)

# Also update training phrases to ensure the new values are matched
def update_training_phrases(phrases):
    new_phrases = []
    for p in phrases:
        new_phrases.append(p)
        for suffix, full_name in sorted(suffix_map.items(), key=lambda x: -len(x[0])):
            if p.endswith(suffix):
                label = p[:-len(suffix)].strip()
                if label:
                    new_value = f"{label} {full_name}"
                    if new_value not in phrases and new_value not in new_phrases:
                        new_phrases.append(new_value)
    return new_phrases

for intent in data['data']['intents']:
    if 'options' in intent and intent['options']:
        intent['options'] = process_options(intent['options'])
        
    if 'trainingPhrases' in intent and intent['trainingPhrases']:
        intent['trainingPhrases'] = update_training_phrases(intent['trainingPhrases'])

with open('UserJourney-Agent.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, indent=2, ensure_ascii=False)

print("Done")
