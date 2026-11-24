// ICP scoring and segmentation. All weights are ASSUMPTIONS: tune them against your own closed-won data.
const CFG = {
  sizeTiers: [ { min: 50, pts: 30, band: 'Mega (50bn+)' }, { min: 10, pts: 22, band: 'Large (10-50bn)' }, { min: 2, pts: 14, band: 'Mid (2-10bn)' }, { min: 0, pts: 6, band: 'Small (<2bn)' } ],
  strategyPts: { 'Buyout': 25, 'Private Credit': 25, 'Growth Equity': 18, 'Real Estate': 12, 'Venture': 8 },
  geoPts: { US: 15, UK: 12, DE: 10, SG: 8 }, geoDefault: 4,
  fundraiseWithinMonths: 12, fundraisePts: 20, debtMaturityPts: 10,
  tierA: 70, tierB: 40,
};
const PLAYS = {
  'Buyout': { committee: ['Deal team (VP / Principal)', 'CFO / Finance', 'Portfolio Operations'], angle: 'Track every financing workflow across live deals in one place' },
  'Private Credit': { committee: ['Origination', 'Portfolio Monitoring', 'Credit Committee support'], angle: 'Lender-side visibility into pipeline, maturities and borrower activity' },
  'Growth Equity': { committee: ['Investment team', 'Finance / Fund Ops'], angle: 'Standardize deal and financing workflow as deal volume scales' },
  'Real Estate': { committee: ['Acquisitions', 'Asset Management', 'Finance'], angle: 'Coordinate financing across multiple assets and lenders' },
  'Venture': { committee: ['Partners', 'Fund Ops'], angle: 'Light-weight workflow tracking for follow-on and bridge financing' },
};
return $input.all().map(({ json: f }) => {
  const size = CFG.sizeTiers.find(t => f.aum_usd_bn >= t.min);
  const sizePts = size.pts;
  const stratPts = CFG.strategyPts[f.strategy] ?? 5;
  const geoPts = CFG.geoPts[f.hq_country] ?? CFG.geoDefault;
  const fundraiseSignal = f.months_since_fundraise <= CFG.fundraiseWithinMonths;
  const signalPts = (fundraiseSignal ? CFG.fundraisePts : 0) + (f.debt_maturity_12m ? CFG.debtMaturityPts : 0);
  const score = Math.min(100, sizePts + stratPts + geoPts + signalPts);
  const tier = score >= CFG.tierA ? 'A' : score >= CFG.tierB ? 'B' : 'C';
  const play = PLAYS[f.strategy] || { committee: ['Investment team'], angle: 'Standardize financing workflow' };
  const signals = [fundraiseSignal ? 'recent fundraise' : null, f.debt_maturity_12m ? 'debt maturity within 12 months' : null].filter(Boolean);
  return { json: { ...f, size_band: size.band, icp_score: score, icp_tier: tier,
    score_breakdown: `size ${sizePts} + strategy ${stratPts} + geo ${geoPts} + signals ${signalPts}`,
    signals: signals.join('; ') || 'none', buying_committee: play.committee.join(' | '), outreach_angle: play.angle } };
});
