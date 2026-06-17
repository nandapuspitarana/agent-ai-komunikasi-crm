const fs = require('fs');

async function testUpload() {
  const filePath = 'C:\\Users\\nanda\\Documents\\aiagent\\agent-ai-komunikasi-crm\\userjourney\\knowledge base\\KB - Pricing Table.xlsx';
  const fileBuffer = fs.readFileSync(filePath);
  const fileBlob = new Blob([fileBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  fileBlob.name = 'KB - Pricing Table.xlsx';
  
  const formData = new FormData();
  formData.append('file', fileBlob, 'KB - Pricing Table.xlsx');
  formData.append('meta_name', 'Pricing Table');
  formData.append('agent_id', 'test-agent-id');

  console.log('Sending request to proxy...');
  try {
    const res = await fetch('http://localhost:8200/api/v1/documents/ingest', {
      method: 'POST',
      body: formData,
    });
    
    if (res.ok) {
      const data = await res.json();
      console.log('Success:', data);
    } else {
      const text = await res.text();
      console.log('Failed:', res.status, text);
    }
  } catch (err) {
    console.error('Fetch error:', err);
  }
}

testUpload();
