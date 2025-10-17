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
        
        // Check if it's a video_not_ready error from TwelveLabs
        if (error.message && error.message.includes('video_not_ready')) {
            return new Response(JSON.stringify({ 
                code: 'video_not_ready',
                message: 'The video is still being indexed. Please try again once the indexing process is complete.'
            }), { status: 202 }); // 202 Accepted - request accepted but processing not complete
        }
        
        // Check if it's a parameter_invalid error (video not in index yet)
        if (error.body && error.body.code === 'parameter_invalid' && 
            error.body.message && error.body.message.includes('video_id parameter is invalid')) {
            return new Response(JSON.stringify({ 
                code: 'video_not_uploaded',
                message: 'The video is still being uploaded and processed. Please wait for the upload to complete.'
            }), { status: 202 }); // 202 Accepted - request accepted but processing not complete
        }
        
        return new Response(JSON.stringify({ 
            code: 'analysis_error',
            error: 'Error during analysis' 
        }), { status: 500 });
    }
}