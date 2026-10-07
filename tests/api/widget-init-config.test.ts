import { describe, it, expect, vi, beforeEach } from 'vitest';

const findUnique = vi.fn();
vi.mock('@/lib/prisma', () => ({ prisma: { tenant: { findUnique: (...a: any[]) => findUnique(...a) } } }));

import { POST as initPost } from '@/app/api/widget/init/route';
import { GET as configGet } from '@/app/api/widget/config/route';

const flow = (config: any, name = 'Claire') => ({ id: 'f1', name, config, updatedAt: new Date() });

const baseTenant = (over: any = {}) => ({
  id: 't1',
  name: 'CEOSUITE',
  themeBrandColor: null,
  themeBrandLogo: null,
  botAvatarUrl: null,
  visitorConfig: {},
  activeFlow: null,
  flows: [],
  ...over,
});

const initReq = (body: any) =>
  new Request('http://localhost/api/widget/init', { method: 'POST', body: JSON.stringify(body) });

beforeEach(() => findUnique.mockReset());

describe('POST /api/widget/init', () => {
  it('TEST-AI-F01d returns type, raw string and structured welcome options', async () => {
    findUnique.mockResolvedValue(
      baseTenant({
        activeFlow: flow({ welcomeMessage: 'Hi', welcomeMessageType: 'options', welcomeMessageOptions: 'Pricing, Tour|book' }),
      })
    );
    const json = await (await initPost(initReq({ tenantId: 't1' }))).json();

    expect(json.config.welcomeMessage).toBe('Hi');
    expect(json.config.welcomeMessageType).toBe('options');
    expect(json.config.welcomeMessageOptions).toBe('Pricing, Tour|book'); // old SDK builds
    expect(json.config.welcomeOptions).toEqual([
      { label: 'Pricing', value: 'Pricing' },
      { label: 'Tour', value: 'book' },
    ]);
  });

  it('welcome type text drops stale options', async () => {
    findUnique.mockResolvedValue(
      baseTenant({ activeFlow: flow({ welcomeMessage: 'Hi', welcomeMessageType: 'text', welcomeMessageOptions: 'Old' }) })
    );
    const { config } = await (await initPost(initReq({ tenantId: 't1' }))).json();
    expect(config.welcomeMessageOptions).toBeNull();
    expect(config.welcomeOptions).toEqual([]);
  });

  it('TEST-AI-R13 does not leak prompts / business context through initialFlow', async () => {
    findUnique.mockResolvedValue(
      baseTenant({
        activeFlow: flow({
          welcomeMessage: 'Hi',
          systemPrompt: 'SECRET-SYSTEM-PROMPT',
          humanPrompt: 'SECRET-HUMAN',
          businessNeeds: 'SECRET-BIZ',
        }),
      })
    );
    const res = await initPost(initReq({ tenantId: 't1' }));
    const text = JSON.stringify(await res.json());

    expect(text).not.toContain('SECRET');
    expect(JSON.parse(text).config.initialFlow).toEqual({ id: 'f1', name: 'Claire' });
  });

  it('falls back to flows[0] when no activeFlow', async () => {
    findUnique.mockResolvedValue(baseTenant({ flows: [flow({ welcomeMessage: 'From latest flow' }, 'Latest')] }));
    const { config } = await (await initPost(initReq({ tenantId: 't1' }))).json();
    expect(config.welcomeMessage).toBe('From latest flow');
    expect(config.botName).toBe('Latest');
  });

  it('no flow at all -> null welcome, default bot name, no error', async () => {
    findUnique.mockResolvedValue(baseTenant());
    const res = await initPost(initReq({ tenantId: 't1' }));
    expect(res.status).toBe(200);
    const { config } = await res.json();
    expect(config.welcomeMessage).toBeNull();
    expect(config.welcomeOptions).toEqual([]);
    expect(config.botName).toBe('Claire');
  });

  it('TEST-AI-F50 returns humanHandoffEnabled and fallbackEmail from tenant', async () => {
    findUnique.mockResolvedValue(
      baseTenant({
        humanHandoffEnabled: false,
        fallbackEmail: 'support@ceosuite.com',
      })
    );
    const { config } = await (await initPost(initReq({ tenantId: 't1' }))).json();
    expect(config.humanHandoffEnabled).toBe(false);
    expect(config.fallbackEmail).toBe('support@ceosuite.com');
  });

  it('400 without tenantId, 404 for unknown tenant', async () => {
    expect((await initPost(initReq({}))).status).toBe(400);
    findUnique.mockResolvedValue(null);
    expect((await initPost(initReq({ tenantId: 'nope' }))).status).toBe(404);
  });
});

describe('GET /api/widget/config', () => {
  const cfgReq = () => new Request('http://localhost/api/widget/config?tenantId=t1');

  it('TEST-AI-R12 tenant without activeFlowId still gets welcome from flows[0]', async () => {
    findUnique.mockResolvedValue(
      baseTenant({
        flows: [flow({ welcomeMessage: 'Hello there', welcomeMessageType: 'options', welcomeMessageOptions: 'A|a, B' })],
      })
    );
    const json = await (await configGet(cfgReq())).json();
    expect(json.welcomeMessage).toBe('Hello there');
    expect(json.welcomeMessageOptions).toEqual(['A|a', 'B']);
    expect(json.welcomeMessageType).toBe('options');
  });

  it('empty items are filtered and type=text yields no options', async () => {
    findUnique.mockResolvedValue(
      baseTenant({ activeFlow: flow({ welcomeMessage: 'Hi', welcomeMessageType: 'text', welcomeMessageOptions: 'A,,B' }) })
    );
    const json = await (await configGet(cfgReq())).json();
    expect(json.welcomeMessageOptions).toEqual([]);
  });

  it('returns humanHandoffEnabled and fallbackEmail from tenant', async () => {
    findUnique.mockResolvedValue(
      baseTenant({
        humanHandoffEnabled: false,
        fallbackEmail: 'support@ceosuite.com',
      })
    );
    const json = await (await configGet(cfgReq())).json();
    expect(json.humanHandoffEnabled).toBe(false);
    expect(json.fallbackEmail).toBe('support@ceosuite.com');
  });
});
