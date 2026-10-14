/*
  Reads the published dataset, which is public, so no token is needed. Used to
  find content a test needs, such as an artwork whose URL has changed, without
  naming any one document.
*/
const PROJECT_ID = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID ?? 's3wn2p8r';
const DATASET = process.env.NEXT_PUBLIC_SANITY_DATASET ?? 'production';

export async function groq<T>(query: string, params: Record<string, unknown> = {}): Promise<T> {
    const url = new URL(`https://${PROJECT_ID}.apicdn.sanity.io/v2025-02-19/data/query/${DATASET}`);
    url.searchParams.set('query', query);
    url.searchParams.set('perspective', 'published');
    for (const [key, value] of Object.entries(params)) url.searchParams.set(`$${key}`, JSON.stringify(value));
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Sanity query failed: ${response.status} ${await response.text()}`);
    return (await response.json()).result as T;
}
