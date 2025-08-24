import sys
import json
from services.web_search_recommendations import get_recommendations_from_web, needs_web_search

def main():
    # Test query for finding investors
    query = "Find top tech startup investors in Silicon Valley"
    
    print(f"Testing web search with query: '{query}'")
    
    # Check if query needs web search
    if needs_web_search(query):
        print("Query requires web search. Proceeding...")
        
        # Get recommendations
        result = get_recommendations_from_web(query)
        
        # Print the result
        print("\n--- SEARCH RESULTS ---\n")
        print(result)
    else:
        print("Query does not require web search.")

if __name__ == "__main__":
    main()