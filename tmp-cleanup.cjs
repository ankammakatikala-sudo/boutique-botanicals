const fs = require('fs');
let c = fs.readFileSync('src/constants.ts', 'utf8');

c = c.replace(/image:\s*'[^']*',?/g, "image: '', ");
c = c.replace(/benefits:\s*'Grows well in low light.',\s*stock:\s*12,/g, "benefits: 'Grows well in low light.', image: '', stock: 12,");

fs.writeFileSync('src/constants.ts', c);
