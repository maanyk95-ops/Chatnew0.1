
export const getContrastColor = (hexColor: string): '#000000' | '#FFFFFF' => {
  if (hexColor.startsWith('#')) {
    hexColor = hexColor.slice(1);
  }

  if (hexColor.length === 3) {
    hexColor = hexColor.split('').map(char => char + char).join('');
  }

  const r = parseInt(hexColor.substring(0, 2), 16);
  const g = parseInt(hexColor.substring(2, 4), 16);
  const b = parseInt(hexColor.substring(4, 6), 16);

  // Formula to determine perceived brightness
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

  return luminance > 0.5 ? '#000000' : '#FFFFFF';
};

export const generateAvatarColor = (seed: string): string => {
    let hash = 0;
    if (seed.length === 0) return '#CCCCCC';
    for (let i = 0; i < seed.length; i++) {
        hash = seed.charCodeAt(i) + ((hash << 5) - hash);
        hash = hash & hash; // Ensure 32bit integer
    }
    const c = (hash & 0x00FFFFFF).toString(16).toUpperCase();
    return "#" + "00000".substring(0, 6 - c.length) + c;
};
