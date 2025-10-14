import { TwelveLabs } from "twelvelabs-js";

const twelvelabs_client = new TwelveLabs({apiKey: process.env.TWELVELABS_API_KEY});

export async function POST(request) {
    
    const { videoId, prompt, type } = await request.json();

    const res = await twelvelabs_client.summarize({
        videoId: videoId,
        type: type,
        prompt: prompt,
    })

    return new Response(JSON.stringify(res), { status: 200 });

}