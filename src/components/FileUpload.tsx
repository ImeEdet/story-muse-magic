import { useCallback } from "react";
import { Upload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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

      // For other formats, try to extract text
      if (extension === ".rtf") {
        const text = await file.text();
        // Basic RTF to text conversion (strips RTF formatting)
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

      // For .doc/.docx, we'll extract what we can
      if (extension === ".docx") {
        const arrayBuffer = await file.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);
        
        // DOCX files are ZIP archives - try to find document.xml
        // This is a simplified extraction
        const textDecoder = new TextDecoder("utf-8");
        const content = textDecoder.decode(uint8Array);
        
        // Extract text between XML tags
        const textMatches = content.match(/<w:t[^>]*>([^<]*)<\/w:t>/g);
        if (textMatches) {
          const extractedText = textMatches
            .map(match => match.replace(/<[^>]+>/g, ""))
            .join(" ");
          onTextExtracted(extractedText);
          toast({
            title: "File loaded",
            description: `Extracted text from ${file.name}`,
          });
          return;
        }
      }

      // Fallback: try reading as text
      const text = await file.text();
      onTextExtracted(text);
      toast({
        title: "File loaded",
        description: `Loaded ${file.name}`,
      });
    } catch (error) {
      console.error("Error reading file:", error);
      toast({
        title: "Error reading file",
        description: "Could not extract text from this file. Try pasting the text directly.",
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
