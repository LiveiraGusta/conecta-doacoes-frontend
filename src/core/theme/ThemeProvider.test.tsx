import { act, render, renderHook, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { setMatchMedia } from '@/test/setup';
import { THEME_STORAGE_KEY } from './theme';
import { ThemeProvider } from './ThemeProvider';
import { useTheme } from './useTheme';

const wrapper = ({ children }: { children: React.ReactNode }) => <ThemeProvider>{children}</ThemeProvider>;

describe('ThemeProvider', () => {
  it('começa pelo tema salvo e aplica no <html>', () => {
    localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify({ color: 'VERDE', mode: 'DARK' }));
    const { result } = renderHook(() => useTheme(), { wrapper });
    expect(result.current).toMatchObject({ color: 'VERDE', mode: 'DARK' });
    expect(document.documentElement.dataset.themeColor).toBe('verde');
    expect(document.documentElement).toHaveClass('dark');
  });

  it('setColor, setMode e setTheme aplicam e persistem', () => {
    const { result } = renderHook(() => useTheme(), { wrapper });
    act(() => result.current.setColor('ROXO'));
    expect(document.documentElement.dataset.themeColor).toBe('roxo');
    act(() => result.current.setMode('DARK'));
    expect(document.documentElement).toHaveClass('dark');
    expect(JSON.parse(localStorage.getItem(THEME_STORAGE_KEY)!)).toEqual({ color: 'ROXO', mode: 'DARK' });

    act(() => result.current.setTheme({ color: 'ROSA', mode: 'LIGHT' }));
    expect(document.documentElement.dataset.themeColor).toBe('rosa');
    expect(document.documentElement).not.toHaveClass('dark');
  });

  it('modo SYSTEM com o sistema escuro liga a classe dark e escuta mudanças', () => {
    setMatchMedia((q) => q.includes('dark'));
    renderHook(() => useTheme(), { wrapper });
    expect(document.documentElement).toHaveClass('dark');
    expect(window.matchMedia('(prefers-color-scheme: dark)').addEventListener).toBeDefined();
  });

  it('aceita um tema inicial explícito (ex.: vindo do /auth/me)', () => {
    render(
      <ThemeProvider initial={{ color: 'LARANJA', mode: 'LIGHT' }}>
        <span>ok</span>
      </ThemeProvider>,
    );
    expect(screen.getByText('ok')).toBeInTheDocument();
    expect(document.documentElement.dataset.themeColor).toBe('laranja');
  });

  it('useTheme fora do provider avisa o erro', () => {
    expect(() => renderHook(() => useTheme())).toThrow('useTheme precisa estar dentro de <ThemeProvider>');
  });
});
