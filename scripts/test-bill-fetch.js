const puppeteer = require('puppeteer');

async function fetchBill(referenceNumber) {
  console.log('Starting browser...');
  const browser = await puppeteer.launch({
    headless: false, // Set to true in production
    defaultViewport: { width: 1366, height: 768 }
  });

  try {
    console.log('Creating new page...');
    const page = await browser.newPage();
    
    // Enable console log from the page
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));

    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');

    console.log('Navigating to bill page...');
    await page.goto('https://bill.pitc.com.pk/mepcobill', {
      waitUntil: 'networkidle0',
      timeout: 30000
    });

    console.log('Filling form...');
    await page.type('#searchTextBox', referenceNumber);
    await page.select('#ruCodeTextBox', '');

    // For debugging - save screenshot before submission
    await page.screenshot({ path: 'before-submit.png' });

    console.log('Submitting form...');
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 30000 }),
      page.click('#btnSearch')
    ]);

    // For debugging - save screenshot after submission
    await page.screenshot({ path: 'after-submit.png' });

    console.log('Extracting data...');
    const pageContent = await page.content();
    console.log('Page content:', pageContent);

    // Check for error message
    const errorMessage = await page.$eval('#ua', el => el.textContent.trim()).catch(() => null);
    if (errorMessage) {
      throw new Error(`Error from website: ${errorMessage}`);
    }

    // Save HTML content to file for analysis
    const fs = require('fs');
    fs.writeFileSync('bill-page.html', pageContent);
    console.log('Saved HTML content to bill-page.html');

    // Extract bill data using XPath selectors (similar to Python version)
    const billData = await page.evaluate(() => {
      const getTextByXPath = (xpath) => {
        const element = document.evaluate(
          xpath,
          document,
          null,
          XPathResult.FIRST_ORDERED_NODE_TYPE,
          null
        ).singleNodeValue;
        return element ? element.textContent.trim() : null;
      };

      // Extract name and address
      const name = getTextByXPath("//span[contains(text(), 'NAME & ADDRESS')]/following-sibling::span[1]");
      
      // Extract payable amount
      const amount = getTextByXPath("//td[contains(b, 'PAYABLE WITHIN DUE DATE')]/following::td[1]");
      
      // Extract units consumed
      const unitsConsumed = getTextByXPath("//td[contains(b, 'UNITS CONSUMED')]/following::td[1]");
      
      // Extract dates from maintable
      const issueDate = getTextByXPath("//table[@class='maintable']//tr[@class='content']/td[6]");
      const dueDate = getTextByXPath("//table[@class='maintable']//tr[@class='content']/td[7]");

      // Extract monthly units
      const monthlyUnits = {};
      const monthRows = document.querySelectorAll("table.nested6 tr");
      monthRows.forEach((row, index) => {
        if (index === 0) return; // Skip header row
        const cells = row.querySelectorAll('td');
        if (cells.length >= 2) {
          const month = cells[0].textContent.trim();
          const units = cells[1].textContent.trim();
          monthlyUnits[month] = units;
        }
      });

      return {
        customerName: name,
        amount: amount,
        unitsConsumed: unitsConsumed,
        issueDate: issueDate,
        dueDate: dueDate,
        monthlyUnits: monthlyUnits
      };
    });

    console.log('Bill data:', billData);
    return billData;

  } catch (error) {
    console.error('Error:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

// Test the function with the reference number
const referenceNumber = '04151722337322';
fetchBill(referenceNumber)
  .then(result => {
    console.log('Success!', result);
  })
  .catch(error => {
    console.error('Failed:', error);
  });
