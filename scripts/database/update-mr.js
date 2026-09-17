const fs = require('fs');
const file = 'UserJourney-Agent.json';
const data = JSON.parse(fs.readFileSync(file, 'utf8'));

let updatedCount = 0;

data.data.intents.forEach(intent => {
  if (intent.name.includes('(MR)') && (intent.name.includes('Book a tour') || intent.name.includes('Request Quotation') || intent.name.includes('Request quotation'))) {
    
    // Extract the webhook URL from the existing onclick handler
    const urlMatch = intent.response.match(/url:'([^']+)'/);
    const webhookUrl = urlMatch ? urlMatch[1] : '';
    
    // Determine the button text
    let btnText = 'Submit';
    if (intent.name.toLowerCase().includes('book a tour')) {
      btnText = 'Schedule Tour';
    } else if (intent.name.toLowerCase().includes('request quotation')) {
      btnText = 'Request Quotation';
    }

    // Split at the form card div to keep the text prefix
    const parts = intent.response.split("<div class='form-card'>");
    const textPrefix = parts[0];

    // The new HTML for the form
    const newForm = `<div class='form-card'><div class='form-grid'><div><label class='form-card_label'>Date</label><input type='date' name='Date' placeholder='Date' class='form-card_input'/></div><div><label class='form-card_label'>Duration</label><input type='text' name='Duration' placeholder='Duration' class='form-card_input'/></div></div><label class='form-card_label'>Name</label><input type='text' name='Name' placeholder='Name' class='form-card_input'/><label class='form-card_label'>Email</label><input type='email' name='Email' placeholder='Email' class='form-card_input'/><label class='form-card_label'>Note</label><input type='text' name='Note' placeholder='Note' class='form-card_input'/><label class='form-card_label'>Remark</label><input type='text' name='Remark' placeholder='Remark' class='form-card_input'/><button type='button' class='submit-btn' onclick="const c=this.closest('.form-card');const i=c.querySelectorAll('input');let d={};i.forEach(el=>d[el.name||el.placeholder||el.type]=el.value);window.postMessage({type:'widget_form_submit',url:'${webhookUrl}',payload:d}, '*');">${btnText}</button></div>`;

    intent.response = textPrefix + newForm;
    updatedCount++;
  }
});

fs.writeFileSync(file, JSON.stringify(data, null, 2));
console.log(`Successfully updated ${updatedCount} MR forms in UserJourney-Agent.json`);
