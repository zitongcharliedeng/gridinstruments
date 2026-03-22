# XState Graph Spec

Model-based test suite — enumerates all (state, event) pairs from 10+ XState UI machines via adjacency map traversal, generating Playwright tests for each transition plus structural invariant checks.

The import block pulls in the Playwright test harness, XState graph utilities, all machine definitions, and every `StateInvariant` object from `invariant-checks.ts`. The sheer length of this import list reflects how many independently verifiable invariants the suite currently tracks.

``` {.typescript file=_generated/tests/xstate-graph.spec.ts}
import { test, expect } from '@playwright/test';
import {
  handleDomParent,
  panelAriaCheck,
  appLoadedCheck,
  overlayGoldenCheck,
  fullPageGoldenCheck,
  keyboardCanvasGoldenCheck,
  tetNotchGoldenCheck,
  scrollbarWidthCheck,
  drefDriftCheck,
  ctMarkers1Check,
  ctMarkers2Check,
  ctNearest1Check,
  ctMidi1Check,
  ctMidi2Check,
  ctPc1Check,
  ctPc2Check,
  ctNotename1Check,
  ctNotename2Check,
  ctNotename3Check,
  ctHue1Check,
  ctHue2Check,
  ctRoundtrip1Check,
  ctCents1Check,
  ctCents2Check,
  ctMachine1Check,
  ctMachine2Check,
  ctMachine3Check,
  ctMachine4Check,
  bhDoubleAccidental1Check,
  iscMpe1Check,
  iscMpe2Check,
  iscMpe3Check,
  iscMpe4Check,
  iscMpe5Check,
  iscAMpe1Check,
  iscSvc1Check,
  iscSvc2Check,
  iscSvc3Check,
  iscSvc4Check,
  iscSvc5Check,
  iscSvc6Check,
  iscSvc7Check,
  iscSvc8Check,
  iscSvc9Check,
  iscSvc10Check,
   iss81SkewNotchCheck,
   iss87CogNoOverlapCheck,
   iss96WaveSelectCheck,
   iss97LayoutResetCheck,
   iss98AlignmentCheck,
   iss92OverlayHeadingsCheck,
   targetNoteApiExists,
   ghostNoteApiExists,
    canvasDropZone,
    gameScoreOverlay,
    gameCalibrateBtnExists,
    gameCalibrationStorage,
    gameOverlayUiExists,
    gameMidiParserIntegration,
    gameBuildNoteGroupsIntegration,
    gameMachineTransitions,
    gameMachineReset,
    gameFreqMatch,
    gameFreqReject,
    gameChordAll,
    gameChordSingle,
    gameChordClear,
    gameInstructionsText,
    gameProgressApi,
    gameMultiCellHighlight,
    gameTuningLock,
    gameCalibrationVisualApi,
    gameCalibrationVisualDim,
    gameEngBuildNoteGroups1,
    gameEngBuildNoteGroups2,
    gameEngTransposeSong,
    gameEngCropToRange,
    gameEngFindOptimalTransposition,
    gameEngComputeMedianMidiNote,
    gameEngBuildNoteGroupsEmpty,
    gameMidi1,
    gameMidi2,
    gameMidi3,
    gameMidi4,
    gameMidi5,
    gameMidi6,
    gameMidi7,
    gameSm1IdleToLoading,
    gameSm2LoadingToPlaying,
    gameSm3LoadingToError,
    gameSm4ErrorReset,
    gameSm5ErrorRetry,
    gameSm6CompleteNewGame,
    gameSm7CompleteReset,
    gameSm8PlayingNewSong,
    gameSm9PlayingReset,
    gameSm10WrongNoteNoop,
    gameSm11TuningWarnAck,
    gameInput1,
    gameInput2,
    gameInput3,
    gameEdge1,
    gameEdge2,
    gameEdge3,
    gameEdge4,
    gameEdge5,
    gameSearch1,
    gameSearch2,
    gameSearch3,
    gameSearch4,
    gameSearch5,
    gameSearch6,
    gameQuant1,
    gameQuant2,
    gameQuant3,
    gameQuant4,
    gameQuant5,
    gameQuant6,
    gameQuant7,
    gameQuant8,
     gameQuant9,
     gameChordProgress1,
     gameRestart1,
     songBarSm1,
     songBarSm2,
     songBarSm3,
     songBarSm4,
     songBarSm5,
     mirrorHighlight1,
     CANVAS_CLEAN_1,
     CANVAS_CLEAN_2,
     CANVAS_CLEAN_3,
     CANVAS_CLEAN_4,
     CANVAS_CLEAN_5,
     SONGBAR_HINT_1,
     SONGBAR_HINT_2,
     SONGBAR_HINT_3,
     SONGBAR_HINT_4,
     SONGBAR_SEARCH_LABEL_1,
     SONGBAR_PROGRESS_1,
     SONGBAR_PROGRESS_2,
     SONGBAR_PROGRESS_3,
     SONGBAR_PROGRESS_4,
     SONGBAR_CAL_1,
     SONGBAR_CAL_2,
     SONGBAR_CAL_3,
     SONGBAR_CAL_4,
     INFO_POPUP_1,
     INFO_POPUP_2,
     INFO_POPUP_3,
     INFO_POPUP_4,
     INFO_POPUP_5,
     INFO_POPUP_LABEL_1,
      EXPR_JOINT_1,
      EXPR_JOINT_2,
      EXPR_JOINT_3,
       EXPR_JOINT_4,
       PB_STYLE_1,
       PB_STYLE_2,
       IDLE_FADE_1,
       IDLE_FADE_2,
       FULLSCREEN_BTN,
       FLAT_SOUND_TOGGLE,
       ALL_INFO_BTNS,
       INFO_HOVER_PREVIEW,
       COG_ACTIVE_INVERSION,
       VOW_NO_NATIVE_SELECT,
       VOW_NO_SCROLL,
       VOW_SINGLE_FONT,
       VOW_NO_BORDER_RADIUS,
       VOW_NO_RAW_TOOLTIPS,
       NO_DUPLICATE_IDS,
       NO_D4_IN_UI,
       MIDI_SETTINGS_GROUPED,
       SINGLE_FLAT_SOUND,
       overlayGoldenCheck2,
       mobileGoldenCheck,
       qwertyGoldenCheck,
     } from './machines/invariant-checks';
import { focusReturnCheck } from './machines/modifierCompoundMachine';
```

These two interfaces describe the shape of a single recorded transition — its source state, triggering event, target state, and the BFS path needed to reach the source state from the machine's initial state.

