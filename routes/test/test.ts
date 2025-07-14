export function GET() {
  return { message: "Test" };
}

export function POST() {
  return new Response(null, {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
}