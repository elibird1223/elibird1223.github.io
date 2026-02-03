const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;

// MIME types for static files
const mimeTypes = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml'
};

// Load environment variables from .env file if it exists
function loadEnv() {
  try {
    const envPath = path.join(__dirname, '.env');
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf-8');
      envContent.split('\n').forEach(line => {
        const [key, ...valueParts] = line.split('=');
        if (key && valueParts.length > 0) {
          process.env[key.trim()] = valueParts.join('=').trim();
        }
      });
      console.log('Loaded .env file');
    }
  } catch (e) {
    console.log('No .env file found');
  }
}

loadEnv();

// Chat handler
async function handleChat(req, res) {
  let body = '';
  req.on('data', chunk => { body += chunk; });
  req.on('end', async () => {
    try {
      const { message, context } = JSON.parse(body);

      const apiKey = process.env.ANTHROPIC_API_KEY || process.env.OPENAI_API_KEY;
      const provider = process.env.AI_PROVIDER || 'anthropic';

      // Use demo mode if no valid API key
      if (!apiKey || apiKey === 'your_api_key_here' || apiKey.length < 20) {
        // Return a helpful demo response if no API key
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          response: getDemoResponse(message, context)
        }));
        return;
      }

      // Call actual AI API
      let response;
      if (provider === 'openai') {
        response = await callOpenAI(message, context, apiKey);
      } else {
        response = await callAnthropic(message, context, apiKey);
      }

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ response }));

    } catch (error) {
      console.error('Chat error:', error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: error.message }));
    }
  });
}

// Demo response when no API key is configured
function getDemoResponse(message, context) {
  const msgLower = message.toLowerCase();

  if (msgLower.includes('job') || msgLower.includes('career')) {
    return `Based on data from **592 BYU Economics graduates**, here are the most common career paths:

**Top Industries:**
- Banking and Finance: 148 graduates (25%)
- Tech and Data Analytics: 133 graduates (22%)
- Management Consulting: 38 graduates (6%)
- Policy/Non-Profit: 39 graduates (7%)
- Economic Consulting: 19 graduates (3%)

**Top Employers:**
- Goldman Sachs (19 graduates)
- Fidelity Investments (19 graduates)
- Qualtrics (7 graduates)
- Cornerstone Research (6 graduates)
- Deloitte (5 graduates)

Economics graduates are well-positioned for analytical roles across many industries. The quantitative skills you develop are highly valued in finance, tech, and consulting.

*Note: This is a demo response. Configure your API key for full AI-powered responses.*`;
  }

  if (msgLower.includes('salary') || msgLower.includes('pay') || msgLower.includes('earn')) {
    return `According to BLS data, here are typical salaries for economics-related careers:

**Median Salaries:**
- Data Scientists: $108,020
- Economists: $113,940
- Financial Analysts: $99,890
- Management Analysts: $99,410
- Market Research Analysts: $74,680

**Entry-level range:** $55,000 - $85,000
**Mid-career range:** $85,000 - $150,000
**Senior level:** $150,000+

Investment banking and consulting typically offer higher starting salaries but require longer hours.

*Note: This is a demo response. Configure your API key for full AI-powered responses.*`;
  }

  if (msgLower.includes('grad') || msgLower.includes('school') || msgLower.includes('phd') || msgLower.includes('mba')) {
    return `Many BYU Economics graduates pursue advanced degrees. From our data:

**Most Common Degree Types:**
- JD (Law): 45 graduates
- MS (Master of Science): 42 graduates
- MBA: 30 graduates
- PhD: 20 graduates
- MPA (Public Administration): 8 graduates

**Top Graduate School Destinations:**
- BYU Law School (14)
- BYU Marriott School of Business (9)
- University of Utah (11 combined)
- Georgia Tech (5)
- Harvard Law School (3)

For PhD programs, gaining research assistant experience with faculty is highly recommended.

*Note: This is a demo response. Configure your API key for full AI-powered responses.*`;
  }

  if (msgLower.includes('consult')) {
    return `**Economic Consulting** is a popular path for BYU Economics graduates, with 19 graduates in this field.

**Top Economic Consulting Firms Hiring BYU Grads:**
- Cornerstone Research (6)
- Charles River Associates (3)
- Analysis Group
- Berkeley Research Group

**What Economic Consultants Do:**
- Apply economic theory to legal and business disputes
- Conduct statistical analysis for litigation support
- Prepare expert reports and testimony support
- Work on antitrust, securities, and IP cases

**Key Skills:**
- Econometrics and statistical software (Stata, R)
- Data analysis and visualization
- Clear written and oral communication
- Attention to detail

*Note: This is a demo response. Configure your API key for full AI-powered responses.*`;
  }

  if (msgLower.includes('invest') || msgLower.includes('bank') || msgLower.includes('finance')) {
    return `**Banking and Finance** is the largest career destination for BYU Economics graduates, with 148 graduates (25%).

**Top Finance Employers:**
- Goldman Sachs (19 graduates)
- Fidelity Investments (19 graduates)
- Morgan Stanley (4)
- Bank of America (3)
- Piper Sandler (2)

**Common Roles:**
- Investment Banking Analyst
- Financial Analyst
- Equity Research Associate
- Wealth Management
- Private Equity Analyst

**Key Locations:**
- Salt Lake City (large Goldman Sachs office)
- New York City
- Houston, Texas

Many graduates start in Salt Lake City and later move to larger financial centers.

*Note: This is a demo response. Configure your API key for full AI-powered responses.*`;
  }

  // Default response
  return `I'm the BYU Economics Career Advisor! I have data on **592 BYU Economics graduates** and can help you explore:

- **Career paths** in finance, tech, consulting, policy, and more
- **Top employers** hiring BYU Economics grads
- **Salary expectations** from BLS data
- **Graduate school** options and destinations
- **Skills to develop** for your target career

Try asking me something like:
- "What jobs can I get with an economics degree?"
- "Tell me about careers in investment banking"
- "What's the salary outlook for data scientists?"
- "How do I prepare for graduate school?"

*Note: This is a demo response. Configure your API key in .env for full AI-powered responses.*`;
}

