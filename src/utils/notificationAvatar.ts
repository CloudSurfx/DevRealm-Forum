import { ChatMessage, Member } from '../types/forum';

const avatarIconCache = new Map<string, string>();

function normalizeInitials(initials: string): string {
  const clean = initials.trim().slice(0, 2).toUpperCase();
  return clean || 'LD';
}

function normalizeColor(color: string): string {
  return /^#[0-9a-f]{3,8}$/i.test(color.trim()) ? color.trim() : '#a88bfa';
}

function createSvgFallbackUri(initials: string, backgroundColor: string): string {
  const safeInitials = initials.replace(/[<>&"']/g, '');
  const svg = [
    '<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">',
    `<rect x="0" y="0" width="128" height="128" rx="28" fill="${backgroundColor}" />`,
    '<rect x="2" y="2" width="124" height="124" rx="26" fill="none" stroke="rgba(255,255,255,0.28)" stroke-width="4" />',
    `<text x="64" y="68" text-anchor="middle" dominant-baseline="central" font-family="Inter, system-ui, -apple-system, sans-serif" font-size="48" font-weight="800" fill="#0f0c18">${safeInitials}</text>`,
    '</svg>',
  ].join('');

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

/**
 * Generates a crisp 128x128 PNG data URI (with SVG fallback) matching the forum's
 * rounded-square member avatar so browser Notification icons render reliably across OSes.
 */
export function createInitialsAvatarDataUri(
  initials: string,
  backgroundColor: string
): string | undefined {
  if (typeof document === 'undefined') return undefined;

  const safeInitials = normalizeInitials(initials);
  const safeColor = normalizeColor(backgroundColor);
  const cacheKey = `${safeInitials}|${safeColor}`;

  const cached = avatarIconCache.get(cacheKey);
  if (cached) return cached;

  try {
    const size = 128;
    const radius = 28;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      const svgUri = createSvgFallbackUri(safeInitials, safeColor);
      avatarIconCache.set(cacheKey, svgUri);
      return svgUri;
    }

    // Rounded square background
    ctx.beginPath();
    ctx.moveTo(radius, 0);
    ctx.lineTo(size - radius, 0);
    ctx.quadraticCurveTo(size, 0, size, radius);
    ctx.lineTo(size, size - radius);
    ctx.quadraticCurveTo(size, size, size - radius, size);
    ctx.lineTo(radius, size);
    ctx.quadraticCurveTo(0, size, 0, size - radius);
    ctx.lineTo(0, radius);
    ctx.quadraticCurveTo(0, 0, radius, 0);
    ctx.closePath();
    ctx.fillStyle = safeColor;
    ctx.fill();

    // Subtle inner highlight ring
    ctx.lineWidth = 4;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.28)';
    ctx.stroke();

    // Bold centered initials
    ctx.fillStyle = '#0f0c18';
    ctx.font = '800 48px Inter, system-ui, -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(safeInitials, size / 2, size / 2 + 2);

    const pngUri = canvas.toDataURL('image/png');
    avatarIconCache.set(cacheKey, pngUri);
    return pngUri;
  } catch {
    const svgUri = createSvgFallbackUri(safeInitials, safeColor);
    avatarIconCache.set(cacheKey, svgUri);
    return svgUri;
  }
}

/**
 * Resolves the best notification icon for a live chat message:
 * uses an explicit avatar URL when available, or generates an avatar icon
 * from the sender's initials and profile color.
 */
export function resolveChatNotificationIcon(
  message: Pick<ChatMessage, 'authorName' | 'authorInitials' | 'authorColor' | 'authorAvatarUrl'>,
  members: Member[]
): string | undefined {
  if (message.authorAvatarUrl) {
    return message.authorAvatarUrl;
  }

  const matchedMember = members.find((m) => m.name === message.authorName);
  if (matchedMember?.avatarUrl) {
    return matchedMember.avatarUrl;
  }

  return createInitialsAvatarDataUri(
    matchedMember?.initials ?? message.authorInitials,
    matchedMember?.avatarColor ?? message.authorColor
  );
}
