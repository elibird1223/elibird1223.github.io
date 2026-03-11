// BROWSER CONSOLE SCRAPER FOR OREM TOYOTA
// Instructions:
// 1. Open https://www.oremtoyota.com/searchused.aspx?ModelAndTrim=CAMRY!RAV4!RAV4%20HYBRID!HIGHLANDER%20HYBRD!GRAND%20HIGHLANDER
// 2. Wait for all cars to load (scroll to bottom to load more if needed)
// 3. Open browser DevTools (F12 or Ctrl+Shift+I)
// 4. Go to Console tab
// 5. Paste this entire script and press Enter
// 6. The CSV will be downloaded automatically

(function() {
  const cars = [];

  // Try various selectors commonly used by dealership websites
  const vehicleCards = document.querySelectorAll(
    '.vehicle-card, .srp-vehicle-card, .inventory-listing, [data-vin], ' +
    '.ddc-content, .vehicle-card-details-container, .hproduct, ' +
    '.vehicle-overview, .vehicle-card-wrapper, article[data-vin]'
  );

  console.log(`Found ${vehicleCards.length} vehicle cards`);

  if (vehicleCards.length === 0) {
    // Alternative: look for any element with VIN data
    const vinElements = document.querySelectorAll('[data-vin]');
    console.log(`Found ${vinElements.length} elements with VIN data`);
  }

  vehicleCards.forEach((card, index) => {
    const getText = (selectors) => {
      const sels = selectors.split(',').map(s => s.trim());
      for (const sel of sels) {
        const el = card.querySelector(sel);
        if (el && el.textContent.trim()) return el.textContent.trim();
      }
      return '';
    };

    const getAttr = (selector, attr) => {
      const el = card.querySelector(selector) || card;
      return el.getAttribute(attr) || '';
    };

    // Get the full vehicle title
    const title = getText(
      '.vehicle-title, .title, h2, h3, .vehicle-name, .listing-title, ' +
      '.vehicle-card-title, [data-vehicle-title], .vehicle-card-header'
    ) || card.querySelector('a')?.textContent?.trim() || '';

    // Get price
    const priceText = getText(
      '.price, .vehicle-price, .final-price, .selling-price, .internet-price, ' +
      '.price-value, .primaryPrice, [data-price], .vehicle-card-price'
    );
    const price = priceText.replace(/[^0-9]/g, '');

    // Get mileage
    const milesText = getText(
      '.mileage, .miles, .odometer, .vehicle-mileage, [data-mileage], ' +
      '.mileage-value, .odometer-value'
    );
    const miles = milesText.replace(/[^0-9]/g, '');

    // Get VIN
    const vin = getAttr('[data-vin]', 'data-vin') ||
                getAttr('', 'data-vin') ||
                getText('.vin, .vehicle-vin');

    // Full text for feature detection
    const fullText = card.textContent.toLowerCase();

    // Detect features
    const hasLeather = fullText.includes('leather') || fullText.includes('softex');
    const hasDVD = fullText.includes('dvd') || fullText.includes('entertainment') || fullText.includes('rear seat');
    const isHybrid = fullText.includes('hybrid');
    const isElectric = fullText.includes('electric') || fullText.includes('ev');
    const fuelType = isHybrid ? 'Hybrid' : isElectric ? 'Electric' : 'Gas';

    // Parse year
    const yearMatch = title.match(/\b(20\d{2})\b/);
    const year = yearMatch ? yearMatch[1] : '';

    // Determine new vs used
    const isNew = (fullText.includes('new') && !fullText.includes('used')) ||
                  window.location.href.toLowerCase().includes('new');

    // Parse make/model/trim
    let make = 'Toyota';
    let model = '';
    let pkg = '';

    const upperTitle = title.toUpperCase();

    // Detect model
    const modelPatterns = [
      { pattern: 'GRAND HIGHLANDER', name: 'Grand Highlander' },
      { pattern: 'HIGHLANDER HYBRID', name: 'Highlander Hybrid' },
      { pattern: 'HIGHLANDER', name: 'Highlander' },
      { pattern: 'RAV4 HYBRID', name: 'RAV4 Hybrid' },
      { pattern: 'RAV4', name: 'RAV4' },
      { pattern: 'CAMRY', name: 'Camry' },
      { pattern: 'COROLLA', name: 'Corolla' },
      { pattern: 'TUNDRA', name: 'Tundra' },
      { pattern: 'TACOMA', name: 'Tacoma' },
      { pattern: '4RUNNER', name: '4Runner' },
      { pattern: 'SIENNA', name: 'Sienna' },
      { pattern: 'PRIUS', name: 'Prius' },
    ];

    for (const mp of modelPatterns) {
      if (upperTitle.includes(mp.pattern)) {
        model = mp.name;
        break;
      }
    }

    // Detect trim/package
    const trims = ['PLATINUM', 'LIMITED', 'XSE', 'XLE', 'SE', 'LE', 'TRD PRO', 'TRD OFF-ROAD',
                   'TRD SPORT', 'ADVENTURE', 'TRAIL', 'WOODLAND', 'PREMIUM', 'NIGHTSHADE',
                   'SR5', 'SR', '1794', 'CAPSTONE'];
    for (const trim of trims) {
      if (upperTitle.includes(trim)) {
        pkg = trim;
        break;
      }
    }

    if (title || vin || price) {
      cars.push({
        Make: make,
        Model: model,
        Package: pkg,
        Year: year,
        Price: price,
        New: isNew ? 'Yes' : 'No',
        Miles: miles,
        Leather: hasLeather ? 'Yes' : 'No',
        DVD: hasDVD ? 'Yes' : 'No',
        Fuel: fuelType,
        Hybrid: isHybrid ? 'Yes' : 'No',
        Location: 'Orem Toyota',
        Title: title,
        VIN: vin
      });
    }
  });

  console.log(`Extracted ${cars.length} vehicles`);
  console.table(cars);

  // Create CSV
  const headers = ['Make', 'Model', 'Package', 'Year', 'Price', 'New', 'Miles', 'Leather', 'DVD', 'Fuel', 'Hybrid', 'Location', 'Title', 'VIN'];
  const csvRows = [headers.join(',')];

  cars.forEach(car => {
    const row = headers.map(h => `"${(car[h] || '').toString().replace(/"/g, '""')}"`);
    csvRows.push(row.join(','));
  });

  const csvContent = csvRows.join('\n');

  // Download CSV
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'orem-toyota-cars.csv';
  link.click();

  console.log('CSV file downloaded!');

  // Also copy to clipboard
  navigator.clipboard.writeText(csvContent).then(() => {
    console.log('CSV also copied to clipboard!');
  }).catch(() => {
    console.log('Could not copy to clipboard, but file was downloaded.');
  });

  return cars;
})();
