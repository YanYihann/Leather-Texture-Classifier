/** Resolve bundled public assets for root domains and GitHub Pages project paths. */
export const publicAsset = (path: string) => `${import.meta.env.BASE_URL}${path.replace(/^\//, '')}`;
