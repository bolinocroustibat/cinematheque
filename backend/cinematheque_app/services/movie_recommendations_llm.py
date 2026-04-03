"""Gemini-backed JSON completion for movie recommendations.

Swap or extend this module for another provider without changing HTTP handlers
or prompt text in ``movies_recommendations``. Key is read from ``LLM_API_KEY``.
"""

import logging
import os
from typing import TypedDict

from google import genai
from google.genai import types

logger = logging.getLogger(__name__)

MODEL_NAME = "gemini-1.5-pro-latest"


class GeminiGenerationParams(TypedDict):
    """Generation knobs for the Gemini call (intent for cross-provider parity)."""

    temperature: float
    top_k: float
    top_p: float
    max_output_tokens: int


DEFAULT_GENERATION: GeminiGenerationParams = {
    "temperature": 0.9,
    "top_k": 1,
    "top_p": 1.0,
    "max_output_tokens": 2048,
}


class MovieRecommendationsLLMError(Exception):
    """Provider failure; ``http_status`` is mapped to ``HttpError`` in the API layer."""

    def __init__(self, message: str, *, http_status: int) -> None:
        super().__init__(message)
        self.http_status = http_status


def generate_recommendations_json(user_prompt: str, *, system_instruction: str) -> str:
    """Call Gemini and return raw JSON text from the model."""
    api_key = os.getenv("LLM_API_KEY")
    if not api_key:
        raise MovieRecommendationsLLMError(
            "Movie recommendations are unavailable: LLM_API_KEY is not configured.",
            http_status=503,
        )

    gen = DEFAULT_GENERATION
    client = genai.Client(api_key=api_key)
    config = types.GenerateContentConfig(
        temperature=gen["temperature"],
        top_k=gen["top_k"],
        top_p=gen["top_p"],
        max_output_tokens=gen["max_output_tokens"],
        response_mime_type="application/json",
        system_instruction=system_instruction,
    )

    try:
        response = client.models.generate_content(
            model=MODEL_NAME,
            contents=user_prompt,
            config=config,
        )
    except Exception as e:
        logger.exception("Gemini generate_content failed")
        raise MovieRecommendationsLLMError(
            f"Recommendation service error: {e}",
            http_status=502,
        ) from e

    if response.prompt_feedback and response.prompt_feedback.block_reason:
        br = response.prompt_feedback.block_reason
        raise MovieRecommendationsLLMError(
            f"Request blocked: {br}",
            http_status=400,
        )

    text = response.text
    if not text:
        raise MovieRecommendationsLLMError(
            "No response from recommendation model.",
            http_status=502,
        )

    return text
