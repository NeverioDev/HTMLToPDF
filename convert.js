
import fs from 'fs';
import puppeteer from 'puppeteer';
import { PDFDocument, rgb } from 'pdf-lib';

async function captureScreenshots(htmlFiles) {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  const screenshots = [];

  for (const htmlFile of htmlFiles) {
    const content = fs.readFileSync(htmlFile, 'utf8');
    await page.setContent(content, { waitUntil: 'networkidle0' });

    const screenshot = await page.screenshot({ fullPage: true });
    screenshots.push(screenshot);
  }

  await browser.close();
  return screenshots;
}

async function createPdfFromImages(images, outputPdf) {
  const pdfDoc = await PDFDocument.create();

  for (const image of images) {
    const img = await pdfDoc.embedPng(image);
    const page = pdfDoc.addPage([img.width, img.height]);
    page.drawImage(img, {
      x: 0,
      y: 0,
      width: img.width,
      height: img.height,
    });
  }

  const pdfBytes = await pdfDoc.save();
  fs.writeFileSync(outputPdf, pdfBytes);
}

const htmlFiles = ['file1.html', 'file2.html', 'file3.html']; // Add your HTML files here
const outputPdf = 'output.pdf';

(async () => {
  const screenshots = await captureScreenshots(htmlFiles);
  await createPdfFromImages(screenshots, outputPdf);
  console.log(`PDF created: ${outputPdf}`);
})();

