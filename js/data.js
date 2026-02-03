// Data loading and management module

const DataManager = {
  graduates: [],
  stats: null,
  blsData: null,
  byuProgram: null,
  loaded: false,

  async loadAll() {
    if (this.loaded) return;

    try {
      const [graduatesData, blsData, byuProgram] = await Promise.all([
        fetch('data/graduates.json').then(r => r.json()),
        fetch('data/bls-outlook.json').then(r => r.json()),
        fetch('data/byu-program.json').then(r => r.json())
      ]);

      this.graduates = graduatesData.graduates;
      this.stats = graduatesData.stats;
      this.blsData = blsData;
      this.byuProgram = byuProgram;
      this.loaded = true;

      console.log(`Loaded ${this.graduates.length} graduates`);
    } catch (error) {
      console.error('Error loading data:', error);
      throw error;
    }
  },

  // Get all unique industries (first job)
  getIndustries() {
    const industries = new Set();
    this.graduates.forEach(g => {
      if (g.firstIndustry) industries.add(g.firstIndustry);
    });
    return Array.from(industries).sort();
  },

  // Get all unique companies (first job)
  getCompanies() {
    const companies = new Set();
    this.graduates.forEach(g => {
      if (g.firstCompany) companies.add(g.firstCompany);
    });
    return Array.from(companies).sort();
  },

  // Get top first job companies with counts
  getFirstJobCompanies() {
    const companies = {};
    this.graduates.forEach(g => {
      if (g.firstCompany) {
        companies[g.firstCompany] = (companies[g.firstCompany] || 0) + 1;
      }
    });
    return Object.entries(companies).sort((a, b) => b[1] - a[1]);
  },

  // Get top first job locations with counts
  getFirstJobLocations() {
    const locations = {};
    this.graduates.forEach(g => {
      if (g.firstLocation) {
        locations[g.firstLocation] = (locations[g.firstLocation] || 0) + 1;
      }
    });
    return Object.entries(locations).sort((a, b) => b[1] - a[1]);
  },

  // Get first job industry breakdown
  getFirstJobIndustries() {
    const industries = {};
    this.graduates.forEach(g => {
      if (g.firstIndustry) {
        industries[g.firstIndustry] = (industries[g.firstIndustry] || 0) + 1;
      }
    });
    return Object.entries(industries).sort((a, b) => b[1] - a[1]);
  },

  // Get all unique locations (first job)
  getLocations() {
    const locations = new Set();
    this.graduates.forEach(g => {
      if (g.firstLocation) locations.add(g.firstLocation);
    });
    return Array.from(locations).sort();
  },

  // Get all unique grad schools
  getGradSchools() {
    const schools = new Set();
    this.graduates.forEach(g => {
      if (g.gradSchool) schools.add(g.gradSchool);
    });
    return Array.from(schools).sort();
  },

  // Filter graduates based on criteria (uses first job data)
  filterGraduates(filters = {}) {
    return this.graduates.filter(g => {
      if (filters.industry && g.firstIndustry !== filters.industry) return false;
      if (filters.company && g.firstCompany !== filters.company) return false;
      if (filters.location && g.firstLocation !== filters.location) return false;
      if (filters.gradSchool && g.gradSchool !== filters.gradSchool) return false;
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const fullName = `${g.firstName} ${g.lastName}`.toLowerCase();
        if (!fullName.includes(searchLower)) return false;
      }
      return true;
    });
  },

  // Search graduates by any field
  searchGraduates(query) {
    const queryLower = query.toLowerCase();
    return this.graduates.filter(g => {
      return (
        g.firstName?.toLowerCase().includes(queryLower) ||
        g.lastName?.toLowerCase().includes(queryLower) ||
        g.currentCompany?.toLowerCase().includes(queryLower) ||
        g.currentJobTitle?.toLowerCase().includes(queryLower) ||
        g.currentIndustry?.toLowerCase().includes(queryLower) ||
        g.gradSchool?.toLowerCase().includes(queryLower)
      );
    });
  },

  // Get graduates by industry
  getGraduatesByIndustry(industry) {
    return this.graduates.filter(g => g.currentIndustry === industry);
  },

  // Get graduates by company
  getGraduatesByCompany(company) {
    return this.graduates.filter(g =>
      g.currentCompany?.toLowerCase().includes(company.toLowerCase())
    );
  },

  // Get BLS occupation data
  getOccupationOutlook(occupation) {
    if (!this.blsData) return null;
    return this.blsData.occupations.find(o =>
      o.title.toLowerCase().includes(occupation.toLowerCase())
    );
  },

  // Build context for AI chat
  buildChatContext() {
    const industryBreakdown = this.stats.industries
      .map(([ind, count]) => `${ind}: ${count} graduates (${Math.round(count/this.stats.totalGraduates*100)}%)`)
      .join('\n');

    const topCompanies = this.stats.topCompanies
      .slice(0, 20)
      .map(([company, count]) => `${company}: ${count} graduates`)
      .join('\n');

    const topGradSchools = this.stats.topGradSchools
      .slice(0, 15)
      .map(([school, count]) => `${school}: ${count} graduates`)
      .join('\n');

    const topLocations = this.stats.topLocations
      .slice(0, 15)
      .map(([loc, count]) => `${loc}: ${count} graduates`)
      .join('\n');

    const degreeTypes = this.stats.degreeTypes
      .slice(0, 10)
      .map(([type, count]) => `${type}: ${count} graduates`)
      .join('\n');

    const blsOutlook = this.blsData.occupations
      .map(o => {
        let info = `${o.title}:\n`;
        info += `  - Median Salary: ${o.medianSalary ? '$' + o.medianSalary.toLocaleString() : 'varies'}\n`;
        if (o.salaryRange) {
          if (o.salaryRange.low10) info += `  - Salary Range: $${o.salaryRange.low10.toLocaleString()} - $${o.salaryRange.high10.toLocaleString()}\n`;
        }
        info += `  - Job Growth (2024-2034): ${o.jobGrowth || o.jobGrowthNote || 'varies'} (${o.growthDescription || ''})\n`;
        if (o.annualOpenings) info += `  - Annual Openings: ${o.annualOpenings.toLocaleString()}\n`;
        if (o.totalJobs) info += `  - Total Jobs: ${o.totalJobs.toLocaleString()}\n`;
        info += `  - Education: ${o.education || 'Bachelor\'s degree'}\n`;
        if (o.description) info += `  - Description: ${o.description}\n`;
        if (o.skills) info += `  - Key Skills: ${o.skills.join(', ')}\n`;
        if (o.topFirms) info += `  - Top Firms: ${o.topFirms.join(', ')}\n`;
        return info;
      })
      .join('\n');

    // Get sample graduates for each industry (3 examples each)
    const samplesByIndustry = {};
    this.stats.industries.forEach(([industry]) => {
      const grads = this.graduates
        .filter(g => g.currentIndustry === industry && g.currentJobTitle && g.currentCompany)
        .slice(0, 3)
        .map(g => `  - ${g.firstName} ${g.lastName}: ${g.currentJobTitle} at ${g.currentCompany}`)
        .join('\n');
      if (grads) samplesByIndustry[industry] = grads;
    });

    const industryExamples = Object.entries(samplesByIndustry)
      .map(([ind, examples]) => `${ind}:\n${examples}`)
      .join('\n\n');

    return {
      summary: `Total BYU Economics graduates in dataset: ${this.stats.totalGraduates}`,
      industryBreakdown,
      topCompanies,
      topGradSchools,
      topLocations,
      degreeTypes,
      blsOutlook,
      industryExamples,
      byuProgram: JSON.stringify(this.byuProgram, null, 2)
    };
  }
};

// Export for use in other modules
window.DataManager = DataManager;
