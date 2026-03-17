import { GoogleGenAI, GenerateContentParameters } from "@google/genai";

async function generateWithSearchFallback(params: GenerateContentParameters, retries = 3, delay = 1000) {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  try {
    return await ai.models.generateContent(params);
  } catch (error: any) {
    const errorMsg = error?.message || "";
    const isQuotaExceeded = errorMsg.includes("search_grounding_request_per_project_per_day_per_user") || 
                           errorMsg.includes("RESOURCE_EXHAUSTED") ||
                           JSON.stringify(error).includes("RESOURCE_EXHAUSTED");

    if (isQuotaExceeded) {
      if (params.config?.tools?.some(t => 'googleSearch' in t)) {
        console.warn("Search grounding quota exceeded, falling back to standard generation.");
        const fallbackParams = {
          ...params,
          config: {
            ...params.config,
            tools: params.config.tools.filter(t => !('googleSearch' in t))
          }
        };
        if (fallbackParams.config.tools?.length === 0) {
          delete fallbackParams.config.tools;
        }
        return await generateWithSearchFallback(fallbackParams, retries, delay);
      }

      if (retries > 0) {
        console.warn(`Quota exceeded, retrying in ${delay}ms... (${retries} retries left)`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return await generateWithSearchFallback(params, retries - 1, delay * 2);
      }
    }
    throw error;
  }
}

export const COMPANIES = [
  "EnterpriseDB (EDB)",
  "Crunchy Data",
  "Percona",
  "Timescale",
  "Citus Data (Microsoft)",
  "Neon",
  "Supabase",
  "Tembo",
  "Aiven",
  "Instaclustr",
  "Cybertec",
  "OnGres",
  "Postgres Professional",
  "Fujitsu (PostgreSQL)",
  "NTT DATA (PostgreSQL)",
  "Google Cloud (AlloyDB/Cloud SQL)",
  "Amazon Web Services (RDS/Aurora)",
  "Microsoft Azure (PostgreSQL)",
  "VMware Tanzu SQL",
  "EDB (2ndQuadrant)"
];

export type TimeRange = "month" | "year" | "5years";

export interface CompanyData {
  name: string;
  summary: string;
  focus: string;
  recentNews: { title: string; url: string; date: string }[];
  sources: string[];
  impactScore: number; // 1-100
  sentiment: "Positive" | "Neutral" | "Negative";
  topics: string[];
  linkedinPosts?: { content: string; date: string; url?: string }[];
  conferences?: { name: string; date: string; role: string }[];
  hiringTrends?: string;
  fundingAnnouncements?: string;
  headquarters?: string;
  regions?: string[];
  coordinates?: [number, number]; // [lat, lng]
}

export interface GlobalEvent {
  name: string;
  location: string;
  date: string;
  deadline?: string;
  url: string;
  description: string;
  type: "Conference" | "Meetup" | "Webinar";
  sponsors?: { name: string; level: string; description?: string }[];
}

export interface LinkedInPost {
  content: string;
  date: string;
  url?: string;
  author?: string;
  popularity?: string;
}

export async function fetchTopLinkedInPosts() {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  
  const prompt = `Research and identify the top 5 most popular and trending LinkedIn posts related to the PostgreSQL ecosystem, database technology, and major PostgreSQL companies (like Percona, EDB, Timescale, Neon, Supabase) from the last 30 days.
  Focus on posts with high engagement (likes, comments, shares).
  
  CRITICAL: Ensure the "url" field contains a valid, direct link to the LinkedIn post. If a direct link cannot be found, use the author's LinkedIn profile URL or a relevant company page URL. Do not use placeholder URLs.
  
  Provide the output in the following JSON format:
  {
    "posts": [
      {
        "content": "A concise summary of the post's main point.",
        "author": "Name of the person or company who posted it.",
        "date": "YYYY-MM-DD",
        "url": "Direct URL to the post if available.",
        "popularity": "Description of engagement (e.g., '1.2k likes, 45 comments' or 'Trending in #PostgreSQL')"
      }
    ]
  }`;

  try {
    const response = await generateWithSearchFallback({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json"
      },
    });

    const data = JSON.parse(response.text || "{}");
    return data.posts as LinkedInPost[];
  } catch (error) {
    console.error("Error fetching top LinkedIn posts:", error);
    return [];
  }
}

