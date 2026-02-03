const fs = require('fs');
const path = require('path');

// Read CSV file
const csvPath = path.join(__dirname, '..', 'V10_full_linkedin_gradyear_fix.csv');
const csvContent = fs.readFileSync(csvPath, 'utf-8');

// Parse CSV
const lines = csvContent.split('\n');
const headers = lines[0].split(',');

const graduates = [];
const industries = {};
const companies = {};
const locations = {};
const gradSchools = {};
const degreeTypes = {};

for (let i = 1; i < lines.length; i++) {
  const line = lines[i].trim();
  if (!line) continue;

  // Handle CSV with quoted fields containing commas
  const values = [];
  let current = '';
  let inQuotes = false;

  for (let j = 0; j < line.length; j++) {
    const char = line[j];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      values.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  values.push(current.trim());

  const graduate = {
    firstName: values[0] || '',
    lastName: values[1] || '',
    linkedinUrl: values[2] || '',
    firstJobTitle: values[3] || '',
    firstCompany: values[4] || '',
    firstLocation: values[5] || '',
    firstDateRange: values[6] || '',
    firstIndustry: values[7] || '',
    currentJobTitle: values[8] || '',
    currentCompany: values[9] || '',
    currentLocation: values[10] || '',
    currentDateRange: values[11] || '',
    currentIndustry: values[12] || '',
    gradSchool: values[13] || '',
    degreeType: values[14] || '',
    fieldOfStudy: values[15] || ''
  };

  // Only include graduates with some career data
  if (graduate.currentIndustry || graduate.firstIndustry || graduate.gradSchool) {
    graduates.push(graduate);

    // Count industries
    if (graduate.currentIndustry) {
      industries[graduate.currentIndustry] = (industries[graduate.currentIndustry] || 0) + 1;
    }

    // Count companies
    if (graduate.currentCompany) {
      companies[graduate.currentCompany] = (companies[graduate.currentCompany] || 0) + 1;
    }

    // Count locations
    if (graduate.currentLocation) {
      // Extract state/region from location
      const loc = graduate.currentLocation;
      locations[loc] = (locations[loc] || 0) + 1;
    }

    // Count grad schools
    if (graduate.gradSchool) {
      gradSchools[graduate.gradSchool] = (gradSchools[graduate.gradSchool] || 0) + 1;
    }

    // Count degree types
    if (graduate.degreeType) {
      degreeTypes[graduate.degreeType] = (degreeTypes[graduate.degreeType] || 0) + 1;
    }
  }
}

// Sort and get top items
const sortByCount = (obj) => Object.entries(obj).sort((a, b) => b[1] - a[1]);

const topCompanies = sortByCount(companies).slice(0, 20);
const topLocations = sortByCount(locations).slice(0, 15);
const topGradSchools = sortByCount(gradSchools).slice(0, 15);

// Create summary statistics
const stats = {
  totalGraduates: graduates.length,
  industries: sortByCount(industries),
  topCompanies,
  topLocations,
  topGradSchools,
  degreeTypes: sortByCount(degreeTypes)
};

// Write graduates JSON
const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

fs.writeFileSync(
  path.join(dataDir, 'graduates.json'),
  JSON.stringify({ graduates, stats }, null, 2)
);

console.log('Processed', graduates.length, 'graduates');
console.log('Industries:', Object.keys(industries).length);
console.log('Companies:', Object.keys(companies).length);
console.log('\nTop Industries:');
sortByCount(industries).slice(0, 10).forEach(([ind, count]) => {
  console.log(`  ${ind}: ${count}`);
});
