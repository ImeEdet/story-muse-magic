import { useCallback } from "react";
import { Upload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import mammoth from "mammoth";

interface FileUploadProps {
  onTextExtracted: (text: string) => void;
}

// Enhanced RTF parser that handles more formatting codes
function parseRtf(rtfContent: string): string {
  let text = rtfContent;
  
  // Remove RTF header and document settings
  text = text.replace(/^\{\\rtf[^}]*\}/gm, "");
  
  // Handle Unicode characters (\uN?)
  text = text.replace(/\\u(\d+)\??/g, (_, code) => {
    return String.fromCharCode(parseInt(code, 10));
  });
  
  // Handle hex-encoded characters (\'XX)
  text = text.replace(/\\'([0-9a-fA-F]{2})/g, (_, hex) => {
    return String.fromCharCode(parseInt(hex, 16));
  });
  
  // Replace common RTF escape sequences
  text = text.replace(/\\par\b/g, "\n");
  text = text.replace(/\\line\b/g, "\n");
  text = text.replace(/\\tab\b/g, "\t");
  text = text.replace(/\\\\/g, "\\");
  text = text.replace(/\\{/g, "{");
  text = text.replace(/\\}/g, "}");
  text = text.replace(/\\~/g, " "); // Non-breaking space
  text = text.replace(/\\_/g, "-"); // Non-breaking hyphen
  
  // Remove control words (e.g., \b, \i, \f0, \fs24)
  text = text.replace(/\\[a-z]+\d*\s?/gi, "");
  
  // Remove groups/braces
  text = text.replace(/[{}]/g, "");
  
  // Clean up whitespace
  text = text.replace(/\r\n/g, "\n");
  text = text.replace(/[ \t]+/g, " ");
  text = text.replace(/\n +/g, "\n");
  text = text.replace(/\n{3,}/g, "\n\n");
  
  return text.trim();
}

// Extract readable text from legacy .doc binary format
function parseDocBinary(arrayBuffer: ArrayBuffer): string {
  const uint8Array = new Uint8Array(arrayBuffer);
  const textDecoder = new TextDecoder("utf-8", { fatal: false });
  const content = textDecoder.decode(uint8Array);
  
  // Try to find text content between common markers
  let extractedText = "";
  
  // Method 1: Look for readable ASCII sequences
  const asciiPattern = /[\x20-\x7E]{10,}/g;
  const matches = content.match(asciiPattern);
  if (matches) {
    extractedText = matches
      .filter(match => {
        // Filter out binary garbage and metadata
        const lowercaseMatch = match.toLowerCase();
        return !lowercaseMatch.includes("microsoft") &&
               !lowercaseMatch.includes("msword") &&
               !lowercaseMatch.includes("normal.dot") &&
               !match.match(/^[A-Z0-9_]+$/) && // Skip constants
               match.length > 20; // Skip short fragments
      })
      .join(" ");
  }
  
  // Clean up extracted text
  extractedText = extractedText
    .replace(/[\x00-\x1F\x7F-\x9F]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  
  return extractedText;
}

export function FileUpload({ onTextExtracted }: FileUploadProps) {
  const { toast } = useToast();

  const handleFile = useCallback(async (file: File) => {
    const validTypes = [
      "text/plain",
      "text/markdown",
      "text/rtf",
      "application/rtf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];

    const validExtensions = [".txt", ".md", ".rtf", ".doc", ".docx"];
    const extension = file.name.toLowerCase().slice(file.name.lastIndexOf("."));

    if (!validTypes.includes(file.type) && !validExtensions.includes(extension)) {
      toast({
        title: "Unsupported file type",
        description: "Please upload a .txt, .md, .rtf, .doc, or .docx file",
        variant: "destructive",
      });
      return;
    }

    try {
      // For .txt and .md files, read directly
      if (extension === ".txt" || extension === ".md") {
        const text = await file.text();
        if (text.trim().length === 0) {
          toast({
            title: "Empty file",
            description: "The file appears to be empty",
            variant: "destructive",
          });
          return;
        }
        onTextExtracted(text);
        toast({
          title: "File loaded",
          description: `Successfully loaded ${file.name}`,
        });
        return;
      }

      // For .rtf files, use enhanced RTF parser
      if (extension === ".rtf") {
        const text = await file.text();
        const plainText = parseRtf(text);
        
        if (plainText.length < 10) {
          toast({
            title: "Could not extract text",
            description: "The RTF file may be corrupted or empty. Try saving as .txt or .docx",
            variant: "destructive",
          });
          return;
        }
        
        onTextExtracted(plainText);
        toast({
          title: "File loaded",
          description: `Successfully loaded ${file.name}`,
        });
        return;
      }

      // For .docx files, use mammoth for proper extraction
      if (extension === ".docx") {
        const arrayBuffer = await file.arrayBuffer();
        
        try {
          const result = await mammoth.extractRawText({ arrayBuffer });
          
          if (result.value && result.value.trim().length > 0) {
            onTextExtracted(result.value);
            toast({
              title: "File loaded",
              description: `Successfully extracted text from ${file.name}`,
            });
          } else {
            toast({
              title: "No text found",
              description: "The document appears to be empty or contains only images",
              variant: "destructive",
            });
          }
        } catch (mammothError) {
          toast({
            title: "Error reading document",
            description: "Could not parse the .docx file. It may be corrupted.",
            variant: "destructive",
          });
        }
        return;
      }

      // For .doc files (legacy format), try binary extraction
      if (extension === ".doc") {
        const arrayBuffer = await file.arrayBuffer();
        
        // First try mammoth in case it's actually a .docx with wrong extension
        try {
          const result = await mammoth.extractRawText({ arrayBuffer });
          if (result.value && result.value.trim().length > 50) {
            onTextExtracted(result.value);
            toast({
              title: "File loaded",
              description: `Successfully extracted text from ${file.name}`,
            });
            return;
          }
        } catch {
          // Not a .docx, continue with binary extraction
        }
        
        // Fall back to binary extraction for true .doc files
        const extractedText = parseDocBinary(arrayBuffer);
        
        if (extractedText.length > 50) {
          onTextExtracted(extractedText);
          toast({
            title: "File loaded",
            description: `Extracted text from ${file.name} (legacy format - some content may be missing)`,
          });
        } else {
          toast({
            title: "Limited extraction",
            description: "Could not fully extract text from .doc file. Please convert to .docx or .txt for best results.",
            variant: "destructive",
          });
        }
        return;
      }

      // Fallback: try reading as plain text
      const text = await file.text();
      if (text.trim().length > 0) {
        onTextExtracted(text);
        toast({
          title: "File loaded",
          description: `Loaded ${file.name}`,
        });
      } else {
        toast({
          title: "Empty file",
          description: "Could not extract any text from this file",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error reading file",
        description: "Could not extract text. Try pasting directly or converting to .docx format.",
        variant: "destructive",
      });
    }
  }, [onTextExtracted, toast]);

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  return (
    <div
      onDrop={handleDrop}
      onDragOver={(e) => e.preventDefault()}
      className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-primary/50 transition-colors cursor-pointer"
    >
      <input
        type="file"
        accept=".txt,.md,.rtf,.doc,.docx"
        onChange={handleChange}
        className="hidden"
        id="file-upload"
      />
      <label htmlFor="file-upload" className="cursor-pointer">
        <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          Drag & drop a file or <span className="text-primary underline">browse</span>
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Supports .txt, .md, .rtf, .doc, .docx
        </p>
      </label>
    </div>
  );
}
