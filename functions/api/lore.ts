import { Env, jsonResponse, errorResponse } from './_shared';

interface LoreRequest {
  run_id: string;
  events_summary?: string;
  seed: number;
  stats?: {
    peak_population: number;
    total_births: number;
    total_deaths: number;
    extinction_tick?: number;
    final_tick: number;
  };
}

const LORE_PROMPT = `You are a mythic chronicler documenting the rise and fall of civilizations in a procedurally generated world.

Given the following simulation data, write a short dramatic narrative (2-3 paragraphs) describing the fate of this world. 
Use evocative, epic language. Reference specific events when possible. The world is identified by its seed number.

Simulation Data:
- World Seed: {{seed}}
- Peak Population: {{peak_population}}
- Total Births: {{total_births}}
- Total Deaths: {{total_deaths}}
- Final Tick: {{final_tick}}
{{extinction_line}}
{{events_summary}}

Write the chronicle:`;

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  if (request.method !== 'POST') {
    return errorResponse('Method not allowed', 405);
  }

  try {
    const body = (await request.json()) as LoreRequest;

    if (!body.run_id || typeof body.seed !== 'number') {
      return errorResponse('run_id and seed are required');
    }

    // Build the prompt
    let prompt = LORE_PROMPT
      .replace('{{seed}}', String(body.seed))
      .replace('{{peak_population}}', String(body.stats?.peak_population ?? 0))
      .replace('{{total_births}}', String(body.stats?.total_births ?? 0))
      .replace('{{total_deaths}}', String(body.stats?.total_deaths ?? 0))
      .replace('{{final_tick}}', String(body.stats?.final_tick ?? 0));

    if (body.stats?.extinction_tick) {
      prompt = prompt.replace(
        '{{extinction_line}}',
        `- Extinction Occurred at Tick: ${body.stats.extinction_tick}`
      );
    } else {
      prompt = prompt.replace('{{extinction_line}}', '- The population survives');
    }

    if (body.events_summary) {
      prompt = prompt.replace(
        '{{events_summary}}',
        `\nNotable Events:\n${body.events_summary}`
      );
    } else {
      prompt = prompt.replace('{{events_summary}}', '');
    }

    // Call Workers AI
    const response = await env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
      prompt,
      max_tokens: 512,
    });

    const lore = typeof response === 'object' && 'response' in response 
      ? (response as { response: string }).response 
      : String(response);

    return jsonResponse({ lore, run_id: body.run_id });
  } catch (err) {
    return errorResponse(`Failed to generate lore: ${err}`, 500);
  }
};
