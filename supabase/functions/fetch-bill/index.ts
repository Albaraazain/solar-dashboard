import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Extract referenceNumber from the request body
    const body = await req.json();
    const referenceNumber = body.referenceNumber;
    if (!referenceNumber) {
      return new Response(JSON.stringify({
        error: "Missing referenceNumber"
      }), {
        status: 400,
        headers: {
          "Content-Type": "application/json"
        }
      });
    }
    // Define the JavaScript code to be executed by Browserless
    const code = `
export default async function ({ page, context }) {
  const { referenceNumber } = context;

  // Navigate to the bill lookup page
  await page.goto('https://bill.pitc.com.pk/mepcobill', { waitUntil: 'networkidle0' });

  // Fill in the reference number
  await page.type('#searchTextBox', referenceNumber);

  // Submit the form and wait for navigation
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'networkidle0' }),
    page.click('#btnSearch')
  ]);

  // Extract bill data using XPath and CSS selectors
  const billData = await page.evaluate(() => {
    const getTextByXPath = (xpath) => {
      const element = document.evaluate(
        xpath,
        document,
        null,
        XPathResult.FIRST_ORDERED_NODE_TYPE,
        null
      ).singleNodeValue;
      return element ? element.textContent.trim() : 'N/A';
    };

    // Extract customer name and address
    const customerName = getTextByXPath("//span[contains(text(), 'NAME & ADDRESS')]/following-sibling::span[1]");

    // Extract payable amount
    const amount = getTextByXPath("//td[contains(b, 'PAYABLE WITHIN DUE DATE')]/following::td[1]");

    // Extract units consumed
    const unitsConsumed = getTextByXPath("//td[contains(b, 'UNITS CONSUMED')]/following::td[1]");

    // Extract issue date and due date
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
      customerName,
      amount,
      unitsConsumed,
      issueDate,
      dueDate,
      monthlyUnits
    };
  });

  return {
    data: billData,
    type: 'application/json'
  };
}
`;
    // Create the context with the reference number
    const context = {
      referenceNumber
    };
    // Browserless API URL with your provided API key
    const browserlessUrl = "https://production-sfo.browserless.io/function?token=S4iWSr6dY070GSe52357655fc5c72b361c0972d7fe";
    // Make the POST request to Browserless
    const response = await fetch(browserlessUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        code,
        context
      })
    });
    if (!response.ok) {
      throw new Error(`Browserless API request failed: ${response.statusText}`);
    }
    // Parse the JSON response from Browserless
    const billData = await response.json();
    // Return the bill data to the client
    return new Response(JSON.stringify(billData), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      },
      status: 200
    });
  } catch (error: any) {
    console.error("Error:", error);
    return new Response(JSON.stringify({
      error: error?.message || 'An unexpected error occurred'
    }), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      },
      status: 500
    });
  }
});