The graph-generated test infrastructure (TransitionTest, computeShortestPaths,
enumerateTransitions) has been removed. See the note at the end of this file
for why — 226 tests that checked CSS class toggling instead of user experience.


The `[Structural]` describe block contains state-independent invariants — checks that must pass on every page load regardless of machine state. The `beforeEach` navigates to the app root and waits for network idle plus a short settle delay before each test.

Panel handle placement and ARIA attributes are tested first because they are pure DOM-structure invariants that must hold before any interaction.

``` {.typescript file=_generated/tests/xstate-graph.spec.ts}
test.describe('[Structural] state-independent invariants', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);
  });

  test('PNL-VIS-6: handle is DOM child of visualiser-panel', async ({ page }) => {
    await handleDomParent.check(page);
  });

  test('PNL-VIS-3: panel handles have correct ARIA attributes', async ({ page }) => {
    await panelAriaCheck.check(page);
  });

  test('BH-FOCUS-RETURN-1: keyboard works after clicking neutral element', async ({ page }) => {
    await focusReturnCheck.check(page);
  });
```

The mobile smart-zoom test verifies that on a 390px touch viewport the app's `getDefaultZoom()` returns a value in the range `(0.5, 1.0]` — ensuring the grid is neither invisible nor oversized on phones.

``` {.typescript file=_generated/tests/xstate-graph.spec.ts}
  test('BH-MOB-2: smart zoom on 390px touch device ≤ 1.0', async ({ browser }) => {
    const ctx = await browser.newContext({
      viewport: { width: 390, height: 844 },
      hasTouch: true,
    });
    const p = await ctx.newPage();
    await p.goto('/');
    await p.waitForLoadState('networkidle');
    await p.waitForTimeout(1500);

    const zoomValue = await p.evaluate(() => {
      const slider = document.getElementById('zoom-slider') as HTMLInputElement | null;
      return slider ? parseFloat(slider.value) : -1;
    });
    expect(zoomValue).toBeGreaterThan(0);
    expect(zoomValue).toBeLessThanOrEqual(1.0);

    await ctx.close();
  });
```

`SM-APP-LOADED` checks that the app uses `#000` background, `#fff` text, JetBrains Mono, correct DPR scaling, and zero border-radius on interactive elements — the full design-language invariant in one shot.

``` {.typescript file=_generated/tests/xstate-graph.spec.ts}
  test('SM-APP-LOADED: app colors, font, DPR scaling, no rounded corners', async ({ page }) => {
    await appLoadedCheck.check(page);
  });
```

Golden screenshot tests compare rendered pixels against stored reference images. They catch unintentional visual regressions in the overlay, full page, keyboard canvas, and TET notch label rendering.

``` {.typescript file=_generated/tests/xstate-graph.spec.ts}
  test('GOLDEN-1: Grid overlay snapshot', async ({ page }) => {
    await page.locator('#grid-settings-btn').click();
    await page.waitForTimeout(300);
    await overlayGoldenCheck.check(page);
  });

  test('GOLDEN-4: Full page snapshot', async ({ page }) => {
    await fullPageGoldenCheck.check(page);
  });

  test('GOLDEN-7: Keyboard canvas snapshot', async ({ page }) => {
    await keyboardCanvasGoldenCheck.check(page);
  });

  test('GOLDEN-8: TET notch labels snapshot', async ({ page }) => {
    await page.locator('#grid-settings-btn').click();
    await page.waitForTimeout(300);
    await tetNotchGoldenCheck.check(page);
  });
```

The OverlayScrollbars tests verify that the overlay panel uses a 12px-wide custom scrollbar and actually overflows at a small viewport height — confirming that the scrollbar is both visually sized correctly and functionally necessary.

``` {.typescript file=_generated/tests/xstate-graph.spec.ts}
  test('ISS-62-1: OverlayScrollbars scrollbar has 12px width when content overflows (#62)', async ({ page }) => {
    await scrollbarWidthCheck.check(page);
  });

  test('ISS-84-1: rapid keyboard clicks do not change D-ref value (#84)', async ({ page }) => {
    await drefDriftCheck.check(page);
  });
```

The coordinate theory (CT) tests verify the mathematical correctness of the pitch lattice, note naming, and OKLCH color system without playing any audio. They test `TUNING_MARKERS` ordering, `coordToMidi`, `pitchClassFromCoordX`, note name strings, hue assignments, round-trip fidelity, and cents-deviation at different fifth sizes.

``` {.typescript file=_generated/tests/xstate-graph.spec.ts}
  test('CT-MARKERS-1: TUNING_MARKERS sorted descending by fifth', async ({ page }) => {
    await ctMarkers1Check.check(page);
  });

  test('CT-MARKERS-2: All 8 expected TET markers present', async ({ page }) => {
    await ctMarkers2Check.check(page);
  });

  test('CT-NEAREST-1: findNearestMarker(700) returns 12-TET with distance 0', async ({ page }) => {
    await ctNearest1Check.check(page);
  });

  test('CT-MIDI-1: coordToMidi(0, 0) = 62 (D4)', async ({ page }) => {
    await ctMidi1Check.check(page);
  });

  test('CT-MIDI-2: coordToMidi for known notes', async ({ page }) => {
    await ctMidi2Check.check(page);
  });

  test('CT-PC-1: pitchClassFromCoordX(0) = 2 (D)', async ({ page }) => {
    await ctPc1Check.check(page);
  });

  test('CT-PC-2: pitchClassFromCoordX for various coordinates', async ({ page }) => {
    await ctPc2Check.check(page);
  });

  test('CT-NOTENAME-1: D is at coordinate 0', async ({ page }) => {
    await ctNotename1Check.check(page);
  });

  test('CT-NOTENAME-2: Known note names at various coordinates', async ({ page }) => {
    await ctNotename2Check.check(page);
  });

  test('CT-NOTENAME-3: Double accidentals exist at extreme coordinates', async ({ page }) => {
    await ctNotename3Check.check(page);
  });

  test('CT-HUE-1: D (pitch class 2) has hue 29\u00B0', async ({ page }) => {
    await ctHue1Check.check(page);
  });

  test('CT-HUE-2: Adjacent fifths differ by 210\u00B0 for max contrast', async ({ page }) => {
    await ctHue2Check.check(page);
  });
```

The round-trip fidelity, cents deviation, runtime machine consistency, and double-accidental tests complete the coordinate theory suite.

``` {.typescript file=_generated/tests/xstate-graph.spec.ts}
  test('CT-ROUNDTRIP-1: coordToMidiNote round-trips for canonical positions', async ({ page }) => {
    await ctRoundtrip1Check.check(page);
  });
```

