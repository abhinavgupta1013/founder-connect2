import os 
import sys
import json
import requests 
from bs4 import BeautifulSoup 
  
# --- CONFIGURATION --- 
SERPAPI_API_KEY = os.environ.get('SERPAPI_API_KEY', 'bbda309a8354ab544f486db9291b5ddc8e166eeb9da7cdf327c47d26671dcc22')
  
# --- HELPER FUNCTIONS (Search and Scrape) --- 
def serpapi_search(query, num_results=5): 
    try: 
        params = {
            "engine": "google",
            "q": query,
            "api_key": SERPAPI_API_KEY,
            "num": num_results
        }
        
        response = requests.get("https://serpapi.com/search", params=params)
        data = response.json()
        
        if "error" in data:
            print(json.dumps({"error": f"SerpAPI error: {data['error']}"}))
            return []
            
        organic_results = data.get("organic_results", [])
        results = [{'link': item.get('link', ''), 
                   'snippet': item.get('snippet', ''),
                   'title': item.get('title', '')} 
                  for item in organic_results]
        return results
    except Exception as e: 
        print(json.dumps({"error": f"An error occurred during search: {str(e)}"}))
        return [] 
  
def scrape_url_content(url, max_chars=3000): 
    try: 
        headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'} 
        response = requests.get(url, headers=headers, timeout=10) 
        
        if response.status_code != 200: 
            return f"Failed to retrieve content (Status code: {response.status_code})" 
            
        soup = BeautifulSoup(response.text, 'html.parser') 
        
        # Remove script and style elements 
        for script in soup(["script", "style"]): 
            script.extract() 
            
        # Get text and clean it up 
        text = soup.get_text(separator=' ', strip=True) 
        
        # Truncate if too long 
        if len(text) > max_chars: 
            text = text[:max_chars] + "... [content truncated]" 
            
        return text 
    except Exception as e: 
        return f"Error scraping content: {str(e)}" 
  
# --- THE "BRAIN" FOR RECOMMENDATIONS --- 
def get_recommendations_from_web(user_query): 
    """ 
    This function orchestrates the entire Search-and-Recommend process. 
    """ 
    try:
        # 1. Search using SerpAPI
        search_results = serpapi_search(user_query) 
        if not search_results: 
            print(json.dumps({"error": "No search results found"}))
            return
    
        # 2. Scrape content from top results 
        results_with_content = []
        for result in search_results: 
            content = scrape_url_content(result['link'])
            result['content'] = content
            results_with_content.append(result)
    
        # 3. Format the results in a structured way
        formatted_results = format_investor_results(results_with_content, user_query)
        # Only print the JSON response, no other output
        print(json.dumps({"result": formatted_results}))
        return
    except Exception as e:
        print(json.dumps({"error": f"Error processing request: {str(e)}"}))

def format_investor_results(results, query):
    """
    Format the search results into a structured recommendation report
    """
    try:
        # Extract key information from results
        investors = []
        for result in results:
            title = result.get('title', '')
            snippet = result.get('snippet', '')
            content = result.get('content', '')
            source = result.get('link', '')
            
            # Add this result as a source
            investors.append({
                'name': title,
                'description': snippet,
                'source': source,
                'details': content[:300] + "..." if len(content) > 300 else content
            })
        
        # Create a structured report - don't print anything here
        report = f"""
# Investment Opportunities Research

Based on your search for "{query}", here's what I found:

## Top Investment Firms

"""
        
        # Add investor information
        for i, investor in enumerate(investors[:3], 1):
            report += f"### {i}. {investor['name']}\n"
            report += f"{investor['description']}\n"
            report += f"Source: {investor['source']}\n\n"
        
        # Add actionable next steps
        report += """
## Actionable Next Steps

1. **Research Further** - Visit the websites of these investment firms to learn more about their portfolio and investment criteria
2. **Prepare Your Pitch** - Tailor your pitch to match the investment focus of each firm
3. **Make Connections** - Look for mutual connections on LinkedIn who might introduce you
4. **Attend Events** - Check if these investors are speaking at upcoming industry events
5. **Follow Up** - After initial contact, follow up within 1-2 weeks

"""
        
        return report
    except Exception as e:
        print(json.dumps({"error": f"Error formatting results: {str(e)}"}))
        return None

# --- ROUTER FUNCTION --- 
def needs_web_search(query): 
    """ 
    Determines if a query requires web search. 
    """ 
    # Keywords that suggest a need for web search 
    web_search_keywords = [ 
        "find", "search", "look up", "discover", "locate", 
        "identify", "recommend", "suggest", "latest", 
        "recent", "news", "trends", "investors", "companies", 
        "startups", "who is", "what is", "where is", "when is", 
        "how to", "best", "top", "popular", "review" 
    ] 
    
    query_lower = query.lower() 
    
    # Check if any web search keywords are in the query 
    for keyword in web_search_keywords: 
        if keyword in query_lower: 
            return True 
            
    return False 

# Command-line interface
if __name__ == "__main__":
    if len(sys.argv) > 1:
        query = " ".join(sys.argv[1:])
        get_recommendations_from_web(query)
    else:
        print(json.dumps({"error": "No query provided"}))