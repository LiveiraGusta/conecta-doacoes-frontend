import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { setViewport } from '@/test/render';
import { useIsMobile } from './useMediaQuery';
import { useLocalStorage } from './useLocalStorage';
import { useOnlineStatus } from './useOnlineStatus';

describe('useIsMobile', () => {
  it('segue o breakpoint md (767 px)', () => {
    setViewport('mobile');
    expect(renderHook(() => useIsMobile()).result.current).toBe(true);
    setViewport('desktop');
    expect(renderHook(() => useIsMobile()).result.current).toBe(false);
  });
});

describe('useOnlineStatus', () => {
  it('acompanha os eventos online/offline', () => {
    const onLine = vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
    const { result } = renderHook(() => useOnlineStatus());
    expect(result.current).toBe(true);
    onLine.mockReturnValue(false);
    act(() => void window.dispatchEvent(new Event('offline')));
    expect(result.current).toBe(false);
  });
});

describe('useLocalStorage', () => {
  it('lê, grava e sobrevive a storage bloqueado', () => {
    localStorage.setItem('k', JSON.stringify(42));
    const { result } = renderHook(() => useLocalStorage('k', 0));
    expect(result.current[0]).toBe(42);
    act(() => result.current[1](7));
    expect(result.current[0]).toBe(7);
    expect(localStorage.getItem('k')).toBe('7');

    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('bloqueado');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('bloqueado');
    });
    const blocked = renderHook(() => useLocalStorage('k', 'padrão'));
    expect(blocked.result.current[0]).toBe('padrão');
    act(() => blocked.result.current[1]('novo'));
    expect(blocked.result.current[0]).toBe('novo');
  });
});