The remaining CT tests verify cents deviation at different fifth sizes, runtime machine state consistency, and double-accidental note naming at extreme grid coordinates.

``` {.typescript file=_generated/tests/xstate-graph.spec.ts}
  test('CT-CENTS-1: At 12-TET (700\u00A2), all coordinates have 0 deviation', async ({ page }) => {
    await ctCents1Check.check(page);
  });

  test('CT-CENTS-2: At 720\u00A2 (5-TET), deviation is 20\u00A2 per fifth step', async ({ page }) => {
    await ctCents2Check.check(page);
  });

  test('CT-MACHINE-1: Runtime overlay machine states match test machine', async ({ page }) => {
    await ctMachine1Check.check(page);
  });

  test('CT-MACHINE-2: Runtime pedal machine states match test sustain/vibrato', async ({ page }) => {
    await ctMachine2Check.check(page);
  });

  test('CT-MACHINE-3: Test panel states map to runtime panel machine states', async ({ page }) => {
    await ctMachine3Check.check(page);
  });

  test('CT-MACHINE-4: Runtime waveform machine has correct initial waveform', async ({ page }) => {
    await ctMachine4Check.check(page);
  });

  test('BH-DOUBLEACCIDENTAL-1: Note naming includes double sharps and flats', async ({ page }) => {
    await bhDoubleAccidental1Check.check(page);
  });
```

The MPE protocol tests (ISC-MPE-* and ISC-SVC-*) verify the MIDI Polyphonic Expression implementation: correct status bytes, valid 14-bit pitch bend encoding, CC74 normalization, FIFO channel allocation, MCM transmission, and the full MPEService lifecycle including settings updates, panic, dispose, pressure mode, and custom CC numbers.

``` {.typescript file=_generated/tests/xstate-graph.spec.ts}
  test('ISC-MPE-1: noteOn sends correct status byte on member channel 2–16', async ({ page }) => {
    await iscMpe1Check.check(page);
  });

  test('ISC-MPE-2: pitch bend produces valid 14-bit LSB/MSB encoding', async ({ page }) => {
    await iscMpe2Check.check(page);
  });

  test('ISC-MPE-3: CC74 slide normalizes 0–1 to 0–127', async ({ page }) => {
    await iscMpe3Check.check(page);
  });

  test('ISC-MPE-4: FIFO channel allocation across channels 2–16', async ({ page }) => {
    await iscMpe4Check.check(page);
  });

  test('ISC-MPE-5: MCM sent on output selection', async ({ page }) => {
    await iscMpe5Check.check(page);
  });

  test('ISC-A-MPE-1: no per-note messages go to manager channel 1', async ({ page }) => {
    await iscAMpe1Check.check(page);
  });
```

The ISC-SVC-* tests exercise the full `MPEService` lifecycle: constructor defaults, settings updates, note-on/off allocation, voice state subscriptions, all-notes-off panic, resource disposal, pressure mode, enable/disable, and custom CC numbers.

``` {.typescript file=_generated/tests/xstate-graph.spec.ts}
  test('ISC-SVC-1: MPEService constructor creates default settings', async ({ page }) => {
    await iscSvc1Check.check(page);
  });

  test('ISC-SVC-2: updateSettings changes configuration', async ({ page }) => {
    await iscSvc2Check.check(page);
  });

  test('ISC-SVC-3: noteOn allocates member channel and sends correct MIDI', async ({ page }) => {
    await iscSvc3Check.check(page);
  });

  test('ISC-SVC-4: noteOff sends correct note-off message', async ({ page }) => {
    await iscSvc4Check.check(page);
  });

  test('ISC-SVC-5: subscribe receives voice state updates', async ({ page }) => {
    await iscSvc5Check.check(page);
  });

  test('ISC-SVC-6: panic sends all-notes-off on all member channels', async ({ page }) => {
    await iscSvc6Check.check(page);
  });

  test('ISC-SVC-7: dispose cleans up resources', async ({ page }) => {
    await iscSvc7Check.check(page);
  });

  test('ISC-SVC-8: configurable pressureMode changes message type', async ({ page }) => {
    await iscSvc8Check.check(page);
  });

  test('ISC-SVC-9: setEnabled(false) prevents note output', async ({ page }) => {
    await iscSvc9Check.check(page);
  });

  test('ISC-SVC-10: configurable timbreCC uses custom CC number', async ({ page }) => {
    await iscSvc10Check.check(page);
  });
```

The ISS-* tests are regression guards for specific GitHub issues: skew notch label text (ISS-81), cog button layout overlap (ISS-87), wave selector UI (ISS-96), keyboard layout reset button (ISS-97), slider-track right-edge alignment (ISS-98), and overlay category heading styles (ISS-92).

``` {.typescript file=_generated/tests/xstate-graph.spec.ts}
  test('ISS-81-1: skew notch at DCompose shows "DCompose / Wicki-Hayden"', async ({ page }) => {
    await iss81SkewNotchCheck.check(page);
  });

  test('ISS-87-1: cog button does not overlap overlay content', async ({ page }) => {
    await iss87CogNoOverlapCheck.check(page);
  });

  test('ISS-96-1: WAVE is a select dropdown with reset button', async ({ page }) => {
    await iss96WaveSelectCheck.check(page);
  });

  test('ISS-97-1: KEYBOARD LAYOUT has reset button that resets to ANSI', async ({ page }) => {
    await iss97LayoutResetCheck.check(page);
  });

   test('ISS-98-1: all slider-track rows share same right edge', async ({ page }) => {
     await iss98AlignmentCheck.check(page);
   });

   test('ISS-92-1: overlay has organized category headings in correct style', async ({ page }) => {
     await iss92OverlayHeadingsCheck.check(page);
   });
```

These tests verify that the game mode infrastructure exists in the DOM and exposes the required JavaScript APIs on `KeyboardVisualizer`. They confirm target-note glow, ghost-note rendering on the history canvas, pointer-event acceptance on the keyboard canvas, the score overlay, calibration button, localStorage calibration key, and the game overlay UI elements.

