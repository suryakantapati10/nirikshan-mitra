const fs = require('fs');

async function testImage(labelName, filePath) {
  console.log(`\n========================================`);
  console.log(`TESTING ${labelName}: ${filePath}`);
  console.log(`========================================`);
  
  const buffer = fs.readFileSync(filePath);
  const base64Data = buffer.toString('base64');
  const dataUrl = `data:image/jpeg;base64,${base64Data}`;

  const response = await fetch('http://localhost:3000/api/ocr', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image: dataUrl })
  });

  const result = await response.json();
  console.log('HTTP Status:', response.status);
  console.log('Success:', result.success);
  console.log('Diagnostics:', JSON.stringify(result.diagnostics, null, 2));
  console.log('\n--- RAW READABLE TEXT EXTRACTED ---');
  console.log(result.text);
  console.log('-----------------------------------\n');
  return result;
}

async function run() {
  const res1 = await testImage('IMAGE 1: Fortune Sunflower Oil', './sample_labels/label1_fortune_oil.jpg');
  const res2 = await testImage('IMAGE 2: Good Day Rich Butter Cookies', './sample_labels/label2_good_day_cookies.jpg');

  console.log('=== VERIFICATION SUMMARY ===');
  console.log('Are results different?:', res1.text !== res2.text);
  console.log('Image 1 characters:', (res1.text || '').length);
  console.log('Image 2 characters:', (res2.text || '').length);
}

run().catch(console.error);
