export const dynamic = "force-dynamic";

export async function GET() {
  const body = `User-agent: *
Allow: /

Sitemap: /sitemap.xml
`;
  return new Response(body, {
    headers: { "Content-Type": "text/plain" },
  });
}
