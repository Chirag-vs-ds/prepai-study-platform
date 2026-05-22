import os
import sys

# Add current directory to path
current_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, current_dir)

print("--- DIAGNOSTIC SCRIPT START ---")
print(f"Current Working Directory: {os.getcwd()}")
print(f"Environment GEMINI_API_KEY: '{os.environ.get('GEMINI_API_KEY')}'")

# Check if .env file exists and print its contents
env_path = os.path.join(current_dir, ".env")
print(f".env file path: '{env_path}'")
print(f".env file exists: {os.path.exists(env_path)}")
if os.path.exists(env_path):
    with open(env_path, "r", encoding="utf-8") as f:
        print("--- .env file contents ---")
        print(f.read())
        print("--------------------------")

# Try to import services.ai_service and check its path
try:
    import services.ai_service
    print(f"Imported ai_service successfully from: {services.ai_service.__file__}")
    
    # Initialize service
    ai = services.ai_service.AIService()
    print(f"AIService.api_key: '{ai.api_key}'")
    print(f"AIService.is_configured: {ai.is_configured}")
except Exception as e:
    print(f"Error importing ai_service: {e}")

print("--- DIAGNOSTIC SCRIPT END ---")
