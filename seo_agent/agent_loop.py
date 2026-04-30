"""
Core agentic loop — shared by all agents.
Handles tool use, message threading, and retry logic.
"""
from __future__ import annotations

import time
from typing import Any

import anthropic

import config
import tools as tool_registry


def run_agent(
    system: str,
    user_message: str,
    model: str,
    max_tokens: int = 8192,
    max_iterations: int = 20,
    extra_tools: list = None,
    verbose: bool = True,
) -> str:
    """
    Run a Claude agent with tool use until it produces a final text response.

    Returns the final text output from the agent.
    """
    client = anthropic.Anthropic(api_key=config.ANTHROPIC_API_KEY)

    tool_schemas = tool_registry.TOOL_SCHEMAS
    if extra_tools:
        tool_schemas = tool_schemas + extra_tools

    messages: list[dict] = [{"role": "user", "content": user_message}]

    for iteration in range(max_iterations):
        if verbose:
            print(f"  [agent loop] iteration {iteration + 1}/{max_iterations}")

        response = client.messages.create(
            model=model,
            system=system,
            messages=messages,
            tools=tool_schemas,
            max_tokens=max_tokens,
        )

        if verbose:
            print(f"  [agent loop] stop_reason={response.stop_reason}")

        # ── Agent finished ─────────────────────────────────────────────────────
        if response.stop_reason == "end_turn":
            text_parts = [
                block.text
                for block in response.content
                if hasattr(block, "text")
            ]
            return "\n".join(text_parts).strip()

        # ── Agent wants to call tools ──────────────────────────────────────────
        if response.stop_reason == "tool_use":
            tool_results = []
            for block in response.content:
                if block.type == "tool_use":
                    if verbose:
                        print(f"  [tool call] {block.name}({list(block.input.keys())})")
                    result = tool_registry.execute_tool(block.name, block.input)
                    if verbose:
                        preview = result[:200].replace("\n", " ")
                        print(f"  [tool result] {preview}…")
                    tool_results.append(
                        {
                            "type": "tool_result",
                            "tool_use_id": block.id,
                            "content": result,
                        }
                    )

            # Append assistant turn + tool results
            messages.append({"role": "assistant", "content": response.content})
            messages.append({"role": "user", "content": tool_results})
            continue

        # ── Unexpected stop reason ─────────────────────────────────────────────
        if verbose:
            print(f"  [agent loop] unexpected stop_reason: {response.stop_reason}")
        break

    # If we exhausted iterations, return whatever text we have
    text_parts = [
        block.text
        for block in response.content
        if hasattr(block, "text")
    ]
    return "\n".join(text_parts).strip()