export async function fetchGlobalEvents() {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  
  const prompt = `Research and list major upcoming PostgreSQL conferences and events for 2026.
  Include international events like PGConf.EU, PGDay, Carnegie Mellon Database Series, etc.
  
  Provide the output in the following JSON format:
  {
    "events": [
      {
        "name": "Event Name",
        "location": "City, Country",
        "date": "YYYY-MM-DD",
        "deadline": "YYYY-MM-DD (CFP deadline if available)",
        "url": "Official URL",
        "description": "Brief description of the event's focus.",
        "type": "Conference",
        "sponsors": [
          { "name": "Sponsor Name", "level": "Platinum/Gold/Silver", "description": "Brief description of their involvement." }
        ]
      }
    ]
  }`;

  try {
    const response = await generateWithSearchFallback({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json"
      },
    });

    const data = JSON.parse(response.text || "{}");
    return data.events as GlobalEvent[];
  } catch (error) {
    console.error("Error fetching global events:", error);
    return [];
  }
}

export async function fetchCompanyComparison(company: string, range: TimeRange) {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  
  const rangeText = {
    month: "the last month",
    year: "the last year",
    "5years": "the last 5 years"
  }[range];

  const prompt = `Research and summarize the current focus and recent news for the PostgreSQL support company: "${company}" over ${rangeText}. 
  Focus on their blog posts, RSS feeds, LinkedIn activity, official news, conference participation, and market presence.
  
  Provide the output in the following JSON format:
  {
    "summary": "A 2-3 sentence overview of their activity in this period.",
    "focus": "Key technical or business focus (e.g., Cloud, Performance, Extensions, AI).",
    "recentNews": [
      { "title": "Headline of a major news or blog post", "url": "URL if available", "date": "ISO 8601 date (YYYY-MM-DD)" }
    ],
    "sources": ["List of main URLs or platforms researched"],
    "impactScore": 85,
    "sentiment": "Positive",
    "topics": ["Topic 1", "Topic 2"],
    "linkedinPosts": [
      { "content": "Summary of a significant LinkedIn post", "date": "YYYY-MM-DD", "url": "Link if found" }
    ],
    "conferences": [
      { "name": "Conference name (e.g. PGConf.EU)", "date": "YYYY-MM-DD", "role": "Speaker/Sponsor/Attendee" }
    ],
    "hiringTrends": "Brief summary of their current hiring activity or team growth.",
    "fundingAnnouncements": "Summary of recent funding rounds, acquisitions, or major financial milestones.",
    "headquarters": "City, Country",
    "regions": ["North America", "Europe", "Asia Pacific", "Latin America", "Middle East & Africa"],
    "coordinates": [40.7128, -74.0060]
  }`;

  try {
    const response = await generateWithSearchFallback({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json"
      },
    });

    return JSON.parse(response.text || "{}") as Partial<CompanyData>;
  } catch (error) {
    console.error(`Error fetching data for ${company}:`, error);
    return null;
  }
}

export async function fetchCompetitiveDuel(companyA: string, companyB: string, dataA: CompanyData, dataB: CompanyData) {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  
  const prompt = `Perform a deep competitive analysis between two PostgreSQL companies: "${companyA}" and "${companyB}".
  Use the following recent data as context:
  ${companyA}: ${JSON.stringify(dataA)}
  ${companyB}: ${JSON.stringify(dataB)}
  
  Identify:
  1. Strategic Divergence: How do their current paths differ?
  2. Competitive Edge: What does one have that the other lacks?
  3. Market Positioning: Who are they targeting?
  
  Provide a sharp, professional analysis in Markdown format.`;

  try {
    const response = await generateWithSearchFallback({
      model: "gemini-3.1-pro-preview",
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }]
      },
    });

    return response.text;
  } catch (error) {
    console.error("Error fetching duel analysis:", error);
    return null;
  }
}

export async function fetchMarketForecast(allData: Record<string, CompanyData>) {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  
  const context = Object.entries(allData).map(([name, d]) => `${name}: ${d.focus}`).join('\n');
  
  const prompt = `Based on the current focus areas of the top 20+ PostgreSQL companies, synthesize a "PostgreSQL 2026 Market Outlook".
  
  Context:
  ${context}
  
  Identify the top 3 emerging trends, the biggest market shifts, and a "Wildcard" prediction.
  Provide the output in a structured Markdown format with clear headings.`;

  try {
    const response = await generateWithSearchFallback({
      model: "gemini-3.1-pro-preview",
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }]
      },
    });

    return response.text;
  } catch (error) {
    console.error("Error fetching market forecast:", error);
    return null;
  }
}
