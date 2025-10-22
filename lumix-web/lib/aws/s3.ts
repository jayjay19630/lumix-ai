import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  PutObjectCommandInput,
  GetObjectCommandInput,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// Initialize S3 Client
const s3Client = new S3Client({
  region: process.env.AWS_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  },
});

const BUCKET_NAME = process.env.S3_BUCKET_NAME || "lumix-files";

/**
 * Upload file to S3
 * Returns a presigned URL valid for 7 days
 */
export async function uploadFileToS3(
  fileBuffer: Buffer,
  fileName: string,
  contentType: string,
  folder: string = "uploads",
): Promise<string> {
  try {
    const key = `${folder}/${Date.now()}-${fileName}`;

    const input: PutObjectCommandInput = {
      Bucket: BUCKET_NAME,
      Key: key,
      Body: fileBuffer,
      ContentType: contentType,
    };

    const command = new PutObjectCommand(input);
    await s3Client.send(command);

    // Generate a presigned URL for accessing the file (valid for 7 days)
    const presignedUrl = await generatePresignedDownloadUrl(key, 604800); // 7 days in seconds
    return presignedUrl;
  } catch (error) {
    console.error("Error uploading file to S3:", error);
    throw error;
  }
}

/**
 * Upload file to S3 with custom key
 * Returns a presigned URL valid for 7 days
 */
export async function uploadToS3(
  fileBuffer: Uint8Array | Buffer,
  key: string,
  contentType: string,
): Promise<string> {
  try {
    const input: PutObjectCommandInput = {
      Bucket: BUCKET_NAME,
      Key: key,
      Body: fileBuffer,
      ContentType: contentType,
    };

    const command = new PutObjectCommand(input);
    await s3Client.send(command);

    // Generate a presigned URL for accessing the file (valid for 7 days)
    const presignedUrl = await generatePresignedDownloadUrl(key, 604800); // 7 days in seconds
    return presignedUrl;
  } catch (error) {
    console.error("Error uploading file to S3:", error);
    throw error;
  }
}

/**
 * Generate presigned URL for file upload
 */
export async function generatePresignedUploadUrl(
  fileName: string,
  contentType: string,
  folder: string = "uploads",
  expiresIn: number = 3600,
): Promise<{ uploadUrl: string; fileUrl: string; key: string }> {
  try {
    const key = `${folder}/${Date.now()}-${fileName}`;

    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      ContentType: contentType,
    });

    const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn });

    const fileUrl = `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION || "us-east-1"}.amazonaws.com/${key}`;

    return {
      uploadUrl,
      fileUrl,
      key,
    };
  } catch (error) {
    console.error("Error generating presigned upload URL:", error);
    throw error;
  }
}

/**
 * Generate presigned URL for file download
 */
export async function generatePresignedDownloadUrl(
  key: string,
  expiresIn: number = 3600,
): Promise<string> {
  try {
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });

    const url = await getSignedUrl(s3Client, command, { expiresIn });
    return url;
  } catch (error) {
    console.error("Error generating presigned download URL:", error);
    throw error;
  }
}

/**
 * Get file from S3
 */
export async function getFileFromS3(key: string): Promise<Buffer> {
  try {
    const input: GetObjectCommandInput = {
      Bucket: BUCKET_NAME,
      Key: key,
    };

    const command = new GetObjectCommand(input);
    const response = await s3Client.send(command);

    if (!response.Body) {
      throw new Error("No file body returned from S3");
    }

    // Convert stream to buffer
    const chunks: Uint8Array[] = [];
    for await (const chunk of response.Body as AsyncIterable<Uint8Array>) {
      chunks.push(chunk);
    }

    return Buffer.concat(chunks);
  } catch (error) {
    console.error("Error getting file from S3:", error);
    throw error;
  }
}

/**
 * Delete file from S3
 */
export async function deleteFileFromS3(key: string): Promise<void> {
  try {
    const command = new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });

    await s3Client.send(command);
  } catch (error) {
    console.error("Error deleting file from S3:", error);
    throw error;
  }
}

/**
 * Upload worksheet PDF
 */
export async function uploadWorksheet(
  pdfBuffer: Buffer,
  lessonId: string,
): Promise<string> {
  return uploadFileToS3(
    pdfBuffer,
    `worksheet-${lessonId}.pdf`,
    "application/pdf",
    "worksheets",
  );
}

/**
 * Upload graded worksheet
 */
export async function uploadGradedWorksheet(
  fileBuffer: Buffer,
  sessionId: string,
  fileName: string,
): Promise<string> {
  return uploadFileToS3(
    fileBuffer,
    `graded-${sessionId}-${fileName}`,
    "application/pdf",
    "graded-worksheets",
  );
}

/**
 * Upload question image
 */
export async function uploadQuestionImage(
  imageBuffer: Buffer,
  questionId: string,
  contentType: string,
): Promise<string> {
  const extension = contentType.split("/")[1] || "jpg";
  return uploadFileToS3(
    imageBuffer,
    `question-${questionId}.${extension}`,
    contentType,
    "question-images",
  );
}

export { s3Client, BUCKET_NAME };
