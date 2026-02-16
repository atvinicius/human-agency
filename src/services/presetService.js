import { supabase, isSupabaseConfigured } from '../lib/supabase';

// Capability-aligned presets — research, analysis, content, strategy
// No code-focused templates (the product orchestrates knowledge work, not code execution)
const FALLBACK_PRESETS = [
  {
    id: 'demo-competitive-intel',
    slug: 'competitive-intel',
    name: 'Competitive Intelligence Report',
    description: 'Map an entire industry landscape — players, positioning, gaps, and emerging threats — in minutes.',
    icon: '🔍',
    category: 'research',
    initial_objective: 'Analyze the competitive landscape for the AI-powered productivity tools market, identifying key players, their positioning, market gaps, and emerging trends',
    estimated_agents: 14,
    estimated_duration: '8 minutes',
    showcase_points: ['Parallel research streams', 'Structured intelligence report', 'Market gap analysis'],
    agent_config: {
      root: {
        role: 'coordinator',
        name: 'Intelligence Director',
        objective: 'Coordinate comprehensive competitive intelligence analysis and produce structured report',
        children: [
          {
            role: 'researcher',
            name: 'Market Analyst',
            objective: 'Assess total addressable market size, growth rate, and market dynamics',
          },
          {
            role: 'researcher',
            name: 'Competitor Mapper',
            objective: 'Identify and profile all significant competitors, their products, and positioning',
            children: [
              { role: 'researcher', name: 'Pricing Analyst', objective: 'Compare pricing models, tiers, and value propositions across competitors' },
              { role: 'researcher', name: 'Feature Analyst', objective: 'Map feature sets and identify capability gaps across the landscape' },
            ],
          },
          {
            role: 'researcher',
            name: 'Trend Scout',
            objective: 'Identify emerging trends, technologies, and shifts that could disrupt the landscape',
          },
          {
            role: 'researcher',
            name: 'Customer Segment Analyst',
            objective: 'Define key customer segments and their unmet needs',
          },
          {
            role: 'validator',
            name: 'Fact Checker',
            objective: 'Cross-reference claims, verify data points, and flag inconsistencies',
          },
          {
            role: 'synthesizer',
            name: 'Report Compiler',
            objective: 'Synthesize all findings into a structured competitive intelligence report with recommendations',
          },
        ],
      },
    },
  },
  {
    id: 'demo-due-diligence',
    slug: 'due-diligence',
    name: 'Investment Due Diligence',
    description: 'Analyze a target company for investment — financials, market, team, risks — in minutes instead of weeks.',
    icon: '📊',
    category: 'analysis',
    initial_objective: 'Conduct comprehensive due diligence on Acme Corp for Series B investment, covering financials, market position, technology, team, and risks',
    estimated_agents: 15,
    estimated_duration: '8 minutes',
    showcase_points: ['Weeks of analysis in minutes', 'Parallel research streams', 'Investment memo output'],
    agent_config: {
      root: {
        role: 'coordinator',
        name: 'Lead Analyst',
        objective: 'Coordinate comprehensive due diligence analysis and produce investment recommendation',
        children: [
          {
            role: 'researcher',
            name: 'Financial Analyst',
            objective: 'Analyze financial statements, unit economics, burn rate, and projections',
            children: [
              { role: 'validator', name: 'Financial Auditor', objective: 'Verify financial claims, flag inconsistencies, and stress-test projections' },
            ],
          },
          { role: 'researcher', name: 'Market Analyst', objective: 'Assess TAM, competitive dynamics, market timing, and growth trajectory' },
          { role: 'researcher', name: 'Technology Analyst', objective: 'Evaluate technology stack, technical moat, scalability, and IP position' },
          { role: 'researcher', name: 'Team Analyst', objective: 'Research founders, key hires, organizational capability, and culture signals' },
          { role: 'researcher', name: 'Risk Analyst', objective: 'Identify regulatory, market, execution, and concentration risks' },
          { role: 'synthesizer', name: 'Memo Writer', objective: 'Synthesize all findings into a structured investment memo with recommendation' },
        ],
      },
    },
  },
  {
    id: 'demo-content-empire',
    slug: 'content-empire',
    name: 'Content Empire',
    description: 'One creator producing adapted content for every platform simultaneously.',
    icon: '🎬',
    category: 'content',
    initial_objective: 'Create a compelling content piece about "the future of remote work" adapted for YouTube, Twitter/X, LinkedIn, and email newsletter — maintaining consistent brand voice across all formats',
    estimated_agents: 12,
    estimated_duration: '6 minutes',
    showcase_points: ['One idea → every platform', 'Consistent brand voice', 'Parallel content creation'],
    agent_config: {
      root: {
        role: 'coordinator',
        name: 'Content Director',
        objective: 'Orchestrate multi-platform content creation from a single core idea',
        children: [
          { role: 'researcher', name: 'Trend Analyst', objective: 'Research trending angles, audience sentiment, and optimal hooks for the topic' },
          { role: 'executor', name: 'Narrative Writer', objective: 'Write the compelling core narrative and key arguments' },
          {
            role: 'coordinator',
            name: 'Distribution Lead',
            objective: 'Coordinate platform-specific adaptations of the core narrative',
            children: [
              { role: 'executor', name: 'YouTube Scripter', objective: 'Create long-form video script with hooks, retention beats, and CTA' },
              { role: 'executor', name: 'Twitter Strategist', objective: 'Create engaging thread with optimal structure and viral hooks' },
              { role: 'executor', name: 'LinkedIn Writer', objective: 'Adapt narrative for professional audience with thought leadership angle' },
              { role: 'executor', name: 'Newsletter Editor', objective: 'Create email newsletter version with personal tone and actionable insights' },
            ],
          },
          { role: 'validator', name: 'Brand Checker', objective: 'Ensure tone, messaging, and quality are consistent across all formats' },
        ],
      },
    },
  },
  {
    id: 'demo-gtm-strategy',
    slug: 'gtm-strategy',
    name: 'Go-to-Market Strategy',
    description: 'Complete GTM playbook — from market research to launch plan — built by a parallel strategy team.',
    icon: '🎯',
    category: 'strategy',
    initial_objective: 'Develop a comprehensive go-to-market strategy for launching an AI writing assistant targeting content marketing teams at mid-market B2B companies',
    estimated_agents: 16,
    estimated_duration: '10 minutes',
    showcase_points: ['Strategic depth at speed', 'Cross-functional coordination', 'Actionable GTM playbook'],
    agent_config: {
      root: {
        role: 'coordinator',
        name: 'Strategy Lead',
        objective: 'Orchestrate the development of a comprehensive go-to-market strategy',
        children: [
          {
            role: 'researcher',
            name: 'Market Researcher',
            objective: 'Analyze market size, dynamics, timing, and opportunity assessment',
            children: [
              { role: 'researcher', name: 'Competitor Analyst', objective: 'Deep-dive on competitor positioning, strengths, and vulnerabilities' },
            ],
          },
          { role: 'researcher', name: 'Customer Researcher', objective: 'Define ideal customer profile, buyer personas, and purchase journey' },
          { role: 'executor', name: 'Positioning Strategist', objective: 'Develop unique positioning, value propositions, and key differentiators' },
          { role: 'executor', name: 'Pricing Strategist', objective: 'Design pricing model, tiers, and packaging strategy' },
          {
            role: 'coordinator',
            name: 'GTM Lead',
            objective: 'Coordinate the tactical go-to-market execution plan',
            children: [
              { role: 'executor', name: 'Channel Strategist', objective: 'Define distribution channels, partnerships, and acquisition strategy' },
              { role: 'executor', name: 'Launch Planner', objective: 'Create phased launch timeline with milestones and success metrics' },
              { role: 'executor', name: 'Content Strategist', objective: 'Plan launch content, messaging, and demand generation approach' },
            ],
          },
          { role: 'synthesizer', name: 'Strategy Synthesizer', objective: 'Compile all workstreams into a cohesive, actionable GTM playbook' },
        ],
      },
    },
  },
  {
    id: 'demo-brand-workshop',
    slug: 'brand-workshop',
    name: 'Brand & Messaging Workshop',
    description: 'Define your brand positioning, messaging hierarchy, and voice — like a strategy offsite, but in minutes.',
    icon: '✨',
    category: 'strategy',
    initial_objective: 'Develop brand positioning, messaging framework, and tone of voice guidelines for a new sustainable fashion marketplace targeting environmentally conscious millennials',
    estimated_agents: 13,
    estimated_duration: '8 minutes',
    showcase_points: ['Brand positioning framework', 'Messaging hierarchy', 'Tone of voice guide'],
    agent_config: {
      root: {
        role: 'coordinator',
        name: 'Brand Strategist',
        objective: 'Lead the brand strategy workshop and produce a comprehensive brand guide',
        children: [
          { role: 'researcher', name: 'Audience Researcher', objective: 'Research target audience values, language, aspirations, and pain points' },
          { role: 'researcher', name: 'Competitive Positioning Analyst', objective: 'Analyze competitor brand positioning, messaging, and white space opportunities' },
          { role: 'researcher', name: 'Cultural Trends Analyst', objective: 'Identify relevant cultural trends, movements, and narratives to align with' },
          {
            role: 'coordinator',
            name: 'Messaging Lead',
            objective: 'Coordinate the development of the messaging framework',
            children: [
              { role: 'executor', name: 'Positioning Writer', objective: 'Craft brand positioning statement, mission, and unique value propositions' },
              { role: 'executor', name: 'Messaging Architect', objective: 'Build messaging hierarchy: tagline, elevator pitch, key messages by audience' },
              { role: 'executor', name: 'Voice Designer', objective: 'Define tone of voice guidelines with do/don\'t examples for each channel' },
            ],
          },
          { role: 'validator', name: 'Differentiation Tester', objective: 'Test positioning for uniqueness, clarity, and defensibility against competitors' },
          { role: 'synthesizer', name: 'Brand Guide Compiler', objective: 'Compile all elements into a structured brand and messaging guide' },
        ],
      },
    },
  },
];

export async function getPresets() {
  if (!isSupabaseConfigured()) {
    return FALLBACK_PRESETS;
  }

  const { data, error } = await supabase
    .from('presets')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching presets:', error);
    return FALLBACK_PRESETS;
  }

  return data;
}

export async function getPresetBySlug(slug) {
  if (!isSupabaseConfigured()) {
    return FALLBACK_PRESETS.find((p) => p.slug === slug) || null;
  }

  const { data, error } = await supabase
    .from('presets')
    .select('*')
    .eq('slug', slug)
    .single();

  if (error) {
    console.error('Error fetching preset:', error);
    return FALLBACK_PRESETS.find((p) => p.slug === slug) || null;
  }

  return data;
}
