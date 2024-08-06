
import express from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import puppeteer from 'puppeteer';
import { PDFDocument } from 'pdf-lib';
import { fileURLToPath } from 'url';

// Define __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Set up multer for file uploads
const upload = multer({ dest: 'uploads/' });

const app = express();
const port = 3000;

app.use(express.static('public'));

// Endpoint to handle file upload and PDF generation
app.post('/upload', upload.array('htmlFiles', 10), async (req, res) => {
  try {
    const htmlFiles = req.files.map(file => path.join(__dirname, file.path));
    console.log('Uploaded HTML files:', htmlFiles);

    const screenshots = await captureScreenshots(htmlFiles);
    const outputPdf = path.join(__dirname, 'output.pdf');
    await createPdfFromImages(screenshots, outputPdf);

    // Send the PDF file to the client
    res.download(outputPdf, 'output.pdf', async err => {
      if (err) {
        console.error('Error sending PDF:', err);
      }

      // Clean up uploaded files and generated PDF
      req.files.forEach(file => fs.unlinkSync(file.path));
      fs.unlinkSync(outputPdf);

      // Delete all files in the uploads directory
      fs.readdir(path.join(__dirname, 'uploads'), (err, files) => {
        if (err) {
          console.error('Error reading uploads directory:', err);
        } else {
          files.forEach(file => {
            fs.unlink(path.join(__dirname, 'uploads', file), err => {
              if (err) {
                console.error('Error deleting file:', err);
              }
            });
          });
        }
      });
    });
  } catch (err) {
    console.error('Error processing files:', err);
    res.status(500).send('Error processing files');
  }
});

async function captureScreenshots(htmlFiles) {
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    const screenshots = [];

    for (const htmlFile of htmlFiles) {
      const content = fs.readFileSync(htmlFile, 'utf8');
      await page.setContent(content, { waitUntil: 'networkidle0' });

      const screenshot = await page.screenshot({ fullPage: true });
      screenshots.push(screenshot);
    }

    return screenshots;
  } catch (error) {
    console.error('Error capturing screenshots:', error);
    throw error;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

async function createPdfFromImages(images, outputPdf) {
  try {
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
  } catch (error) {
    console.error('Error creating PDF from images:', error);
    throw error;
  }
}

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});

