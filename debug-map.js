const puppeteer = require('puppeteer');
(async () => {
    const browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();
    page.on('console', msg => console.log('BROWSER CONSOLE:', msg.text()));
    await page.goto('http://localhost:3000/world', { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 5000));
    await browser.close();
    process.exit(0);
})();
