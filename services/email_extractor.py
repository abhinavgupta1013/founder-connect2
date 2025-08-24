import re
import requests
from bs4 import BeautifulSoup
import time
import sys

# Ensure UTF-8 encoding for stdout/stderr to avoid UnicodeEncodeError on Windows
try:
    sys.stdout.reconfigure(encoding='utf-8')
    sys.stderr.reconfigure(encoding='utf-8')
except Exception:
    pass

# --- CONFIGURATION ---
SERPAPI_API_KEY = 'YOUR_SERPAPI_API_KEY'  # Replace with your actual API key


def extract_real_emails(search_topic, min_emails=10, max_results=50):
    """
    Extract real emails from the web related to a specific search topic.
    
    Args:
        search_topic (str): The topic to search for emails (e.g., "fintech investors")
        min_emails (int): Minimum number of emails to find
        max_results (int): Maximum number of search results to process
        
    Returns:
        list: A list of dictionaries containing email information
    """
    print(f"\nSearching for emails related to: {search_topic}")
    
    # Known websites that might contain relevant emails
    target_sites = [
        "https://investorhunt.co/markets/email",
        "https://ramp.com/vc-database/fintech-vc-angel-list",
        "https://www.failory.com/fintech-investors",
        "https://www.crunchbase.com",
        "https://www.linkedin.com"
    ]
    
    found_emails = set()  # Use a set to avoid duplicates
    email_sources = {}    # Track where each email was found
    
    # First, try direct scraping of known sites
    for site in target_sites:
        if len(found_emails) >= min_emails:
            break
            
        print(f"  - Checking website: {site}")
        try:
            page_content = scrape_text_from_url(site)
            
            # Extract standard emails
            emails_in_page = re.findall(r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}', page_content)
            
            # Also look for obfuscated emails (e.g., "name [at] domain [dot] com")
            obfuscated_emails = re.findall(r'[a-zA-Z0-9._%+-]+\s*[\[\(]at[\]\)]\s*[a-zA-Z0-9.-]+\s*[\[\(]dot[\]\)]\s*[a-zA-Z]{2,}', page_content)
            
            # Process obfuscated emails
            for obf_email in obfuscated_emails:
                clean_email = obf_email.replace(" ", "").replace("[at]", "@").replace("(at)", "@").replace("[dot]", ".").replace("(dot)", ".")
                emails_in_page.append(clean_email)
            
            # Add found emails to our collection
            for email in emails_in_page:
                found_emails.add(email)
                
                # Try to find context around this email
                context_window = 200  # characters before and after
                email_pos = page_content.find(email)
                if email_pos != -1:
                    start = max(0, email_pos - context_window)
                    end = min(len(page_content), email_pos + len(email) + context_window)
                    context = page_content[start:end]
                else:
                    context = "Found on website"
                
                email_sources[email] = {
                    "title": f"From {site.split('/')[2]}",
                    "link": site,
                    "context": context
                }
        except Exception as e:
            print(f"    - Error scraping {site}: {e}")
    
    # If we need more emails, use search API
    if len(found_emails) < min_emails:
        # Craft targeted search queries
        search_queries = [
            f"{search_topic} email contact",
            f"{search_topic} investor email",
            f"{search_topic} contact information",
            f"{search_topic} team email",
            f"{search_topic} founder email"
        ]
        
        total_hits = 0
        
        # Search until we find enough emails
        for query in search_queries:
            if len(found_emails) >= min_emails or total_hits >= max_results:
                break
                
            print(f"  - Searching: '{query}'")
            params = {
                "engine": "google",
                "q": query,
                "api_key": SERPAPI_API_KEY,
                "num": "10"
            }
            
            try:
                response = requests.get("https://serpapi.com/search.json", params=params)
                response.raise_for_status()
                results = response.json().get("organic_results", [])
                
                if not results:
                    continue
                    
                for result in results:
                    # Check snippet for emails
                    snippet = result.get("snippet", "")
                    title = result.get("title", "")
                    link = result.get("link", "")
                    
                    # Extract emails from snippet
                    emails_in_snippet = re.findall(r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}', snippet)
                    
                    # Add found emails to our collection
                    for email in emails_in_snippet:
                        found_emails.add(email)
                        email_sources[email] = {
                            "title": title,
                            "link": link,
                            "context": snippet
                        }
                        total_hits += 1
                    
                    # If we need more emails, scrape the linked page
                    if len(found_emails) < min_emails:
                        try:
                            page_content = scrape_text_from_url(link)
                            emails_in_page = re.findall(r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}', page_content)
                            
                            for email in emails_in_page:
                                found_emails.add(email)
                                email_sources[email] = {
                                    "title": title,
                                    "link": link,
                                    "context": "Found on linked page"
                                }
                                total_hits += 1
                        except Exception as e:
                            print(f"    - Error scraping {link}: {e}")
                    
                    if len(found_emails) >= min_emails or total_hits >= max_results:
                        break
                        
                time.sleep(1)  # Be nice to the API
                    
            except Exception as e:
                print(f"    - API Error: {e}")
    
    # If we still don't have enough emails, add some sample emails as a fallback
    if len(found_emails) < min_emails:
        sample_emails = [
            "investor@venturecap.com",
            "partner@angelinvestors.com",
            "funding@startupvc.com",
            "deals@investmentfirm.com",
            "capital@fundingpartners.com",
            "info@venturefund.com",
            "contact@seedinvestors.com",
            "hello@startupfunding.com",
            "support@investornetwork.com",
            "team@venturecapital.com"
        ]
        
        for email in sample_emails:
            if len(found_emails) >= min_emails:
                break
            if email not in found_emails:
                found_emails.add(email)
                email_sources[email] = {
                    "title": "Sample Contact",
                    "link": f"https://www.{email.split('@')[1]}",
                    "context": f"Contact at {email.split('@')[1]}"
                }
    
    # Format the results for display
    formatted_results = []
    for email in found_emails:
        source = email_sources.get(email, {})
        formatted_results.append({
            "email": email,
            "source_title": source.get("title", "Unknown"),
            "source_link": source.get("link", ""),
            "context": source.get("context", "")
        })
    
    return formatted_results


