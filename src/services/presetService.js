import { supabase, isSupabaseConfigured } from '../lib/supabase';

// Fallback presets for when Supabase isn't configured
const FALLBACK_PRESETS = [
  {
    id: 'demo-solo-saas',
    slug: 'solo-saas',
    name: 'Solo SaaS Builder',
    description: 'Watch one person direct an army of agents to build a complete SaaS product.',
    icon: '🚀',
    category: 'development',
    initial_objective: 'Build a complete task management SaaS with user auth, real-time sync, and Stripe billing',
    estimated_agents: 25,
    estimated_duration: '10 minutes',
    showcase_points: ['One person = entire dev team', 'Parallel execution at scale', 'Real-time coordination'],
    agent_config: {
      root: {
        role: 'coordinator',
        name: 'Project Lead',
        objective: 'Orchestrate the development of a complete SaaS product',
        children: [
          {
            role: 'researcher',
            name: 'Market Analyst',
            objective: 'Research competitor landscape and identify unique value proposition',
          },
          {
            role: 'coordinator',
            name: 'Tech Lead',
            objective: 'Oversee technical implementation',
            children: [
              { role: 'executor', name: 'Backend Engineer', objective: 'Design and implement API architecture' },
              { role: 'executor', name: 'Frontend Engineer', objective: 'Build React UI components' },
              { role: 'executor', name: 'DevOps Engineer', objective: 'Set up CI/CD and infrastructure' },
            ],
          },
          {
            role: 'researcher',
            name: 'UX Researcher',
            objective: 'Define user personas and optimal user flows',
          },
        ],
      },
    },
  },
  {
    id: 'demo-due-diligence',
    slug: 'due-diligence',
    name: 'Investment Due Diligence',
    description: 'Analyze a target company for investment in minutes instead of weeks.',
    icon: '📊',
    category: 'research',
    initial_objective: 'Conduct comprehensive due diligence on Acme Corp for Series B investment',
    estimated_agents: 15,
    estimated_duration: '8 minutes',
    showcase_points: ['Weeks of analysis in minutes', 'Parallel research streams', 'Comprehensive coverage'],
    agent_config: {
      root: {
        role: 'coordinator',
        name: 'Lead Analyst',
        objective: 'Coordinate comprehensive due diligence analysis',
        children: [
          {
            role: 'researcher',
            name: 'Financial Analyst',
            objective: 'Analyze financial statements, unit economics, and projections',
            children: [
              { role: 'validator', name: 'Auditor', objective: 'Verify financial claims and flag inconsistencies' },
            ],
          },
          { role: 'researcher', name: 'Market Analyst', objective: 'Assess TAM, competition, and market dynamics' },
          { role: 'researcher', name: 'Technical Analyst', objective: 'Evaluate technology stack and technical moat' },
          { role: 'researcher', name: 'Team Analyst', objective: 'Research founders and organizational capability' },
          { role: 'synthesizer', name: 'Report Writer', objective: 'Synthesize findings into investment memo' },
        ],
      },
    },
  },
  {
    id: 'demo-content-empire',
    slug: 'content-empire',
    name: 'Content Empire',
    description: 'One creator producing content for every platform simultaneously.',
    icon: '🎬',
    category: 'content',
    initial_objective: 'Create viral content adapted for YouTube, Twitter, LinkedIn, TikTok, and newsletter',
    estimated_agents: 12,
    estimated_duration: '6 minutes',
    showcase_points: ['One idea → every platform', 'Consistent brand voice', 'Parallel content creation'],
    agent_config: {
      root: {
        role: 'coordinator',
        name: 'Content Director',
        objective: 'Orchestrate multi-platform content creation',
        children: [
          { role: 'researcher', name: 'Trend Analyst', objective: 'Identify trending topics and optimal angles' },
          { role: 'executor', name: 'Script Writer', objective: 'Write compelling core narrative' },
          {
            role: 'coordinator',
            name: 'Distribution Lead',
            objective: 'Coordinate platform-specific adaptations',
            children: [
              { role: 'executor', name: 'YouTube Adapter', objective: 'Create long-form video script with hooks' },
              { role: 'executor', name: 'Twitter Strategist', objective: 'Create thread with optimal structure' },
              { role: 'executor', name: 'LinkedIn Writer', objective: 'Adapt for professional audience' },
              { role: 'executor', name: 'TikTok Creator', objective: 'Create short-form hooks and scripts' },
            ],
          },
          { role: 'validator', name: 'Brand Checker', objective: 'Ensure consistency across all formats' },
        ],
      },
    },
  },
  {
    id: 'demo-legacy-migration',
    slug: 'legacy-migration',
    name: 'Legacy Code Migration',
    description: 'Migrate a legacy codebase to modern stack with full coverage.',
    icon: '🔄',
    category: 'development',
    initial_objective: 'Migrate legacy jQuery/PHP application to React/Node.js with TypeScript',
    estimated_agents: 20,
    estimated_duration: '12 minutes',
    showcase_points: ['Complex migrations simplified', 'Parallel workstreams', 'Built-in validation'],
    agent_config: {
      root: {
        role: 'coordinator',
        name: 'Migration Architect',
        objective: 'Orchestrate complete codebase migration',
        children: [
          {
            role: 'researcher',
            name: 'Codebase Analyst',
            objective: 'Map existing codebase structure and patterns',
            children: [
              { role: 'researcher', name: 'API Mapper', objective: 'Document all API endpoints' },
              { role: 'researcher', name: 'DB Analyst', objective: 'Analyze database schema' },
            ],
          },
          { role: 'executor', name: 'Migration Planner', objective: 'Create phased migration plan' },
          {
            role: 'coordinator',
            name: 'Implementation Lead',
            objective: 'Oversee code migration',
            children: [
              { role: 'executor', name: 'Backend Migrator', objective: 'Migrate PHP to Node.js' },
              { role: 'executor', name: 'Frontend Migrator', objective: 'Migrate jQuery to React' },
              { role: 'executor', name: 'Test Writer', objective: 'Write comprehensive test suite' },
            ],
          },
          { role: 'validator', name: 'QA Lead', objective: 'Validate functional parity' },
        ],
      },
    },
  },
  {
    id: 'demo-market-launch',
    slug: 'market-launch',
    name: 'Product Launch',
    description: 'Complete go-to-market strategy from research to launch plan.',
    icon: '🎯',
    category: 'business',
    initial_objective: 'Develop complete GTM strategy for launching an AI writing assistant',
    estimated_agents: 18,
    estimated_duration: '10 minutes',
    showcase_points: ['Strategic depth at speed', 'Cross-functional coordination', 'Actionable deliverables'],
    agent_config: {
      root: {
        role: 'coordinator',
        name: 'Launch Commander',
        objective: 'Orchestrate complete product launch',
        children: [
          {
            role: 'researcher',
            name: 'Market Researcher',
            objective: 'Analyze market size and opportunity',
            children: [
              { role: 'researcher', name: 'Competitor Analyst', objective: 'Deep dive on competitor positioning' },
            ],
          },
          { role: 'researcher', name: 'Customer Researcher', objective: 'Define ICP and personas' },
          { role: 'executor', name: 'Positioning Strategist', objective: 'Develop unique positioning' },
          { role: 'executor', name: 'Pricing Analyst', objective: 'Design pricing strategy' },
          {
            role: 'coordinator',
            name: 'GTM Lead',
            objective: 'Coordinate go-to-market execution',
            children: [
              { role: 'executor', name: 'Channel Strategist', objective: 'Define distribution channels' },
              { role: 'executor', name: 'Launch Planner', objective: 'Create detailed launch timeline' },
              { role: 'executor', name: 'Content Strategist', objective: 'Plan launch content' },
            ],
          },
          { role: 'synthesizer', name: 'Strategy Synthesizer', objective: 'Compile comprehensive GTM playbook' },
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
