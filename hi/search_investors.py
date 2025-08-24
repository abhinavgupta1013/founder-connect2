import sys
from services.web_search_recommendations import get_recommendations_from_web

def main():
    # Default query if none provided
    query = "Find top tech startup investors in Silicon Valley"
    
    # Use command line argument if provided
    if len(sys.argv) > 1:
        query = " ".join(sys.argv[1:])
    
    print(f"Searching for: {query}\n")
    
    # Get recommendations
    result = get_recommendations_from_web(query)
    
    # Print the result
    print(result)

if __name__ == "__main__":
    main()