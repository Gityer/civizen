import { describe, expect, it, vi } from 'vitest';

import {
  CALL_INBOX_TOPIC_PREFIX,
  DEFAULT_ICE_SERVERS,
  PRIVATE_CHANNEL_CONFIG,
  TURN_CREDENTIALS_FUNCTION,
  buildRtcConfiguration,
  createCallSignalSender,
  callInboxTopic,
  fetchRtcConfiguration,
  resolveSignalTopic,
} from './call-signalling';

describe('call signalling topics', () => {
  it('names a private inbox per member', () => {
    expect(callInboxTopic('abc')).toBe(`${CALL_INBOX_TOPIC_PREFIX}abc`);
    expect(PRIVATE_CHANNEL_CONFIG.config.private).toBe(true);
  });

  it('delivers only to an explicit recipient and never broadcasts', () => {
    expect(resolveSignalTopic({ toProfileId: 'p-2' })).toBe('call-inbox:p-2');
    expect(resolveSignalTopic({ toProfileId: '  p-3 ' })).toBe('call-inbox:p-3');
    expect(resolveSignalTopic({ toProfileId: null })).toBeNull();
    expect(resolveSignalTopic({})).toBeNull();
    expect(resolveSignalTopic({ toProfileId: '' })).toBeNull();
  });
});

describe('RTC configuration', () => {
  it('keeps STUN defaults and appends well-formed TURN servers only', () => {
    const config = buildRtcConfiguration([
      { urls: 'turn:turn.example.org:3478', username: 'u', credential: 'c' },
      { urls: ['turns:turn.example.org:5349'], username: 'u', credential: 'c' },
      { nope: true },
      'garbage',
    ]);
    expect(config.iceServers).toHaveLength(DEFAULT_ICE_SERVERS.length + 2);
    expect(config.iceServers?.[0]).toEqual(DEFAULT_ICE_SERVERS[0]);
  });

  it('falls back to STUN when the credentials function errors or is missing', async () => {
    const failing = { functions: { invoke: vi.fn().mockResolvedValue({ data: null, error: new Error('no function') }) } };
    expect((await fetchRtcConfiguration(failing)).iceServers).toEqual(DEFAULT_ICE_SERVERS);

    const throwing = { functions: { invoke: vi.fn().mockRejectedValue(new Error('network')) } };
    expect((await fetchRtcConfiguration(throwing)).iceServers).toEqual(DEFAULT_ICE_SERVERS);
  });

  it('uses the TURN servers the function returns', async () => {
    const invoke = vi.fn().mockResolvedValue({
      data: { iceServers: [{ urls: 'turn:relay.civizen.world:3478', username: '1:u', credential: 'x' }] },
      error: null,
    });
    const config = await fetchRtcConfiguration({ functions: { invoke } });
    expect(invoke).toHaveBeenCalledWith(TURN_CREDENTIALS_FUNCTION, { body: {} });
    expect(config.iceServers?.at(-1)).toEqual({ urls: 'turn:relay.civizen.world:3478', username: '1:u', credential: 'x' });
  });
});

describe('call signal sender', () => {
  function createClient(sendResult = 'ok') {
    const channels: Array<{ topic: string; send: ReturnType<typeof vi.fn> }> = [];
    const client = {
      channel: vi.fn((topic: string) => {
        const channel = { topic, send: vi.fn().mockResolvedValue(sendResult) };
        channels.push(channel);
        return channel;
      }),
      removeChannel: vi.fn().mockResolvedValue('ok'),
    };
    return { client, channels };
  }

  it('reuses one private outbox per recipient and sends on it', async () => {
    const { client, channels } = createClient();
    const sender = createCallSignalSender(client);

    expect(await sender.send({ type: 'invite', toProfileId: 'p-2' })).toBe(true);
    expect(await sender.send({ type: 'offer', toProfileId: 'p-2' })).toBe(true);
    expect(await sender.send({ type: 'invite', toProfileId: 'p-3' })).toBe(true);

    expect(client.channel).toHaveBeenCalledTimes(2);
    expect(client.channel).toHaveBeenCalledWith('call-inbox:p-2', PRIVATE_CHANNEL_CONFIG);
    expect(channels[0].send).toHaveBeenCalledTimes(2);
    expect(channels[0].send.mock.calls[0][0]).toMatchObject({ type: 'broadcast', event: 'signal' });

    sender.dispose();
    expect(client.removeChannel).toHaveBeenCalledTimes(2);
  });

  it('drops a signal without a recipient instead of broadcasting it', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { client } = createClient();
    const sender = createCallSignalSender(client);

    expect(await sender.send({ type: 'invite', toProfileId: null })).toBe(false);
    expect(client.channel).not.toHaveBeenCalled();
    warn.mockRestore();
  });

  it('reports a failed send', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { client } = createClient('timed out');
    const sender = createCallSignalSender(client);

    expect(await sender.send({ type: 'hangup', toProfileId: 'p-2' })).toBe(false);
    error.mockRestore();
  });
});
