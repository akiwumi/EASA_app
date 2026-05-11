-- Repair stale AI provider rows created with Claude defaults.
-- The app default is OpenAI/ChatGPT.

update ai_provider_config
set
  provider = 'openai',
  model = 'gpt-4o',
  updated_at = now()
where provider = 'anthropic'
  or model = 'claude-sonnet-4-20250514';
