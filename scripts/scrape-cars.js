const puppeteer = require('puppeteer');
const fs = require('fs');

const URL = 'https://www.oremtoyota.com/searchused.aspx?ModelAndTrim=CAMRY!RAV4!RAV4%20HYBRID!HIGHLANDER%20HYBRD!GRAND%20HIGHLANDER';

async function scrapeCars() {
  console.log('Launching browser...');
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  // Set a realistic user agent
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

  console.log('Navigating to dealership page...');
  await page.goto(URL, { waitUntil: 'networkidle2', timeout: 60000 });

  // Wait for vehicle listings to load
  console.log('Waiting for listings to load...');
  await page.waitForSelector('.vehicle-card, .inventory-listing, [data-vin], .srp-vehicle', { timeout: 30000 }).catch(() => {
    console.log('Could not find expected selectors, trying alternative approach...');
  });

  // Give extra time for dynamic content
  await new Promise(r => setTimeout(r, 5000));

  // Take a screenshot for debugging
  await page.screenshot({ path: 'debug-screenshot.png', fullPage: true });
  console.log('Screenshot saved as debug-screenshot.png');

  // Extract car data
  const cars = await page.evaluate(() => {
    const results = [];

    // Try multiple possible selectors for vehicle cards
    const selectors = [
      '.vehicle-card',
      '.inventory-listing',
      '.srp-vehicle',
      '[data-vin]',
      '.vehicle',
      '.listing-item',
      '.inventory-item',
      '.vehicle-listing'
    ];

    let vehicleElements = [];
    for (const selector of selectors) {
      vehicleElements = document.querySelectorAll(selector);
      if (vehicleElements.length > 0) {
        console.log(`Found ${vehicleElements.length} vehicles with selector: ${selector}`);
        break;
      }
    }

    vehicleElements.forEach(el => {
      const getText = (selectors) => {
        for (const sel of selectors) {
          const elem = el.querySelector(sel);
          if (elem) return elem.textContent.trim();
        }
        return '';
      };

      const getAttr = (selectors, attr) => {
        for (const sel of selectors) {
          const elem = el.querySelector(sel);
          if (elem && elem.getAttribute(attr)) return elem.getAttribute(attr);
        }
        return '';
      };

      // Extract full title/name which often contains year, make, model, package
      const title = getText([
        '.vehicle-title', '.title', '.vehicle-name', 'h2', 'h3',
        '.listing-title', '.vehicle-header', '[data-vehicle-title]'
      ]);

      // Extract price
      const priceText = getText([
        '.price', '.vehicle-price', '.final-price', '.selling-price',
        '.internet-price', '[data-price]', '.price-value'
      ]);
      const price = priceText.replace(/[^0-9.]/g, '');

      // Extract mileage
      const milesText = getText([
        '.mileage', '.miles', '.odometer', '[data-mileage]',
        '.vehicle-mileage', '.specs-mileage'
      ]);
      const miles = milesText.replace(/[^0-9]/g, '');

      // Extract VIN
      const vin = getAttr(['[data-vin]'], 'data-vin') ||
                  getText(['.vin', '.vehicle-vin', '[data-vin]']);

      // Get all text content for feature detection
      const fullText = el.textContent.toLowerCase();

      // Detect features from description
      const hasLeather = fullText.includes('leather');
      const hasDVD = fullText.includes('dvd') || fullText.includes('entertainment');
      const isHybrid = fullText.includes('hybrid');
      const fuelType = isHybrid ? 'Hybrid' :
                       fullText.includes('electric') ? 'Electric' : 'Gas';

      // Parse year, make, model from title
      const yearMatch = title.match(/\b(20\d{2})\b/);
      const year = yearMatch ? yearMatch[1] : '';

      // Determine if new or used
      const isNew = fullText.includes('new') && !fullText.includes('used');

      if (title || vin) {
        results.push({
          title,
          year,
          price,
          miles,
          vin,
          hasLeather,
          hasDVD,
          fuelType,
          isHybrid,
          isNew,
          fullText: fullText.substring(0, 500) // For debugging
        });
      }
    });

    return results;
  });

  console.log(`Found ${cars.length} vehicles`);

  // Parse make, model, package from title
  const parsedCars = cars.map(car => {
    let make = 'Toyota'; // Default since it's Orem Toyota
    let model = '';
    let pkg = '';

    const title = car.title.toUpperCase();

    // Detect model
    if (title.includes('GRAND HIGHLANDER')) {
      model = 'Grand Highlander';
    } else if (title.includes('HIGHLANDER')) {
      model = 'Highlander';
    } else if (title.includes('RAV4')) {
      model = 'RAV4';
    } else if (title.includes('CAMRY')) {
      model = 'Camry';
    }

    // Extract package/trim (common Toyota trims)
    const trims = ['XSE', 'XLE', 'SE', 'LE', 'TRD', 'LIMITED', 'PLATINUM', 'PREMIUM', 'ADVENTURE', 'TRAIL', 'WOODLAND'];
    for (const trim of trims) {
      if (title.includes(trim)) {
        pkg = trim;
        break;
      }
    }

    return {
      Make: make,
      Model: model,
      Package: pkg,
      Year: car.year,
      Price: car.price,
      New: car.isNew ? 'Yes' : 'No',
      Miles: car.miles,
      Leather: car.hasLeather ? 'Yes' : 'No',
      DVD: car.hasDVD ? 'Yes' : 'No',
      Fuel: car.fuelType,
      Hybrid: car.isHybrid ? 'Yes' : 'No',
      Location: 'Orem Toyota'
    };
  });

  // Create CSV
  const headers = ['Make', 'Model', 'Package', 'Year', 'Price', 'New', 'Miles', 'Leather', 'DVD', 'Fuel', 'Hybrid', 'Location'];
  const csvRows = [headers.join(',')];

  parsedCars.forEach(car => {
    const row = headers.map(h => `"${car[h] || ''}"`);
    csvRows.push(row.join(','));
  });

  const csvContent = csvRows.join('\n');
  fs.writeFileSync('cars-data.csv', csvContent);
  console.log('Data saved to cars-data.csv');

  // Also save as JSON for inspection
  fs.writeFileSync('cars-data.json', JSON.stringify(parsedCars, null, 2));
  console.log('Data saved to cars-data.json');

  // Print preview
  console.log('\nPreview of extracted data:');
  console.log(parsedCars.slice(0, 3));

  await browser.close();
}

scrapeCars().catch(err => {
  console.error('Error scraping:', err);
  process.exit(1);
});
