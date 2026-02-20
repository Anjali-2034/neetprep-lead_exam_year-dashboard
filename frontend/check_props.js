const fs = require('fs');
const path = '/home/anjaliverma/.local/share/opencode/tool-output/tool_c6528611d001gCW0HfnUUqvmng';

try {
  const data = fs.readFileSync(path, 'utf8');
  // It's likely wrapped in {"results": [...] } or similar structure
  // The grep output showed `{"results":...` at the start.
  
  // The file might be truncated though? 
  // Ah, the tool output said "800759 bytes truncated...". 
  // Wait, the tool output *was* truncated when *displayed* to me, but the full content is saved to the file.
  // So I can read the file fully here? Node script runs on the machine, so yes.
  
  const json = JSON.parse(data);
  const properties = json.results;
  
  const targetNames = [
    'first_page_seen',
    'hs_analytics_first_url',
    'recent_conversion_event_name',
    'first_conversion_event_name',
    'gclid',
    'hs_google_click_id',
    'utm_campaign',
    'lead_exam_year'
  ];

  const found = {};
  targetNames.forEach(name => {
    const prop = properties.find(p => p.name === name);
    if (prop) {
      found[name] = {
        label: prop.label,
        type: prop.type,
        description: prop.description
      };
    } else {
      found[name] = "NOT FOUND";
    }
  });

  console.log(JSON.stringify(found, null, 2));

} catch (err) {
  console.error("Error:", err.message);
}
