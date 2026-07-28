// Injeta o tema antes do primeiro render para evitar flash
export default function ThemeScript() {
  const script = `
    (function() {
      try {
        var t = localStorage.getItem('theme');
        var el = document.documentElement;
        el.classList.remove('dark', 'light');
        el.classList.add(t === 'dark' ? 'dark' : 'light');
      } catch(e) {}
    })();
  `
  return <script dangerouslySetInnerHTML={{ __html: script }} />
}
