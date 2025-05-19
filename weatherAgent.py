from __future__ import annotations as _annotations

import asyncio
import os
import urllib.parse
from dataclasses import dataclass
from typing import Any

import logfire
from devtools import debug
from httpx import AsyncClient
from pydantic_ai.models.gemini import GeminiModel
from pydantic_ai.providers.google_gla import GoogleGLAProvider
from pydantic_ai import Agent, ModelRetry, RunContext
from dotenv import load_dotenv

load_dotenv()

# 'if-token-present' means nothing will be sent (and the example will work) if you don't have logfire configured
logfire.configure(send_to_logfire='if-token-present')
logfire.instrument_pydantic_ai()



@dataclass
class Deps:
    client: AsyncClient
    weather_api_key: str | None


model = GeminiModel(
    'gemini-2.0-flash', 
    provider=GoogleGLAProvider(api_key=os.getenv('GOOGLE_API_KEY')),    
)

weather_agent = Agent(
    model,
    instructions=(
        "Reply in one sentence to tell the user about the weather and a recommendation on what to wear",
        "Use the `get_weather` tool to get the weather",
    ),
    deps_type=Deps,
    retries=2,
)



@weather_agent.tool
async def get_weather(ctx: RunContext[Deps]) -> dict[str, Any]:
    """Get the weather

    Args:
        ctx: The context.

    """
    if ctx.deps.weather_api_key is None:
        # if no API key is provided, return a dummy response
        return {'temperature': '21 °C', 'description': 'Sunny'}
    lat = 37.7644
    lng = 121.9540
    params = {
        'apikey': ctx.deps.weather_api_key,
        'location': f'{lat},{lng}',
        'units': 'metric',
    }
    with logfire.span('calling weather API', params=params) as span:
        r = await ctx.deps.client.get(
            'https://api.tomorrow.io/v4/weather/realtime', params=params
        )
        r.raise_for_status()
        data = r.json()
        span.set_attribute('response', data)

    values = data['data']['values']
    # https://docs.tomorrow.io/reference/data-layers-weather-codes
    code_lookup = {
        1000: 'Clear, Sunny',
        1100: 'Mostly Clear',
        1101: 'Partly Cloudy',
        1102: 'Mostly Cloudy',
        1001: 'Cloudy',
        2000: 'Fog',
        2100: 'Light Fog',
        4000: 'Drizzle',
        4001: 'Rain',
        4200: 'Light Rain',
        4201: 'Heavy Rain',
        5000: 'Snow',
        5001: 'Flurries',
        5100: 'Light Snow',
        5101: 'Heavy Snow',
        6000: 'Freezing Drizzle',
        6001: 'Freezing Rain',
        6200: 'Light Freezing Rain',
        6201: 'Heavy Freezing Rain',
        7000: 'Ice Pellets',
        7101: 'Heavy Ice Pellets',
        7102: 'Light Ice Pellets',
        8000: 'Thunderstorm',
    }
    return {
        'temperature': f'{values["temperatureApparent"]:0.0f}°C',
        'description': code_lookup.get(values['weatherCode'], 'Unknown'),
    }


async def main():
    async with AsyncClient() as client:
        logfire.instrument_httpx(client, capture_all=True)
        # create a free API key at https://www.tomorrow.io/weather-api/
        weather_api_key = os.getenv('WEATHER_API_KEY')
        # create a free API key at https://www.mapbox.com/
        deps = Deps(
            client=client, weather_api_key=weather_api_key
        )
        result = await weather_agent.run(
            'What is the weather like?', deps=deps
        )
        debug(result)
        print('Response:', result.output)


if __name__ == '__main__':
    asyncio.run(main())

