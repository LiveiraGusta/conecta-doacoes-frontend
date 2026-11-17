/**
 * Só aceita redirect interno (começa com "/" e não com "//" nem "/\"): um `?redirect=https://outro.site`
 * ou `//outro.site` não pode levar o usuário para fora do app depois do login (open redirect).
 */
export function safeRedirect(value: string | null | undefined): string | null {
  return value && value.startsWith('/') && !value.startsWith('//') && !value.startsWith('/\\') ? value : null;
}
