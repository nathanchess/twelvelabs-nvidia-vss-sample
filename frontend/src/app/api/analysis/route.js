import { TwelveLabs, TwelvelabsApi } from 'twelvelabs-js';

const twelvelabs_client = new TwelveLabs({apiKey: process.env.TWELVELABS_API_KEY});

export async function POST(request) {

    /* Request prompt to TwelveLabs Pegasus model and return response. */

    const { userQuery, videoId } = await request.json();

    try {

        const response = await twelvelabs_client.analyze({
            videoId: videoId,
            prompt: userQuery,
            temperature: 0.2
        })

        return new Response(JSON.stringify(response), { status: 200 });

    } catch (error) {
        console.error("Error during analysis", error);
        return new Response(JSON.stringify({ error: 'Error during analysis' }), { status: 500 });
    }
}