const potrace = require('potrace');
const fs = require('fs');
const path = require('path');

const refImgPath = 'C:/Users/Naveen/.gemini/antigravity/brain/82fbaad2-3e50-4b24-9aeb-0cd88f56c103/.user_uploaded/media_1795162451616_ad3251ae.png';

potrace.trace(refImgPath, {
  threshold: 80,
  turnPolicy: potrace.Potrace.TURNPOLICY_MINORITY,
  turdSize: 2,
  optTolerance: 0.2,
  optCurve: true
}, (err, svg) => {
  if (err) {
    console.error('Error tracing:', err);
    return;
  }
  fs.writeFileSync('screenshots/potrace-raw.svg', svg);
  console.log('Successfully traced SVG with length:', svg.length);
});
