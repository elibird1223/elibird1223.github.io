// Netlify serverless function for chat – rule-based, no external AI calls.
// Uses aggregated context from the frontend (graduates.json, BLS data, BYU program info)
// to return data-driven, templated advice for free.

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { message, context } = JSON.parse(event.body || '{}');

    if (!message) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Message is required' })
      };
    }

    const response = getRuleBasedResponse(message, context || {});

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ response })
    };
  } catch (error) {
    console.error('Chat function error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Failed to process chat request',
        details: error.message
      })
    };
  }
};

function getRuleBasedResponse(message, context) {
  const msgLower = message.toLowerCase();
  const summary = context.summary || '';
  const industryBreakdown = context.industryBreakdown || '';
  const topCompanies = context.topCompanies || '';
  const topLocations = context.topLocations || '';
  const topGradSchools = context.topGradSchools || '';
  const degreeTypes = context.degreeTypes || '';
  const blsOutlook = context.blsOutlook || '';

  // Salary / pay questions
  if (msgLower.includes('salary') || msgLower.includes('pay') || msgLower.includes('earn') || msgLower.includes('money') || msgLower.includes('compensation')) {
    return [
      `Here’s a salary‑focused view using the BLS data included in this app:\n`,
      `**Economics‑related roles and outlook (BLS)**\n${blsOutlook}\n`,
      `For BYU Econ grads specifically, many end up in Banking & Finance, Tech & Data Analytics, and Consulting – which typically sit on the higher end of those salary distributions.`,
      `You can combine this with the industry breakdown and top employers to target roles that match both your interests and pay expectations.`
    ].join('\n');
  }

  // Grad school / PhD / MBA / law
  if (msgLower.includes('phd') || msgLower.includes('grad school') || msgLower.includes('graduate school') ||
      msgLower.includes('mba') || msgLower.includes('law school') || msgLower.includes('jd')) {
    return [
      `The alumni data shows a pipeline from BYU Econ into a variety of graduate programs:\n`,
      `**Where grads go to grad school:**\n${topGradSchools}\n`,
      `**Types of degrees pursued:**\n${degreeTypes}\n`,
      `For a PhD in economics, the strongest prep is the Pre‑PhD track (ECON 580/581/582/588) plus substantial math and research assistant experience. For MBA and law school, work experience (MBA) and GPA + LSAT (law) matter most.`,
      `If you share the degree you’re considering (PhD Econ, MBA, JD, MPP, etc.), you can use the Econ Tracks section plus Alumni Explorer to design a course and experience plan that matches what successful alumni have done.`
    ].join('\n');
  }

  // Consulting questions
  if (msgLower.includes('consult') || msgLower.includes('consulting')) {
    return [
      `Economic and management consulting show up clearly in the alumni data.\n`,
      `**Industry snapshot:**\n${industryBreakdown}\n`,
      `**Firms with multiple BYU Econ alumni (consulting‑heavy employers):**\n${topCompanies}\n`,
      `Consulting roles value strong econometrics, data analysis (Stata/R/Python), slide‑building, and communication. The Management/Finance, Data Analytics, and Policy tracks on the Econ Tracks page give good elective combos for consulting.\n`,
      `In the Alumni Explorer, try filtering first‑job industry to “Economic Consulting” or “Management Consulting” and read through a few profiles to see common paths.`
    ].join('\n');
  }

  // Banking / finance / investing
  if (msgLower.includes('invest') || msgLower.includes('bank') || msgLower.includes('finance')) {
    return [
      `Great question about finance.\n`,
      `Banking and Finance is one of the largest destinations for BYU Economics graduates.\n`,
      `**Where grads are working (by industry):**\n${industryBreakdown}\n`,
      `**Finance‑heavy employers that show up a lot in the data:**\n${topCompanies}\n`,
      `In the alumni records you’ll see roles like:\n` +
      `- Investment Banking Analyst\n` +
      `- Financial Analyst (corporate or FP&A)\n` +
      `- Equity Research / Investment Research\n` +
      `- Wealth Management / Private Banking\n` +
      `- Corporate Finance and related roles\n`,
      `Most students who end up in these paths follow something like:\n` +
      `- Choose the **Management/Finance** track on the Econ Tracks page\n` +
      `- Join finance‑oriented clubs (investment, banking, consulting)\n` +
      `- Do 1–2 internships in finance before senior year\n`,
      `If you tell me whether you’re more interested in **investment banking**, **buy‑side investing**, or **corporate finance**, I can suggest a more specific plan (courses + internships + clubs) based on what past alumni did.`
    ].join('\n');
  }

  // Careers / “what can I do” questions (generic)
  if (msgLower.includes('job') || msgLower.includes('career') || msgLower.includes('do with an economics')) {
    return [
      `You asked: "${message}". Here’s what the data on BYU Economics graduates says about careers overall:\n`,
      `**Overview**\n${summary}\n`,
      `**Where grads are working now (by industry):**\n${industryBreakdown}\n`,
      `**Top employers hiring BYU Econ grads:**\n${topCompanies}\n`,
      `If you’re leaning toward a specific area (finance, tech/data, consulting, policy, Pre‑PhD, law), ask about that track directly and then use the Alumni Explorer to filter by that industry and see real first jobs and companies.`
    ].join('\n');
  }

  // Location / “where do people go” questions
  if (msgLower.includes('where do') || msgLower.includes('location') || msgLower.includes('city') || msgLower.includes('move')) {
    return [
      `Here’s what the alumni data shows about locations:\n`,
      `**Top first‑job locations:**\n${topLocations}\n`,
      `The interactive map on the Career Statistics tab shows these hubs geographically (including non‑US cities where first jobs are located).`,
      `If you have a target city or region, you can search for it in the Alumni Explorer to see who has gone there and what they’re doing.`
    ].join('\n');
  }

  // Default: general advisor using summary + hints
  return [
    `You asked: "${message}". I'm your BYU Economics Career Advisor. Using real data on BYU Econ graduates, I can help you explore:\n`,
    `- **Career paths** across industries (finance, tech/data, consulting, policy/non‑profit, Pre‑PhD, law)\n` +
    `- **Top employers and locations** where alumni actually work\n` +
    `- **Graduate school** destinations and degree types\n` +
    `- **Job market outlook** using BLS data\n`,
    `Here’s a quick snapshot from the dataset:\n${summary}\n`,
    `Try asking something like:\n` +
    `- "What careers do BYU Econ grads go into most?"\n` +
    `- "How do I prepare for economic consulting?"\n` +
    `- "What does the salary outlook look like for data scientists or economists?"\n` +
    `- "What should I take if I’m thinking about a PhD in economics?"`
  ].join('\n');
}

