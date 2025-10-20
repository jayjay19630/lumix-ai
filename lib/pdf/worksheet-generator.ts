import { jsPDF } from "jspdf";

export interface WorksheetQuestion {
  id: string;
  text: string;
  topic: string;
  difficulty: "Easy" | "Medium" | "Hard";
}

export interface WorksheetCriteria {
  title: string;
  studentName?: string;
  topics: string[];
  difficulty: ("Easy" | "Medium" | "Hard")[];
  questionCount: number;
  includeAnswerKey: boolean;
  sections?: {
    warmup?: number;
    practice?: number;
    challenge?: number;
  };
}

export interface WorksheetGenerationResult {
  pdfBlob: Blob;
  pdfDataUri: string;
  questions: WorksheetQuestion[];
}

/**
 * Generate a worksheet PDF based on criteria
 */
export async function generateWorksheetPDF(
  questions: WorksheetQuestion[],
  criteria: WorksheetCriteria
): Promise<WorksheetGenerationResult> {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - 2 * margin;
  let yPosition = margin;

  // Helper function to check if we need a new page
  const checkNewPage = (requiredSpace: number = 20) => {
    if (yPosition + requiredSpace > pageHeight - margin) {
      doc.addPage();
      yPosition = margin;
      return true;
    }
    return false;
  };

  // Header - Lumix branding
  doc.setFillColor(99, 102, 241); // Indigo-600
  doc.rect(0, 0, pageWidth, 25, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.setFont("helvetica", "bold");
  doc.text("Lumix", margin, 15);

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("Teaching brilliance, powered by AI", margin, 20);

  yPosition = 35;

  // Worksheet Title
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text(criteria.title, margin, yPosition);
  yPosition += 10;

  // Student Name (if provided)
  if (criteria.studentName) {
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text(`Student: ${criteria.studentName}`, margin, yPosition);
    yPosition += 6;
  }

  // Date
  const today = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  doc.setFontSize(10);
  doc.text(`Date: ${today}`, margin, yPosition);
  yPosition += 12;

  // Divider line
  doc.setDrawColor(200, 200, 200);
  doc.line(margin, yPosition, pageWidth - margin, yPosition);
  yPosition += 10;

  // Add sections if specified
  if (criteria.sections) {
    const { warmup, practice, challenge } = criteria.sections;
    let questionIndex = 0;

    // Warmup Section
    if (warmup && warmup > 0) {
      checkNewPage(15);
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(99, 102, 241);
      doc.text("Warm-up Questions", margin, yPosition);
      yPosition += 8;

      doc.setTextColor(0, 0, 0);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);

      for (let i = 0; i < warmup && questionIndex < questions.length; i++) {
        const question = questions[questionIndex++];
        checkNewPage(25);

        doc.setFont("helvetica", "bold");
        doc.text(`${questionIndex}.`, margin, yPosition);
        doc.setFont("helvetica", "normal");

        const lines = doc.splitTextToSize(question.text, contentWidth - 10);
        doc.text(lines, margin + 7, yPosition);
        yPosition += lines.length * 6 + 10;
      }

      yPosition += 5;
    }

    // Practice Section
    if (practice && practice > 0) {
      checkNewPage(15);
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(99, 102, 241);
      doc.text("Main Practice", margin, yPosition);
      yPosition += 8;

      doc.setTextColor(0, 0, 0);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);

      for (let i = 0; i < practice && questionIndex < questions.length; i++) {
        const question = questions[questionIndex++];
        checkNewPage(25);

        doc.setFont("helvetica", "bold");
        doc.text(`${questionIndex}.`, margin, yPosition);
        doc.setFont("helvetica", "normal");

        const lines = doc.splitTextToSize(question.text, contentWidth - 10);
        doc.text(lines, margin + 7, yPosition);
        yPosition += lines.length * 6 + 10;
      }

      yPosition += 5;
    }

    // Challenge Section
    if (challenge && challenge > 0) {
      checkNewPage(15);
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(245, 158, 11); // Amber-500
      doc.text("Challenge Questions", margin, yPosition);
      yPosition += 8;

      doc.setTextColor(0, 0, 0);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);

      for (let i = 0; i < challenge && questionIndex < questions.length; i++) {
        const question = questions[questionIndex++];
        checkNewPage(25);

        doc.setFont("helvetica", "bold");
        doc.text(`${questionIndex}.`, margin, yPosition);
        doc.setFont("helvetica", "normal");

        const lines = doc.splitTextToSize(question.text, contentWidth - 10);
        doc.text(lines, margin + 7, yPosition);
        yPosition += lines.length * 6 + 10;
      }
    }
  } else {
    // No sections - just list all questions
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Questions", margin, yPosition);
    yPosition += 10;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);

    questions.forEach((question, index) => {
      checkNewPage(25);

      doc.setFont("helvetica", "bold");
      doc.text(`${index + 1}.`, margin, yPosition);
      doc.setFont("helvetica", "normal");

      const lines = doc.splitTextToSize(question.text, contentWidth - 10);
      doc.text(lines, margin + 7, yPosition);
      yPosition += lines.length * 6 + 10;
    });
  }

  // Answer Key (if requested)
  if (criteria.includeAnswerKey) {
    doc.addPage();
    yPosition = margin;

    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(99, 102, 241);
    doc.text("Answer Key", margin, yPosition);
    yPosition += 12;

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");

    questions.forEach((question, index) => {
      checkNewPage(10);
      doc.text(
        `${index + 1}. ${question.topic} - ${question.difficulty}`,
        margin,
        yPosition
      );
      yPosition += 6;
    });
  }

  // Footer on all pages
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(
      `Generated by Lumix - Page ${i} of ${totalPages}`,
      pageWidth / 2,
      pageHeight - 10,
      { align: "center" }
    );
  }

  // Generate blob and data URI
  const pdfBlob = doc.output("blob");
  const pdfDataUri = doc.output("datauristring");

  return {
    pdfBlob,
    pdfDataUri,
    questions,
  };
}

/**
 * Download worksheet PDF
 */
export function downloadWorksheetPDF(
  result: WorksheetGenerationResult,
  filename: string = "worksheet.pdf"
) {
  const link = document.createElement("a");
  link.href = URL.createObjectURL(result.pdfBlob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}
