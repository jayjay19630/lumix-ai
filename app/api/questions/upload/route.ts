import { NextRequest, NextResponse } from "next/server";
import { uploadFileToS3 } from "@/lib/aws/s3";
import type { ApiResponse } from "@/lib/types";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json(
        {
          success: false,
          error: "No file provided",
        } as ApiResponse,
        { status: 400 }
      );
    }

    // Validate file type
    const validTypes = ["application/pdf", "image/jpeg", "image/png", "image/jpg"];
    if (!validTypes.includes(file.type)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid file type. Please upload PDF or image files.",
        } as ApiResponse,
        { status: 400 }
      );
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        {
          success: false,
          error: "File size exceeds 10MB limit",
        } as ApiResponse,
        { status: 400 }
      );
    }

    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Upload to S3
    const fileUrl = await uploadFileToS3(
      buffer,
      file.name,
      file.type,
      "question-papers"
    );

    return NextResponse.json({
      success: true,
      data: {
        fileUrl,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
      },
    } as ApiResponse<{
      fileUrl: string;
      fileName: string;
      fileSize: number;
      fileType: string;
    }>);
  } catch (error) {
    console.error("File upload error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to upload file",
      } as ApiResponse,
      { status: 500 }
    );
  }
}
