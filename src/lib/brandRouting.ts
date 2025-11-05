/**
 * Brand routing logic for multi-vertical video generation
 * Maps target verticals to appropriate brand labels and domains
 */

export function getBrandLabelForVertical(vertical: string): string {
  const normalized = vertical.toLowerCase().trim();
  
  if (normalized.includes('realtor') || normalized.includes('real estate')) {
    return 'AIRealtors247.ca';
  }
  
  if (normalized.includes('lawyer') || normalized.includes('legal') || normalized.includes('attorney')) {
    return 'AILawyers247.ca';
  }
  
  // All trades, home services, towing, septic, etc. default to AIAgents247
  return 'AIAgents247.ca';
}

export function getDefaultDomainForVertical(vertical: string): string {
  // For now, mirrors brand_label
  return getBrandLabelForVertical(vertical);
}

export function normalizeVerticalSlug(vertical: string): string {
  // Convert "Garage Door Repair" → "garage-door-repair"
  return vertical
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
}

export function getVerticalDisplayName(slug: string): string {
  // Convert "garage-door-repair" → "Garage Door Repair"
  return slug
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
