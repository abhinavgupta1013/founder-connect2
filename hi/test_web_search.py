#!/usr/bin/env python
"""
Simple CLI interface to test the web search and recommendation system.
"""
import os
import sys
from services.web_search_recommendations import needs_web_search, get_recommendations_from_web

def main():
    """Main CLI function to test the web search and recommendation system."""
    print("=" * 80)
    print("Business Analyst Web Search & Recommendation System")
    print("=" * 80)
    print("Type 'exit' to quit.")
    print("Example queries:")
    print("  - Find investors for AI startups")
    print("  - What are the latest trends in fintech?")
    print("  - How to approach venture capital firms")
    print("=" * 80)
    
    while True:
        user_input = input("\nYour query: ")
        if user_input.lower() in ['exit', 'quit', 'q']:
            print("Goodbye!")
            break
            
        if not user_input.strip():
            print("Please enter a query.")
            continue
            
        if needs_web_search(user_input):
            print("\n🔍 Processing your query. This may take a moment...\n")
            response = get_recommendations_from_web(user_input)
            print("\n" + "=" * 80)
            print("RECOMMENDATION REPORT")
            print("=" * 80)
            print(response)
            print("=" * 80)
        else:
            print("\nThis query doesn't seem to need web search. Try adding keywords like 'find', 'latest', or 'how to'.")

if __name__ == "__main__":
    # Check if API keys are set
    required_keys = ['GOOGLE_API_KEY', 'SEARCH_ENGINE_ID', 'OPENROUTER_API_KEY']
    missing_keys = [key for key in required_keys if not os.environ.get(key) or os.environ.get(key) == 'YOUR_' + key]
    
    if missing_keys:
        print("Error: The following environment variables need to be set:")
        for key in missing_keys:
            print(f"  - {key}")
        print("\nYou can set them in your terminal before running this script:")
        print("  Windows: set KEY=value")
        print("  Linux/Mac: export KEY=value")
        sys.exit(1)
        
    main()