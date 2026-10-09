// Small inline-SVG icon set (stroke-based, 24x24, currentColor) used instead of emoji so
// both themes render them crisply and consistently across platforms.

const svg = (inner, viewBox = '0 0 24 24') =>
  `<svg viewBox="${viewBox}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${inner}</svg>`;

export const icons = {
  logo: svg(
    '<path d="M12 3 4 6.5v5.2c0 4.6 3.3 7.4 8 9.3 4.7-1.9 8-4.7 8-9.3V6.5L12 3Z"/><path d="M9 12l2 2 4-4.5"/>'
  ),
  sun: svg(
    '<circle cx="12" cy="12" r="4"/><path d="M12 2v2.5M12 19.5V22M4.2 4.2l1.8 1.8M18 18l1.8 1.8M2 12h2.5M19.5 12H22M4.2 19.8l1.8-1.8M18 6l1.8-1.8"/>'
  ),
  moon: svg('<path d="M20 14.5A8.5 8.5 0 1 1 9.5 4 7 7 0 0 0 20 14.5Z"/>'),
  globe: svg(
    '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.5 3.8 5.8 3.8 9s-1.3 6.5-3.8 9c-2.5-2.5-3.8-5.8-3.8-9s1.3-6.5 3.8-9Z"/>'
  ),
  chevronDown: svg('<path d="M6 9l6 6 6-6"/>'),
  externalLink: svg('<path d="M14 5h5v5M19 5 10 14M9 5H6a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-3"/>'),
  checkCircle: svg('<circle cx="12" cy="12" r="9"/><path d="M8.5 12.3l2.3 2.3 4.7-5.1"/>'),
  alertTriangle: svg('<path d="M12 3.5 21 19H3L12 3.5Z"/><path d="M12 9.5v4M12 16.2v.1"/>'),
  clock: svg('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/>'),
  helpCircle: svg('<circle cx="12" cy="12" r="9"/><path d="M9.7 9.3a2.3 2.3 0 1 1 3.4 2c-.9.6-1.1 1-1.1 2.2M12 17v.1"/>'),
  xCircle: svg('<circle cx="12" cy="12" r="9"/><path d="M9 9l6 6M15 9l-6 6"/>'),
  search: svg('<circle cx="11" cy="11" r="7"/><path d="M20 20l-4.3-4.3"/>'),
  info: svg('<circle cx="12" cy="12" r="9"/><path d="M12 8v.1M12 11v5"/>'),
  chart: svg('<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>'),
  plusCircle: svg('<circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/>'),
  warning: svg('<path d="M12 3.5 21 19H3L12 3.5Z"/><path d="M12 9.5v4M12 16.2v.1"/>'),
  arrowRight: svg('<path d="M5 12h14M13 6l6 6-6 6"/>'),
};

export function icon(name, className = '') {
  const markup = icons[name] ?? '';
  if (!className) return markup;
  return markup.replace('<svg ', `<svg class="${className}" `);
}
