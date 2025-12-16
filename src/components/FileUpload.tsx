import { useCallback } from "react";
import { Upload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import mammoth from "mammoth";

interface FileUploadProps {
  onTextExtracted: (text: string) => void;
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
        onTextExtracted(text);
        toast({
          title: "File loaded",
          description: `Successfully loaded ${file.name}`,
        });
        return;
      }

      // For .rtf files, basic RTF to text conversion
      if (extension === ".rtf") {
        const text = await file.text();
        const plainText = text
          .replace(/\\[a-z]+\d*\s?/gi, "")
          .replace(/[{}]/g, "")
          .replace(/\\'[0-9a-f]{2}/gi, "")
          .trim();
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
        const result = await mammoth.extractRawText({ arrayBuffer });
        
        if (result.value) {
          onTextExtracted(result.value);
          toast({
            title: "File loaded",
            description: `Successfully extracted text from ${file.name}`,
          });
        } else {
          throw new Error("No text content found in document");
        }
        return;
      }

      // For .doc files (legacy format), try basic text extraction
      if (extension === ".doc") {
        const arrayBuffer = await file.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);
        const textDecoder = new TextDecoder("utf-8", { fatal: false });
        const content = textDecoder.decode(uint8Array);
        
        // Extract readable text by filtering non-printable characters
        const extractedText = content
          .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, " ")
          .replace(/\s+/g, " ")
          .trim();
        
        if (extractedText.length > 50) {
          onTextExtracted(extractedText);
          toast({
            title: "File loaded",
            description: `Extracted text from ${file.name} (legacy format - some formatting may be lost)`,
          });
        } else {
          toast({
            title: "Limited extraction",
            description: "Could not fully extract text from .doc file. Consider converting to .docx",
            variant: "destructive",
          });
        }
        return;
      }

      // Fallback: try reading as text
      const text = await file.text();
      onTextExtracted(text);
      toast({
        title: "File loaded",
        description: `Loaded ${file.name}`,
      });
    } catch (error) {
      toast({
        title: "Error reading file",
        description: "Could not extract text from this file. Try pasting the text directly or converting to .docx format.",
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