``` {.typescript file=_generated/tests/xstate-graph.spec.ts}
  test('GAME-TGT-1: target note glow API exists', async ({ page }) => {
    await targetNoteApiExists.check(page);
  });

  test('GAME-GHOST-1: ghost note API exists on history canvas', async ({ page }) => {
    await ghostNoteApiExists.check(page);
  });

  test('GAME-DROP-1: keyboard canvas exists and accepts pointer events', async ({ page }) => {
    await canvasDropZone.check(page);
  });

  test('GAME-SCORE-1: game score overlay can be dynamically created', async ({ page }) => {
    await gameScoreOverlay.check(page);
  });

  test('GAME-CAL-1: calibrate-btn exists in DOM', async ({ page }) => {
    await gameCalibrateBtnExists.check(page);
  });

  test('GAME-CAL-2: gi_calibrated_range localStorage key is valid JSON array when set', async ({ page }) => {
    await gameCalibrationStorage.check(page);
  });

  test('GAME-UI-1: game overlay UI elements exist in DOM', async ({ page }) => {
    await gameOverlayUiExists.check(page);
  });
```

The game integration tests exercise the full pipeline from MIDI parsing through `buildNoteGroups` and into `gameMachine` state transitions. They verify that a well-formed fixture produces valid `NoteEvent` and `NoteGroup` arrays, that `gameMachine` transitions correctly on `SONG_LOADED`, and that a `GAME_RESET` fully clears the context.

``` {.typescript file=_generated/tests/xstate-graph.spec.ts}
  test('GAME-INT-1: MIDI parser produces valid NoteEvent array from fixture', async ({ page }) => {
    await gameMidiParserIntegration.check(page);
  });

  test('GAME-INT-2: buildNoteGroups produces valid NoteGroup array', async ({ page }) => {
    await gameBuildNoteGroupsIntegration.check(page);
  });

  test('GAME-INT-3: gameMachine transitions correctly on SONG_LOADED', async ({ page }) => {
    await gameMachineTransitions.check(page);
  });

  test('GAME-INT-4: game reset returns to idle with cleared context', async ({ page }) => {
    await gameMachineReset.check(page);
  });
```

These tests cover the game's note-matching logic: cellId-based matching rejects wrong grid positions even with correct midiNote, chord groups require all constituent cellIds, single-note groups advance immediately, and the `pressedCellIds` accumulator clears on group advance.

``` {.typescript file=_generated/tests/xstate-graph.spec.ts}
  test('GAME-FREQ-1: correct midiNote with wrong cellId is rejected (cellId-based matching)', async ({ page }) => {
    await gameFreqMatch.check(page);
  });

  test('GAME-FREQ-2: correct cellId with wrong midiNote still advances (cellId-based matching)', async ({ page }) => {
    await gameFreqReject.check(page);
  });

  test('GAME-CHORD-1: multi-note chord requires ALL notes before advancing', async ({ page }) => {
    await gameChordAll.check(page);
  });

  test('GAME-CHORD-2: single-note groups advance immediately', async ({ page }) => {
    await gameChordSingle.check(page);
  });

  test('GAME-CHORD-3: pressedCellIds clears on group advance', async ({ page }) => {
    await gameChordClear.check(page);
  });
```

The remaining game UI tests confirm that progress and multi-cell highlight APIs exist and behave correctly: instructions text is present in the game overlay, `setGameState`/`setGameProgress` exist on `KeyboardVisualizer`, `getCellIdsForMidiNotes` returns multiple positions per pitch (isomorphic mirroring), the tuning slider is unlocked when no game is playing, and the calibration visual API dims uncalibrated cells.

``` {.typescript file=_generated/tests/xstate-graph.spec.ts}
  test('GAME-UI-2: instructions text exists in GAME overlay section', async ({ page }) => {
    await gameInstructionsText.check(page);
  });

  test('GAME-UI-3: setGameState and setGameProgress exist on KeyboardVisualizer', async ({ page }) => {
    await gameProgressApi.check(page);
  });

  test('GAME-HIGHLIGHT-1: getCellIdsForMidiNotes returns multiple cells per pitch', async ({ page }) => {
    await gameMultiCellHighlight.check(page);
  });

  test('GAME-LOCK-1: tuning slider enabled when no game is playing', async ({ page }) => {
    await gameTuningLock.check(page);
  });

  test('GAME-CAL-3: setCalibratedRange API exists on KeyboardVisualizer', async ({ page }) => {
    await gameCalibrationVisualApi.check(page);
  });

  test('GAME-CAL-4: uncalibrated cells render darker than normal cells', async ({ page }) => {
    await gameCalibrationVisualDim.check(page);
  });

  test('GAME-CHORD-PROGRESS-1: setPressedTargetNotes method exists and target-pressed is dimmer than target', async ({ page }) => {
    await gameChordProgress1.check(page);
  });

  test('GAME-RESTART-1: GAME_RESTART event exists in playing and complete states', async ({ page }) => {
    await gameRestart1.check(page);
  });
```

The game engine unit tests verify the pure algorithmic functions in `game-engine.ts` in isolation. They cover chord-grouping windowing, `cellId` deduplication within a chord, semitone transposition, range cropping, optimal transposition search, median MIDI note calculation, and the empty-input edge case.

``` {.typescript file=_generated/tests/xstate-graph.spec.ts}
  test('GAME-ENG-1: buildNoteGroups groups notes within 20ms window into one chord group', async ({ page }) => {
    await gameEngBuildNoteGroups1.check(page);
  });

  test('GAME-ENG-2: buildNoteGroups deduplicates cellIds within a single chord group', async ({ page }) => {
    await gameEngBuildNoteGroups2.check(page);
  });

  test('GAME-ENG-3: transposeSong shifts all midiNotes by N semitones and recalculates cellIds', async ({ page }) => {
    await gameEngTransposeSong.check(page);
  });

  test('GAME-ENG-4: cropToRange removes notes not in range and drops empty groups', async ({ page }) => {
    await gameEngCropToRange.check(page);
  });

  test('GAME-ENG-5: findOptimalTransposition returns the semitone offset that maximises in-range notes', async ({ page }) => {
    await gameEngFindOptimalTransposition.check(page);
  });

  test('GAME-ENG-6: computeMedianMidiNote returns median pitch or 62 for empty input', async ({ page }) => {
    await gameEngComputeMedianMidiNote.check(page);
  });

  test('GAME-ENG-7: buildNoteGroups returns empty array for empty NoteEvent input', async ({ page }) => {
    await gameEngBuildNoteGroupsEmpty.check(page);
  });
```

The MIDI parser tests exercise the binary MIDI parsing layer: multi-track Type 1 files, running status encoding, velocity-0 note-on as note-off, drum channel (ch9) filtering, empty note arrays, corrupt headers, and drum-only files. These invariants protect against regressions in the raw byte-level parser without requiring actual MIDI hardware.