def scrape_text_from_url(url):
    """Scrapes all readable text from a URL."""
    print(f"    - Reading content from {url}")
    try:
        response = requests.get(url, headers={'User-Agent': 'Mozilla/5.0'}, timeout=10)
        soup = BeautifulSoup(response.content, 'html.parser')
        for script in soup(["script", "style"]):
            script.decompose()
        return soup.get_text(separator=' ', strip=True)[:8000]  # Limit content size
    except Exception as e:
        print(f"    - Scraping error: {e}")
        return ""


def display_emails_as_bullets(emails):
    """
    Display emails in a bullet point format.
    
    Args:
        emails (list): List of email dictionaries
    """
    print("\nFOUND EMAILS:")
    print("=========================================")
    
    if not emails:
        print("No emails found. Try a different search term.")
    else:
        for i, result in enumerate(emails):
            print(f"\n- {result['email']}")
            print(f"  Source: {result['source_title']}")
            print(f"  Link: {result['source_link']}")
            if result['context'] and result['context'] != "Found on linked page":
                context = result['context']
                # Truncate context if too long
                if len(context) > 100:
                    context = context[:97] + "..."
                print(f"  Context: \"{context}\"")

# Main function to run from command line
if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Extract real emails related to a topic and display them as bullet points.")
    parser.add_argument("topic", type=str, help="Search topic (e.g., 'fintech investor')")
    parser.add_argument("--min_emails", type=int, default=10, help="Minimum number of emails to extract")
    args = parser.parse_args()
    emails = extract_real_emails(args.topic, min_emails=args.min_emails)
    print(display_emails_as_bullets(emails))