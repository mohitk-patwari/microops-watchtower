export async function GET(){
    return new Response(JSON.stringify({ message: "Hello, Next.js meow API is working!"}),{
        status:200,
        headers:{"Content-Type":"application/json"},
    });
}