``` {.typescript file=_generated/tests/xstate-graph.spec.ts}
  test('GAME-MIDI-1: Type 1 multi-track MIDI parsed into merged NoteEvent array', async ({ page }) => {
    await gameMidi1.check(page);
  });

  test('GAME-MIDI-2: Running status: consecutive NoteOn events without repeated status byte are decoded', async ({ page }) => {
    await gameMidi2.check(page);
  });

  test('GAME-MIDI-3: Velocity-0 NoteOn treated as NoteOff: closes pending note, not emitted as note-on', async ({ page }) => {
    await gameMidi3.check(page);
  });

  test('GAME-MIDI-4: Channel 9 (drums) is filtered: single open drum note yields empty array', async ({ page }) => {
    await gameMidi4.check(page);
  });

  test('GAME-MIDI-5: Valid MIDI with no notes returns empty array without throwing', async ({ page }) => {
    await gameMidi5.check(page);
  });

  test('GAME-MIDI-6: Corrupt buffer (bad magic bytes) throws with descriptive MThd error', async ({ page }) => {
    await gameMidi6.check(page);
  });

  test('GAME-MIDI-7: MIDI with only drum channel (ch9) events returns empty array after filtering', async ({ page }) => {
    await gameMidi7.check(page);
  });
```

The game state machine (GAME-SM-*) tests exercise every major transition in `gameMachine`: idle → loading on file drop, loading → playing with context initialization, loading → error with stored error message, error reset and retry paths, complete → new game and reset, playing → new song and reset, wrong-note no-op guard, and the tuning-warn acknowledgement flag.

``` {.typescript file=_generated/tests/xstate-graph.spec.ts}
  test('GAME-SM-1: idle → FILE_DROPPED → loading', async ({ page }) => {
    await gameSm1IdleToLoading.check(page);
  });

  test('GAME-SM-2: loading → SONG_LOADED → playing (context initialised: currentGroupIndex=0, startTimeMs set)', async ({ page }) => {
    await gameSm2LoadingToPlaying.check(page);
  });

  test('GAME-SM-3: loading → LOAD_FAILED → error (errorMessage stored in context)', async ({ page }) => {
    await gameSm3LoadingToError.check(page);
  });

  test('GAME-SM-4: error → GAME_RESET → idle (context fully cleared)', async ({ page }) => {
    await gameSm4ErrorReset.check(page);
  });

  test('GAME-SM-5: error → FILE_DROPPED → loading (retry without explicit reset)', async ({ page }) => {
    await gameSm5ErrorRetry.check(page);
  });

  test('GAME-SM-6: complete → FILE_DROPPED → loading (new game from complete state)', async ({ page }) => {
    await gameSm6CompleteNewGame.check(page);
  });

  test('GAME-SM-7: complete → GAME_RESET → idle', async ({ page }) => {
    await gameSm7CompleteReset.check(page);
  });

  test('GAME-SM-8: playing → FILE_DROPPED → loading (new song mid-game, context reset)', async ({ page }) => {
    await gameSm8PlayingNewSong.check(page);
  });

  test('GAME-SM-9: playing → GAME_RESET → idle (pressedCellIds cleared)', async ({ page }) => {
    await gameSm9PlayingReset.check(page);
  });

  test('GAME-SM-10: playing → wrong NOTE_PRESSED → stays in playing (no-op, no accumulation)', async ({ page }) => {
    await gameSm10WrongNoteNoop.check(page);
  });

  test('GAME-SM-11: TUNING_WARN_ACK sets tuningWarnAcknowledged flag in context', async ({ page }) => {
    await gameSm11TuningWarnAck.check(page);
  });
```

The game input tests verify the `NOTE_PRESSED` event handler: a correct `cellId` advances `currentGroupIndex`, a wrong `cellId` is silently rejected even if the `midiNote` matches, preventing mirror-note false positives in non-12-TET tunings.

``` {.typescript file=_generated/tests/xstate-graph.spec.ts}
  test('GAME-INPUT-1: NOTE_PRESSED with correct midiNote field advances currentGroupIndex', async ({ page }) => {
    await gameInput1.check(page);
  });

  test('GAME-INPUT-2: NOTE_PRESSED with wrong cellId is rejected: state, index, and accumulator unchanged', async ({ page }) => {
    await gameInput2.check(page);
  });

  test('GAME-INPUT-3: NOTE_PRESSED with wrong cellId but correct midiNote is rejected — cellId-based matching', async ({ page }) => {
    await gameInput3.check(page);
  });
```

The game edge-case tests handle unusual but valid scenarios: non-MIDI file rejection, drum-only MIDI producing an empty song, same correct note pressed twice (deduplication), `cropToRange` removing all groups, and immediate single-note group advancement. Each test confirms the machine reaches the correct terminal state without hanging.

``` {.typescript file=_generated/tests/xstate-graph.spec.ts}
  test('GAME-EDGE-1: Non-MIDI file: machine enters loading then error (file type validation is in main.ts, not machine)', async ({ page }) => {
    await gameEdge1.check(page);
  });

  test('GAME-EDGE-2: Drum-only events → buildNoteGroups returns empty; machine enters error on LOAD_FAILED', async ({ page }) => {
    await gameEdge2.check(page);
  });

  test('GAME-EDGE-3: Pressing same correct note twice: deduped to 1 entry, two-note chord does not advance', async ({ page }) => {
    await gameEdge3.check(page);
  });

  test('GAME-EDGE-4: cropToRange with empty Set removes all groups; machine enters error on LOAD_FAILED', async ({ page }) => {
    await gameEdge4.check(page);
  });

  test('GAME-EDGE-5: Single-note group advances immediately on correct press (no chord accumulation phase)', async ({ page }) => {
    await gameEdge5.check(page);
  });
```

The MIDI search tests confirm that the search UI exists in the DOM inside `#grid-overlay`, that `searchAllAdapters` returns an array without throwing, that GitHub adapter results carry the required `title/source/fetchUrl` fields, that typing in `#midi-search-input` triggers the search pipeline, that all three adapters implement the `MidiSearchAdapter` interface, and that the input/results elements have the correct types and IDs.

``` {.typescript file=_generated/tests/xstate-graph.spec.ts}
  test('GAME-SEARCH-1: #midi-search-input exists in DOM inside #grid-overlay', async ({ page }) => {
    await gameSearch1.check(page);
  });

  test('GAME-SEARCH-2: searchAllAdapters returns array, never throws', async ({ page }) => {
    await gameSearch2.check(page);
  });

  test('GAME-SEARCH-3: GitHubMidiAdapter results have required fields (title, source, fetchUrl)', async ({ page }) => {
    await gameSearch3.check(page);
  });

  test('GAME-SEARCH-4: typing in #midi-search-input triggers search pipeline', async ({ page }) => {
    await gameSearch4.check(page);
  });

  test('GAME-SEARCH-5: all 3 MIDI adapters implement MidiSearchAdapter interface', async ({ page }) => {
    await gameSearch5.check(page);
  });

  test('GAME-SEARCH-6: #midi-search-input is type=text and #midi-search-results exists', async ({ page }) => {
    await gameSearch6.check(page);
  });
```

