const fs = require('fs');
const res = JSON.parse(fs.readFileSync('./data/resorts.json'));
console.log("Total Resort Records: " + res.length);
