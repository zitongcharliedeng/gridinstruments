import { setup, createActor } from 'xstate';

const smoke = setup({ types: { context: {} as { ok: boolean } } }).createMachine({
  id: 'smoke',
  context: { ok: true },
});

const actor = createActor(smoke);
actor.start();

console.assert(actor.getSnapshot().context.ok === true);

export {};
