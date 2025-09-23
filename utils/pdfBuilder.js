import puppeteer from 'puppeteer';
import fs from 'node:fs/promises';


export const buildPDF = async ({ html, outhPath }) => {

        let browser;
        browser = await puppeteer.launch({ args: ['--no-sandbox']});
        const page = await browser.newPage();
        await page.setContent(html, { waitUntil: 'networkidle0'});
        await page.pdf({
            path: outhPath,
            format: 'A4',
            printBackground: true,
            margin: { top: '10mm', left: '10mm', right: '10mm', bottom: '12mm'}
        });
        await browser.close();
        return outhPath;
}