The quantization tests verify `quantizeNotes` at each supported resolution: `none` passes events through unchanged, `1/4` snaps to quarter-note grid, long notes split into repeated events, tempo changes adjust grid spacing, time signature changes do not throw, duplicate midi notes at the same grid point are deduplicated, the MIDI parser returns `tempoMap` and `timeSigMap`, the default time signature is 4/4, and odd meters like 7/8 do not break quantization.

``` {.typescript file=_generated/tests/xstate-graph.spec.ts}
  test('GAME-QUANT-1: quantizeNotes with none returns events unchanged', async ({ page }) => {
    await gameQuant1.check(page);
  });

  test('GAME-QUANT-2: quantizeNotes with 1/4 snaps to quarter grid', async ({ page }) => {
    await gameQuant2.check(page);
  });

  test('GAME-QUANT-3: long note splits into repeated events', async ({ page }) => {
    await gameQuant3.check(page);
  });

  test('GAME-QUANT-4: tempo change adjusts grid spacing', async ({ page }) => {
    await gameQuant4.check(page);
  });

  test('GAME-QUANT-5: time signature change handled without error', async ({ page }) => {
    await gameQuant5.check(page);
  });

  test('GAME-QUANT-6: duplicate midiNote at same grid point deduplicated', async ({ page }) => {
    await gameQuant6.check(page);
  });

  test('GAME-QUANT-7: parseMidi returns tempoMap and timeSigMap', async ({ page }) => {
    await gameQuant7.check(page);
  });

  test('GAME-QUANT-8: default time signature is 4/4', async ({ page }) => {
    await gameQuant8.check(page);
  });

   test('GAME-QUANT-9: odd meter (7/8) does not break quantization', async ({ page }) => {
     await gameQuant9.check(page);
   });
```

The SongBar state machine tests confirm that the machine's states are defined, that `#song-bar-hint` is accessible, that the search input lives inside `#song-bar-search`, that the calibrate button is inside `#song-bar-calibrate`, and that calibration confirm/cancel buttons exist inside `#calibration-banner`. The mirror-highlight test confirms that a single MIDI note maps to multiple isomorphic grid positions.

``` {.typescript file=_generated/tests/xstate-graph.spec.ts}
  test('SONGBAR-SM-1: songBarMachine states exist', async ({ page }) => {
    await songBarSm1.check(page);
  });

  test('SONGBAR-SM-2: #song-bar-hint element exists and is accessible', async ({ page }) => {
    await songBarSm2.check(page);
  });

  test('SONGBAR-SM-3: #midi-search-input is a text input inside #song-bar-search', async ({ page }) => {
    await songBarSm3.check(page);
  });

  test('SONGBAR-SM-4: #calibrate-btn exists inside #song-bar-calibrate', async ({ page }) => {
    await songBarSm4.check(page);
  });

   test('SONGBAR-SM-5: calibration confirm and cancel buttons exist inside #calibration-banner', async ({ page }) => {
    await songBarSm5.check(page);
  });

   test('MIRROR-HIGHLIGHT-1: getCellIdsForMidiNotes returns >1 cell for MIDI 62 at multiple isomorphic positions', async ({ page }) => {
    await mirrorHighlight1.check(page);
  });
```

The canvas-clean tests verify that the keyboard canvas renders without any game-mode HUD elements when the app is idle — no hint text, no progress bar, no elapsed timer — while still confirming that the `setGameState` and `setGameProgress` API methods exist on `KeyboardVisualizer` for when game mode is active.

``` {.typescript file=_generated/tests/xstate-graph.spec.ts}
  test('CANVAS-CLEAN-1: canvas has no hint text at center-bottom when idle', async ({ page }) => {
    await CANVAS_CLEAN_1.check(page);
  });

  test('CANVAS-CLEAN-2: canvas has no progress bar at top', async ({ page }) => {
    await CANVAS_CLEAN_2.check(page);
  });

  test('CANVAS-CLEAN-3: canvas has no elapsed timer text at top-right', async ({ page }) => {
    await CANVAS_CLEAN_3.check(page);
  });

  test('CANVAS-CLEAN-4: KeyboardVisualizer.setGameState method still exists', async ({ page }) => {
    await CANVAS_CLEAN_4.check(page);
  });

  test('CANVAS-CLEAN-5: KeyboardVisualizer.setGameProgress method still exists', async ({ page }) => {
    await CANVAS_CLEAN_5.check(page);
  });
```

The SongBar hint tests verify that `#song-bar-hint` is right-aligned via `margin-left: auto`, that its right edge tracks the song-bar container, and that it hides (becomes invisible) both when the search input is focused and when the user types in it — confirming the idle→active visibility transition for the hint element.

``` {.typescript file=_generated/tests/xstate-graph.spec.ts}
  test('SONGBAR-HINT-1: #song-bar-hint has margin-left: auto (right-aligned)', async ({ page }) => {
    await SONGBAR_HINT_1.check(page);
  });

  test('SONGBAR-HINT-2: #song-bar-hint right edge is near #song-bar right edge', async ({ page }) => {
    await SONGBAR_HINT_2.check(page);
  });

  test('SONGBAR-HINT-3: Focusing #midi-search-input hides #song-bar-hint', async ({ page }) => {
    await SONGBAR_HINT_3.check(page);
  });

  test('SONGBAR-HINT-4: Typing in #midi-search-input hides #song-bar-hint', async ({ page }) => {
    await SONGBAR_HINT_4.check(page);
  });

  test('SONGBAR-SEARCH-LABEL-1: A visible "SEARCH" label exists adjacent to #midi-search-input', async ({ page }) => {
    await SONGBAR_SEARCH_LABEL_1.check(page);
  });
```

The SongBar progress and calibration tests verify that the in-game status elements (`#game-elapsed-timer`, `#game-progress`, `#game-song-title`, `#game-reset-btn`) exist inside `#game-status` and have the correct text content, and that the calibrate button is enabled, correctly labelled, and reachable in the song-bar area.

