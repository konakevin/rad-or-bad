import { renderHook, act } from '@testing-library/react-native';
import { useDreamAlbum, type DreamAlbumItem } from '@/hooks/useDreamAlbum';

const MOCK_ITEM: DreamAlbumItem = {
  url: 'https://example.com/dream.jpg',
  prompt: 'a fox in a forest',
  fromWish: null,
  dreamMode: 'dream_me',
  controlState: {
    selectedMode: 'dream_me',
    customPrompt: '',
    reDreamCurrent: false,
    reusePhoto: false,
  },
};

describe('useDreamAlbum', () => {
  it('starts empty', () => {
    const { result } = renderHook(() => useDreamAlbum());
    expect(result.current.album).toEqual([]);
    expect(result.current.activeIndex).toBe(0);
    expect(result.current.activeDream).toBeNull();
  });

  it('addDream appends to album and updates activeIndex', () => {
    const { result } = renderHook(() => useDreamAlbum());
    act(() => result.current.addDream(MOCK_ITEM));
    expect(result.current.album).toHaveLength(1);
    expect(result.current.album[0].url).toBe('https://example.com/dream.jpg');
  });

  it('addDream sets activeIndex to new item', () => {
    const { result } = renderHook(() => useDreamAlbum());
    act(() => result.current.addDream(MOCK_ITEM));
    act(() => result.current.addDream({ ...MOCK_ITEM, url: 'https://example.com/dream2.jpg' }));
    expect(result.current.album).toHaveLength(2);
    expect(result.current.activeIndex).toBe(1);
  });

  it('removeDream removes by index and fixes bounds', () => {
    const { result } = renderHook(() => useDreamAlbum());
    act(() => result.current.addDream(MOCK_ITEM));
    act(() => result.current.addDream({ ...MOCK_ITEM, url: 'https://example.com/dream2.jpg' }));
    act(() => result.current.removeDream(0));
    expect(result.current.album).toHaveLength(1);
    expect(result.current.album[0].url).toBe('https://example.com/dream2.jpg');
    expect(result.current.activeIndex).toBe(0);
  });

  it('removeDream on last item does not go negative', () => {
    const { result } = renderHook(() => useDreamAlbum());
    act(() => result.current.addDream(MOCK_ITEM));
    act(() => result.current.removeDream(0));
    expect(result.current.album).toHaveLength(0);
    expect(result.current.activeIndex).toBe(0);
  });

  it('clearAlbum resets everything', () => {
    const { result } = renderHook(() => useDreamAlbum());
    act(() => result.current.addDream(MOCK_ITEM));
    act(() => result.current.setSelectedMode('chaos'));
    act(() => result.current.setCustomPrompt('test'));
    act(() => result.current.clearAlbum());
    expect(result.current.album).toEqual([]);
    expect(result.current.activeIndex).toBe(0);
    expect(result.current.selectedMode).toBe('dream_me');
    expect(result.current.customPrompt).toBe('');
  });

  it('makeControlState captures current controls', () => {
    const { result } = renderHook(() => useDreamAlbum());
    act(() => result.current.setSelectedMode('cinematic_poster'));
    act(() => result.current.setCustomPrompt('a dragon'));
    const cs = result.current.makeControlState();
    expect(cs.selectedMode).toBe('cinematic_poster');
    expect(cs.customPrompt).toBe('a dragon');
    expect(cs.reDreamCurrent).toBe(false);
    expect(cs.reusePhoto).toBe(false);
  });

  it('restoreControlsFromDream sets controls from dream item', () => {
    const { result } = renderHook(() => useDreamAlbum());
    const item: DreamAlbumItem = {
      ...MOCK_ITEM,
      controlState: {
        selectedMode: 'chaos',
        customPrompt: 'restored prompt',
        reDreamCurrent: true,
        reusePhoto: false,
      },
    };
    act(() => result.current.restoreControlsFromDream(item));
    expect(result.current.selectedMode).toBe('chaos');
    expect(result.current.customPrompt).toBe('restored prompt');
    expect(result.current.reDreamCurrent).toBe(true);
  });
});
