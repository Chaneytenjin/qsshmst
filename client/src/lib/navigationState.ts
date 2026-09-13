export interface NavigationRule {
  path: string;
  roles: readonly string[];
  founderOnly?: boolean;
}

export function getVisibleNavigationItems<T extends NavigationRule>(
  items: readonly T[],
  role: string,
  isFounder: boolean,
): T[] {
  return items.filter((item) => !item.founderOnly || isFounder).filter((item) => item.roles.includes(role));
}

export function isNavigationPathActive(currentPath: string, itemPath: string): boolean {
  return currentPath === itemPath || currentPath.startsWith(`${itemPath}/`);
}
