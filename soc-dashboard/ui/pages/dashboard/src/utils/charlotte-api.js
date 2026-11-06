/**
 * Charlotte AI Credits — calls charlotte-credits-fn Foundry Function.
 * Avoids CORS: the function runs server-side with context auth.
 * Falls back to workflow execution count estimate when Charlotte API is unavailable.
 */

export async function fetchCharlotteCredits(falcon) {
  if (!falcon) return null;

  try {
    const ym = new Date().toISOString().slice(0, 7); // e.g. "2026-10"
    console.log('[Charlotte API] Calling charlotte-credits-fn for month:', ym);

    const cf = falcon.cloudFunction({ name: 'charlotte-credits-fn' });
    const result = await cf.execute({
      method:  'POST',
      path:    '/execute',
      body:    { month: ym },
      params:  {}
    });

    // Detect empty object (function returned error Response with no body)
    if (!result || Object.keys(result).length === 0) {
      console.warn('[Charlotte API] Function returned empty/null response');
      return null;
    }

    console.log('[Charlotte API] raw result keys:', Object.keys(result));

    // Detect explicit error response: check both source field and error field
    if (result.source === 'error' || (typeof result.error === 'string' && !result.totalLimit)) {
      console.warn('[Charlotte API] Function returned error:', result.error || result.source);
      console.warn('[Charlotte API] debug base_url:', result._debug_base_url, 'url tried:', result._debug_url_tried);
      return null;
    }

    const { totalUsed = 0, totalLimit = 0, creditsRemaining = 0, percentage = 0, topUsers = [] } = result;

    // If both limit and used are 0, Charlotte API is unavailable and workflow estimate found nothing
    if (totalLimit === 0 && totalUsed === 0) {
      console.warn('[Charlotte API] 0/0 result — Charlotte API unavailable, no workflow estimate data');
      if (result._debug_executions !== undefined) console.warn('[Charlotte API] workflow executions found:', result._debug_executions);
      if (result._debug_base_url) console.warn('[Charlotte API] debug base_url:', result._debug_base_url);
      return null;
    }

    console.log('[Charlotte API] ✅ source:', result.source, 'total:', totalLimit, 'used:', totalUsed, 'remaining:', creditsRemaining);
    if (result._debug_base_url) console.log('[Charlotte API] debug base_url:', result._debug_base_url);
    if (result._debug_executions !== undefined) console.log('[Charlotte API] workflow executions this month:', result._debug_executions);

    return {
      totalUsed,
      totalLimit,
      creditsRemaining,
      percentage,
      topUsers,
      totalExecutions: 0,
      lastUpdated:     new Date().toISOString(),
      source:          result.source || 'charlotte-fn'
    };

  } catch (err) {
    console.error('[Charlotte API] Function call failed:', err?.message ?? String(err));
    return null;
  }
}
