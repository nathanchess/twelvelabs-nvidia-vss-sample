import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { TwelveLabs, TwelvelabsApi } from 'twelvelabs-js';

const twelvelabs_client = new TwelveLabs({apiKey: process.env.TWELVELABS_API_KEY});

const s3_client = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
})

export async function GET(request) {

    /*
    Retrieves all videos from the TwelveLabs index which can be mapped to the VSS database.
    */

    const videoPager = await twelvelabs_client.indexes.videos.list(process.env.NEXT_PUBLIC_TWELVELABS_MARENGO_INDEX_ID);
    const videoPagerPegasus = await twelvelabs_client.indexes.videos.list(process.env.NEXT_PUBLIC_TWELVELABS_PEGASUS_INDEX_ID);
    const videoList = {}

    for await (const video of videoPager.data) {
        const fileName = video.systemMetadata.filename
        videoList[fileName] = {
            ...video,
            ...video.systemMetadata
        }
    }

    for await (const video of videoPagerPegasus.data) {
        const fileName = video.systemMetadata.filename
        videoList[fileName] = {
            ...videoList[fileName],
            'pegasusId': video.id
        }
    }

    return new Response(JSON.stringify(videoList), { status: 200 });

}

export async function POST(request) {
    
    /*
    Given file name and type, return a signed URL for uploading to S3 on the client side.
    */
    
    try {

        const { fileName, fileType } = await request.json();
        const fileKey = `uploads/${Date.now()}_${fileName}`;

        const command = new PutObjectCommand({
            Bucket: process.env.AWS_SOURCE_S3_BUCKET,
            Key: fileKey,
            ContentType: fileType,
        })  

        const signedUrl = await getSignedUrl(s3_client, command, { expiresIn: 3600 })
        return new Response(JSON.stringify({ uploadUrl: signedUrl, key: fileKey }), { status: 200 });

    } catch (error) {
        console.error("Error generating signed URL", error);
        return new Response(JSON.stringify({ error: 'Error generating signed URL' }), { status: 500 });
    }
}