async function callAnthropic(message, context, apiKey) {
  const systemPrompt = `You are a career advisor for BYU Economics students. You have ACCESS TO REAL DATA about 592 BYU Economics graduates and must use this data to answer questions accurately.

IMPORTANT INSTRUCTIONS:
- ALWAYS cite specific numbers from the data below (e.g., "148 graduates (25%) went into Banking and Finance")
- When asked about companies, reference the ACTUAL companies and counts from the data
- When asked about industries, use the EXACT percentages from the data
- Be specific and data-driven, not generic
- If asked about something not in the data, say so honestly

=== BYU ECONOMICS GRADUATE DATA (592 graduates) ===

INDUSTRY BREAKDOWN (where graduates work now):
${context.industryBreakdown}

TOP EMPLOYERS (companies that hired the most BYU Econ grads):
${context.topCompanies}

TOP LOCATIONS (where graduates work):
${context.topLocations || 'Not available'}

GRADUATE SCHOOL DESTINATIONS (for those who pursued advanced degrees):
${context.topGradSchools}

DEGREE TYPES PURSUED:
${context.degreeTypes || 'Not available'}

EXAMPLE GRADUATES BY INDUSTRY (real people from the dataset):
${context.industryExamples || 'Not available'}

=== BLS JOB MARKET DATA ===
${context.blsOutlook}

=== BYU ECONOMICS PROGRAM INFO ===
Department: Economics, College of Family, Home, and Social Sciences, BYU
Location: 2146 West View Building, Provo, UT 84602
Contact: (801) 422-2859, economics@byu.edu
Academic Advisor: Megan Hancock at Liberal Arts Advisement Center (1049 JFSB)
Career Services Director: Amanda Peterson (2590 WSC, 801-422-3000, careers.byu.edu)

KEY RESOURCES:
- Career Prep Seminar (required for career preparation)
- Handshake platform for jobs/internships (use BYU NetID)
- Weekly email blasts with job/internship opportunities (email economics@byu.edu to join)
- Economics Student Association (ESA) - networking, speakers, company visits
- Women in Econ group (byuwomeninecon@gmail.com)

INTERNSHIPS:
- Department strongly encourages all majors to complete an internship
- Internship Coordinator: econ-internships@byu.edu
- Internship Grant available (funded by alumni) - deadlines: March 20 (spring/summer), July 15 (fall), Nov 30 (winter)
- Washington Seminar for DC internships (congressional, policy, economics)
- Historical Internships List shows past placements

GRADUATE SCHOOL PREP:
- Grad School Guide resource available
- Research assistant opportunities with faculty
- BYU Record Linking Lab employs 20 undergrad RAs
- Honors thesis program
- Pre-doctoral research positions support

SKILLS DEVELOPED:
Economic theory, econometrics, Stata, R, Python, data analysis, financial modeling, research methodology, policy analysis

GRADE REQUIREMENTS:
C- or higher in MATH 112 and ECON 110, 378, 380, 381, 382, & 388

RESPONSE GUIDELINES:
1. Start with the most relevant data point for the question
2. Use bullet points for lists of companies, industries, or recommendations
3. Include specific numbers and percentages
4. Keep responses focused and 2-4 paragraphs max
5. End with actionable advice when appropriate

Remember: You are speaking with current BYU economics students exploring career options. Be helpful, specific, and data-driven.`;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{ role: 'user', content: message }]
    })
  });

  if (!response.ok) {
    throw new Error(`Anthropic API error: ${response.status}`);
  }

  const data = await response.json();
  return data.content[0].text;
}

async function callOpenAI(message, context, apiKey) {
  const systemPrompt = `You are a helpful career advisor for BYU Economics students...`; // Similar to above

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'gpt-4-turbo-preview',
      max_tokens: 1024,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message }
      ]
    })
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

// Static file handler
function serveStatic(req, res) {
  let filePath = path.join(__dirname, req.url === '/' ? 'index.html' : req.url);
  const ext = path.extname(filePath);
  const contentType = mimeTypes[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404);
        res.end('File not found');
      } else {
        res.writeHead(500);
        res.end('Server error');
      }
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
    }
  });
}

// Main server
const server = http.createServer((req, res) => {
  // Handle CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // Route requests
  if (req.url === '/.netlify/functions/chat' && req.method === 'POST') {
    handleChat(req, res);
  } else {
    serveStatic(req, res);
  }
});

server.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║     BYU Economics Career Explorer - Local Server           ║
╠════════════════════════════════════════════════════════════╣
║                                                            ║
║  Server running at: http://localhost:${PORT}                  ║
║                                                            ║
║  To enable full AI responses, create a .env file with:     ║
║    ANTHROPIC_API_KEY=your_key_here                         ║
║    AI_PROVIDER=anthropic                                   ║
║                                                            ║
║  Without an API key, demo responses will be shown.         ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
`);
});
