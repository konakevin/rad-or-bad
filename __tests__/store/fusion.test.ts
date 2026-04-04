import { useFusionStore } from '@/store/fusion';

const TEST_TARGET = {
  postId: 'post-123',
  prompt: 'pixel art, retro game aesthetic, a fox in a forest',
  imageUrl: 'https://example.com/image.jpg',
  username: 'testuser',
  userId: 'user-456',
  recipeId: null,
};

// Reset store before each test
beforeEach(() => {
  useFusionStore.getState().clear();
});

describe('fusion store', () => {
  it('starts in normal mode with no target', () => {
    const { mode, target } = useFusionStore.getState();
    expect(mode).toBe('normal');
    expect(target).toBeNull();
  });

  it('setStyleRef sets mode and target', () => {
    useFusionStore.getState().setStyleRef(TEST_TARGET);
    const { mode, target } = useFusionStore.getState();
    expect(mode).toBe('style_ref');
    expect(target).toEqual(TEST_TARGET);
  });

  it('setTwin sets mode and target', () => {
    useFusionStore.getState().setTwin(TEST_TARGET);
    const { mode, target } = useFusionStore.getState();
    expect(mode).toBe('twin');
    expect(target).toEqual(TEST_TARGET);
  });

  it('setFuse sets mode and target', () => {
    useFusionStore.getState().setFuse(TEST_TARGET);
    const { mode, target } = useFusionStore.getState();
    expect(mode).toBe('fuse');
    expect(target).toEqual(TEST_TARGET);
  });

  it('clear resets mode and target', () => {
    useFusionStore.getState().setStyleRef(TEST_TARGET);
    expect(useFusionStore.getState().mode).toBe('style_ref');

    useFusionStore.getState().clear();
    const { mode, target } = useFusionStore.getState();
    expect(mode).toBe('normal');
    expect(target).toBeNull();
  });

  it('setStyleRef then clear then setTwin — no state leak', () => {
    useFusionStore.getState().setStyleRef(TEST_TARGET);
    useFusionStore.getState().clear();
    useFusionStore.getState().setTwin({
      ...TEST_TARGET,
      postId: 'different-post',
      prompt: 'different prompt',
    });

    const { mode, target } = useFusionStore.getState();
    expect(mode).toBe('twin');
    expect(target?.postId).toBe('different-post');
    expect(target?.prompt).toBe('different prompt');
  });

  it('switching modes overwrites previous target', () => {
    useFusionStore.getState().setStyleRef(TEST_TARGET);
    useFusionStore.getState().setFuse({
      ...TEST_TARGET,
      postId: 'fuse-post',
    });

    const { mode, target } = useFusionStore.getState();
    expect(mode).toBe('fuse');
    expect(target?.postId).toBe('fuse-post');
  });

  it('prompt is preserved in target for style_ref', () => {
    useFusionStore.getState().setStyleRef(TEST_TARGET);
    const { target } = useFusionStore.getState();
    expect(target?.prompt).toBe('pixel art, retro game aesthetic, a fox in a forest');
  });

  it('prompt survives mode change without clear', () => {
    useFusionStore.getState().setStyleRef(TEST_TARGET);
    // Simulate what happens if mode is changed without clearing
    const oldTarget = useFusionStore.getState().target;
    useFusionStore.getState().setFuse(oldTarget!);
    expect(useFusionStore.getState().target?.prompt).toBe(TEST_TARGET.prompt);
  });
});
