import { TwelveLabs } from "twelvelabs-js";

const twelvelabs_client = new TwelveLabs({apiKey: process.env.TWELVELABS_API_KEY});

export async function POST(request) {

    const { query, groupBy, threshold } = await request.json();

    const response = await twelvelabs_client.search.query({
        indexId: process.env.NEXT_PUBLIC_TWELVELABS_MARENGO_INDEX_ID,
        searchOptions: ['visual', 'audio'],
        queryText: query,
        groupBy: groupBy,
        threshold: threshold,
    })

    for await (const item of response) {
        if (item.id && item.clips) { // Grouped by videos
            console.log(` Video ID: ${item.id}`);
            for (const clip of item.clips) {
                console.log("  Clip:");
                console.log(`    Score: ${clip.score}`);
                console.log(`    Start: ${clip.start}`);
                console.log(`    End: ${clip.end}`);
                console.log(`    Video ID: ${clip.videoId}`);
                console.log(`    Confidence: ${clip.confidence}`);
                console.log(`    Thumbnail URL: ${clip.thumbnailUrl}`);
            }
        } else { // Grouped by clips.
            console.log(`  Score: ${item.score}`);
            console.log(`  Start: ${item.start}`);
            console.log(`  End: ${item.end}`);
            console.log(`  Video ID: ${item.videoId}`);
            console.log(`  Confidence: ${item.confidence}`);
            console.log(`  Thumbnail URL: ${item.thumbnailUrl}`);
            if (item.transcription) {
                console.log(`  Transcription: ${item.transcription}`);
            }
        }
    }

    return new Response(JSON.stringify(response), { status: 200 });

}