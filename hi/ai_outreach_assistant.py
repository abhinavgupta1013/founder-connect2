import sys
import re
import json
import requests
import os
from openai import OpenAI

# --- CONFIGURATION ---
SERPAPI_API_KEY = os.environ.get('SERPAPI_API_KEY', 'YOUR_SERPAPI_API_KEY')
OPENROUTER_API_KEY = os.environ.get('OPENROUTER_API_KEY', 'YOUR_OPENROUTER_API_KEY')

# --- Initialize Clients ---
openrouter_client = OpenAI(
  base_url="https://openrouter.ai/api/v1",
  api_key=OPENROUTER_API_KEY,
)

# --- HELPER FUNCTIONS ---

def find_emails_for_query(topic, max_emails=10):
    print(f"🚀 Starting search for '{topic}'...")
    
    # Validate API key
    if not SERPAPI_API_KEY or SERPAPI_API_KEY == 'YOUR_SERPAPI_API_KEY':
        print("    - Error: SERPAPI_API_KEY is not configured")
        # Return sample emails for testing
        return [
            "investor@venturecap.com",
            "funding@startupvc.com",
            "info@venturefund.com",
            "deals@investmentfirm.com",
            "team@venturecapital.com"
        ][:max_emails]
    
    found_emails = set()
    search_queries = [f'"{topic}" contact email', f'"{topic}" startup founder email "@"']
    
    for query in search_queries:
        params = {"engine": "google", "q": query, "api_key": SERPAPI_API_KEY}
        try:
            print(f"    - Searching with query: {query}")
            response = requests.get("https://serpapi.com/search.json", params=params)
            response.raise_for_status()
            results = response.json().get("organic_results", [])
            print(f"    - Found {len(results)} search results")
            
            for result in results:
                snippet = result.get("snippet", "")
                emails_in_snippet = re.findall(r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}', snippet)
                if emails_in_snippet:
                    found_emails.update(emails_in_snippet)
        except Exception as e:
            print(f"    - API Error: {e}")
    
    # If no emails found, provide sample data
    if not found_emails:
        print("    - No emails found, using sample data")
        sample_emails = [
            "investor@venturecap.com",
            "funding@startupvc.com",
            "info@venturefund.com",
            "deals@investmentfirm.com",
            "team@venturecapital.com"
        ][:max_emails]
        return sample_emails
    
    email_list = list(found_emails)[:max_emails]
    print(f"✅ Search complete. Found {len(email_list)} emails.")
    return email_list

def draft_intro_email_with_ai(topic, project_summary):
    print("🤖 AI is drafting the intro email...")
    
    # Validate API key
    if not OPENROUTER_API_KEY or OPENROUTER_API_KEY == 'YOUR_OPENROUTER_API_KEY':
        print("    - Error: OPENROUTER_API_KEY is not configured")
        return "Sample email body for testing. Please configure OPENROUTER_API_KEY for production use."
    
    prompt = f"""
    You are a professional business communication assistant. Write a concise and compelling cold outreach email to a potential contact in the '{topic}' space.
    The email should be based on the following project summary: "{project_summary}"
    Keep the email under 150 words and end with a clear call to action. Return ONLY the raw text of the email body.
    """
    
    try:
        completion = openrouter_client.chat.completions.create(
            model="anthropic/claude-3-haiku",
            messages=[{"role": "user", "content": prompt}],
        )
        email_content = completion.choices[0].message.content
        print(f"    - Successfully generated email content ({len(email_content)} chars)")
        return email_content
    except Exception as e:
        print(f"    - AI drafting error: {e}")
        # Return fallback content instead of None to prevent errors
        return f"Hello,\n\nI'm reaching out regarding our work in {topic}. {project_summary}\n\nWould you be available for a brief call to discuss potential collaboration?\n\nBest regards,\n[Your Name]"

# --- COMMAND LINE INTERFACE ---

def handle_search(query):
    """Handle search command from Node.js"""
    if not query:
        return json.dumps({"error": "Query is missing"})
    
    emails = find_emails_for_query(query)
    return json.dumps({"emails": emails})

def handle_draft(query, project_summary):
    """Handle draft command from Node.js"""
    if not query or not project_summary:
        return json.dumps({"error": "Missing required data"})

    try:
        email_body = draft_intro_email_with_ai(query, project_summary)
        # Always return a valid email body, even if it's a fallback template
        return json.dumps({"email_body": email_body})
    except Exception as e:
        print(f"Error in handle_draft: {e}")
        # Return a fallback template
        fallback_email = f"Hello,\n\nI'm reaching out regarding our work in {query}. {project_summary}\n\nWould you be available for a brief call to discuss potential collaboration?\n\nBest regards,\n[Your Name]"
        return json.dumps({"email_body": fallback_email})

if __name__ == '__main__':
    # Command-line interface for Node.js integration
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No command provided"}))
        sys.exit(1)
    
    command = sys.argv[1]
    
    if command == "search" and len(sys.argv) >= 3:
        query = sys.argv[2]
        print(handle_search(query))
    
    elif command == "draft" and len(sys.argv) >= 4:
        query = sys.argv[2]
        project_summary = sys.argv[3]
        print(handle_draft(query, project_summary))
    
    else:
        print(json.dumps({"error": "Invalid command or missing arguments"}))
        sys.exit(1)