``` {.typescript file=_generated/tests/xstate-graph.spec.ts}
  test('SONGBAR-PROGRESS-1: #game-elapsed-timer element exists inside #game-status', async ({ page }) => {
    await SONGBAR_PROGRESS_1.check(page);
  });

  test('SONGBAR-PROGRESS-2: #game-progress element exists inside #game-status', async ({ page }) => {
    await SONGBAR_PROGRESS_2.check(page);
  });

  test('SONGBAR-PROGRESS-3: #game-song-title element exists inside #game-status', async ({ page }) => {
    await SONGBAR_PROGRESS_3.check(page);
  });

  test('SONGBAR-PROGRESS-4: #game-reset-btn text is "⟲ Restart"', async ({ page }) => {
    await SONGBAR_PROGRESS_4.check(page);
  });

  test('SONGBAR-CAL-1: #calibrate-btn text is "Calibrate Playable Area"', async ({ page }) => {
    await SONGBAR_CAL_1.check(page);
  });

  test('SONGBAR-CAL-2: #calibrate-btn is not disabled when game is idle', async ({ page }) => {
    await SONGBAR_CAL_2.check(page);
  });

  test('SONGBAR-CAL-3: Calibration message text mentions "playable area"', async ({ page }) => {
    await SONGBAR_CAL_3.check(page);
  });

  test('SONGBAR-CAL-4: #calibrate-btn exists in the song-bar area', async ({ page }) => {
    await SONGBAR_CAL_4.check(page);
  });
```

The info popup tests verify the `SLIDER_INFO` popup system: that info buttons exist for quantization and calibration, that clicking the quantization button opens `#info-dialog`, that `#info-dialog` uses `position: fixed`, that the `SLIDER_INFO` map has non-empty entries for both keys, and that the quantization label reads "QUANTIZE" rather than the legacy "DIFF".

``` {.typescript file=_generated/tests/xstate-graph.spec.ts}
  test('INFO-POPUP-1: .slider-info-btn[data-info="quantization"] exists in song-bar area', async ({ page }) => {
    await INFO_POPUP_1.check(page);
  });

  test('INFO-POPUP-2: .slider-info-btn[data-info="calibration"] exists in song-bar area', async ({ page }) => {
    await INFO_POPUP_2.check(page);
  });

  test('INFO-POPUP-3: Clicking quantization info button opens #info-dialog', async ({ page }) => {
    await INFO_POPUP_3.check(page);
  });

  test('INFO-POPUP-4: #info-dialog has position: fixed (works from any parent)', async ({ page }) => {
    await INFO_POPUP_4.check(page);
  });

  test('INFO-POPUP-5: SLIDER_INFO has quantization and calibration entries (non-empty)', async ({ page }) => {
    await INFO_POPUP_5.check(page);
  });

  test('INFO-POPUP-LABEL-1: Quantization label text is "QUANTIZE" (not "DIFF")', async ({ page }) => {
    await INFO_POPUP_LABEL_1.check(page);
  });
```

The EXPRESSION section tests confirm that info buttons for all four expression parameters (bend, velocity, pressure, timbre) exist in the correct overlay section, and that the timbre row includes a CC mode selector. The pitch-bend style tests confirm the range input uses `type="text"` (no native spinner arrows) and matches the project's design-language rules (no border-radius, JetBrains Mono).

``` {.typescript file=_generated/tests/xstate-graph.spec.ts}
  test('EXPR-JOINT-1: .slider-info-btn[data-info="bend"] exists in EXPRESSION section', async ({ page }) => {
    await EXPR_JOINT_1.check(page);
  });

  test('EXPR-JOINT-2: .slider-info-btn[data-info="velocity"] exists in EXPRESSION section', async ({ page }) => {
    await EXPR_JOINT_2.check(page);
  });

  test('EXPR-JOINT-3: .slider-info-btn[data-info="pressure"] exists in EXPRESSION section', async ({ page }) => {
    await EXPR_JOINT_3.check(page);
  });

  test('EXPR-JOINT-4: .slider-info-btn[data-info="timbre"] exists and timbre has CC mode select', async ({ page }) => {
    await EXPR_JOINT_4.check(page);
  });

  test('PB-STYLE-1: Pitch bend range input has type="text" (no native spinner arrows)', async ({ page }) => {
    await PB_STYLE_1.check(page);
  });

  test('PB-STYLE-2: Pitch bend range input has no border-radius and uses JetBrains Mono', async ({ page }) => {
    await PB_STYLE_2.check(page);
  });

  test('IDLE-FADE-1: #song-bar-hint has opacity transition CSS', async ({ page }) => {
    await IDLE_FADE_1.check(page);
  });

  test('IDLE-FADE-2: #song-bar-hint is visible (opacity > 0) on page load when idle', async ({ page }) => {
    await IDLE_FADE_2.check(page);
  });
```

The ideal-state invariants (IDEAL-* prefix) define the project's "done" criteria: zero duplicate element IDs, no "D4" text in non-grid UI elements, MIDI settings contains an EXPRESSION subtitle, and exactly one flat-sound-toggle checkbox. If all four pass the project is structurally complete. The section also includes three additional golden screenshots (overlay, mobile viewport, QWERTY labels) plus UI-completeness and design-vow checks.

``` {.typescript file=_generated/tests/xstate-graph.spec.ts}
  test('IDEAL-NO-DUP-IDS: Zero duplicate element IDs', async ({ page }) => {
    await NO_DUPLICATE_IDS.check(page);
  });

  test('IDEAL-NO-D4: No D4 text in UI', async ({ page }) => {
    await NO_D4_IN_UI.check(page);
  });

  test('IDEAL-MIDI-GROUPED: MIDI settings has EXPRESSION subtitle', async ({ page }) => {
    await MIDI_SETTINGS_GROUPED.check(page);
  });

  test('IDEAL-SINGLE-FLAT: Exactly one flat-sound-toggle', async ({ page }) => {
    await SINGLE_FLAT_SOUND.check(page);
  });
```

The golden screenshot tests compare rendered pixels against stored reference images, and the UI-completeness and design-vow checks enforce project-wide structural rules before closing the `[Structural]` describe block.

