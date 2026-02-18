// Modular web search — provider-agnostic with pluggable backends
// Default: Serper (Google results, 2500 free queries/month)
// Switch providers by changing SEARCH_PROVIDER env var

async function serperSearch(query, options = {}) {
  const apiKey = process.env.SERPER_API_KEY;
  if (!apiKey) throw new Error('SERPER_API_KEY not configured');

  const res = await fetch('https://google.serper.dev/search', {
    method: 'POST',
    headers: {
      'X-API-KEY': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ q: query, num: options.num || 5 }),
  });

  if (!res.ok) {
    throw new Error(`Serper search failed: ${res.status}`);
  }

  const data = await res.json();
  return {
    answer: data.answerBox?.answer || data.answerBox?.snippet || null,
    results: (data.organic || []).slice(0, 5).map((r) => ({
      title: r.title,
      url: r.link,
      snippet: r.snippet,
    })),
  };
}

async function braveSearch(query, options = {}) {
  const apiKey = process.env.BRAVE_SEARCH_API_KEY;
  if (!apiKey) throw new Error('BRAVE_SEARCH_API_KEY not configured');

  const params = new URLSearchParams({ q: query, count: options.num || 5 });
  const res = await fetch(`https://api.search.brave.com/res/v1/web/search?${params}`, {
    headers: {
      'Accept': 'application/json',
      'Accept-Encoding': 'gzip',
      'X-Subscription-Token': apiKey,
    },
  });

  if (!res.ok) {
    throw new Error(`Brave search failed: ${res.status}`);
  }

  const data = await res.json();
  return {
    answer: null,
    results: (data.web?.results || []).slice(0, 5).map((r) => ({
      title: r.title,
      url: r.url,
      snippet: r.description,
    })),
  };
}

async function tavilySearch(query, options = {}) {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) throw new Error('TAVILY_API_KEY not configured');

  const res = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      api_key: apiKey,
      query,
      max_results: options.num || 5,
      search_depth: 'basic',
    }),
  });

  if (!res.ok) {
    throw new Error(`Tavily search failed: ${res.status}`);
  }

  const data = await res.json();
  return {
    answer: data.answer || null,
    results: (data.results || []).slice(0, 5).map((r) => ({
      title: r.title,
      url: r.url,
      snippet: r.content?.slice(0, 300),
    })),
  };
}

const PROVIDERS = {
  serper: serperSearch,
  brave: braveSearch,
  tavily: tavilySearch,
};

export async function webSearch(query, options = {}) {
  const provider = process.env.SEARCH_PROVIDER || 'serper';
  const searchFn = PROVIDERS[provider];
  if (!searchFn) throw new Error(`Unknown search provider: ${provider}`);
  return searchFn(query, options);
}
