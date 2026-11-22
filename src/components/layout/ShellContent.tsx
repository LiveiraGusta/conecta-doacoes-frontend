/**
 * O `<main>` de cada casca recebe o `div` da página (ver AppShell): mover o nó do DOM não remonta nada.
 */
export function ShellContent({ content, className }: { content: HTMLElement; className?: string }) {
  return (
    <main
      id="conteudo"
      className={className}
      ref={(el) => {
        if (el && content.parentNode !== el) el.appendChild(content);
      }}
    />
  );
}
