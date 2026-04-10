import fs from 'fs';

let content = fs.readFileSync('frontend/src/constants.ts', 'utf-8');

content = content.replace(/price:\s*(\d+),\s*originalPrice:\s*(\d+)/g, (match, p1, p2) => {
    let p = parseInt(p1);
    let o = parseInt(p2);
    
    if (p >= 400 || o >= 400) {
        // Randomize but keep under 400, and ensure price < originalPrice
        // Deterministic pseudo-random based on original values
        p = 150 + (p % 150); // 150 to 299
        o = p + 40 + (o % 50); // p + 40 to p + 89
    }
    return `price: ${p}, originalPrice: ${o}`;
});

fs.writeFileSync('frontend/src/constants.ts', content);
console.log('Prices updated successfully!');