``` {.typescript file=_generated/tests/xstate-graph.spec.ts}
  test('GOLDEN-OVERLAY-2: Overlay screenshot golden', async ({ page }) => {
    await overlayGoldenCheck2.check(page);
  });

  test('GOLDEN-MOBILE: Mobile viewport golden', async ({ page }) => {
    await mobileGoldenCheck.check(page);
  });

  test('GOLDEN-QWERTY: QWERTY labels golden', async ({ page }) => {
    await qwertyGoldenCheck.check(page);
  });

  test('UI-FULLSCREEN-1: Fullscreen button exists', async ({ page }) => {
    await FULLSCREEN_BTN.check(page);
  });

  test('UI-FLAT-SOUND-1: Flat sound toggle exists', async ({ page }) => {
    await FLAT_SOUND_TOGGLE.check(page);
  });

  test('UI-INFO-COMPLETE-1: All 9 info buttons exist', async ({ page }) => {
    await ALL_INFO_BTNS.check(page);
  });

  test('UI-INFO-HOVER-1: Every info button has hover preview with content', async ({ page }) => {
    await INFO_HOVER_PREVIEW.check(page);
  });

  test('UI-COG-INVERT-1: Grid cog inverts when overlay opens, reverts on close', async ({ page }) => {
    await COG_ACTIVE_INVERSION.check(page);
  });

  test('VOW-NO-NATIVE-SELECT: No native select elements', async ({ page }) => {
    await VOW_NO_NATIVE_SELECT.check(page);
  });

  test('VOW-NO-SCROLL: Body overflow hidden', async ({ page }) => {
    await VOW_NO_SCROLL.check(page);
  });

  test('VOW-SINGLE-FONT: JetBrains Mono only', async ({ page }) => {
    await VOW_SINGLE_FONT.check(page);
  });

  test('VOW-NO-BORDER-RADIUS: Sharp corners (dialogs excepted)', async ({ page }) => {
    await VOW_NO_BORDER_RADIUS.check(page);
  });

  test('VOW-NO-RAW-TOOLTIPS: Zero title= attributes', async ({ page }) => {
    await VOW_NO_RAW_TOOLTIPS.check(page);
  });

  test('SMOKE-1: Grid cog opens overlay with visible controls', async ({ page }) => {
    await page.locator('#grid-settings-btn').click();
    await page.waitForTimeout(200);
    const overlay = page.locator('#grid-overlay');
    await expect(overlay).toBeVisible();
    await expect(page.locator('#volume-slider')).toBeAttached();
    await expect(page.locator('#tuning-slider')).toBeAttached();
    await expect(page.locator('#zoom-slider')).toBeAttached();
    await page.keyboard.press('Escape');
  });

  test('SMOKE-2: Key press plays note — visualizer responds', async ({ page }) => {
    const canvas = page.locator('#keyboard-canvas');
    await expect(canvas).toBeVisible();
    await page.keyboard.press('KeyH');
    await page.waitForTimeout(500);
    await page.keyboard.up('KeyH');
  });

  test('SMOKE-3: Calibrate button inverts and banner appears', async ({ page }) => {
    const btn = page.locator('#calibrate-btn');
    await expect(btn).toHaveText('Calibrate Playable Area');
    await btn.click();
    await page.waitForTimeout(300);
    await expect(btn).toHaveText('Calibrating...');
    const banner = page.locator('#calibration-banner');
    await expect(banner).toBeVisible();
    await page.locator('#calibrate-cancel').click();
    await page.waitForTimeout(200);
    await expect(btn).toHaveText('Calibrate Playable Area');
  });

  test('SMOKE-6: Vis overlay opens with TIME and RANGE sliders', async ({ page }) => {
    await page.locator('#vis-settings-btn').click();
    await page.waitForTimeout(200);
    await expect(page.locator('#vis-time-slider')).toBeAttached();
    await expect(page.locator('#vis-range-slider')).toBeAttached();
    await page.keyboard.press('Escape');
  });

  test('SMOKE-5: Wave dropdown opens and shows options', async ({ page }) => {
    await page.locator('#grid-settings-btn').click();
    await page.waitForTimeout(200);
    const ssMain = page.locator('.ss-main').first();
    await ssMain.click();
    await page.waitForTimeout(300);
    const optCount = await page.locator('.ss-content .ss-option').first().count();
    expect(optCount).toBeGreaterThan(0);
    await page.keyboard.press('Escape');
  });

  test('SMOKE-7: Dvorak layout appears in keyboard dropdown', async ({ page }) => {
    await page.locator('#grid-settings-btn').click();
    await page.waitForTimeout(200);
    const layoutSelect = page.locator('.ss-content .ss-option');
    await page.locator('.ss-main').nth(1).click();
    await page.waitForTimeout(200);
    const texts = await layoutSelect.allTextContents();
    const hasDvorak = texts.some(t => t.includes('Dvorak'));
    expect(hasDvorak).toBe(true);
    await page.keyboard.press('Escape');
  });

  test('SMOKE-8: Mobile viewport — grid visible and playable at 375px', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.waitForTimeout(500);
    const canvas = page.locator('#keyboard-canvas');
    const box = await canvas.boundingBox();
    expect(box).not.toBeNull();
    if (box) {
      expect(box.width).toBeCloseTo(375, -1);
      expect(box.height).toBeGreaterThan(200);
    }
  });

  test('SMOKE-10: Upload button and pressure CC source exist', async ({ page }) => {
    const uploadBtn = page.locator('#midi-file-input');
    await expect(uploadBtn).toBeAttached();
    await page.locator('#grid-settings-btn').click();
    await page.waitForTimeout(200);
    const pressureCcBtn = page.locator('#pressure-cc-source');
    await expect(pressureCcBtn).toBeAttached();
    await page.keyboard.press('Escape');
  });

  test('SMOKE-4: Info buttons are 14x14 square text buttons', async ({ page }) => {
    await page.locator('#grid-settings-btn').click();
    await page.waitForTimeout(200);
    const infoBtns = page.locator('.slider-info-btn:visible');
    const count = await infoBtns.count();
    expect(count).toBeGreaterThan(3);
    for (let i = 0; i < Math.min(count, 5); i++) {
      const box = await infoBtns.nth(i).boundingBox();
      if (box) {
        expect(Math.round(box.width)).toBeCloseTo(14, -1);
        expect(Math.round(box.height)).toBeCloseTo(14, -1);
      }
    }
    await page.keyboard.press('Escape');
  });
 });
```

The graph-generated transition loop has been **removed** as part of the testing
harness restructure (#213, #214). The 226 graph tests tested CSS class toggling
(implementation details), not user experience. They caused:
- 15-minute timeouts from combinatoric explosion (10 machines × N states × M events)
- False confidence — tests passed while the app was broken for real users
- Fragility — any CSS class rename broke dozens of tests

The structural invariants above + the SMOKE tests replace this loop with
tests that verify what the USER sees, not what the DOM classes say.

XState machines remain the source of truth for state transitions — the machines
themselves guarantee correctness. Testing that `class.contains('hidden')` toggles
is redundant when the machine already enforces the state contract.
