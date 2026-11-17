/**
 * Preferências do chat que ficam só neste navegador (decisão da fase 6): som e aviso de mensagem nova.
 * Guardadas como JSON (`true`/`false`) pelo useLocalStorage da tela de configurações; o padrão é ligado.
 */
export const CHAT_SOUND_KEY = 'cd:chat-sound';
export const CHAT_NOTIFY_KEY = 'cd:chat-notify';

export function chatPrefEnabled(key: string): boolean {
  try {
    return localStorage.getItem(key) !== 'false';
  } catch {
    return true;
  }
}
