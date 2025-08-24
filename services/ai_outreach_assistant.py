from flask import Flask, request, jsonify
from flask_cors import CORS
import re
import time
import requests
from openai import OpenAI
import os
import sys
import json

# --- CONFIGURATION ---
SERPAPI_API_KEY = os.environ.get('SERPAPI_API_KEY', 'YOUR_SERPAPI_API_KEY')
OPENROUTER_API_KEY = os.environ.get('OPENROUTER_API_KEY', 'YOUR_OPENROUTER_API_KEY')
EMAIL_API_ENDPOINT = 'http://localhost:3000/api/web-search/send-intro-email'  # Node.js service endpoint

# --- Initialize App and Clients ---
app = Flask(__name__)
CORS(app)
openrouter_client = OpenAI(
  base_url="https://openrouter.ai/api/v1",
  api_key=OPENROUTER_API_KEY,
)

# --- HELPER FUNCTIONS ---

def find_emails_for_query(topic, max_emails=10):
    print(f"🚀 Starting search for '{topic}'...")
    found_emails = set()
    search_queries = [f'"{topic}" contact email', f'"{topic}" startup founder email "@"']
    for query in search_queries:
        params = {"engine": "google", "q": query, "api_key": SERPAPI_API_KEY}
        try:
            response = requests.get("https://serpapi.com/search.json", params=params)
            response.raise_for_status()
            results = response.json().get("organic_results", [])
            for result in results:
                snippet = result.get("snippet", "")
                emails_in_snippet = re.findall(r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}', snippet)
                if emails_in_snippet:
                    found_emails.update(emails_in_snippet)
        except Exception as e:
            print(f"    - API Error: {e}")
    print(f"✅ Search complete. Found {len(found_emails)} emails.")
    return list(found_emails)

def draft_intro_email_with_ai(topic, project_summary):
    print("🤖 AI is drafting the intro email...")
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
        return completion.choices[0].message.content
    except Exception as e:
        print(f"    - AI drafting error: {e}")
        return None

def send_email_via_api(email_address, subject, body, from_name, from_email):
    payload = {
        'toEmails': [email_address],
        'fromName': from_name,
        'fromEmail': from_email,
        'businessContext': body
    }
    try:
        response = requests.post(EMAIL_API_ENDPOINT, json=payload)
        return response.status_code == 200
    except Exception as e:
        print(f"    - Sending error: {e}")
        return False

# --- API ENDPOINT 1: SEARCH FOR EMAILS ---
@app.route('/api/search', methods=['POST'])
def handle_search():
    data = request.get_json()
    query = data.get('query')
    if not query:
        return jsonify({"error": "Query is missing"}), 400
    
    emails = find_emails_for_query(query)
    return jsonify({"emails": emails})

# --- API ENDPOINT 2: DRAFT AND SEND INTROS ---
@app.route('/api/send-intro', methods=['POST'])
def handle_send_intro():
    data = request.get_json()
    emails = data.get('emails')
    query = data.get('query')
    project_summary = data.get('project_summary')
    from_name = data.get('fromName')
    from_email = data.get('fromEmail')

    if not all([emails, query, project_summary, from_name, from_email]):
        return jsonify({"error": "Missing required data"}), 400

    intro_body = draft_intro_email_with_ai(query, project_summary)
    if not intro_body:
        return jsonify({"error": "Failed to draft the email."}), 500
    
    print(f"📬 Preparing to send intros to {len(emails)} emails...")
    subject = f"Introduction & Inquiry: {query}"
    sent_count = 0
    for email in emails:
        if send_email_via_api(email, subject, intro_body, from_name, from_email):
            sent_count += 1
            print(f"    - Intro sent successfully to {email}")
        else:
            print(f"    - Failed to send intro to {email}")

    report = {"message": f"Process complete. Successfully sent introductions to {sent_count} of {len(emails)} contacts."}
    return jsonify(report)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)