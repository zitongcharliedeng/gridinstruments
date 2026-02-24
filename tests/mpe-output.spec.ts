import { test, expect } from '@playwright/test';

/**
 * Behavioral smoke tests for MpeOutput.
 *
 * Strategy: each test uses page.evaluate() to dynamically import MpeOutput
 * from the Vite dev server, wires it to a mock MIDIOutput that captures
 * every sent() call, exercises class state, and returns serialisable byte
 * arrays for assertion in Node.
 */

test.describe('MPE Output — Behavioral Smoke Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  // ── ISC-MPE-1 ─────────────────────────────────────────────────────────────
  test('ISC-MPE-1: noteOn sends correct status byte on member channel 2–16', async ({ page }) => {
    const sent = await page.evaluate(async () => {
      const { MpeOutput } = await import('/src/lib/mpe-output.ts');
      const sent: number[][] = [];
      const mock = {
        send(data: number[]) { sent.push([...data]); },
        clear() { /* MIDIOutput interface */ },
      };
      const mpe = new MpeOutput();
      mpe.setOutput(mock);
      sent.length = 0; // clear MCM
      mpe.setEnabled(true);

      mpe.noteOn('n1', 60, 0.8);
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
    expect(noteOn[1]).toBe(60);                     // MIDI note
    expect(noteOn[2]).toBe(Math.round(0.8 * 127));  // velocity → 102
  });

  // ── ISC-MPE-2 ─────────────────────────────────────────────────────────────
  test('ISC-MPE-2: pitch bend produces valid 14-bit LSB/MSB encoding', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { MpeOutput } = await import('/src/lib/mpe-output.ts');
      const sent: number[][] = [];
      const mock = {
        send(data: number[]) { sent.push([...data]); },
        clear() {},
      };
      const mpe = new MpeOutput();
      mpe.setOutput(mock);
      sent.length = 0;
      mpe.setEnabled(true);

      mpe.noteOn('n1', 60, 0.8);
      sent.length = 0;

      // +24 semitones (half of default 48 bend range)
      mpe.sendPitchBend('n1', 24);
      const bend24 = [...sent[0]];
      sent.length = 0;

      // Center (0 semitones)
      mpe.sendPitchBend('n1', 0);
      const bendCenter = [...sent[0]];
      sent.length = 0;

      // Max up (+48 = full range)
      mpe.sendPitchBend('n1', 48);
      const bendMaxUp = [...sent[0]];
      sent.length = 0;

      // Max down (-48 = full range)
      mpe.sendPitchBend('n1', -48);
      const bendMaxDown = [...sent[0]];

      return { bend24, bendCenter, bendMaxUp, bendMaxDown };
    });

    // All pitch bend messages: status high nibble = 0xE0
    expect(result.bend24[0] & 0xF0).toBe(0xE0);

    // +24 st → normalized=0.5 → uint14=round(1.5×8191.5)=12287
    //   12287 & 0x7F = 127 (LSB),  12287>>7 & 0x7F = 95 (MSB)
    expect(result.bend24[1]).toBe(127);
    expect(result.bend24[2]).toBe(95);

    // Center → uint14=8192 → lsb=0, msb=64
    expect(result.bendCenter[1]).toBe(0);
    expect(result.bendCenter[2]).toBe(64);

    // Max up → uint14=16383 → lsb=127, msb=127
    expect(result.bendMaxUp[1]).toBe(127);
    expect(result.bendMaxUp[2]).toBe(127);

    // Max down → uint14=0 → lsb=0, msb=0
    expect(result.bendMaxDown[1]).toBe(0);
    expect(result.bendMaxDown[2]).toBe(0);
  });

  // ── ISC-MPE-3 ─────────────────────────────────────────────────────────────
  test('ISC-MPE-3: CC74 slide normalizes 0–1 to 0–127', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { MpeOutput } = await import('/src/lib/mpe-output.ts');
      const sent: number[][] = [];
      const mock = {
        send(data: number[]) { sent.push([...data]); },
        clear() {},
      };
      const mpe = new MpeOutput();
      mpe.setOutput(mock);
      sent.length = 0;
      mpe.setEnabled(true);

      mpe.noteOn('n1', 60, 0.8);
      sent.length = 0;

      // Slide values
      mpe.sendSlide('n1', 0);
      const slide0 = [...sent[0]];
      sent.length = 0;

      mpe.sendSlide('n1', 0.5);
      const slideHalf = [...sent[0]];
      sent.length = 0;

      mpe.sendSlide('n1', 1.0);
      const slideFull = [...sent[0]];
      sent.length = 0;

      // Pressure uses the same 0–1 → 0–127 normalisation
      mpe.sendPressure('n1', 0);
      const pressure0 = [...sent[0]];
      sent.length = 0;

      mpe.sendPressure('n1', 1.0);
      const pressureFull = [...sent[0]];

      return { slide0, slideHalf, slideFull, pressure0, pressureFull };
    });

    // Slide: [CC_status, 74, value]
    expect(result.slide0[1]).toBe(74);
    expect(result.slide0[2]).toBe(0);

    expect(result.slideHalf[1]).toBe(74);
    expect(result.slideHalf[2]).toBe(64);  // round(0.5 × 127) = 64

    expect(result.slideFull[1]).toBe(74);
    expect(result.slideFull[2]).toBe(127);

    // Pressure: [0xD0|ch, value]
    expect(result.pressure0[0] & 0xF0).toBe(0xD0);
    expect(result.pressure0[1]).toBe(0);
    expect(result.pressureFull[1]).toBe(127);
  });

  // ── ISC-MPE-4 ─────────────────────────────────────────────────────────────
  test('ISC-MPE-4: FIFO channel allocation across channels 2–16', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { MpeOutput } = await import('/src/lib/mpe-output.ts');
      const sent: number[][] = [];
      const mock = {
        send(data: number[]) { sent.push([...data]); },
        clear() {},
      };
      const mpe = new MpeOutput();
      mpe.setOutput(mock);
      sent.length = 0;
      mpe.setEnabled(true);

      // Allocate all 15 member channels
      const allocatedChannels: number[] = [];
      for (let i = 0; i < 15; i++) {
        const startIdx = sent.length;
        mpe.noteOn(`n${i}`, 60 + i, 0.8);
        // noteOn produces 4 messages; note-on is the 4th
        const noteOnMsg = sent[startIdx + 3];
        allocatedChannels.push((noteOnMsg[0] & 0x0F) + 1);
      }

      // 16th noteOn — all channels exhausted → no output
      const beforeOverflow = sent.length;
      mpe.noteOn('overflow', 48, 0.8);
      const overflowMessageCount = sent.length - beforeOverflow;

      // Release first note, then allocate → FIFO returns channel 2
      mpe.noteOff('n0', 60);
      const beforeReuse = sent.length;
      mpe.noteOn('reuse', 72, 0.8);
      const reuseNoteOn = sent[beforeReuse + 3];
      const reuseChannel = (reuseNoteOn[0] & 0x0F) + 1;

      return { allocatedChannels, overflowMessageCount, reuseChannel };
    });

    // Sequential FIFO: channels 2 through 16
    expect(result.allocatedChannels).toEqual(
      [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16],
    );
    // Overflow: no messages sent
    expect(result.overflowMessageCount).toBe(0);
    // Reuse: freed channel 2 returned via FIFO
    expect(result.reuseChannel).toBe(2);
  });

  // ── ISC-MPE-5 ─────────────────────────────────────────────────────────────
  test('ISC-MPE-5: MCM sent on output selection', async ({ page }) => {
    const sent = await page.evaluate(async () => {
      const { MpeOutput } = await import('/src/lib/mpe-output.ts');
      const sent: number[][] = [];
      const mock = {
        send(data: number[]) { sent.push([...data]); },
        clear() {},
      };
      const mpe = new MpeOutput();
      mpe.setOutput(mock); // triggers sendMCM
      return sent;
    });

    // ── Lower zone MCM on ch1 (status 0xB0) ──
    expect(sent[0]).toEqual([0xB0, 101, 0]);    // RPN MSB = 0
    expect(sent[1]).toEqual([0xB0, 100, 6]);    // RPN LSB = 6 (MCM)
    expect(sent[2]).toEqual([0xB0, 6, 15]);     // Data Entry = 15 members
    expect(sent[3]).toEqual([0xB0, 101, 127]);  // Null RPN
    expect(sent[4]).toEqual([0xB0, 100, 127]);

    // ── Upper zone disable on ch16 (status 0xBF) ──
    expect(sent[5]).toEqual([0xBF, 101, 0]);
    expect(sent[6]).toEqual([0xBF, 100, 6]);
    expect(sent[7]).toEqual([0xBF, 6, 0]);      // 0 members = zone off
    expect(sent[8]).toEqual([0xBF, 101, 127]);
    expect(sent[9]).toEqual([0xBF, 100, 127]);

    // ── Pitch Bend Sensitivity (RPN 0/0) on manager ch1 ──
    expect(sent[10]).toEqual([0xB0, 101, 0]);   // RPN MSB = 0
    expect(sent[11]).toEqual([0xB0, 100, 0]);   // RPN LSB = 0 (PBS)
    expect(sent[12]).toEqual([0xB0, 6, 48]);    // 48 semitones
    expect(sent[13]).toEqual([0xB0, 38, 0]);    // 0 cents
  });

  // ── ISC-A-MPE-1 ───────────────────────────────────────────────────────────
  test('ISC-A-MPE-1: no per-note messages go to manager channel 1', async ({ page }) => {
    const channels = await page.evaluate(async () => {
      const { MpeOutput } = await import('/src/lib/mpe-output.ts');
      const sent: number[][] = [];
      const mock = {
        send(data: number[]) { sent.push([...data]); },
        clear() {},
      };
      const mpe = new MpeOutput();
      mpe.setOutput(mock);
      sent.length = 0; // clear MCM (those legitimately target ch1)
      mpe.setEnabled(true);

      // Exercise every per-note message type
      for (let i = 0; i < 5; i++) {
        mpe.noteOn(`n${i}`, 60 + i, 0.8);
      }
      mpe.sendPitchBend('n0', 12);
      mpe.sendSlide('n1', 0.5);
      mpe.sendPressure('n2', 0.7);
      mpe.noteOff('n3', 63);

      return sent.map(msg => (msg[0] & 0x0F) + 1);
    });

    // No per-note message should target channel 1 (manager)
    expect(channels).not.toContain(1);

    // All channels must be in member range 2–16
    for (const ch of channels) {
      expect(ch).toBeGreaterThanOrEqual(2);
      expect(ch).toBeLessThanOrEqual(16);
    }
  });
});
