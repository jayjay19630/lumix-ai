import { NextRequest, NextResponse } from "next/server";
import { createWorksheet } from "@/lib/aws/dynamodb";
import { uploadToS3 } from "@/lib/aws/s3";
import { v4 as uuidv4 } from "uuid";
import type { Worksheet } from "@/lib/types";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    // Extract data from FormData
    const pdfBlob = formData.get("pdf") as Blob;
    const title = formData.get("title") as string;
    const studentName = formData.get("studentName") as string;
    const topicsStr = formData.get("topics") as string;
    const difficultyStr = formData.get("difficulty") as string;
    const questionCountStr = formData.get("questionCount") as string;
    const questionsStr = formData.get("questions") as string;
    const includeAnswerKeyStr = formData.get("includeAnswerKey") as string;
    const sectionsStr = formData.get("sections") as string | null;

    // Validate required fields
    if (!pdfBlob || !title || !topicsStr || !difficultyStr || !questionsStr) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    // Parse JSON fields
    const topics = JSON.parse(topicsStr);
    const difficulty = JSON.parse(difficultyStr);
    const questions = JSON.parse(questionsStr);
    const includeAnswerKey = includeAnswerKeyStr === "true";
    const sections = sectionsStr ? JSON.parse(sectionsStr) : undefined;

    // Generate unique ID for worksheet
    const worksheetId = uuidv4();
    const timestamp = new Date().toISOString().split("T")[0];
    const filename = `${title.toLowerCase().replace(/\s+/g, "-")}-${timestamp}.pdf`;
    const uploadKey = `worksheets/${worksheetId}/${filename}`;

    // Upload PDF to S3
    const pdfBuffer = new Uint8Array(await pdfBlob.arrayBuffer());
    const pdfUrl = await uploadToS3(pdfBuffer, uploadKey, "application/pdf");

    // Create worksheet record
    const worksheet: Worksheet = {
      worksheet_id: worksheetId,
      title,
      student_name: studentName || undefined,
      topics,
      difficulty,
      question_count: parseInt(questionCountStr),
      questions,
      pdf_url: pdfUrl,
      has_answer_key: includeAnswerKey,
      sections,
      created_at: new Date().toISOString(),
    };

    // Save to DynamoDB
    await createWorksheet(worksheet);

    return NextResponse.json({
      worksheet,
      message: "Worksheet saved successfully",
    });
  } catch (error) {
    console.error("Error saving worksheet:", error);
    return NextResponse.json(
      { error: "Failed to save worksheet" },
      { status: 500 },
    );
  }
}
