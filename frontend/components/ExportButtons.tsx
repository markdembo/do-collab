"use client";

import { Copy, Download } from "lucide-react";

import { Button } from "@/components/ui/button";
import domtoimage from "dom-to-image";
import { toast } from "sonner";

interface ExportButtonsProps {
  previewRef: React.RefObject<HTMLDivElement | null>;
  backgroundColor: string;
}

export default function ExportButtons({ previewRef, backgroundColor }: ExportButtonsProps) {
  const handleDownload = async () => {
    if (!previewRef.current) return;

    try {
      const dataUrl = await domtoimage.toPng(previewRef.current, {
        quality: 1.0,
        bgcolor: backgroundColor,
      });

      const link = document.createElement("a");
      link.download = "e-card.png";
      link.href = dataUrl;
      link.click();

      toast.success("E-card downloaded successfully!");
    } catch (error) {
      toast.error("Failed to download e-card");
      console.error("Download error:", error);
    }
  };

  const handleCopy = async () => {
    if (!previewRef.current) return;

    try {
      const dataUrl = await domtoimage.toPng(previewRef.current, {
        quality: 1.0,
        bgcolor: backgroundColor,
      });

      await navigator.clipboard.write([
        new ClipboardItem({
          "image/png": await fetch(dataUrl).then((res) => res.blob()),
        }),
      ]);

      toast.success("E-card copied to clipboard!");
    } catch (error) {
      toast.error("Failed to copy e-card");
      console.error("Copy error:", error);
    }
  };

  return (
    <div className="flex gap-2">
      <Button onClick={handleDownload} variant="outline" size="sm">
        <Download className="w-4 h-4 mr-2" />
        Download
      </Button>
      <Button onClick={handleCopy} variant="outline" size="sm">
        <Copy className="w-4 h-4 mr-2" />
        Copy image
      </Button>
    </div>
  );
}
