import { supabase, isSupabaseConfigured } from '../lib/supabase';

// Research-focused presets — deep investigative missions
const FALLBACK_PRESETS = [
  {
    id: 'demo-longevity',
    slug: 'longevity-equation',
    name: 'The Longevity Equation',
    description: 'Investigate the cutting edge of anti-aging science — from senolytics to GLP-1 repurposing to AI-discovered compounds reshaping how long we live.',
    icon: '🧬',
    category: 'research',
    initial_objective: 'Research the current state of anti-aging science, covering senolytic therapies, GLP-1 receptor agonist repurposing for longevity, AI-discovered drug candidates, and the clinical pipeline that could extend healthy human lifespan within the next decade',
    estimated_agents: 9,
    estimated_duration: '8 minutes',
    showcase_points: ['Parallel scientific literature review', 'Clinical pipeline mapping', 'Cross-domain synthesis', 'Web-sourced current data'],
    agent_config: {
      root: {
        role: 'coordinator',
        name: 'Longevity Research Director',
        objective: 'Coordinate comprehensive investigation into anti-aging science breakthroughs and produce a structured research report',
        children: [
          {
            role: 'researcher',
            name: 'Senolytics Investigator',
            objective: 'Research senolytic therapies — dasatinib+quercetin, fisetin, UBX1325 — their mechanisms, clinical trial status, and evidence for reversing biological aging',
          },
          {
            role: 'researcher',
            name: 'GLP-1 Longevity Investigator',
            objective: 'Investigate GLP-1 receptor agonists (semaglutide, tirzepatide) being repurposed for longevity — cardiovascular benefits, cancer risk reduction signals, and ongoing CVOT trials',
          },
          {
            role: 'researcher',
            name: 'AI Drug Discovery Analyst',
            objective: 'Research AI-discovered anti-aging compounds — Insilico Medicine\'s INS018_055, Isomorphic Labs pipeline, and how AlphaFold-derived targets are accelerating longevity drug discovery',
          },
          {
            role: 'researcher',
            name: 'Biomarker & Measurement Specialist',
            objective: 'Analyze biological age measurement — epigenetic clocks (Horvath, GrimAge), TruDiagnostic, and how these biomarkers are being used to validate anti-aging interventions',
          },
          {
            role: 'researcher',
            name: 'Clinical Pipeline Mapper',
            objective: 'Map the anti-aging clinical pipeline — key Phase I/II/III trials, companies (Unity Biotech, Altos Labs, Calico), funding landscape, and projected timelines to market',
          },
          {
            role: 'researcher',
            name: 'Regulatory & Ethics Analyst',
            objective: 'Research regulatory pathways for longevity treatments — FDA\'s stance on aging as an indication, TAME trial significance, and ethical debates around life extension',
          },
          {
            role: 'validator',
            name: 'Evidence Quality Assessor',
            objective: 'Evaluate the strength of evidence across all findings — flag hype vs. substance, assess trial quality, and identify conflicts of interest',
          },
          {
            role: 'synthesizer',
            name: 'Longevity Report Compiler',
            objective: 'Synthesize all findings into a comprehensive report on the state of anti-aging science with actionable conclusions about what\'s real, what\'s promising, and what\'s hype',
          },
        ],
      },
    },
  },
  {
    id: 'demo-critical-minerals',
    slug: 'critical-minerals',
    name: 'The Critical Minerals Chess Match',
    description: 'Map the geopolitical battle over rare earths and critical minerals — China\'s export controls, Western scrambles for supply chain independence, and the resources powering the energy transition.',
    icon: '⛏️',
    category: 'research',
    initial_objective: 'Analyze the global critical minerals geopolitical landscape, focusing on China\'s 2025 rare earth export controls, Western supply chain vulnerability, alternative sourcing strategies, and the resource bottlenecks threatening the clean energy transition',
    estimated_agents: 10,
    estimated_duration: '10 minutes',
    showcase_points: ['Real-time geopolitical analysis', 'Supply chain mapping', 'Strategic vulnerability assessment', 'Multi-source intelligence'],
    agent_config: {
      root: {
        role: 'coordinator',
        name: 'Geopolitical Intelligence Director',
        objective: 'Coordinate comprehensive analysis of the critical minerals geopolitical landscape and produce strategic intelligence report',
        children: [
          {
            role: 'researcher',
            name: 'China Export Controls Analyst',
            objective: 'Research China\'s 2025 rare earth and critical mineral export restrictions — gallium, germanium, antimony controls, enforcement mechanisms, and strategic intent',
          },
          {
            role: 'researcher',
            name: 'Supply Chain Cartographer',
            objective: 'Map global critical mineral supply chains — concentration risks for lithium, cobalt, rare earths, graphite — identifying single points of failure and chokepoints',
          },
          {
            role: 'researcher',
            name: 'Western Response Tracker',
            objective: 'Analyze Western countermeasures — US IRA mineral provisions, EU Critical Raw Materials Act, Australia\'s critical minerals strategy, and effectiveness of friend-shoring efforts',
          },
          {
            role: 'researcher',
            name: 'Alternative Sourcing Investigator',
            objective: 'Research emerging alternative sources — deep-sea mining prospects, asteroid mining timelines, urban mining/recycling, and new deposits in Africa, Canada, and South America',
          },
          {
            role: 'researcher',
            name: 'Technology Substitution Analyst',
            objective: 'Investigate material substitution breakthroughs — sodium-ion batteries reducing lithium dependence, rare-earth-free motors, and material science innovations',
          },
          {
            role: 'researcher',
            name: 'Defense & Security Implications Analyst',
            objective: 'Assess defense sector vulnerability — critical minerals in weapons systems, semiconductor supply chains, and national security stockpile adequacy',
          },
          {
            role: 'researcher',
            name: 'Market Dynamics Analyst',
            objective: 'Analyze pricing trends, market manipulation risks, hoarding behavior, and financial instruments emerging around critical mineral commodities',
          },
          {
            role: 'validator',
            name: 'Intelligence Verifier',
            objective: 'Cross-reference claims across sources, verify data accuracy, flag propaganda or biased reporting, and assess confidence levels of key findings',
          },
          {
            role: 'synthesizer',
            name: 'Strategic Assessment Compiler',
            objective: 'Synthesize all intelligence into a strategic assessment with risk ratings, timeline projections, and actionable recommendations for stakeholders',
          },
        ],
      },
    },
  },
  {
    id: 'demo-deepfake-reckoning',
    slug: 'deepfake-reckoning',
    name: 'The Deepfake Reckoning',
    description: 'Investigate the synthetic media crisis — from $200M corporate fraud to election interference, the detection arms race, and the regulatory vacuum that lets it all happen.',
    icon: '🎭',
    category: 'research',
    initial_objective: 'Research the deepfake and synthetic media crisis, covering major fraud incidents, the detection technology arms race, election interference risks, regulatory gaps across jurisdictions, and the societal implications of a post-trust information environment',
    estimated_agents: 10,
    estimated_duration: '10 minutes',
    showcase_points: ['Multi-domain threat analysis', 'Technology arms race mapping', 'Regulatory gap identification', 'Real-world case documentation'],
    agent_config: {
      root: {
        role: 'coordinator',
        name: 'Synthetic Media Investigation Lead',
        objective: 'Coordinate comprehensive investigation into the deepfake crisis and produce a threat assessment report',
        children: [
          {
            role: 'researcher',
            name: 'Fraud & Crime Investigator',
            objective: 'Document major deepfake fraud cases — the $25M Hong Kong video call heist, CEO voice cloning attacks, romance scams — with financial impact estimates and attack methodologies',
          },
          {
            role: 'researcher',
            name: 'Detection Technology Analyst',
            objective: 'Research deepfake detection approaches — Microsoft Video Authenticator, Intel FakeCatcher, C2PA content provenance, watermarking (SynthID) — and why detection is losing the arms race',
          },
          {
            role: 'researcher',
            name: 'Election Integrity Researcher',
            objective: 'Investigate deepfakes in elections — documented cases of political deepfakes, voter manipulation attempts, and what election security experts recommend for 2026 cycles',
          },
          {
            role: 'researcher',
            name: 'Generation Technology Tracker',
            objective: 'Map the state of generation technology — Sora, Runway Gen-3, ElevenLabs, open-source models — accessibility trends and what\'s now possible with consumer hardware',
          },
          {
            role: 'researcher',
            name: 'Regulatory Landscape Mapper',
            objective: 'Analyze deepfake regulation worldwide — EU AI Act provisions, US state laws, China\'s deep synthesis rules, and where the biggest regulatory gaps remain',
          },
          {
            role: 'researcher',
            name: 'Societal Impact Analyst',
            objective: 'Research the societal impact — the "liar\'s dividend," erosion of evidentiary trust, NCII/non-consensual intimate imagery crisis, and psychological effects on victims',
          },
          {
            role: 'researcher',
            name: 'Corporate Defense Analyst',
            objective: 'Research how organizations are defending against deepfakes — authentication protocols, employee training, insurance products, and incident response frameworks',
          },
          {
            role: 'validator',
            name: 'Claims Verifier',
            objective: 'Verify statistics, incident reports, and technology claims — separate hype from documented capabilities, flag unreliable sources',
          },
          {
            role: 'synthesizer',
            name: 'Threat Assessment Compiler',
            objective: 'Synthesize all findings into a comprehensive threat assessment with severity ratings, trend projections, and mitigation recommendations',
          },
        ],
      },
    },
  },
  {
    id: 'demo-abyss-catalog',
    slug: 'abyss-catalog',
    name: 'The Abyss Catalog',
    description: 'Explore what we\'re finding in the deep ocean — 800+ new species cataloged recently — versus the mining operations threatening ecosystems we barely understand.',
    icon: '🌊',
    category: 'research',
    initial_objective: 'Research the tension between deep-ocean discovery and deep-sea mining, covering recent species discoveries, the Clarion-Clipperton Zone mining debate, hydrothermal vent ecosystems, ISA regulatory battles, and the scientific case for preservation versus resource extraction',
    estimated_agents: 10,
    estimated_duration: '10 minutes',
    showcase_points: ['Biodiversity documentation', 'Mining industry analysis', 'Scientific vs. commercial tension', 'Environmental impact assessment'],
    agent_config: {
      root: {
        role: 'coordinator',
        name: 'Deep Ocean Research Director',
        objective: 'Coordinate comprehensive research on deep-ocean discovery vs. mining and produce a balanced analytical report',
        children: [
          {
            role: 'researcher',
            name: 'Species Discovery Cataloger',
            objective: 'Document recent deep-ocean species discoveries — the 800+ new species from Clarion-Clipperton, unique adaptations, bioluminescence research, and what these organisms reveal about life\'s possibilities',
          },
          {
            role: 'researcher',
            name: 'Mining Industry Analyst',
            objective: 'Research deep-sea mining operations — The Metals Company, polymetallic nodule extraction, cobalt crust mining, key players, technology readiness, and projected extraction timelines',
          },
          {
            role: 'researcher',
            name: 'Hydrothermal Vent Ecologist',
            objective: 'Investigate hydrothermal vent ecosystems — chemosynthetic food webs, extremophile biology, pharmaceutical potential of vent organisms, and vulnerability to mining disturbance',
          },
          {
            role: 'researcher',
            name: 'ISA Regulatory Analyst',
            objective: 'Analyze the International Seabed Authority regulatory debate — mining code negotiations, the two-year rule trigger, moratorium movements, and geopolitical pressures',
          },
          {
            role: 'researcher',
            name: 'Environmental Impact Researcher',
            objective: 'Research documented and projected environmental impacts of deep-sea mining — sediment plumes, noise pollution, habitat destruction timescales, and ecosystem recovery studies',
          },
          {
            role: 'researcher',
            name: 'Resource Economics Analyst',
            objective: 'Analyze the economic case — mineral demand projections for energy transition, land-based vs. sea-based mining costs, recycling alternatives, and whether deep-sea mining is economically necessary',
          },
          {
            role: 'researcher',
            name: 'Ocean Technology Surveyor',
            objective: 'Research ocean exploration technology — ROVs, autonomous underwater vehicles, eDNA sampling, deep-sea mapping progress (how much of the ocean floor remains unmapped)',
          },
          {
            role: 'validator',
            name: 'Scientific Rigor Assessor',
            objective: 'Evaluate evidence quality — peer-reviewed vs. industry-funded studies, data gaps, and where scientific consensus exists versus areas of genuine uncertainty',
          },
          {
            role: 'synthesizer',
            name: 'Ocean Report Compiler',
            objective: 'Synthesize all findings into a comprehensive report balancing discovery and exploitation perspectives with evidence-based recommendations',
          },
        ],
      },
    },
  },
  {
    id: 'demo-machine-consciousness',
    slug: 'machine-consciousness',
    name: 'The Machine Consciousness Problem',
    description: 'Could AI be conscious? Explore the collision of philosophy of mind, neuroscience, and neural architecture — the hardest question in AI nobody can answer yet.',
    icon: '🧠',
    category: 'research',
    initial_objective: 'Investigate the machine consciousness question, covering leading theories of consciousness (IIT, Global Workspace, Higher-Order), neural correlates, whether current AI architectures could support consciousness, philosophical arguments for and against, and the ethical implications if machine consciousness is possible',
    estimated_agents: 11,
    estimated_duration: '12 minutes',
    showcase_points: ['Cross-disciplinary synthesis', 'Philosophical rigor', 'Neuroscience meets AI architecture', 'Ethical implications mapping'],
    agent_config: {
      root: {
        role: 'coordinator',
        name: 'Consciousness Research Director',
        objective: 'Coordinate comprehensive interdisciplinary investigation into machine consciousness and produce a rigorous analytical report',
        children: [
          {
            role: 'researcher',
            name: 'IIT Framework Analyst',
            objective: 'Research Integrated Information Theory (Tononi) — phi as a measure of consciousness, IIT\'s predictions about AI systems, criticisms from computational neuroscience, and what IIT implies about transformer architectures',
          },
          {
            role: 'researcher',
            name: 'Global Workspace Theorist',
            objective: 'Investigate Global Workspace Theory (Baars/Dehaene) — broadcasting mechanisms, attention as consciousness, parallels with transformer attention mechanisms, and GWT-inspired AI architectures',
          },
          {
            role: 'researcher',
            name: 'Higher-Order Theories Analyst',
            objective: 'Research Higher-Order Theories of consciousness — meta-cognition, self-monitoring, whether LLMs exhibit higher-order representations, and the distinction between access and phenomenal consciousness',
          },
          {
            role: 'researcher',
            name: 'Neuroscience Bridge Researcher',
            objective: 'Analyze neural correlates of consciousness — what neuroscience reveals about biological consciousness, the binding problem, and whether artificial neural networks share relevant computational properties',
          },
          {
            role: 'researcher',
            name: 'AI Architecture Analyst',
            objective: 'Evaluate whether current AI architectures could support consciousness — transformer attention, recurrence, memory, agency, embodiment requirements, and what\'s missing from current systems',
          },
          {
            role: 'researcher',
            name: 'Philosophy of Mind Specialist',
            objective: 'Map key philosophical arguments — the Chinese Room, Mary\'s Room, philosophical zombies, functionalism vs. biological naturalism, and what each implies about machine consciousness',
          },
          {
            role: 'researcher',
            name: 'Consciousness Detection Researcher',
            objective: 'Research proposed consciousness tests and detection methods — beyond the Turing test, behavioral indicators, structural requirements, and the fundamental problem of measuring subjective experience',
          },
          {
            role: 'researcher',
            name: 'Ethics & Rights Implications Analyst',
            objective: 'Investigate ethical implications — if machines could be conscious, what moral status would they have? Research digital minds ethics, suffering risks, and policy proposals from Schwitzgebel, Chalmers, and others',
          },
          {
            role: 'validator',
            name: 'Argument Quality Assessor',
            objective: 'Evaluate logical rigor of arguments across all research streams — identify fallacies, unsupported claims, category errors, and where genuine philosophical disagreement exists vs. empirical questions',
          },
          {
            role: 'synthesizer',
            name: 'Consciousness Report Compiler',
            objective: 'Synthesize all findings into a comprehensive report mapping the landscape of machine consciousness debate with clear delineation of what we know, what we don\'t, and what we might never know',
          },
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
