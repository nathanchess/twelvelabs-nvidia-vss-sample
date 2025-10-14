import { TwelveLabs, TwelvelabsApi } from 'twelvelabs-js';

const twelvelabs_client = new TwelveLabs({apiKey: process.env.TWELVELABS_API_KEY});

export async function GET(request, { params }) {
    const { videoId } = await params;
    try {
        const gist = await twelvelabs_client.gist({
            videoId: videoId,
            types: ['title', 'topic', 'hashtag']
        })
        return new Response(JSON.stringify(gist), { status: 200 });
    } catch (error) {
        console.error("Error fetching gist", error);
        return new Response(JSON.stringify({ error: 'Error fetching gist' }), { status: 500 });
    }
}