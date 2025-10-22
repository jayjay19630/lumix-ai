"""
Web search tool for educational resources and information
"""
from typing import Dict, Any, Optional, List
from strands import tool


@tool
async def web_search(
    query: str,
    search_type: str = "educational_resources",
    max_results: int = 5,
    filter_domains: Optional[List[str]] = None
) -> Dict[str, Any]:
    """
    Search the web for current educational resources, teaching strategies, and curriculum information.

    IMPORTANT: Use this tool to access up-to-date information beyond the knowledge cutoff:
    - Current curriculum standards and syllabi
    - Recent educational research and best practices
    - Teaching resources and lesson ideas
    - Exam formats and requirements

    Use this tool to:
    - Research curriculum standards (IGCSE, IB, Common Core, etc.)
    - Find teaching strategies and resources
    - Look up current exam formats
    - Discover educational tools and materials
    - Get up-to-date subject information

    Args:
        query: Search query (e.g., "IGCSE Mathematics quadratic equations syllabus")
        search_type: "educational_resources", "teaching_strategies", "current_events", or "general"
        max_results: Maximum number of results to return (1-10, default: 5)
        filter_domains: Optional - Whitelist specific domains (e.g., ["ibo.org", "cambridgeinternational.org"])

    Returns:
        Search results with titles, URLs, snippets, and relevance scores
    """
    try:
        # Validate inputs
        if max_results < 1 or max_results > 10:
            max_results = 5

        # Enhance query based on search type
        enhanced_query = query
        if search_type == "educational_resources":
            enhanced_query = f"{query} teaching resources lesson plans curriculum"
        elif search_type == "teaching_strategies":
            enhanced_query = f"{query} teaching strategies pedagogy best practices"
        elif search_type == "current_events":
            enhanced_query = f"{query} recent news education"

        # Use Tavily API for web search (or alternative)
        # Note: This requires TAVILY_API_KEY in environment
        import os

        tavily_api_key = os.getenv('TAVILY_API_KEY')

        if tavily_api_key:
            # Use Tavily for high-quality educational search
            results = await _tavily_search(enhanced_query, max_results, filter_domains)
        else:
            # Fallback to DuckDuckGo or basic search
            results = await _fallback_search(enhanced_query, max_results)

        # Filter and rank results
        filtered_results = []
        for result in results[:max_results]:
            # Add relevance scoring for educational content
            relevance_score = _calculate_relevance(result, query, search_type)

            filtered_results.append({
                "title": result.get('title', ''),
                "url": result.get('url', ''),
                "snippet": result.get('snippet', result.get('content', ''))[:300],
                "relevance_score": relevance_score,
                "domain": _extract_domain(result.get('url', ''))
            })

        # Sort by relevance
        filtered_results.sort(key=lambda x: x['relevance_score'], reverse=True)

        return {
            "success": True,
            "results": filtered_results,
            "count": len(filtered_results),
            "query": query,
            "search_type": search_type,
            "message": f"Found {len(filtered_results)} results for '{query}'"
        }

    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "results": [],
            "count": 0
        }


async def _tavily_search(query: str, max_results: int, filter_domains: Optional[List[str]] = None) -> List[Dict[str, Any]]:
    """Use Tavily API for high-quality search results"""
    try:
        from tavily import TavilyClient
        import os

        client = TavilyClient(api_key=os.getenv('TAVILY_API_KEY'))

        search_params = {
            "query": query,
            "max_results": max_results,
            "search_depth": "advanced",
            "include_domains": filter_domains if filter_domains else []
        }

        response = client.search(**search_params)

        results = []
        for item in response.get('results', []):
            results.append({
                "title": item.get('title'),
                "url": item.get('url'),
                "snippet": item.get('content'),
                "score": item.get('score', 0.5)
            })

        return results

    except Exception as e:
        print(f"Tavily search failed: {e}")
        return []


async def _fallback_search(query: str, max_results: int) -> List[Dict[str, Any]]:
    """Fallback search using DuckDuckGo"""
    try:
        from duckduckgo_search import DDGS

        ddgs = DDGS()
        results = []

        search_results = ddgs.text(query, max_results=max_results)

        for item in search_results:
            results.append({
                "title": item.get('title', ''),
                "url": item.get('href', item.get('link', '')),
                "snippet": item.get('body', item.get('snippet', '')),
                "score": 0.5
            })

        return results

    except Exception as e:
        print(f"DuckDuckGo search failed: {e}")
        # Return empty results if all search methods fail
        return []


def _calculate_relevance(result: Dict[str, Any], query: str, search_type: str) -> float:
    """Calculate relevance score for educational content"""
    score = result.get('score', 0.5)

    # Boost educational domains
    url = result.get('url', '').lower()
    educational_domains = [
        'edu', 'ac.uk', 'gov', 'ibo.org', 'cambridge', 'collegeboard',
        'khanacademy', 'teacherspayteachers', 'edutopia', 'nctm.org'
    ]

    for domain in educational_domains:
        if domain in url:
            score += 0.2
            break

    # Boost based on search type
    title = result.get('title', '').lower()
    snippet = result.get('snippet', '').lower()

    if search_type == "educational_resources":
        if any(word in title or word in snippet for word in ['lesson', 'curriculum', 'teaching', 'resource']):
            score += 0.1
    elif search_type == "teaching_strategies":
        if any(word in title or word in snippet for word in ['strategy', 'pedagogy', 'method', 'approach']):
            score += 0.1

    # Cap at 1.0
    return min(score, 1.0)


def _extract_domain(url: str) -> str:
    """Extract domain from URL"""
    try:
        from urllib.parse import urlparse
        parsed = urlparse(url)
        return parsed.netloc
    except:
        return url.split('/')[2] if len(url.split('/')) > 2 else url
