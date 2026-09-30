import { parseOptions, QuickReplyOption } from '@/lib/quick-replies';

/**
 * Minimal tenant shape needed to pick the flow that drives the public widget.
 * `activeFlow` wins; otherwise the most recently updated flow is used (callers
 * load it with `flows: { take: 1, orderBy: { updatedAt: 'desc' } }`).
 */
export interface TenantWithFlows<F> {
  activeFlow?: F | null;
  flows?: F[] | null;
}

export function resolveEffectiveFlow<F>(tenant: TenantWithFlows<F>): F | null {
  return tenant.activeFlow || tenant.flows?.[0] || null;
}

export interface WelcomeConfig {
  message: string | null;
  type: 'text' | 'options' | 'form';
  options: QuickReplyOption[];
  /** Raw builder string, kept for SDK builds that still parse the comma list themselves. */
  rawOptions: string | null;
}

/**
 * Reads the welcome message settings out of a flow config. Buttons are only
 * returned for the `options` type (or legacy configs that never set a type but
 * do have options) — an explicit `text`/`form` type discards stale leftovers.
 */
export function readWelcomeConfig(flowConfig: any): WelcomeConfig {
  const cfg = flowConfig || {};
  const declaredType = cfg.welcomeMessageType;
  const rawOptions =
    typeof cfg.welcomeMessageOptions === 'string' && cfg.welcomeMessageOptions.trim()
      ? cfg.welcomeMessageOptions
      : null;
  const parsed = parseOptions(rawOptions);

  const type: WelcomeConfig['type'] =
    declaredType === 'form'
      ? 'form'
      : declaredType === 'text'
        ? 'text'
        : parsed.length > 0
          ? 'options'
          : 'text';

  const useOptions = type === 'options';
  return {
    message: cfg.welcomeMessage || null,
    type,
    options: useOptions ? parsed : [],
    rawOptions: useOptions ? rawOptions : null,
  };
}
