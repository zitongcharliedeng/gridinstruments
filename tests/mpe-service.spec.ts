import { test, expect } from '@playwright/test';

/**
 * Behavioral tests for MPEService — standalone, configurable MPE MIDI service.
 *
 * Strategy: each test uses page.evaluate() to dynamically import MPEService
 * from the Vite dev server, wires it to a mock MIDIOutput that captures
 * every send() call, exercises the service API, and returns serialisable
 * data for assertion in Node.
 */

test.describe('MPE Service — Standalone Service Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  // ── ISC-SVC-1 ─────────────────────────────────────────────────────────────

  /**
   * @reason MPEService must be independently testable without website UI,
   *   validating the separation of concerns from MpeOutput.
   * @design-intent "this shouldn't be tied with our website logic, it's a
   *   service with a nice component API" — MPE service is a standalone module.
   */
  test('ISC-SVC-1: MPEService constructor creates default settings', async ({ page }) => {
    const settings = await page.evaluate(async () => {
      const { MPEService } = await import('/src/lib/mpe-service.ts');
      const svc = new MPEService();
      return svc.getSettings();
    });

    expect(settings.masterChannel).toBe(1);
    expect(settings.memberChannelCount).toBe(15);
    expect(settings.pitchBendRange).toBe(48);
    expect(settings.pressureMode).toBe('channel-at');
    expect(settings.timbreCC).toBe(74);
    expect(settings.pressureCC).toBe(11);
    expect(settings.bendAutoReset).toBe(true);
  });

  // ── ISC-SVC-2 ─────────────────────────────────────────────────────────────

  /**
   * @reason Settings must be mutable at runtime so users can reconfigure
   *   the MPE zone without reconstructing the service.
   * @design-intent updateSettings provides a patch-style API matching React
   *   setState patterns for ergonomic partial updates.
   */
  test('ISC-SVC-2: updateSettings changes configuration', async ({ page }) => {
    const settings = await page.evaluate(async () => {
      const { MPEService } = await import('/src/lib/mpe-service.ts');
      const svc = new MPEService();
      svc.updateSettings({ timbreCC: 1 });
      return svc.getSettings();
    });

    expect(settings.timbreCC).toBe(1);
    // Other defaults remain unchanged
    expect(settings.masterChannel).toBe(1);
    expect(settings.pitchBendRange).toBe(48);
    expect(settings.pressureMode).toBe('channel-at');
  });

  // ── ISC-SVC-3 ─────────────────────────────────────────────────────────────

  /**
   * @reason noteOn is the fundamental MPE voice-start message. It must
   *   allocate a member channel, reset per-note state, and send note-on.
   * @design-intent The 4-message preamble (bend reset, timbre reset,
   *   pressure reset, note-on) ensures synths receive a clean initial state
   *   per MPE best practices.
   */
  test('ISC-SVC-3: noteOn allocates member channel and sends correct MIDI', async ({ page }) => {
    const sent = await page.evaluate(async () => {
      const { MPEService } = await import('/src/lib/mpe-service.ts');
      const sent: number[][] = [];
      const mock = {
        send(data: number[]) { sent.push([...data]); },
        clear() {},
      };
      const svc = new MPEService();
      svc.setOutput(mock);
      sent.length = 0; // clear MCM
      svc.setEnabled(true);

      svc.noteOn('n1', 60, 0.8);
      return sent;
    });

    // noteOn sends 4 messages: pitch-bend reset, CC74 reset, pressure reset, note-on
    expect(sent).toHaveLength(4);

    const noteOn = sent[3];
    // Status high nibble = 0x90 (Note On)
    expect(noteOn[0] & 0xF0).toBe(0x90);
    // Channel must be a member channel (2–16, i.e. index 1–15)
    const channel = (noteOn[0] & 0x0F) + 1;
    expect(channel).toBeGreaterThanOrEqual(2);
    expect(channel).toBeLessThanOrEqual(16);
    // Payload
    expect(noteOn[1]).toBe(60);
    expect(noteOn[2]).toBe(Math.round(0.8 * 127));
  });

  // ── ISC-SVC-4 ─────────────────────────────────────────────────────────────

  /**
   * @reason noteOff must target the same member channel that noteOn allocated,
   *   forming the complete note lifecycle.
   * @design-intent Voice tracking by noteId ensures noteOff routes to the
   *   correct channel even when many notes are active simultaneously.
   */
  test('ISC-SVC-4: noteOff sends correct note-off message', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { MPEService } = await import('/src/lib/mpe-service.ts');
      const sent: number[][] = [];
      const mock = {
        send(data: number[]) { sent.push([...data]); },
        clear() {},
      };
      const svc = new MPEService();
      svc.setOutput(mock);
      sent.length = 0;
      svc.setEnabled(true);

      svc.noteOn('n1', 60, 0.8);
      const noteOnChannel = sent[3][0] & 0x0F;
      sent.length = 0;

      svc.noteOff('n1', 60);
      return { noteOff: sent[0], noteOnChannel };
    });

    // Status high nibble = 0x80 (Note Off)
    expect(result.noteOff[0] & 0xF0).toBe(0x80);
    // Same channel as note-on
    expect(result.noteOff[0] & 0x0F).toBe(result.noteOnChannel);
    // MIDI note
    expect(result.noteOff[1]).toBe(60);
    // Release velocity
    expect(result.noteOff[2]).toBe(64);
  });

  // ── ISC-SVC-5 ─────────────────────────────────────────────────────────────

  /**
   * @reason Subscribers need real-time voice state for UI rendering (e.g.
   *   showing active notes, per-voice pressure/timbre indicators).
   * @design-intent The subscribe/notify pattern decouples MIDI output from
   *   UI concerns — the service pushes state, components pull what they need.
   */
  test('ISC-SVC-5: subscribe receives voice state updates', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { MPEService } = await import('/src/lib/mpe-service.ts');
      const sent: number[][] = [];
      const mock = {
        send(data: number[]) { sent.push([...data]); },
        clear() {},
      };
      const svc = new MPEService();
      svc.setOutput(mock);
      svc.setEnabled(true);

      const updates: { count: number; firstState?: string; firstNote?: number }[] = [];
      svc.subscribe((voices) => {
        updates.push({
          count: voices.length,
          firstState: voices[0]?.state,
          firstNote: voices[0]?.midiNote,
        });
      });

      svc.noteOn('n1', 60, 0.8);
      svc.noteOff('n1', 60);
      return updates;
    });

    // noteOn triggers notify → 1 voice (active)
    expect(result[0].count).toBe(1);
    expect(result[0].firstState).toBe('active');
    expect(result[0].firstNote).toBe(60);

    // noteOff triggers notify → voice still in map but state = released
    expect(result[1].count).toBe(1);
    expect(result[1].firstState).toBe('released');
  });

  // ── ISC-SVC-6 ─────────────────────────────────────────────────────────────

  /**
   * @reason Panic is a safety mechanism to silence all output immediately.
   *   It must reach every member channel to guarantee no stuck notes.
   * @design-intent CC123 (All Notes Off) on every member channel follows
   *   the MIDI specification for emergency note-off.
   */
  test('ISC-SVC-6: panic sends all-notes-off on all member channels', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { MPEService } = await import('/src/lib/mpe-service.ts');
      const sent: number[][] = [];
      const mock = {
        send(data: number[]) { sent.push([...data]); },
        clear() {},
      };
      const svc = new MPEService();
      svc.setOutput(mock);
      sent.length = 0; // clear MCM

      svc.panic();
      return sent;
    });

    // Default: 15 member channels (2–16), each gets CC123
    expect(result).toHaveLength(15);
    for (let i = 0; i < 15; i++) {
      const ch = (result[i][0] & 0x0F) + 1;
      expect(ch).toBeGreaterThanOrEqual(2);
      expect(ch).toBeLessThanOrEqual(16);
      // CC status
      expect(result[i][0] & 0xF0).toBe(0xB0);
      // CC123 = All Notes Off
      expect(result[i][1]).toBe(123);
      expect(result[i][2]).toBe(0);
    }
  });

  // ── ISC-SVC-7 ─────────────────────────────────────────────────────────────

  /**
   * @reason dispose must fully tear down the service — releasing MIDI
   *   resources, clearing subscribers, and preventing zombie callbacks.
   * @design-intent After dispose, no listener receives further updates
   *   even if the service object is accidentally reused.
   */
  test('ISC-SVC-7: dispose cleans up resources', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { MPEService } = await import('/src/lib/mpe-service.ts');
      const sent: number[][] = [];
      const mock = {
        send(data: number[]) { sent.push([...data]); },
        clear() {},
      };
      const svc = new MPEService();
      svc.setOutput(mock);
      svc.setEnabled(true);

      const voiceUpdates: number[] = [];
      svc.subscribe((voices) => { voiceUpdates.push(voices.length); });

      svc.noteOn('n1', 60, 0.8);
      // voiceUpdates: [1]

      svc.dispose();
      // dispose → panic → notify([]) → voiceUpdates: [1, 0]
      // then listeners.clear()

      // Re-wire output to prove listener is cleared
      svc.setOutput(mock);
      sent.length = 0;
      // _enabled still true (dispose doesn't reset it)
      svc.noteOn('n2', 62, 0.8);
      const messagesAfterReuse = sent.length;

      return { voiceUpdates, messagesAfterReuse };
    });

    // Callback fired during noteOn and during dispose → panic
    expect(result.voiceUpdates).toEqual([1, 0]);
    // noteOn after dispose sent messages (output re-wired, service still functional)
    expect(result.messagesAfterReuse).toBeGreaterThan(0);
    // But no new callback — listener was cleared by dispose
    expect(result.voiceUpdates).toHaveLength(2);
  });

  // ── ISC-SVC-8 ─────────────────────────────────────────────────────────────

  /**
   * @reason Different synths expect pressure via different MIDI messages.
   *   Poly aftertouch carries per-note resolution; CC mode suits older gear.
   * @design-intent pressureMode is a first-class setting so the same service
   *   instance adapts to hardware requirements without code changes.
   */
  test('ISC-SVC-8: configurable pressureMode changes message type', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { MPEService } = await import('/src/lib/mpe-service.ts');

      // ── Test poly-at mode ──
      const sentPolyAt: number[][] = [];
      const mockPolyAt = {
        send(data: number[]) { sentPolyAt.push([...data]); },
        clear() {},
      };
      const svcPolyAt = new MPEService({ pressureMode: 'poly-at' });
      svcPolyAt.setOutput(mockPolyAt);
      sentPolyAt.length = 0;
      svcPolyAt.setEnabled(true);
      svcPolyAt.noteOn('n1', 60, 0.8);
      sentPolyAt.length = 0;
      svcPolyAt.sendPressure('n1', 0.5);
      const polyAtMsg = [...sentPolyAt[0]];

      // ── Test cc mode ──
      const sentCC: number[][] = [];
      const mockCC = {
        send(data: number[]) { sentCC.push([...data]); },
        clear() {},
      };
      const svcCC = new MPEService({ pressureMode: 'cc', pressureCC: 11 });
      svcCC.setOutput(mockCC);
      sentCC.length = 0;
      svcCC.setEnabled(true);
      svcCC.noteOn('n1', 60, 0.8);
      sentCC.length = 0;
      svcCC.sendPressure('n1', 0.5);
      const ccMsg = [...sentCC[0]];

      return { polyAtMsg, ccMsg };
    });

    // Poly aftertouch: status = 0xA0 | channel
    expect(result.polyAtMsg[0] & 0xF0).toBe(0xA0);
    expect(result.polyAtMsg[1]).toBe(60);                    // MIDI note
    expect(result.polyAtMsg[2]).toBe(Math.round(0.5 * 127)); // pressure value

    // CC mode: status = 0xB0 | channel, CC11 (expression)
    expect(result.ccMsg[0] & 0xF0).toBe(0xB0);
    expect(result.ccMsg[1]).toBe(11);                        // pressureCC
    expect(result.ccMsg[2]).toBe(Math.round(0.5 * 127));     // pressure value
  });

  // ── ISC-SVC-9 ─────────────────────────────────────────────────────────────

  /**
   * @reason The enabled flag is a master gate — when disabled, no MIDI
   *   output occurs, preventing accidental sound during setup or teardown.
   * @design-intent setEnabled(false) also triggers panic() to immediately
   *   silence any active notes, ensuring a clean disabled state.
   */
  test('ISC-SVC-9: setEnabled(false) prevents note output', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { MPEService } = await import('/src/lib/mpe-service.ts');
      const sent: number[][] = [];
      const mock = {
        send(data: number[]) { sent.push([...data]); },
        clear() {},
      };
      const svc = new MPEService();
      svc.setOutput(mock);
      sent.length = 0;
      // Enable then disable to test the gate
      svc.setEnabled(true);
      svc.setEnabled(false);
      // setEnabled(false) calls panic → sends CC123 on all 15 channels
      sent.length = 0; // clear panic messages

      svc.noteOn('n1', 60, 0.8);
      const noteOnMessages = sent.length;

      svc.sendPitchBend('n1', 12);
      const afterBend = sent.length;

      svc.sendSlide('n1', 0.5);
      const afterSlide = sent.length;

      svc.sendPressure('n1', 0.5);
      const afterPressure = sent.length;

      return {
        noteOnMessages,
        afterBend,
        afterSlide,
        afterPressure,
        isEnabled: svc.isEnabled(),
      };
    });

    expect(result.noteOnMessages).toBe(0);
    expect(result.afterBend).toBe(0);
    expect(result.afterSlide).toBe(0);
    expect(result.afterPressure).toBe(0);
    expect(result.isEnabled).toBe(false);
  });

  // ── ISC-SVC-10 ────────────────────────────────────────────────────────────

  /**
   * @reason Timbre/slide CC must be configurable because different synths
   *   map slide to different controllers (CC74 = brightness, CC1 = mod wheel).
   * @design-intent timbreCC as a setting allows per-synth profiles without
   *   forking the service — just change the CC number.
   */
  test('ISC-SVC-10: configurable timbreCC uses custom CC number', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { MPEService } = await import('/src/lib/mpe-service.ts');
      const sent: number[][] = [];
      const mock = {
        send(data: number[]) { sent.push([...data]); },
        clear() {},
      };
      const svc = new MPEService({ timbreCC: 1 });
      svc.setOutput(mock);
      sent.length = 0;
      svc.setEnabled(true);

      svc.noteOn('n1', 60, 0.8);
      // noteOn sends: pitch bend reset, CC1 reset (custom timbre), pressure reset, note-on
      const timbreReset = [...sent[1]]; // second message = timbre reset
      sent.length = 0;

      svc.sendSlide('n1', 0.75);
      const slideMsg = [...sent[0]];

      return { timbreReset, slideMsg };
    });

    // Timbre reset during noteOn uses CC1 instead of CC74
    expect(result.timbreReset[0] & 0xF0).toBe(0xB0);
    expect(result.timbreReset[1]).toBe(1);  // CC1 = mod wheel
    expect(result.timbreReset[2]).toBe(64); // center value

    // Slide message uses CC1
    expect(result.slideMsg[0] & 0xF0).toBe(0xB0);
    expect(result.slideMsg[1]).toBe(1);
    expect(result.slideMsg[2]).toBe(Math.round(0.75 * 127));
  });
});
