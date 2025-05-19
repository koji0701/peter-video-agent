from pydantic_ai import Agent, RunContext
from pydantic_ai.models.gemini import GeminiModel
from pydantic_ai.providers.google_gla import GoogleGlAProvider
from dotenv import load_dotenv
import os

load_dotenv()

model = GeminiModel(
    'gemini-2.0-flash', 
    provider=GoogleGlAProvider(api_key=os.getenv('GOOGLE_API_KEY'))
    
)

agent = Agent(model)


